import { useApplication } from "@cartesi/react";
import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";

const STORAGE_KEY = "cartesi-explorer.decoders";

/** Decoder module URLs keyed by lowercase application contract address. */
type DecoderUrls = Record<string, string>;

interface DecoderContextValue {
    decoders: DecoderUrls;
    setDecoder: (application: string, url: string) => void;
    removeDecoder: (application: string) => void;
    /** Decoders offered by a share link, awaiting confirmation. Not persisted. */
    suggestions: DecoderUrls;
    suggest: (decoders: DecoderUrls) => void;
    dismissSuggestion: (application: string) => void;
}

const DecoderContext = createContext<DecoderContextValue>({
    decoders: {},
    setDecoder: () => {},
    removeDecoder: () => {},
    suggestions: {},
    suggest: () => {},
    dismissSuggestion: () => {},
});

function without(map: DecoderUrls, application: string): DecoderUrls {
    const next = { ...map };
    delete next[application.toLowerCase()];
    return next;
}

export function DecoderProvider({ children }: { children: ReactNode }) {
    const [decoders, setDecoders] = useState<DecoderUrls>(() => {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY) ?? "{}",
            ) as DecoderUrls;
        } catch {
            return {};
        }
    });

    const update = useCallback((mutate: (prev: DecoderUrls) => DecoderUrls) => {
        setDecoders((prev) => {
            const next = mutate(prev);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const [suggestions, setSuggestions] = useState<DecoderUrls>({});

    const setDecoder = useCallback(
        (application: string, url: string) => {
            const trimmed = url.trim();
            if (!trimmed) return;
            update((prev) => ({
                ...prev,
                [application.toLowerCase()]: trimmed,
            }));
            setSuggestions((prev) => without(prev, application));
        },
        [update],
    );

    const removeDecoder = useCallback(
        (application: string) => update((prev) => without(prev, application)),
        [update],
    );

    // Only what would change something is offered: a link suggesting the
    // decoder already registered has nothing to ask.
    const suggest = useCallback(
        (offered: DecoderUrls) =>
            setSuggestions(
                Object.fromEntries(
                    Object.entries(offered).filter(
                        ([app, url]) => decoders[app.toLowerCase()] !== url,
                    ),
                ),
            ),
        [decoders],
    );

    const dismissSuggestion = useCallback(
        (application: string) =>
            setSuggestions((prev) => without(prev, application)),
        [],
    );

    return (
        <DecoderContext.Provider
            value={{
                decoders,
                setDecoder,
                removeDecoder,
                suggestions,
                suggest,
                dismissSuggestion,
            }}
        >
            {children}
        </DecoderContext.Provider>
    );
}

export function useDecoders() {
    return useContext(DecoderContext);
}

/** URL of the decoder registered for an application address, if any. */
export function useDecoderUrl(application?: string): string | undefined {
    const { decoders } = useDecoders();
    return application ? decoders[application.toLowerCase()] : undefined;
}

/**
 * Asks before adopting each decoder a share link suggested. Unlike the server
 * and batch submitters, which a link applies directly, a decoder is
 * executable code, so each one needs explicit confirmation.
 */
export function DecoderSuggestions() {
    const { suggestions } = useDecoders();
    const entries = Object.entries(suggestions);
    if (entries.length === 0) return null;
    return (
        <div className="mb-4 space-y-2">
            {entries.map(([application, url]) => (
                <DecoderSuggestion
                    key={application}
                    application={application}
                    url={url}
                />
            ))}
        </div>
    );
}

function DecoderSuggestion({
    application,
    url,
}: {
    application: string;
    url: string;
}) {
    const { setDecoder, dismissSuggestion } = useDecoders();
    const name = useApplication({ application }).data?.name;
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="min-w-0">
                This link suggests payload decoder{" "}
                <code className="font-mono break-all">{url}</code> for{" "}
                {name ? (
                    <strong>{name}</strong>
                ) : (
                    <code className="font-mono break-all">{application}</code>
                )}
                . A decoder runs with full access to this page — only add it if
                you trust the source.
            </span>
            <span className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setDecoder(application, url)}
                    className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 cursor-pointer"
                >
                    Add decoder
                </button>
                <button
                    type="button"
                    onClick={() => dismissSuggestion(application)}
                    className="rounded-md border border-amber-400 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100 cursor-pointer dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
                >
                    Dismiss
                </button>
            </span>
        </div>
    );
}
