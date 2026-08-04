// N-API surface over xge_run() (see xgenext2fs_lib.c).
//
// Exposes two functions, `run` and `runSync`, both taking the argv of the
// xgenext2fs CLI *without* the program name. Building the argv from structured
// options is left to src/index.ts.
//
// xgenext2fs is not reentrant, so every call -- sync or async -- takes the same
// mutex. `run` still releases the JS thread while the image is generated, which
// for multi-gigabyte drives is the whole point.

#include <mutex>
#include <string>
#include <vector>

#include <napi.h>

#include "xgenext2fs.h"

namespace {

std::mutex g_lock;

struct Outcome {
    int status = 0;
    std::string out;
    std::string err;
};

// Parse the JS argv into owned strings. C++ exceptions are disabled in this
// addon, so bad input is reported by scheduling a JS exception and returning
// false; callers must bail out immediately.
bool ReadArgs(const Napi::CallbackInfo &info, std::vector<std::string> &args) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "expected an array of arguments")
            .ThrowAsJavaScriptException();
        return false;
    }
    Napi::Array array = info[0].As<Napi::Array>();
    args.reserve(array.Length() + 1);
    args.emplace_back("xgenext2fs");
    for (uint32_t i = 0; i < array.Length(); i++) {
        Napi::Value value = array.Get(i);
        if (!value.IsString()) {
            Napi::TypeError::New(env, "arguments must be strings")
                .ThrowAsJavaScriptException();
            return false;
        }
        args.emplace_back(value.As<Napi::String>().Utf8Value());
    }
    return true;
}

Outcome Invoke(const std::vector<std::string> &args) {
    std::vector<char *> argv;
    argv.reserve(args.size() + 1);
    for (const std::string &arg : args) {
        argv.push_back(const_cast<char *>(arg.c_str()));
    }
    argv.push_back(nullptr);

    xge_result result{};
    Outcome outcome;
    {
        std::lock_guard<std::mutex> guard(g_lock);
        xge_run(static_cast<int>(args.size()), argv.data(), &result);
        outcome.status = result.status;
        if (result.out != nullptr) {
            outcome.out = result.out;
        }
        if (result.err != nullptr) {
            outcome.err = result.err;
        }
        xge_result_free(&result);
    }
    return outcome;
}

// Trim so the message reads like an error rather than a log dump.
std::string ErrorMessage(const Outcome &outcome) {
    std::string message = outcome.err;
    while (!message.empty() && (message.back() == '\n' || message.back() == '\r')) {
        message.pop_back();
    }
    // keep only the last line: earlier ones are progress, the last one is why
    // the run died
    const size_t split = message.find_last_of('\n');
    if (split != std::string::npos) {
        message = message.substr(split + 1);
    }
    if (message.empty()) {
        message = "xgenext2fs exited with status " + std::to_string(outcome.status);
    }
    return message;
}

Napi::Object ToResult(Napi::Env env, const Outcome &outcome) {
    Napi::Object result = Napi::Object::New(env);
    result.Set("stdout", Napi::String::New(env, outcome.out));
    result.Set("stderr", Napi::String::New(env, outcome.err));
    return result;
}

Napi::Error ToError(Napi::Env env, const Outcome &outcome) {
    Napi::Error error = Napi::Error::New(env, ErrorMessage(outcome));
    error.Set("status", Napi::Number::New(env, outcome.status));
    error.Set("stdout", Napi::String::New(env, outcome.out));
    error.Set("stderr", Napi::String::New(env, outcome.err));
    return error;
}

class RunWorker : public Napi::AsyncWorker {
  public:
    RunWorker(Napi::Env env, std::vector<std::string> args)
        : Napi::AsyncWorker(env), args_(std::move(args)),
          deferred_(Napi::Promise::Deferred::New(env)) {}

    Napi::Promise Promise() { return deferred_.Promise(); }

    void Execute() override { outcome_ = Invoke(args_); }

    void OnOK() override {
        Napi::Env env = Env();
        Napi::HandleScope scope(env);
        if (outcome_.status != 0) {
            deferred_.Reject(ToError(env, outcome_).Value());
        } else {
            deferred_.Resolve(ToResult(env, outcome_));
        }
    }

    void OnError(const Napi::Error &error) override {
        deferred_.Reject(error.Value());
    }

  private:
    std::vector<std::string> args_;
    Napi::Promise::Deferred deferred_;
    Outcome outcome_;
};

Napi::Value Run(const Napi::CallbackInfo &info) {
    std::vector<std::string> args;
    if (!ReadArgs(info, args)) {
        return info.Env().Undefined();
    }
    RunWorker *worker = new RunWorker(info.Env(), std::move(args));
    Napi::Promise promise = worker->Promise();
    worker->Queue();
    return promise;
}

Napi::Value RunSync(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::vector<std::string> args;
    if (!ReadArgs(info, args)) {
        return env.Undefined();
    }
    Outcome outcome = Invoke(args);
    if (outcome.status != 0) {
        ToError(env, outcome).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    return ToResult(env, outcome);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("run", Napi::Function::New(env, Run));
    exports.Set("runSync", Napi::Function::New(env, RunSync));
    exports.Set("version", Napi::String::New(env, xge_version()));
    return exports;
}

} // namespace

NODE_API_MODULE(genext2fs, Init)
