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

// N-API binding for the Cartesi Machine emulator C API (cm.h and
// cm-jsonrpc.h), compiled together with libcartesi from the
// machine-emulator submodule.
//
// The whole API is synchronous on purpose: the TypeScript layer drives the
// machine in a blocking loop (run/receiveCmioRequest/sendCmioResponse), and
// callers that need concurrency use the forked JSON-RPC remote machine.
//
// Conventions:
// - uint64_t values cross the boundary as BigInt (Number is also accepted on
//   the way in, when integral and within Number.MAX_SAFE_INTEGER).
// - Machine/runtime configs, proofs, access logs and memory-range lists cross
//   as JSON strings; (de)serialization stays in the TypeScript layer.
// - Byte blobs cross as Buffer/Uint8Array.
// - A failed C call throws an Error carrying `code` (the cm_error value) and
//   `description` (cm_get_last_error_message()).

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

#ifndef _WIN32
#include <fcntl.h>
#endif

#include <napi.h>

extern "C" {
#include "cm-jsonrpc.h"
#include "cm.h"
}

namespace {

// The cmio rx/tx buffers are 2^21 bytes long (CM_AR_CMIO_RX_BUFFER_LOG2_SIZE)
constexpr size_t CMIO_BUFFER_SIZE = static_cast<size_t>(CM_AR_CMIO_RX_BUFFER_LENGTH);

void throw_machine_error(Napi::Env env, cm_error code) {
    const char *description = cm_get_last_error_message();
    std::string message = "Cartesi Machine Error: ";
    message += description;
    message += " (code: " + std::to_string(code) + ")";
    Napi::Error err = Napi::Error::New(env, message);
    err.Set("code", Napi::Number::New(env, code));
    err.Set("description", Napi::String::New(env, description));
    err.ThrowAsJavaScriptException();
}

// Extracts a uint64_t from a BigInt (any-precision bits are rejected) or an
// integral Number argument.
bool get_u64(Napi::Env env, const Napi::Value &value, const char *name, uint64_t *out) {
    if (value.IsBigInt()) {
        bool lossless = false;
        *out = value.As<Napi::BigInt>().Uint64Value(&lossless);
        if (!lossless) {
            Napi::RangeError::New(env, std::string(name) + " does not fit in a uint64").ThrowAsJavaScriptException();
            return false;
        }
        return true;
    }
    if (value.IsNumber()) {
        double d = value.As<Napi::Number>().DoubleValue();
        if (d < 0 || d > 9007199254740991.0 || d != static_cast<double>(static_cast<uint64_t>(d))) {
            Napi::RangeError::New(env, std::string(name) + " must be a non-negative safe integer")
                .ThrowAsJavaScriptException();
            return false;
        }
        *out = static_cast<uint64_t>(d);
        return true;
    }
    Napi::TypeError::New(env, std::string(name) + " must be a BigInt or Number").ThrowAsJavaScriptException();
    return false;
}

bool get_i64(Napi::Env env, const Napi::Value &value, const char *name, int64_t *out) {
    if (value.IsBigInt()) {
        bool lossless = false;
        *out = value.As<Napi::BigInt>().Int64Value(&lossless);
        if (!lossless) {
            Napi::RangeError::New(env, std::string(name) + " does not fit in an int64").ThrowAsJavaScriptException();
            return false;
        }
        return true;
    }
    if (value.IsNumber()) {
        *out = value.As<Napi::Number>().Int64Value();
        return true;
    }
    Napi::TypeError::New(env, std::string(name) + " must be a BigInt or Number").ThrowAsJavaScriptException();
    return false;
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

// A 32-byte hash argument, viewed as the cm_hash array pointer the C API wants.
bool get_hash(Napi::Env env, const Napi::Value &value, const char *name, const cm_hash **hash) {
    const uint8_t *data = nullptr;
    size_t length = 0;
    if (!get_bytes(env, value, name, &data, &length, CM_HASH_SIZE)) {
        return false;
    }
    *hash = reinterpret_cast<const cm_hash *>(data);
    return true;
}

// An optional 32-byte hash argument (null/undefined become "absent").
bool get_optional_hash(Napi::Env env, const Napi::Value &value, const char *name, const cm_hash **hash) {
    if (value.IsUndefined() || value.IsNull()) {
        *hash = nullptr;
        return true;
    }
    return get_hash(env, value, name, hash);
}

// A required UTF-8 string argument, copied into out.
bool get_string(Napi::Env env, const Napi::Value &value, const char *name, std::string *out) {
    if (!value.IsString()) {
        Napi::TypeError::New(env, std::string(name) + " must be a string").ThrowAsJavaScriptException();
        return false;
    }
    *out = value.As<Napi::String>().Utf8Value();
    return true;
}

// An optional UTF-8 string argument (null/undefined become "absent").
bool get_optional_string(Napi::Env env, const Napi::Value &value, const char *name, std::string *out, bool *present) {
    if (value.IsUndefined() || value.IsNull()) {
        *present = false;
        return true;
    }
    *present = true;
    return get_string(env, value, name, out);
}

// Access log type flags, matching the koffi binding's AccessLogTypeEnum.
bool get_i32(Napi::Env env, const Napi::Value &value, const char *name, int32_t *out) {
    if (!value.IsNumber()) {
        Napi::TypeError::New(env, std::string(name) + " must be a number").ThrowAsJavaScriptException();
        return false;
    }
    *out = value.As<Napi::Number>().Int32Value();
    return true;
}

class Machine final : public Napi::ObjectWrap<Machine> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    static Napi::Object NewInstance(Napi::Env env, cm_machine *m);
    explicit Machine(const Napi::CallbackInfo &info);
    ~Machine() override;

    Machine(const Machine &) = delete;
    Machine &operator=(const Machine &) = delete;
    Machine(Machine &&) = delete;
    Machine &operator=(Machine &&) = delete;

    cm_machine *handle() const {
        return machine_;
    }

private:
    // cm.h
    Napi::Value IsEmpty(const Napi::CallbackInfo &info);
    Napi::Value IsJsonrpcMachine(const Napi::CallbackInfo &info);
    Napi::Value Create(const Napi::CallbackInfo &info);
    Napi::Value Load(const Napi::CallbackInfo &info);
    Napi::Value CloneEmpty(const Napi::CallbackInfo &info);
    Napi::Value Store(const Napi::CallbackInfo &info);
    Napi::Value Destroy(const Napi::CallbackInfo &info);
    Napi::Value GetDefaultConfig(const Napi::CallbackInfo &info);
    Napi::Value GetRegAddress(const Napi::CallbackInfo &info);
    Napi::Value SetRuntimeConfig(const Napi::CallbackInfo &info);
    Napi::Value GetRuntimeConfig(const Napi::CallbackInfo &info);
    Napi::Value ReplaceMemoryRange(const Napi::CallbackInfo &info);
    Napi::Value GetInitialConfig(const Napi::CallbackInfo &info);
    Napi::Value GetAddressRanges(const Napi::CallbackInfo &info);
    Napi::Value GetRootHash(const Napi::CallbackInfo &info);
    Napi::Value ReadRevertRootHash(const Napi::CallbackInfo &info);
    Napi::Value WriteRevertRootHash(const Napi::CallbackInfo &info);
    Napi::Value GetAddressName(const Napi::CallbackInfo &info);
    Napi::Value GetProof(const Napi::CallbackInfo &info);
    Napi::Value ReadWord(const Napi::CallbackInfo &info);
    Napi::Value ReadReg(const Napi::CallbackInfo &info);
    Napi::Value WriteReg(const Napi::CallbackInfo &info);
    Napi::Value ReadMemory(const Napi::CallbackInfo &info);
    Napi::Value WriteMemory(const Napi::CallbackInfo &info);
    Napi::Value ReadVirtualMemory(const Napi::CallbackInfo &info);
    Napi::Value WriteVirtualMemory(const Napi::CallbackInfo &info);
    Napi::Value TranslateVirtualAddress(const Napi::CallbackInfo &info);
    Napi::Value Run(const Napi::CallbackInfo &info);
    Napi::Value RunUarch(const Napi::CallbackInfo &info);
    Napi::Value ResetUarch(const Napi::CallbackInfo &info);
    Napi::Value ReceiveCmioRequest(const Napi::CallbackInfo &info);
    Napi::Value SendCmioResponse(const Napi::CallbackInfo &info);
    Napi::Value LogStep(const Napi::CallbackInfo &info);
    Napi::Value LogStepUarch(const Napi::CallbackInfo &info);
    Napi::Value LogResetUarch(const Napi::CallbackInfo &info);
    Napi::Value LogSendCmioResponse(const Napi::CallbackInfo &info);
    Napi::Value VerifyStepUarch(const Napi::CallbackInfo &info);
    Napi::Value VerifyResetUarch(const Napi::CallbackInfo &info);
    Napi::Value VerifySendCmioResponse(const Napi::CallbackInfo &info);
    Napi::Value VerifyHashTree(const Napi::CallbackInfo &info);
    Napi::Value GetHashTreeStats(const Napi::CallbackInfo &info);
    Napi::Value WriteWord(const Napi::CallbackInfo &info);
    Napi::Value GetNodeHash(const Napi::CallbackInfo &info);
    Napi::Value CloneStored(const Napi::CallbackInfo &info);
    Napi::Value RenameStored(const Napi::CallbackInfo &info);
    Napi::Value RemoveStored(const Napi::CallbackInfo &info);
    Napi::Value SyncStored(const Napi::CallbackInfo &info);
    // cm-jsonrpc.h
    Napi::Value JsonrpcFork(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcShutdownServer(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcRebindServer(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcGetServerVersion(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcEmancipateServer(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcSetTimeout(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcGetTimeout(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcSetCleanupCall(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcGetCleanupCall(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcGetServerAddress(const Napi::CallbackInfo &info);
    Napi::Value JsonrpcDelayNextRequest(const Napi::CallbackInfo &info);

    cm_machine *machine_ = nullptr;
};

Machine::Machine(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Machine>(info) {
    Napi::Env env = info.Env();
    if (info.Length() != 1 || !info[0].IsExternal()) {
        Napi::TypeError::New(env, "Machine cannot be constructed directly; use the factory functions")
            .ThrowAsJavaScriptException();
        return;
    }
    machine_ = info[0].As<Napi::External<cm_machine>>().Data();
}

Machine::~Machine() {
    if (machine_ != nullptr) {
        cm_delete(machine_);
        machine_ = nullptr;
    }
}

Napi::Object Machine::NewInstance(Napi::Env env, cm_machine *m) {
    Napi::FunctionReference *ctor = env.GetInstanceData<Napi::FunctionReference>();
    return ctor->New({Napi::External<cm_machine>::New(env, m)});
}

// Calls a C API function and throws if it failed. Must be used in functions
// returning Napi::Value.
#define CHECK_CM(env, call)                                                                                            \
    do {                                                                                                               \
        cm_error rc__ = (call);                                                                                        \
        if (rc__ != CM_ERROR_OK) {                                                                                     \
            throw_machine_error((env), rc__);                                                                          \
            return (env).Undefined();                                                                                  \
        }                                                                                                              \
    } while (0)

Napi::Value Machine::IsEmpty(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    bool yes = false;
    CHECK_CM(env, cm_is_empty(machine_, &yes));
    return Napi::Boolean::New(env, yes);
}

Napi::Value Machine::IsJsonrpcMachine(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    bool yes = false;
    CHECK_CM(env, cm_is_jsonrpc_machine(machine_, &yes));
    return Napi::Boolean::New(env, yes);
}

Napi::Value Machine::Create(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string config;
    std::string runtime_config;
    bool has_runtime_config = false;
    std::string dir;
    bool has_dir = false;
    if (!get_string(env, info[0], "config", &config) ||
        !get_optional_string(env, info[1], "runtimeConfig", &runtime_config, &has_runtime_config) ||
        !get_optional_string(env, info[2], "dir", &dir, &has_dir)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_create(machine_, config.c_str(), has_runtime_config ? runtime_config.c_str() : nullptr,
                      has_dir ? dir.c_str() : nullptr));
    return env.Undefined();
}

Napi::Value Machine::Load(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string dir;
    std::string runtime_config;
    bool has_runtime_config = false;
    int32_t sharing = CM_SHARING_NONE;
    if (!get_string(env, info[0], "dir", &dir) ||
        !get_optional_string(env, info[1], "runtimeConfig", &runtime_config, &has_runtime_config) ||
        (!info[2].IsUndefined() && !get_i32(env, info[2], "sharing", &sharing))) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_load(machine_, dir.c_str(), has_runtime_config ? runtime_config.c_str() : nullptr,
                      static_cast<cm_sharing_mode>(sharing)));
    return env.Undefined();
}

Napi::Value Machine::CloneEmpty(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    cm_machine *new_m = nullptr;
    CHECK_CM(env, cm_clone_empty(machine_, &new_m));
    return NewInstance(env, new_m);
}

Napi::Value Machine::Store(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string dir;
    int32_t sharing = CM_SHARING_ALL;
    if (!get_string(env, info[0], "dir", &dir) ||
        (!info[1].IsUndefined() && !get_i32(env, info[1], "sharing", &sharing))) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_store(machine_, dir.c_str(), static_cast<cm_sharing_mode>(sharing)));
    return env.Undefined();
}

Napi::Value Machine::Destroy(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    CHECK_CM(env, cm_destroy(machine_));
    return env.Undefined();
}

Napi::Value Machine::GetDefaultConfig(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *config = nullptr;
    CHECK_CM(env, cm_get_default_config(machine_, &config));
    return Napi::String::New(env, config);
}

Napi::Value Machine::GetRegAddress(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t reg = 0;
    if (!get_i32(env, info[0], "reg", &reg)) {
        return env.Undefined();
    }
    uint64_t val = 0;
    CHECK_CM(env, cm_get_reg_address(machine_, static_cast<cm_reg>(reg), &val));
    return Napi::BigInt::New(env, val);
}

Napi::Value Machine::SetRuntimeConfig(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string runtime_config;
    if (!get_string(env, info[0], "runtimeConfig", &runtime_config)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_set_runtime_config(machine_, runtime_config.c_str()));
    return env.Undefined();
}

Napi::Value Machine::GetRuntimeConfig(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *runtime_config = nullptr;
    CHECK_CM(env, cm_get_runtime_config(machine_, &runtime_config));
    return Napi::String::New(env, runtime_config);
}

Napi::Value Machine::ReplaceMemoryRange(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string range_config;
    if (!get_string(env, info[0], "rangeConfig", &range_config)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_replace_memory_range(machine_, range_config.c_str()));
    return env.Undefined();
}

Napi::Value Machine::GetInitialConfig(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *config = nullptr;
    CHECK_CM(env, cm_get_initial_config(machine_, &config));
    return Napi::String::New(env, config);
}

Napi::Value Machine::GetAddressRanges(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *ranges = nullptr;
    CHECK_CM(env, cm_get_address_ranges(machine_, &ranges));
    return Napi::String::New(env, ranges);
}

Napi::Value Machine::GetRootHash(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    cm_hash hash{};
    CHECK_CM(env, cm_get_root_hash(machine_, &hash));
    return Napi::Buffer<uint8_t>::Copy(env, hash, CM_HASH_SIZE);
}

Napi::Value Machine::ReadRevertRootHash(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    cm_hash hash{};
    CHECK_CM(env, cm_read_revert_root_hash(machine_, &hash));
    return Napi::Buffer<uint8_t>::Copy(env, hash, CM_HASH_SIZE);
}

Napi::Value Machine::WriteRevertRootHash(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const cm_hash *hash = nullptr;
    if (!get_hash(env, info[0], "hash", &hash)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_write_revert_root_hash(machine_, hash));
    return env.Undefined();
}

Napi::Value Machine::GetAddressName(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t paddr = 0;
    if (!get_u64(env, info[0], "paddr", &paddr)) {
        return env.Undefined();
    }
    const char *name = nullptr;
    CHECK_CM(env, cm_get_address_name(machine_, paddr, &name));
    return Napi::String::New(env, name);
}

Napi::Value Machine::GetProof(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    int32_t log2_size = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_i32(env, info[1], "log2Size", &log2_size)) {
        return env.Undefined();
    }
    int32_t log2_root_size = CM_HASH_TREE_LOG2_ROOT_SIZE;
    if (!info[2].IsUndefined() && !get_i32(env, info[2], "log2RootSize", &log2_root_size)) {
        return env.Undefined();
    }
    const char *proof = nullptr;
    CHECK_CM(env, cm_get_proof(machine_, address, log2_size, log2_root_size, &proof));
    return Napi::String::New(env, proof);
}

Napi::Value Machine::ReadWord(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    if (!get_u64(env, info[0], "address", &address)) {
        return env.Undefined();
    }
    uint64_t val = 0;
    CHECK_CM(env, cm_read_word(machine_, address, &val));
    return Napi::BigInt::New(env, val);
}

Napi::Value Machine::ReadReg(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t reg = 0;
    if (!get_i32(env, info[0], "reg", &reg)) {
        return env.Undefined();
    }
    uint64_t val = 0;
    CHECK_CM(env, cm_read_reg(machine_, static_cast<cm_reg>(reg), &val));
    return Napi::BigInt::New(env, val);
}

Napi::Value Machine::WriteReg(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t reg = 0;
    uint64_t val = 0;
    if (!get_i32(env, info[0], "reg", &reg) || !get_u64(env, info[1], "value", &val)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_write_reg(machine_, static_cast<cm_reg>(reg), val));
    return env.Undefined();
}

Napi::Value Machine::ReadMemory(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    uint64_t length = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_u64(env, info[1], "length", &length)) {
        return env.Undefined();
    }
    if (length > SIZE_MAX) {
        Napi::RangeError::New(env, "length is too large").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Buffer<uint8_t> data = Napi::Buffer<uint8_t>::New(env, static_cast<size_t>(length));
    CHECK_CM(env, cm_read_memory(machine_, address, data.Data(), length));
    return data;
}

Napi::Value Machine::WriteMemory(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    const uint8_t *data = nullptr;
    size_t length = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_bytes(env, info[1], "data", &data, &length)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_write_memory(machine_, address, data, length));
    return env.Undefined();
}

Napi::Value Machine::ReadVirtualMemory(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    uint64_t length = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_u64(env, info[1], "length", &length)) {
        return env.Undefined();
    }
    if (length > SIZE_MAX) {
        Napi::RangeError::New(env, "length is too large").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Buffer<uint8_t> data = Napi::Buffer<uint8_t>::New(env, static_cast<size_t>(length));
    CHECK_CM(env, cm_read_virtual_memory(machine_, address, data.Data(), length));
    return data;
}

Napi::Value Machine::WriteVirtualMemory(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    const uint8_t *data = nullptr;
    size_t length = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_bytes(env, info[1], "data", &data, &length)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_write_virtual_memory(machine_, address, data, length));
    return env.Undefined();
}

Napi::Value Machine::TranslateVirtualAddress(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t vaddr = 0;
    if (!get_u64(env, info[0], "vaddr", &vaddr)) {
        return env.Undefined();
    }
    uint64_t paddr = 0;
    CHECK_CM(env, cm_translate_virtual_address(machine_, vaddr, &paddr));
    return Napi::BigInt::New(env, paddr);
}

Napi::Value Machine::Run(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t mcycle_end = 0;
    if (!get_u64(env, info[0], "mcycleEnd", &mcycle_end)) {
        return env.Undefined();
    }
    cm_break_reason break_reason = CM_BREAK_REASON_FAILED;
    CHECK_CM(env, cm_run(machine_, mcycle_end, &break_reason));
    return Napi::Number::New(env, break_reason);
}

Napi::Value Machine::RunUarch(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t uarch_cycle_end = 0;
    if (!get_u64(env, info[0], "uarchCycleEnd", &uarch_cycle_end)) {
        return env.Undefined();
    }
    cm_uarch_break_reason break_reason = CM_UARCH_BREAK_REASON_FAILED;
    CHECK_CM(env, cm_run_uarch(machine_, uarch_cycle_end, &break_reason));
    return Napi::Number::New(env, break_reason);
}

Napi::Value Machine::ResetUarch(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    CHECK_CM(env, cm_reset_uarch(machine_));
    return env.Undefined();
}

Napi::Value Machine::ReceiveCmioRequest(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint8_t cmd = 0;
    uint16_t reason = 0;
    std::vector<uint8_t> data(CMIO_BUFFER_SIZE);
    uint64_t length = data.size();
    CHECK_CM(env, cm_receive_cmio_request(machine_, &cmd, &reason, data.data(), &length));
    Napi::Object result = Napi::Object::New(env);
    result.Set("cmd", Napi::Number::New(env, cmd));
    result.Set("reason", Napi::Number::New(env, reason));
    result.Set("data", Napi::Buffer<uint8_t>::Copy(env, data.data(), static_cast<size_t>(length)));
    return result;
}

Napi::Value Machine::SendCmioResponse(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t reason = 0;
    const uint8_t *data = nullptr;
    size_t length = 0;
    const cm_hash *revert_root_hash = nullptr;
    if (!get_i32(env, info[0], "reason", &reason) || !get_bytes(env, info[1], "data", &data, &length) ||
        !get_optional_hash(env, info[2], "revertRootHash", &revert_root_hash)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_send_cmio_response(machine_, static_cast<uint16_t>(reason), data, length, revert_root_hash));
    return env.Undefined();
}

Napi::Value Machine::LogStep(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t mcycle_count = 0;
    std::string log_filename;
    if (!get_u64(env, info[0], "mcycleCount", &mcycle_count) || !get_string(env, info[1], "logFilename", &log_filename)) {
        return env.Undefined();
    }
    cm_break_reason break_reason = CM_BREAK_REASON_FAILED;
    CHECK_CM(env, cm_log_step(machine_, mcycle_count, log_filename.c_str(), &break_reason));
    return Napi::Number::New(env, break_reason);
}

Napi::Value Machine::LogStepUarch(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t log_type = 0;
    if (!get_i32(env, info[0], "logType", &log_type)) {
        return env.Undefined();
    }
    const char *log = nullptr;
    CHECK_CM(env, cm_log_step_uarch(machine_, log_type, &log));
    return Napi::String::New(env, log);
}

Napi::Value Machine::LogResetUarch(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t log_type = 0;
    if (!get_i32(env, info[0], "logType", &log_type)) {
        return env.Undefined();
    }
    const char *log = nullptr;
    CHECK_CM(env, cm_log_reset_uarch(machine_, log_type, &log));
    return Napi::String::New(env, log);
}

Napi::Value Machine::LogSendCmioResponse(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t reason = 0;
    const uint8_t *data = nullptr;
    size_t length = 0;
    const cm_hash *revert_root_hash = nullptr;
    int32_t log_type = 0;
    if (!get_i32(env, info[0], "reason", &reason) || !get_bytes(env, info[1], "data", &data, &length) ||
        !get_hash(env, info[2], "revertRootHash", &revert_root_hash) || !get_i32(env, info[3], "logType", &log_type)) {
        return env.Undefined();
    }
    const char *log = nullptr;
    CHECK_CM(env, cm_log_send_cmio_response(machine_, static_cast<uint16_t>(reason), data, length, revert_root_hash,
                      log_type, &log));
    return Napi::String::New(env, log);
}

// Shared implementation for the instance methods and the module-level
// functions (which pass m == nullptr).
// The verify functions return the root hash obtained after the operation,
// for the caller to check.
Napi::Value verify_step(Napi::Env env, const Napi::CallbackInfo &info, size_t base) {
    const cm_hash *root_hash_before = nullptr;
    std::string log_filename;
    uint64_t mcycle_count = 0;
    if (!get_hash(env, info[base + 0], "rootHashBefore", &root_hash_before) ||
        !get_string(env, info[base + 1], "logFilename", &log_filename) ||
        !get_u64(env, info[base + 2], "mcycleCount", &mcycle_count)) {
        return env.Undefined();
    }
    cm_hash obtained_root_hash{};
    CHECK_CM(env, cm_verify_step(root_hash_before, log_filename.c_str(), mcycle_count, &obtained_root_hash));
    return Napi::Buffer<uint8_t>::Copy(env, obtained_root_hash, CM_HASH_SIZE);
}

Napi::Value verify_step_uarch(Napi::Env env, cm_machine *m, const Napi::CallbackInfo &info, size_t base) {
    const cm_hash *root_hash_before = nullptr;
    std::string log;
    if (!get_hash(env, info[base + 0], "rootHashBefore", &root_hash_before) ||
        !get_string(env, info[base + 1], "log", &log)) {
        return env.Undefined();
    }
    cm_hash obtained_root_hash{};
    CHECK_CM(env, cm_verify_step_uarch(m, root_hash_before, log.c_str(), &obtained_root_hash));
    return Napi::Buffer<uint8_t>::Copy(env, obtained_root_hash, CM_HASH_SIZE);
}

Napi::Value verify_reset_uarch(Napi::Env env, cm_machine *m, const Napi::CallbackInfo &info, size_t base) {
    const cm_hash *root_hash_before = nullptr;
    std::string log;
    if (!get_hash(env, info[base + 0], "rootHashBefore", &root_hash_before) ||
        !get_string(env, info[base + 1], "log", &log)) {
        return env.Undefined();
    }
    cm_hash obtained_root_hash{};
    CHECK_CM(env, cm_verify_reset_uarch(m, root_hash_before, log.c_str(), &obtained_root_hash));
    return Napi::Buffer<uint8_t>::Copy(env, obtained_root_hash, CM_HASH_SIZE);
}

Napi::Value verify_send_cmio_response(Napi::Env env, cm_machine *m, const Napi::CallbackInfo &info, size_t base) {
    int32_t reason = 0;
    const uint8_t *data = nullptr;
    size_t length = 0;
    const cm_hash *root_hash_before = nullptr;
    std::string log;
    const cm_hash *revert_root_hash = nullptr;
    if (!get_i32(env, info[base + 0], "reason", &reason) || !get_bytes(env, info[base + 1], "data", &data, &length) ||
        !get_hash(env, info[base + 2], "rootHashBefore", &root_hash_before) ||
        !get_string(env, info[base + 3], "log", &log) ||
        !get_hash(env, info[base + 4], "revertRootHash", &revert_root_hash)) {
        return env.Undefined();
    }
    cm_hash obtained_root_hash{};
    CHECK_CM(env, cm_verify_send_cmio_response(m, static_cast<uint16_t>(reason), data, length, root_hash_before,
                      log.c_str(), revert_root_hash, &obtained_root_hash));
    return Napi::Buffer<uint8_t>::Copy(env, obtained_root_hash, CM_HASH_SIZE);
}

Napi::Value Machine::VerifyStepUarch(const Napi::CallbackInfo &info) {
    return verify_step_uarch(info.Env(), machine_, info, 0);
}

Napi::Value Machine::VerifyResetUarch(const Napi::CallbackInfo &info) {
    return verify_reset_uarch(info.Env(), machine_, info, 0);
}

Napi::Value Machine::VerifySendCmioResponse(const Napi::CallbackInfo &info) {
    return verify_send_cmio_response(info.Env(), machine_, info, 0);
}

Napi::Value Machine::VerifyHashTree(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    bool result = false;
    CHECK_CM(env, cm_verify_hash_tree(machine_, &result));
    return Napi::Boolean::New(env, result);
}

Napi::Value Machine::GetHashTreeStats(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    bool clear = info[0].IsBoolean() ? info[0].As<Napi::Boolean>().Value() : false;
    const char *stats = nullptr;
    CHECK_CM(env, cm_get_hash_tree_stats(machine_, clear, &stats));
    return Napi::String::New(env, stats);
}

Napi::Value Machine::WriteWord(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    uint64_t val = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_u64(env, info[1], "value", &val)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_write_word(machine_, address, val));
    return env.Undefined();
}

Napi::Value Machine::GetNodeHash(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t address = 0;
    int32_t log2_size = 0;
    if (!get_u64(env, info[0], "address", &address) || !get_i32(env, info[1], "log2Size", &log2_size)) {
        return env.Undefined();
    }
    cm_hash hash{};
    CHECK_CM(env, cm_get_node_hash(machine_, address, log2_size, &hash));
    return Napi::Buffer<uint8_t>::Copy(env, hash, CM_HASH_SIZE);
}

Napi::Value Machine::CloneStored(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string from_dir;
    std::string to_dir;
    if (!get_string(env, info[0], "fromDir", &from_dir) || !get_string(env, info[1], "toDir", &to_dir)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_clone_stored(machine_, from_dir.c_str(), to_dir.c_str()));
    return env.Undefined();
}

Napi::Value Machine::RenameStored(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string from_dir;
    std::string to_dir;
    if (!get_string(env, info[0], "fromDir", &from_dir) || !get_string(env, info[1], "toDir", &to_dir)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_rename_stored(machine_, from_dir.c_str(), to_dir.c_str()));
    return env.Undefined();
}

Napi::Value Machine::RemoveStored(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string dir;
    if (!get_string(env, info[0], "dir", &dir)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_remove_stored(machine_, dir.c_str()));
    return env.Undefined();
}

Napi::Value Machine::SyncStored(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string dir;
    if (!get_string(env, info[0], "dir", &dir)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_sync_stored(machine_, dir.c_str()));
    return env.Undefined();
}

Napi::Value Machine::JsonrpcFork(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    cm_machine *forked_m = nullptr;
    const char *address = nullptr;
    uint32_t pid = 0;
    CHECK_CM(env, cm_jsonrpc_fork_server(machine_, &forked_m, &address, &pid));
    Napi::Object result = Napi::Object::New(env);
    result.Set("machine", NewInstance(env, forked_m));
    result.Set("address", Napi::String::New(env, address));
    result.Set("pid", Napi::Number::New(env, pid));
    return result;
}

Napi::Value Machine::JsonrpcShutdownServer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    CHECK_CM(env, cm_jsonrpc_shutdown_server(machine_));
    return env.Undefined();
}

Napi::Value Machine::JsonrpcRebindServer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string address;
    if (!get_string(env, info[0], "address", &address)) {
        return env.Undefined();
    }
    const char *address_bound = nullptr;
    CHECK_CM(env, cm_jsonrpc_rebind_server(machine_, address.c_str(), &address_bound));
    return Napi::String::New(env, address_bound);
}

Napi::Value Machine::JsonrpcGetServerVersion(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *version = nullptr;
    CHECK_CM(env, cm_jsonrpc_get_server_version(machine_, &version));
    return Napi::String::New(env, version);
}

Napi::Value Machine::JsonrpcEmancipateServer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    CHECK_CM(env, cm_jsonrpc_emancipate_server(machine_));
    return env.Undefined();
}

Napi::Value Machine::JsonrpcSetTimeout(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int64_t ms = 0;
    if (!get_i64(env, info[0], "ms", &ms)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_jsonrpc_set_timeout(machine_, ms));
    return env.Undefined();
}

Napi::Value Machine::JsonrpcGetTimeout(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int64_t ms = 0;
    CHECK_CM(env, cm_jsonrpc_get_timeout(machine_, &ms));
    return Napi::Number::New(env, static_cast<double>(ms));
}

Napi::Value Machine::JsonrpcSetCleanupCall(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t call = 0;
    if (!get_i32(env, info[0], "call", &call)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_jsonrpc_set_cleanup_call(machine_, static_cast<cm_jsonrpc_cleanup_call>(call)));
    return env.Undefined();
}

Napi::Value Machine::JsonrpcGetCleanupCall(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    cm_jsonrpc_cleanup_call call = CM_JSONRPC_NOTHING;
    CHECK_CM(env, cm_jsonrpc_get_cleanup_call(machine_, &call));
    return Napi::Number::New(env, call);
}

Napi::Value Machine::JsonrpcGetServerAddress(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *address = nullptr;
    CHECK_CM(env, cm_jsonrpc_get_server_address(machine_, &address));
    return Napi::String::New(env, address);
}

Napi::Value Machine::JsonrpcDelayNextRequest(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t ms = 0;
    if (!get_u64(env, info[0], "ms", &ms)) {
        return env.Undefined();
    }
    CHECK_CM(env, cm_jsonrpc_delay_next_request(machine_, ms));
    return env.Undefined();
}

Napi::Object Machine::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Machine",
        {
            InstanceMethod<&Machine::IsEmpty>("isEmpty"),
            InstanceMethod<&Machine::IsJsonrpcMachine>("isJsonrpcMachine"),
            InstanceMethod<&Machine::Create>("create"),
            InstanceMethod<&Machine::Load>("load"),
            InstanceMethod<&Machine::CloneEmpty>("cloneEmpty"),
            InstanceMethod<&Machine::Store>("store"),
            InstanceMethod<&Machine::Destroy>("destroy"),
            InstanceMethod<&Machine::GetDefaultConfig>("getDefaultConfig"),
            InstanceMethod<&Machine::GetRegAddress>("getRegAddress"),
            InstanceMethod<&Machine::SetRuntimeConfig>("setRuntimeConfig"),
            InstanceMethod<&Machine::GetRuntimeConfig>("getRuntimeConfig"),
            InstanceMethod<&Machine::ReplaceMemoryRange>("replaceMemoryRange"),
            InstanceMethod<&Machine::GetInitialConfig>("getInitialConfig"),
            InstanceMethod<&Machine::GetAddressRanges>("getAddressRanges"),
            InstanceMethod<&Machine::GetRootHash>("getRootHash"),
            InstanceMethod<&Machine::ReadRevertRootHash>("readRevertRootHash"),
            InstanceMethod<&Machine::WriteRevertRootHash>("writeRevertRootHash"),
            InstanceMethod<&Machine::GetAddressName>("getAddressName"),
            InstanceMethod<&Machine::GetProof>("getProof"),
            InstanceMethod<&Machine::ReadWord>("readWord"),
            InstanceMethod<&Machine::ReadReg>("readReg"),
            InstanceMethod<&Machine::WriteReg>("writeReg"),
            InstanceMethod<&Machine::ReadMemory>("readMemory"),
            InstanceMethod<&Machine::WriteMemory>("writeMemory"),
            InstanceMethod<&Machine::ReadVirtualMemory>("readVirtualMemory"),
            InstanceMethod<&Machine::WriteVirtualMemory>("writeVirtualMemory"),
            InstanceMethod<&Machine::TranslateVirtualAddress>("translateVirtualAddress"),
            InstanceMethod<&Machine::Run>("run"),
            InstanceMethod<&Machine::RunUarch>("runUarch"),
            InstanceMethod<&Machine::ResetUarch>("resetUarch"),
            InstanceMethod<&Machine::ReceiveCmioRequest>("receiveCmioRequest"),
            InstanceMethod<&Machine::SendCmioResponse>("sendCmioResponse"),
            InstanceMethod<&Machine::LogStep>("logStep"),
            InstanceMethod<&Machine::LogStepUarch>("logStepUarch"),
            InstanceMethod<&Machine::LogResetUarch>("logResetUarch"),
            InstanceMethod<&Machine::LogSendCmioResponse>("logSendCmioResponse"),
            InstanceMethod<&Machine::VerifyStepUarch>("verifyStepUarch"),
            InstanceMethod<&Machine::VerifyResetUarch>("verifyResetUarch"),
            InstanceMethod<&Machine::VerifySendCmioResponse>("verifySendCmioResponse"),
            InstanceMethod<&Machine::VerifyHashTree>("verifyHashTree"),
            InstanceMethod<&Machine::GetHashTreeStats>("getHashTreeStats"),
            InstanceMethod<&Machine::WriteWord>("writeWord"),
            InstanceMethod<&Machine::GetNodeHash>("getNodeHash"),
            InstanceMethod<&Machine::CloneStored>("cloneStored"),
            InstanceMethod<&Machine::RenameStored>("renameStored"),
            InstanceMethod<&Machine::RemoveStored>("removeStored"),
            InstanceMethod<&Machine::SyncStored>("syncStored"),
            InstanceMethod<&Machine::JsonrpcFork>("jsonrpcFork"),
            InstanceMethod<&Machine::JsonrpcShutdownServer>("jsonrpcShutdownServer"),
            InstanceMethod<&Machine::JsonrpcRebindServer>("jsonrpcRebindServer"),
            InstanceMethod<&Machine::JsonrpcGetServerVersion>("jsonrpcGetServerVersion"),
            InstanceMethod<&Machine::JsonrpcEmancipateServer>("jsonrpcEmancipateServer"),
            InstanceMethod<&Machine::JsonrpcSetTimeout>("jsonrpcSetTimeout"),
            InstanceMethod<&Machine::JsonrpcGetTimeout>("jsonrpcGetTimeout"),
            InstanceMethod<&Machine::JsonrpcSetCleanupCall>("jsonrpcSetCleanupCall"),
            InstanceMethod<&Machine::JsonrpcGetCleanupCall>("jsonrpcGetCleanupCall"),
            InstanceMethod<&Machine::JsonrpcGetServerAddress>("jsonrpcGetServerAddress"),
            InstanceMethod<&Machine::JsonrpcDelayNextRequest>("jsonrpcDelayNextRequest"),
        });
    auto *ctor = new Napi::FunctionReference();
    *ctor = Napi::Persistent(func);
    env.SetInstanceData(ctor);
    exports.Set("Machine", func);
    return exports;
}

// -----------------------------------------------------------------------------
// Module-level functions
// -----------------------------------------------------------------------------

Napi::Value GetLastErrorMessage(const Napi::CallbackInfo &info) {
    return Napi::String::New(info.Env(), cm_get_last_error_message());
}

Napi::Value GetVersion(const Napi::CallbackInfo &info) {
    return Napi::BigInt::New(info.Env(), cm_get_version());
}

Napi::Value MachineNew(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    cm_machine *new_m = nullptr;
    CHECK_CM(env, cm_new(&new_m));
    return Machine::NewInstance(env, new_m);
}

Napi::Value MachineCreateNew(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string config;
    std::string runtime_config;
    bool has_runtime_config = false;
    if (!get_string(env, info[0], "config", &config) ||
        !get_optional_string(env, info[1], "runtimeConfig", &runtime_config, &has_runtime_config)) {
        return env.Undefined();
    }
    std::string dir;
    bool has_dir = false;
    if (!get_optional_string(env, info[2], "dir", &dir, &has_dir)) {
        return env.Undefined();
    }
    cm_machine *new_m = nullptr;
    CHECK_CM(env, cm_create_new(config.c_str(), has_runtime_config ? runtime_config.c_str() : nullptr,
                      has_dir ? dir.c_str() : nullptr, &new_m));
    return Machine::NewInstance(env, new_m);
}

Napi::Value MachineLoadNew(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string dir;
    std::string runtime_config;
    bool has_runtime_config = false;
    if (!get_string(env, info[0], "dir", &dir) ||
        !get_optional_string(env, info[1], "runtimeConfig", &runtime_config, &has_runtime_config)) {
        return env.Undefined();
    }
    int32_t sharing = CM_SHARING_NONE;
    if (!info[2].IsUndefined() && !get_i32(env, info[2], "sharing", &sharing)) {
        return env.Undefined();
    }
    cm_machine *new_m = nullptr;
    CHECK_CM(env, cm_load_new(dir.c_str(), has_runtime_config ? runtime_config.c_str() : nullptr,
                      static_cast<cm_sharing_mode>(sharing), &new_m));
    return Machine::NewInstance(env, new_m);
}

Napi::Value GetDefaultConfig(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    const char *config = nullptr;
    CHECK_CM(env, cm_get_default_config(nullptr, &config));
    return Napi::String::New(env, config);
}

Napi::Value GetRegAddress(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int32_t reg = 0;
    if (!get_i32(env, info[0], "reg", &reg)) {
        return env.Undefined();
    }
    uint64_t val = 0;
    CHECK_CM(env, cm_get_reg_address(nullptr, static_cast<cm_reg>(reg), &val));
    return Napi::BigInt::New(env, val);
}

Napi::Value GetAddressName(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    uint64_t paddr = 0;
    if (!get_u64(env, info[0], "paddr", &paddr)) {
        return env.Undefined();
    }
    const char *name = nullptr;
    CHECK_CM(env, cm_get_address_name(nullptr, paddr, &name));
    return Napi::String::New(env, name);
}

Napi::Value VerifyStep(const Napi::CallbackInfo &info) {
    return verify_step(info.Env(), info, 0);
}

Napi::Value VerifyStepUarch(const Napi::CallbackInfo &info) {
    return verify_step_uarch(info.Env(), nullptr, info, 0);
}

Napi::Value VerifyResetUarch(const Napi::CallbackInfo &info) {
    return verify_reset_uarch(info.Env(), nullptr, info, 0);
}

Napi::Value VerifySendCmioResponse(const Napi::CallbackInfo &info) {
    return verify_send_cmio_response(info.Env(), nullptr, info, 0);
}

#ifndef _WIN32
// The spawned server inherits stdout/stderr from this process. Node opens
// stdio without FD_CLOEXEC, but guard against embedders that do otherwise:
// temporarily clear the flag on stdout around the spawn, as the koffi binding
// did.
class scoped_clear_cloexec {
public:
    explicit scoped_clear_cloexec(int fd) : fd_(fd) {
        flags_ = fcntl(fd_, F_GETFD, 0);
        if (flags_ >= 0 && ((flags_ & FD_CLOEXEC) != 0)) {
            fcntl(fd_, F_SETFD, flags_ & ~FD_CLOEXEC);
        }
    }
    ~scoped_clear_cloexec() {
        if (flags_ >= 0 && ((flags_ & FD_CLOEXEC) != 0)) {
            fcntl(fd_, F_SETFD, flags_);
        }
    }
    scoped_clear_cloexec(const scoped_clear_cloexec &) = delete;
    scoped_clear_cloexec &operator=(const scoped_clear_cloexec &) = delete;
    scoped_clear_cloexec(scoped_clear_cloexec &&) = delete;
    scoped_clear_cloexec &operator=(scoped_clear_cloexec &&) = delete;

private:
    int fd_;
    int flags_;
};
#endif

Napi::Value JsonrpcSpawnServer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string address;
    int64_t spawn_timeout_ms = -1;
    if (!get_string(env, info[0], "address", &address) ||
        (!info[1].IsUndefined() && !get_i64(env, info[1], "spawnTimeoutMs", &spawn_timeout_ms))) {
        return env.Undefined();
    }
    cm_machine *new_m = nullptr;
    const char *bound_address = nullptr;
    uint32_t pid = 0;
    {
#ifndef _WIN32
        scoped_clear_cloexec guard(1);
#endif
        CHECK_CM(env, cm_jsonrpc_spawn_server(address.c_str(), spawn_timeout_ms, &new_m, &bound_address, &pid));
    }
    Napi::Object result = Napi::Object::New(env);
    result.Set("machine", Machine::NewInstance(env, new_m));
    result.Set("boundAddress", Napi::String::New(env, bound_address));
    result.Set("pid", Napi::Number::New(env, pid));
    return result;
}

Napi::Value JsonrpcConnectServer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string address;
    int64_t connect_timeout_ms = -1;
    if (!get_string(env, info[0], "address", &address) ||
        (!info[1].IsUndefined() && !get_i64(env, info[1], "connectTimeoutMs", &connect_timeout_ms))) {
        return env.Undefined();
    }
    cm_machine *new_m = nullptr;
    CHECK_CM(env, cm_jsonrpc_connect_server(address.c_str(), connect_timeout_ms, &new_m));
    return Machine::NewInstance(env, new_m);
}

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    Machine::Init(env, exports);
    exports.Set("getLastErrorMessage", Napi::Function::New(env, GetLastErrorMessage));
    exports.Set("getVersion", Napi::Function::New(env, GetVersion));
    exports.Set("machineNew", Napi::Function::New(env, MachineNew));
    exports.Set("machineCreateNew", Napi::Function::New(env, MachineCreateNew));
    exports.Set("machineLoadNew", Napi::Function::New(env, MachineLoadNew));
    exports.Set("getDefaultConfig", Napi::Function::New(env, GetDefaultConfig));
    exports.Set("getRegAddress", Napi::Function::New(env, GetRegAddress));
    exports.Set("getAddressName", Napi::Function::New(env, GetAddressName));
    exports.Set("verifyStep", Napi::Function::New(env, VerifyStep));
    exports.Set("verifyStepUarch", Napi::Function::New(env, VerifyStepUarch));
    exports.Set("verifyResetUarch", Napi::Function::New(env, VerifyResetUarch));
    exports.Set("verifySendCmioResponse", Napi::Function::New(env, VerifySendCmioResponse));
    exports.Set("jsonrpcSpawnServer", Napi::Function::New(env, JsonrpcSpawnServer));
    exports.Set("jsonrpcConnectServer", Napi::Function::New(env, JsonrpcConnectServer));
    return exports;
}

} // namespace

NODE_API_MODULE(cartesi_machine, InitModule)
