/*
 * Hand-written replacement for the config.h that libarchive's configure/cmake
 * generates, reduced to what the vendored read-only tar subset needs.
 *
 * Only the files listed under `libarchive_sources` in binding.gyp are compiled,
 * so most of upstream's knobs (compression backends, ACL/xattr support, the
 * writers, the other format readers) are deliberately left undefined. The
 * remaining probes are POSIX.1-2008 features present on every platform this
 * addon targets; the handful that genuinely differ between glibc/musl Linux and
 * Darwin are selected below.
 *
 * libarchive picks this file up through -DPLATFORM_CONFIG_H (see
 * deps/libarchive/libarchive/archive_platform.h), so it never looks for the
 * generated config.h.
 */

#ifndef DEROLL_LIBARCHIVE_CONFIG_H
#define DEROLL_LIBARCHIVE_CONFIG_H

/* ------------------------------------------------------------------ headers */
#define HAVE_ERRNO_H 1
#define HAVE_FCNTL_H 1
#define HAVE_INTTYPES_H 1
#define HAVE_LANGINFO_H 1
#define HAVE_LIMITS_H 1
#define HAVE_STDARG_H 1
#define HAVE_STDINT_H 1
#define HAVE_STDLIB_H 1
#define HAVE_STRING_H 1
#define HAVE_SYS_STAT_H 1
#define HAVE_SYS_TIME_H 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_TIME_H 1
#define HAVE_UNISTD_H 1
#define HAVE_WCHAR_H 1

/* ------------------------------------------------------ declared constants */
#define HAVE_DECL_INT32_MAX 1
#define HAVE_DECL_INT32_MIN 1
#define HAVE_DECL_INT64_MAX 1
#define HAVE_DECL_INT64_MIN 1
#define HAVE_DECL_INTMAX_MAX 1
#define HAVE_DECL_INTMAX_MIN 1
#define HAVE_DECL_SIZE_MAX 1
#define HAVE_DECL_SSIZE_MAX 1
#define HAVE_DECL_UINT32_MAX 1
#define HAVE_DECL_UINT64_MAX 1
#define HAVE_DECL_UINT64_MIN 1
#define HAVE_DECL_UINTMAX_MAX 1

/* --------------------------------------------------------------- functions */
#define HAVE_FCHMOD 1
#define HAVE_FCHOWN 1
#define HAVE_FSEEKO 1
#define HAVE_FUTIMENS 1
#define HAVE_FUTIMES 1
#define HAVE_GETEGID 1
#define HAVE_GETEUID 1
#define HAVE_MBRTOWC 1
#define HAVE_MKSTEMP 1
#define HAVE_NL_LANGINFO 1
#define HAVE_UTIMENSAT 1
#define HAVE_WCRTOMB 1
#define HAVE_WCSCPY 1
#define HAVE_WCSLEN 1
#define HAVE_WCTOMB 1
#define HAVE_WMEMCMP 1
#define HAVE_WMEMCPY 1
#define HAVE_WMEMMOVE 1

/*
 * Character set conversion. glibc, musl and Darwin all provide iconv(3); on
 * Darwin it lives in libiconv, which binding.gyp links. Without it libarchive
 * would fall back to a best-effort conversion and could report a warning for
 * archives whose entry names are not valid in the current locale, which
 * xgenext2fs treats as fatal.
 */
#define HAVE_ICONV 1
#define HAVE_ICONV_H 1
#define ICONV_CONST

/* --------------------------------------------------------------- <errno.h> */
#define HAVE_EILSEQ 1
#if defined(__APPLE__) || defined(__FreeBSD__) || defined(__OpenBSD__) ||       \
    defined(__NetBSD__)
/* EFTYPE is a BSD extension; libarchive maps ARCHIVE_ERRNO_FILE_FORMAT to it */
#define HAVE_EFTYPE 1
#endif

/* ------------------------------------------------------- struct stat timing */
#if defined(__APPLE__)
#define HAVE_STRUCT_STAT_ST_BIRTHTIME 1
#define HAVE_STRUCT_STAT_ST_BIRTHTIMESPEC_TV_NSEC 1
#define HAVE_STRUCT_STAT_ST_MTIMESPEC_TV_NSEC 1
#define HAVE_COPYFILE_H 1
#else
#define HAVE_STRUCT_STAT_ST_MTIM_TV_NSEC 1
#endif

/* ------------------------------------------------------- platform specifics */
#if defined(__linux__)
#define MAJOR_IN_SYSMACROS 1
#define HAVE_GETRESUID 1
#define HAVE_LINUX_FS_H 1
#elif defined(__sun) || defined(sun)
#define MAJOR_IN_MKDEV 1
#else
#define HAVE_ISSETUGID 1
#endif

#endif /* DEROLL_LIBARCHIVE_CONFIG_H */
