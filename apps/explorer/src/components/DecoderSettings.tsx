import { skipToken, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { loadDecoder } from "../decoder/loader";
import { useDecoders } from "../decoder/registry";
import { filterInputClass } from "./table";
import { Section } from "./ui";

/** Registration UI for an application's payload decoder module. */
export function DecoderSettings({ application }: { application: string }) {
    const { decoders, setDecoder, removeDecoder } = useDecoders();
    const url = decoders[application.toLowerCase()];
    const [draft, setDraft] = useState(url ?? "");

    const module = useQuery({
        queryKey: ["decoder-module", url],
        queryFn: url ? () => loadDecoder(url) : skipToken,
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    return (
        <Section title="Payload decoder">
            <div className="space-y-2">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    A module that translates this application's payloads into
                    readable data — a built ES module URL, or a decoder's
                    TypeScript source on GitHub (paste the file's{" "}
                    <code className="font-mono">github.com</code> or{" "}
                    <code className="font-mono">gist.github.com</code> URL, or
                    use{" "}
                    <code className="font-mono">gh:owner/repo@ref/path.ts</code>
                    ). It runs with full access to this page — only add sources
                    you trust.
                </p>
                <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setDecoder(application, draft);
                    }}
                >
                    <input
                        type="url"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="https://github.com/owner/repo/blob/main/decoder.ts"
                        className={`${filterInputClass} min-w-0 flex-1`}
                    />
                    <button
                        type="submit"
                        disabled={!draft.trim() || draft.trim() === url}
                        className="rounded-full bg-cartesi-cyan px-4 py-1.5 text-xs font-semibold uppercase tracking-eyebrow text-black hover:bg-cartesi-cyan/80 disabled:cursor-default disabled:opacity-50 cursor-pointer"
                    >
                        {url ? "Update" : "Add"}
                    </button>
                    {url && (
                        <button
                            type="button"
                            onClick={() => {
                                removeDecoder(application);
                                setDraft("");
                            }}
                            className="rounded-full border border-neutral-400 px-4 py-1.5 text-xs font-semibold uppercase tracking-eyebrow text-neutral-700 hover:border-accent cursor-pointer dark:border-neutral-600 dark:text-neutral-300"
                        >
                            Remove
                        </button>
                    )}
                </form>
                {url && (
                    <div className="text-xs">
                        {module.isPending ? (
                            <span className="text-neutral-500 dark:text-neutral-400">
                                Loading decoder…
                            </span>
                        ) : module.error ? (
                            <span className="text-red-700 dark:text-red-400">
                                {module.error.message}
                            </span>
                        ) : module.data ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                                Loaded ✓ {module.data.name ?? "unnamed decoder"}{" "}
                                (v{module.data.version})
                            </span>
                        ) : null}
                    </div>
                )}
            </div>
        </Section>
    );
}
