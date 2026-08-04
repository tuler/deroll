/*
 * Library entry point around the unmodified xgenext2fs CLI source.
 * See xgenext2fs_lib.c for how the CLI is turned into a callable function.
 */

#ifndef DEROLL_XGENEXT2FS_H
#define DEROLL_XGENEXT2FS_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct xge_result {
    /* exit status the CLI would have returned: 0 on success */
    int status;
    /* NUL-terminated capture of everything written to stdout/stderr, or NULL */
    char *out;
    char *err;
} xge_result;

/*
 * Run xgenext2fs with `argv` (argv[0] must be the program name, argv[argc] must
 * be NULL) and capture its output into `res`. Returns res->status.
 *
 * NOT reentrant: xgenext2fs keeps parser state in globals and reports errors by
 * calling exit(), so callers must serialize invocations. The addon holds a mutex
 * around this call.
 */
int xge_run(int argc, char **argv, xge_result *res);

/* Release the buffers owned by a result. Safe to call on a zeroed result. */
void xge_result_free(xge_result *res);

/* The xgenext2fs version this was built against, e.g. "1.5.6". */
const char *xge_version(void);

#ifdef __cplusplus
}
#endif

#endif /* DEROLL_XGENEXT2FS_H */
