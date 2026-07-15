// Copyright Cartesi and individual authors (see AUTHORS)
// SPDX-License-Identifier: Apache-2.0
//
// Minimal native shim for /dev/cmio, the Cartesi Machine IO kernel driver.
// The driver only speaks ioctl+mmap, which JavaScript cannot issue, so this
// is the one irreducible piece of native code: open the device, map the tx/rx
// buffers (exposed to JS as external ArrayBuffers, zero copy), and forward
// the packed 64-bit HTIF yield. The whole rollup protocol lives in JS.

#include <cerrno>
#include <cstdint>
#include <cstring>

#include <fcntl.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>

#include <napi.h>

namespace {

// From the Cartesi Linux kernel uapi header (include/uapi/linux/cartesi/cmio.h,
// Apache-2.0), inlined so no kernel headers are needed at build time.
struct cmio_buffer {
    uint64_t data;
    uint64_t length;
};

struct cmio_setup {
    struct cmio_buffer tx, rx;
};

#define IOCTL_CMIO_SETUP _IOR(0xd3, 0, struct cmio_setup)
#define IOCTL_CMIO_YIELD _IOWR(0xd3, 1, uint64_t)

constexpr const char *DEVICE_PATH = "/dev/cmio";

Napi::Error errno_error(Napi::Env env, const char *what, int err) {
    char msg[256];
    (void) snprintf(msg, sizeof msg, "%s failed: %s (%d)", what, strerror(err), -err);
    Napi::Error error = Napi::Error::New(env, msg);
    error.Set("errno", Napi::Number::New(env, -err));
    error.Set("syscall", Napi::String::New(env, what));
    return error;
}

class Device final : public Napi::ObjectWrap<Device> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    explicit Device(const Napi::CallbackInfo &info);
    ~Device() override {
        Release();
    }

    Device(const Device &) = delete;
    Device &operator=(const Device &) = delete;
    Device(Device &&) = delete;
    Device &operator=(Device &&) = delete;

private:
    void Release() {
        if (tx_ != nullptr) {
            munmap(tx_, tx_length_);
            tx_ = nullptr;
        }
        if (rx_ != nullptr) {
            munmap(rx_, rx_length_);
            rx_ = nullptr;
        }
        if (fd_ >= 0) {
            close(fd_);
            fd_ = -1;
        }
    }

    Napi::Value GetTx(const Napi::CallbackInfo &info) {
        return tx_ref_.Value();
    }

    Napi::Value GetRx(const Napi::CallbackInfo &info) {
        return rx_ref_.Value();
    }

    Napi::Value Yield(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        if (fd_ < 0) {
            Napi::Error::New(env, "device is closed").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        if (info.Length() < 1 || !info[0].IsBigInt()) {
            Napi::TypeError::New(env, "yield takes a bigint").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        bool lossless = false;
        uint64_t req = info[0].As<Napi::BigInt>().Uint64Value(&lossless);
        if (!lossless) {
            Napi::RangeError::New(env, "yield value must fit in 64 bits").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        if (ioctl(fd_, IOCTL_CMIO_YIELD, &req) != 0) {
            errno_error(env, "ioctl(IOCTL_CMIO_YIELD)", errno).ThrowAsJavaScriptException();
            return env.Undefined();
        }
        return Napi::BigInt::New(env, req);
    }

    Napi::Value Close(const Napi::CallbackInfo &info) {
        Release();
        return info.Env().Undefined();
    }

    int fd_ = -1;
    uint8_t *tx_ = nullptr;
    uint8_t *rx_ = nullptr;
    size_t tx_length_ = 0;
    size_t rx_length_ = 0;
    Napi::Reference<Napi::ArrayBuffer> tx_ref_;
    Napi::Reference<Napi::ArrayBuffer> rx_ref_;
};

Device::Device(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Device>(info) {
    Napi::Env env = info.Env();

    fd_ = open(DEVICE_PATH, O_RDWR);
    if (fd_ < 0) {
        errno_error(env, "open /dev/cmio", errno).ThrowAsJavaScriptException();
        return;
    }

    struct cmio_setup setup {};
    if (ioctl(fd_, IOCTL_CMIO_SETUP, &setup) != 0) {
        int err = errno;
        Release();
        errno_error(env, "ioctl(IOCTL_CMIO_SETUP)", err).ThrowAsJavaScriptException();
        return;
    }

    // the driver requires mapping at the addresses it hands out
    void *tx = mmap(reinterpret_cast<void *>(setup.tx.data), setup.tx.length, PROT_READ | PROT_WRITE, MAP_SHARED,
        fd_, 0);
    if (tx == MAP_FAILED) {
        int err = errno;
        Release();
        errno_error(env, "mmap tx", err).ThrowAsJavaScriptException();
        return;
    }
    tx_ = static_cast<uint8_t *>(tx);
    tx_length_ = setup.tx.length;

    void *rx = mmap(reinterpret_cast<void *>(setup.rx.data), setup.rx.length, PROT_READ, MAP_SHARED, fd_, 0);
    if (rx == MAP_FAILED) {
        int err = errno;
        Release();
        errno_error(env, "mmap rx", err).ThrowAsJavaScriptException();
        return;
    }
    rx_ = static_cast<uint8_t *>(rx);
    rx_length_ = setup.rx.length;

    // external ArrayBuffers: zero-copy views over the device buffers, valid
    // until close()
    tx_ref_ = Napi::Persistent(Napi::ArrayBuffer::New(env, tx_, tx_length_));
    rx_ref_ = Napi::Persistent(Napi::ArrayBuffer::New(env, rx_, rx_length_));
}

Napi::Object Device::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Device",
        {
            InstanceAccessor<&Device::GetTx>("tx"),
            InstanceAccessor<&Device::GetRx>("rx"),
            InstanceMethod<&Device::Yield>("yield"),
            InstanceMethod<&Device::Close>("close"),
        });
    exports.Set("Device", func);
    return exports;
}

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return Device::Init(env, exports);
}

} // namespace

NODE_API_MODULE(cmio_shim, InitModule)
