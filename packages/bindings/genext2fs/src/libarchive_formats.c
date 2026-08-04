/*
 * Narrowed replacements for libarchive's archive_read_support_format_all() and
 * archive_read_support_filter_all().
 *
 * Upstream's versions reference every reader libarchive ships (7zip, rar, zip,
 * iso9660, ...) and every decompression filter (gzip, bzip2, lzma, zstd, ...),
 * which would drag in the whole library plus zlib/bz2/lzma/zstd. xgenext2fs only
 * ever feeds it tar archives, so the addon compiles just the tar reader and the
 * "none" (uncompressed) filter and defines the two aggregate entry points here.
 *
 * Compressed input is dealt with on the JavaScript side, which decompresses
 * before handing the bytes over -- see src/index.ts.
 */

#include <archive.h>

int
archive_read_support_format_all(struct archive *a)
{
    return archive_read_support_format_tar(a);
}

int
archive_read_support_filter_all(struct archive *a)
{
    return archive_read_support_filter_none(a);
}
