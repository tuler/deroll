/*
 * Hand-written replacement for the config.h that autoconf generates for
 * xgenext2fs (deps/genext2fs/configure.ac).
 *
 * node-gyp cannot run `./configure`, so instead of shipping a generated header
 * per platform we assert the small set of features xgenext2fs probes for. Every
 * one of them is mandated by POSIX.1-2008 and present on the platforms this
 * addon targets (glibc/musl Linux and macOS), except where noted below.
 *
 * Keep this in sync with the AC_CHECK_* calls in deps/genext2fs/configure.ac
 * when bumping the submodule.
 */

#ifndef DEROLL_GENEXT2FS_CONFIG_H
#define DEROLL_GENEXT2FS_CONFIG_H

/* Must match deps/genext2fs AC_INIT([xgenext2fs], [...]) */
#define VERSION "1.5.6"
#define PACKAGE "xgenext2fs"
#define PACKAGE_NAME "xgenext2fs"
#define PACKAGE_VERSION VERSION
#define PACKAGE_STRING "xgenext2fs " VERSION

/* Headers (AC_CHECK_HEADERS / AC_HEADER_*) */
#define HAVE_DIRENT_H 1
#define HAVE_FCNTL_H 1
#define HAVE_GETOPT_H 1
#define HAVE_INTTYPES_H 1
#define HAVE_LIBGEN_H 1
#define HAVE_LIMITS_H 1
#define HAVE_MEMORY_H 1
#define HAVE_STDDEF_H 1
#define HAVE_STDINT_H 1
#define HAVE_STDLIB_H 1
#define HAVE_STRINGS_H 1
#define HAVE_STRING_H 1
#define HAVE_SYS_STAT_H 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_UNISTD_H 1

/* Types and struct members (AC_TYPE_UID_T, AC_CHECK_MEMBERS) */
#define HAVE_STRUCT_STAT_ST_RDEV 1

/* Library functions (AC_CHECK_FUNCS) */
#define HAVE_GETOPT_LONG 1
#define HAVE_STRTOF 1

/*
 * getline(3) is POSIX.1-2008. Darwin only grew it in 10.7 and xgenext2fs
 * carries a getdelim() based fallback for older systems, so declare it for the
 * platforms we know have it and let the fallback handle the rest.
 */
#if defined(__linux__) || defined(__GLIBC__) || defined(__APPLE__)
#define HAVE_GETLINE 1
#endif

/* AC_HEADER_MAJOR: where major()/minor()/makedev() live */
#if defined(__linux__)
#define MAJOR_IN_SYSMACROS 1
#elif defined(__sun) || defined(sun)
#define MAJOR_IN_MKDEV 1
#endif
/* On the BSDs (incl. Darwin) they come from <sys/types.h>, already included. */

/* tarball support is provided by the vendored libarchive subset */
#define HAVE_LIBARCHIVE 1

#endif /* DEROLL_GENEXT2FS_CONFIG_H */
