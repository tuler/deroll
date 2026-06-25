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

// The whole API is synchronous on purpose: calls that "block" (waitForInput)
// yield the machine, which pauses the entire guest — including the Node.js
// event loop — so there is nothing to run concurrently while they wait.
//
// This is a thin, faithful wrapper over the libcmt v2 rollup API: it exposes
// the raw I/O primitives (emit_output/report/exception, wait_for_input) only.
// All EVM-ABI encoding/decoding of inputs and outputs lives in the JS layer
// (lib/index.js), mirroring how libcmt split the rollup and codec modules.

#include <cerrno>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>

#include <napi.h>

extern "C" {
#include <libcmt/buf.h>
#include <libcmt/merkle.h>
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
bool get_bytes(Napi::Env env, const Napi::Value &value, const char *name, const uint8_t **data, size_t *length) {
    if (!value.IsTypedArray() || value.As<Napi::TypedArray>().TypedArrayType() != napi_uint8_array) {
        Napi::TypeError::New(env, std::string(name) + " must be a Buffer or Uint8Array").ThrowAsJavaScriptException();
        return false;
    }
    Napi::Uint8Array array = value.As<Napi::Uint8Array>();
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

    Napi::Value WaitForInput(const Napi::CallbackInfo &info);
    Napi::Value EmitOutput(const Napi::CallbackInfo &info);
    Napi::Value EmitReport(const Napi::CallbackInfo &info);
    Napi::Value EmitException(const Napi::CallbackInfo &info);
    Napi::Value Progress(const Napi::CallbackInfo &info);
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

// Accept (or reject) the previous request and wait for the next one. Returns
// the raw input buffer and its kind; the JS layer decodes advance metadata.
Napi::Value Rollup::WaitForInput(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    bool accept = true;
    if (info.Length() >= 1) {
        if (!info[0].IsBoolean()) {
            Napi::TypeError::New(env, "accept must be a boolean").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        accept = info[0].As<Napi::Boolean>().Value();
    }
    cmt_buf_t out{};
    long rc = cmt_rollup_wait_for_input(&rollup_, accept, &out);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_wait_for_input", static_cast<int>(rc)).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    const char *type = nullptr;
    if (rc == CMT_ROLLUP_REQ_TYPE_ADVANCE) {
        type = "advance";
    } else if (rc == CMT_ROLLUP_REQ_TYPE_INSPECT) {
        type = "inspect";
    } else {
        Napi::Error::New(env, "cmt_rollup_wait_for_input returned an unknown request type")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Object request = Napi::Object::New(env);
    request.Set("type", Napi::String::New(env, type));
    request.Set("payload", Napi::Buffer<uint8_t>::Copy(env, out.begin, cmt_buf_length(&out)));
    return request;
}

// Emit a raw output, added to the outputs merkle tree. Returns its index (the
// tree leaf count before the push).
Napi::Value Rollup::EmitOutput(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *data = nullptr;
    size_t length = 0;
    if (!get_bytes(env, info[0], "payload", &data, &length)) {
        return env.Undefined();
    }
    uint64_t index = cmt_merkle_get_leaf_count(cmt_rollup_get_merkle(&rollup_));
    int rc = cmt_rollup_emit_output(&rollup_, length, data);
    if (rc < 0) {
        errno_error(env, "cmt_rollup_emit_output", rc).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return Napi::BigInt::New(env, index);
}

Napi::Value Rollup::EmitReport(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!usable(env)) {
        return env.Undefined();
    }
    const uint8_t *data = nullptr;
    size_t length = 0;
    if (!get_bytes(env, info[0], "payload", &data, &length)) {
        return env.Undefined();
    }
    int rc = cmt_rollup_emit_report(&rollup_, length, data);
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
    const uint8_t *data = nullptr;
    size_t length = 0;
    if (!get_bytes(env, info[0], "payload", &data, &length)) {
        return env.Undefined();
    }
    int rc = cmt_rollup_emit_exception(&rollup_, length, data);
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
            InstanceMethod<&Rollup::WaitForInput>("waitForInput"),
            InstanceMethod<&Rollup::EmitOutput>("emitOutput"),
            InstanceMethod<&Rollup::EmitReport>("emitReport"),
            InstanceMethod<&Rollup::EmitException>("emitException"),
            InstanceMethod<&Rollup::Progress>("progress"),
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
