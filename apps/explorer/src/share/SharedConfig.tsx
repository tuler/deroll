import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDecoders } from "../decoder/registry";
import { useSubmitters } from "../sequencer/registry";
import { useServer } from "../server";
import { fetchSnapshot } from "./client";
import { SHARE_PARAM } from "./snapshot";

/**
 * Applies the configuration a share link (`?c=<key>`) names, then drops the
 * param: from there on the configuration lives in local storage like any
 * other. The server and batch submitters are applied directly; decoders are
 * only suggested, since they run code (see DecoderSuggestions).
 * Must be mounted inside the router.
 */
export function SharedConfig() {
    const [params, setParams] = useSearchParams();
    const key = params.get(SHARE_PARAM);
    const { setServer } = useServer();
    const { setSubmitter } = useSubmitters();
    const { suggest } = useDecoders();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!key) return;
        let cancelled = false;
        const settle = () =>
            setParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete(SHARE_PARAM);
                    return next;
                },
                { replace: true },
            );
        fetchSnapshot(key).then(
            (snapshot) => {
                if (cancelled) return;
                setServer(snapshot.server);
                const decoders: Record<string, string> = {};
                for (const [app, config] of Object.entries(snapshot.apps)) {
                    if (config.submitter) setSubmitter(app, config.submitter);
                    if (config.decoder) decoders[app] = config.decoder;
                }
                suggest(decoders);
                setError(null);
                settle();
            },
            (e: unknown) => {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : String(e));
                settle();
            },
        );
        // A re-run while fetching only refetches an immutable resource; once
        // applied the param is gone, so nothing runs again.
        return () => {
            cancelled = true;
        };
    }, [key, setParams, setServer, setSubmitter, suggest]);

    if (key) {
        return (
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Loading shared configuration…
            </p>
        );
    }
    if (!error) return null;
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <span>Could not load the shared configuration: {error}</span>
            <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-md border border-red-400 px-3 py-1 text-xs hover:bg-red-100 cursor-pointer dark:border-red-700 dark:hover:bg-red-900/40"
            >
                Dismiss
            </button>
        </div>
    );
}
