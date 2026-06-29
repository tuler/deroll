// Copyright Cartesi and individual authors (see AUTHORS)
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// The whole API is synchronous on purpose: calls that "block" (finish, gio)
// yield the machine, which pauses the entire guest — including the Node.js
// event loop — so there is nothing to run concurrently while they wait.

#include <cerrno>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>

#include <napi.h>

extern "C" {
#include <libcmt/rollup.h>
}

namespace {

Napi::Error errno_error(Napi::Env env, const char *what, int rc) {
    char msg[256];
    (void) snprintf(msg, sizeof msg, "%s failed: %s (%d)", what, strerror(-rc), rc);
    Napi::Error err = Napi::Error::New(env, msg);
    err.Set("errno", Napi::Number::New(env, rc));
    err.Set("syscall", Napi::String::New(env, what));
    return err;
}

// Extracts a byte view from a Buffer/Uint8Array argument. The view borrows the
// underlying ArrayBuffer storage: valid only while no JS runs.
bool get_bytes(Napi::Env env, const Napi::Value &value, const char *name, const uint8_t **data, size_t *length,
    ptrdiff_t exact_length = -1) {
    if (!value.IsTypedArray() || value.As<Napi::TypedArray>().TypedArrayType() != napi_uint8_array) {
        Napi::TypeError::New(env, std::string(name) + " must be a Buffer or Uint8Array").ThrowAsJavaScriptException();
        return false;
    }
    Napi::Uint8Array array = value.As<Napi::Uint8Array>();
    if (exact_length >= 0 && array.ByteLength() != static_cast<size_t>(exact_length)) {
        Napi::TypeError::New(env,
            std::string(name) + " must be exactly " + std::to_string(exact_length) + " bytes long")
            .ThrowAsJavaScriptException();
        return false;
    }
    *data = array.Data();
    *length = array.ByteLength();
    return true;
}

class Rollup final : public Napi::ObjectWrap<Rollup> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    explicit Rollup(const Napi::CallbackInfo &info);
    ~Rollup() override;

    Rollup(const Rollup &) = delete;
    Rollup &operator=(const Rollup &) = delete;
    Rollup(Rollup &&) = delete;
    Rollup &operator=(Rollup &&) = delete;

private:
    bool usable(Napi::Env env);

    Napi::Value Finish(const Napi::CallbackInfo &info);
    Napi::Value EmitVoucher(const Napi::CallbackInfo &info);
    Napi::Value EmitDelegateCallVoucher(const Napi::CallbackInfo &info);
    Napi::Value EmitNotice(const Napi::CallbackInfo &info);
    Napi::Value EmitReport(const Napi::CallbackInfo &info);
    Napi::Value EmitException(const Napi::CallbackInfo &info);
    Napi::Value Progress(const Napi::CallbackInfo &info);
    Napi::Value Gio(const Napi::CallbackInfo &info);
    Napi::Value LoadMerkle(const Napi::CallbackInfo &info);
    Napi::Value SaveMerkle(const Napi::CallbackInfo &info);
    Napi::Value ResetMerkle(const Napi::CallbackInfo &info);
    Napi::Value Close(const Napi::CallbackInfo &info);

    cmt_rollup_t rollup_{};
    bool open_ = false;
};

Rollup::Rollup(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Rollup>(info) {
    Napi::Env env = info.Env();
    int rc = cmt_rollup_init(&rollup_);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_init", rc).ThrowAsJavaScriptException();
        return;
    }
    open_ = true;
}

Rollup::~Rollup() {
    if (open_) {
        cmt_rollup_fini(&rollup_);
        open_ = false;
    }
}

bool Rollup::usable(Napi::Env env) {
    if (!open_) {
        Napi::Error::New(env, "rollup is closed").ThrowAsJavaScriptException();
        return false;
    }
    return true;
}

Napi::Value Rollup::Finish(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "accept must be a boolean").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    cmt_rollup_finish_t finish{};
    finish.accept_previous_request = info[0].As<Napi::Boolean>().Value();
    int rc = cmt_rollup_finish(&rollup_, &finish);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_finish", rc).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Object request = Napi::Object::New(env);
    if (finish.next_request_type == HTIF_YIELD_REASON_ADVANCE) {
        cmt_rollup_advance_t advance{};
        rc = cmt_rollup_read_advance_state(&rollup_, &advance);
        if (rc < 0) {
            errno_error(env, "cmt_rollup_read_advance_state", rc).ThrowAsJavaScriptException();
            return env.Undefined();
        }
        request.Set("type", Napi::String::New(env, "advance"));
        request.Set("chainId", Napi::BigInt::New(env, advance.chain_id));
        request.Set("appContract", Napi::Buffer<uint8_t>::Copy(env, advance.app_contract.data, CMT_ABI_ADDRESS_LENGTH));
        request.Set("msgSender", Napi::Buffer<uint8_t>::Copy(env, advance.msg_sender.data, CMT_ABI_ADDRESS_LENGTH));
        request.Set("blockNumber", Napi::BigInt::New(env, advance.block_number));
        request.Set("blockTimestamp", Napi::BigInt::New(env, advance.block_timestamp));
        request.Set("prevRandao", Napi::Buffer<uint8_t>::Copy(env, advance.prev_randao.data, CMT_ABI_U256_LENGTH));
        request.Set("index", Napi::BigInt::New(env, advance.index));
        request.Set("payload",
            Napi::Buffer<uint8_t>::Copy(env, static_cast<const uint8_t *>(advance.payload.data),
                advance.payload.length));
    } else {
        cmt_rollup_inspect_t inspect{};
        rc = cmt_rollup_read_inspect_state(&rollup_, &inspect);
        if (rc < 0) {
            errno_error(env, "cmt_rollup_read_inspect_state", rc).ThrowAsJavaScriptException();
            return env.Undefined();
        }
        request.Set("type", Napi::String::New(env, "inspect"));
        request.Set("payload",
            Napi::Buffer<uint8_t>::Copy(env, static_cast<const uint8_t *>(inspect.payload.data),
                inspect.payload.length));
    }
    return request;
}

Napi::Value Rollup::EmitVoucher(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *address_data = nullptr;
    const uint8_t *value_data = nullptr;
    const uint8_t *payload_data = nullptr;
    size_t address_length = 0;
    size_t value_length = 0;
    size_t payload_length = 0;
    if (!get_bytes(env, info[0], "destination", &address_data, &address_length, CMT_ABI_ADDRESS_LENGTH) ||
        !get_bytes(env, info[1], "value", &value_data, &value_length, CMT_ABI_U256_LENGTH) ||
        !get_bytes(env, info[2], "payload", &payload_data, &payload_length)) {
        return env.Undefined();
    }
    cmt_abi_address_t address{};
    cmt_abi_u256_t value{};
    memcpy(address.data, address_data, CMT_ABI_ADDRESS_LENGTH);
    memcpy(value.data, value_data, CMT_ABI_U256_LENGTH);
    const cmt_abi_bytes_t payload{payload_length, const_cast<uint8_t *>(payload_data)};
    uint64_t index = 0;
    int rc = cmt_rollup_emit_voucher(&rollup_, &address, &value, &payload, &index);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_emit_voucher", rc).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return Napi::BigInt::New(env, index);
}

Napi::Value Rollup::EmitDelegateCallVoucher(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *address_data = nullptr;
    const uint8_t *payload_data = nullptr;
    size_t address_length = 0;
    size_t payload_length = 0;
    if (!get_bytes(env, info[0], "destination", &address_data, &address_length, CMT_ABI_ADDRESS_LENGTH) ||
        !get_bytes(env, info[1], "payload", &payload_data, &payload_length)) {
        return env.Undefined();
    }
    cmt_abi_address_t address{};
    memcpy(address.data, address_data, CMT_ABI_ADDRESS_LENGTH);
    const cmt_abi_bytes_t payload{payload_length, const_cast<uint8_t *>(payload_data)};
    uint64_t index = 0;
    int rc = cmt_rollup_emit_delegate_call_voucher(&rollup_, &address, &payload, &index);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_emit_delegate_call_voucher", rc).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return Napi::BigInt::New(env, index);
}

Napi::Value Rollup::EmitNotice(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *payload_data = nullptr;
    size_t payload_length = 0;
    if (!get_bytes(env, info[0], "payload", &payload_data, &payload_length)) {
        return env.Undefined();
    }
    const cmt_abi_bytes_t payload{payload_length, const_cast<uint8_t *>(payload_data)};
    uint64_t index = 0;
    int rc = cmt_rollup_emit_notice(&rollup_, &payload, &index);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_emit_notice", rc).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return Napi::BigInt::New(env, index);
}

Napi::Value Rollup::EmitReport(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *payload_data = nullptr;
    size_t payload_length = 0;
    if (!get_bytes(env, info[0], "payload", &payload_data, &payload_length)) {
        return env.Undefined();
    }
    const cmt_abi_bytes_t payload{payload_length, const_cast<uint8_t *>(payload_data)};
    int rc = cmt_rollup_emit_report(&rollup_, &payload);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_emit_report", rc).ThrowAsJavaScriptException();
    }
    return env.Undefined();
}

Napi::Value Rollup::EmitException(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *payload_data = nullptr;
    size_t payload_length = 0;
    if (!get_bytes(env, info[0], "payload", &payload_data, &payload_length)) {
        return env.Undefined();
    }
    const cmt_abi_bytes_t payload{payload_length, const_cast<uint8_t *>(payload_data)};
    int rc = cmt_rollup_emit_exception(&rollup_, &payload);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_emit_exception", rc).ThrowAsJavaScriptException();
    }
    return env.Undefined();
}

Napi::Value Rollup::Progress(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "progress must be a number").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    int rc = cmt_rollup_progress(&rollup_, info[0].As<Napi::Number>().Uint32Value());
    if (rc < 0) {
        errno_error(env, "cmt_rollup_progress", rc).ThrowAsJavaScriptException();
    }
    return env.Undefined();
}

Napi::Value Rollup::Gio(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "domain must be a number").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    uint32_t domain = info[0].As<Napi::Number>().Uint32Value();
    if (domain > UINT16_MAX) {
        Napi::RangeError::New(env, "domain must fit in 16 bits").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    const uint8_t *id_data = nullptr;
    size_t id_length = 0;
    if (!get_bytes(env, info[1], "id", &id_data, &id_length)) {
        return env.Undefined();
    }
    cmt_gio_t request{};
    request.domain = static_cast<uint16_t>(domain);
    request.id = const_cast<uint8_t *>(id_data);
    request.id_length = static_cast<uint32_t>(id_length);
    int rc = cmt_gio_request(&rollup_, &request);
    if (rc < 0) {
        errno_error(env, "cmt_gio_request", rc).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Object response = Napi::Object::New(env);
    response.Set("responseCode", Napi::Number::New(env, request.response_code));
    response.Set("responseData",
        Napi::Buffer<uint8_t>::Copy(env, static_cast<const uint8_t *>(request.response_data),
            request.response_data_length));
    return response;
}

Napi::Value Rollup::LoadMerkle(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "path must be a string").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    std::string path = info[0].As<Napi::String>().Utf8Value();
    int rc = cmt_rollup_load_merkle(&rollup_, path.c_str());
    if (rc < 0) {
        errno_error(env, "cmt_rollup_load_merkle", rc).ThrowAsJavaScriptException();
    }
    return env.Undefined();
}

Napi::Value Rollup::SaveMerkle(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "path must be a string").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    std::string path = info[0].As<Napi::String>().Utf8Value();
    int rc = cmt_rollup_save_merkle(&rollup_, path.c_str());
    if (rc < 0) {
        errno_error(env, "cmt_rollup_save_merkle", rc).ThrowAsJavaScriptException();
    }
    return env.Undefined();
}

Napi::Value Rollup::ResetMerkle(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    cmt_rollup_reset_merkle(&rollup_);
    return env.Undefined();
}

Napi::Value Rollup::Close(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (open_) {
        cmt_rollup_fini(&rollup_);
        open_ = false;
    }
    return env.Undefined();
}

Napi::Object Rollup::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Rollup",
        {
            InstanceMethod<&Rollup::Finish>("finish"),
            InstanceMethod<&Rollup::EmitVoucher>("emitVoucher"),
            InstanceMethod<&Rollup::EmitDelegateCallVoucher>("emitDelegateCallVoucher"),
            InstanceMethod<&Rollup::EmitNotice>("emitNotice"),
            InstanceMethod<&Rollup::EmitReport>("emitReport"),
            InstanceMethod<&Rollup::EmitException>("emitException"),
            InstanceMethod<&Rollup::Progress>("progress"),
            InstanceMethod<&Rollup::Gio>("gio"),
            InstanceMethod<&Rollup::LoadMerkle>("loadMerkle"),
            InstanceMethod<&Rollup::SaveMerkle>("saveMerkle"),
            InstanceMethod<&Rollup::ResetMerkle>("resetMerkle"),
            InstanceMethod<&Rollup::Close>("close"),
        });
    exports.Set("Rollup", func);
    return exports;
}

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return Rollup::Init(env, exports);
}

} // namespace

NODE_API_MODULE(libcmt, InitModule)
