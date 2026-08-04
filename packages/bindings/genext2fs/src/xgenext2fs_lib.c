/*
 * Turns the xgenext2fs CLI into a callable library function without patching a
 * single line of deps/genext2fs/xgenext2fs.c.
 *
 * xgenext2fs is a normal command line program: it parses argv with getopt_long,
 * writes progress to stderr, dumps `--verbose` output to stdout, and reports
 * every error by calling exit(). None of that is usable from a long-lived Node
 * process, so this translation unit textually includes the upstream source with
 * three redirections in place:
 *
 *   main()   -> xgenext2fs_main(), so we can call it with our own argv
 *   exit()   -> longjmp() back into xge_run(), so failures unwind instead of
 *               taking the whole process down
 *   stdout/stderr (and the printf family) -> temporary files, so the CLI's
 *               diagnostics become strings we can hand back to JavaScript
 *
 * The redirections are macros, so every system header xgenext2fs.c pulls in has
 * to be included *before* they are defined -- otherwise the `exit` macro would
 * rewrite the prototype in <stdlib.h>. The block below mirrors the include list
 * at the top of xgenext2fs.c; xgenext2fs.c's own #includes then no-op on their
 * header guards.
 *
 * Limitations that follow from this approach and are handled by the callers:
 *   - not reentrant (getopt state, `blocksize` and `app_name` are globals), so
 *     the addon serializes calls with a mutex;
 *   - longjmp()ing out of a failed run leaks whatever the CLI had allocated at
 *     that point. Errors are expected to be rare and the leak is bounded by one
 *     partially built filesystem, so this is preferred over fork()ing.
 */

#include <signal.h>

#include <config.h>

#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <getopt.h>
#include <inttypes.h>
#include <libgen.h>
#include <limits.h>
#include <locale.h>
#include <stdarg.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#if MAJOR_IN_MKDEV
#include <sys/mkdev.h>
#elif MAJOR_IN_SYSMACROS
#include <sys/sysmacros.h>
#endif

#include <archive.h>
#include <archive_entry.h>

#include <assert.h>
#include <setjmp.h>

#include "xgenext2fs.h"

/* ------------------------------------------------------------------------- */

static jmp_buf xge_jmp;
static FILE *xge_out;
static FILE *xge_err;

#if defined(__GNUC__) || defined(__clang__)
static void xge_exit(int status) __attribute__((noreturn));
#else
static void xge_exit(int status);
#endif

/* Redirect the CLI's process-wide side effects at the whole included source. */
#undef stdout
#undef stderr
#define stdout xge_out
#define stderr xge_err
#define exit(status) xge_exit(status)
#define printf(...) fprintf(stdout, __VA_ARGS__)
#define putchar(c) fputc((c), stdout)
#define main xgenext2fs_main

#include "xgenext2fs.c"

#undef main
#undef putchar
#undef printf
#undef exit
#undef stderr
#undef stdout

/*
 * exit(0) has to survive the round trip through longjmp(), which turns a value
 * of 0 into 1, so statuses are biased by one on the way out.
 */
static void
xge_exit(int status)
{
    longjmp(xge_jmp, status + 1);
}

/* ------------------------------------------------------------------------- */

/* Read a capture stream back into a NUL-terminated heap buffer. */
static char *
xge_drain(FILE *fh)
{
    long size;
    char *buf;
    size_t got;

    if (fh == NULL)
        return NULL;
    if (fflush(fh) != 0 || fseek(fh, 0, SEEK_END) != 0)
        return NULL;
    if ((size = ftell(fh)) <= 0)
        return NULL;
    if (fseek(fh, 0, SEEK_SET) != 0)
        return NULL;
    if ((buf = malloc((size_t)size + 1)) == NULL)
        return NULL;
    got = fread(buf, 1, (size_t)size, fh);
    buf[got] = '\0';
    return buf;
}

/*
 * Put the globals xgenext2fs relies on back into the state they have at process
 * start, so a second call behaves like a fresh process.
 */
static void
xge_reset_globals(void)
{
    /* file scope state of xgenext2fs.c */
    blocksize = 1024;
    app_name = NULL;

    /* getopt(3) scan state */
#if defined(__APPLE__) || defined(__FreeBSD__) || defined(__OpenBSD__) ||       \
    defined(__NetBSD__) || defined(__DragonFly__)
    optreset = 1;
    optind = 1;
#else
    /* glibc and musl reinitialize completely when optind is 0 */
    optind = 0;
#endif
    opterr = 1;
    optopt = '?';
}

int
xge_run(int argc, char **argv, xge_result *res)
{
    int jumped;

    res->status = 0;
    res->out = NULL;
    res->err = NULL;

    xge_out = tmpfile();
    xge_err = tmpfile();
    if (xge_out == NULL || xge_err == NULL) {
        if (xge_out != NULL)
            fclose(xge_out);
        if (xge_err != NULL)
            fclose(xge_err);
        xge_out = xge_err = NULL;
        res->status = -1;
        res->err = strdup("could not allocate temporary files for output capture");
        return res->status;
    }

    xge_reset_globals();

    if ((jumped = setjmp(xge_jmp)) != 0)
        res->status = jumped - 1; /* reached through the exit() redirection */
    else
        res->status = xgenext2fs_main(argc, argv);

    res->out = xge_drain(xge_out);
    res->err = xge_drain(xge_err);

    fclose(xge_out);
    fclose(xge_err);
    xge_out = xge_err = NULL;

    return res->status;
}

void
xge_result_free(xge_result *res)
{
    if (res == NULL)
        return;
    free(res->out);
    free(res->err);
    res->out = NULL;
    res->err = NULL;
}

const char *
xge_version(void)
{
    return VERSION;
}
