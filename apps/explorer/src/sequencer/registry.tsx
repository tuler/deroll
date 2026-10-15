import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAddress, isAddress, type Address } from "viem";

const STORAGE_KEY = "cartesi-explorer.submitters";
const URL_PARAM = "submitter";

/** Batch-submitter addresses keyed by lowercase application contract address. */
type Submitters = Record<string, Address>;

interface SubmitterContextValue {
    submitters: Submitters;
    setSubmitter: (application: string, submitter: string) => void;
    removeSubmitter: (application: string) => void;
}

const SubmitterContext = createContext<SubmitterContextValue>({
    submitters: {},
    setSubmitter: () => {},
    removeSubmitter: () => {},
});

/** Parses a stored map, dropping anything that is not an address. */
function load(): Submitters {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        const out: Submitters = {};
        for (const [app, submitter] of Object.entries(raw ?? {})) {
            if (typeof submitter === "string" && isAddress(submitter))
                out[app.toLowerCase()] = getAddress(submitter);
        }
        return out;
    } catch {
        return {};
    }
}

/**
 * Holds the batch-submitter address configured for each application. The
 * explorer classifies an input as a sequencer batch only when its sender is
 * that address, exactly as the scheduler does, and never by trying to decode
 * the payload: a direct input that happens to parse as a batch is still a
 * direct input. The rollups node does not know the submitter, so it is
 * configuration, set explicitly by the user.
 */
export function SubmitterProvider({ children }: { children: ReactNode }) {
    const [submitters, setSubmitters] = useState<Submitters>(load);

    const update = useCallback((mutate: (prev: Submitters) => Submitters) => {
        setSubmitters((prev) => {
            const next = mutate(prev);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const setSubmitter = useCallback(
        (application: string, submitter: string) => {
            const trimmed = submitter.trim();
            if (!isAddress(trimmed)) return;
            update((prev) => ({
                ...prev,
                [application.toLowerCase()]: getAddress(trimmed),
            }));
        },
        [update],
    );

    const removeSubmitter = useCallback(
        (application: string) => {
            update((prev) => {
                const next = { ...prev };
                delete next[application.toLowerCase()];
                return next;
            });
        },
        [update],
    );

    return (
        <SubmitterContext.Provider
            value={{ submitters, setSubmitter, removeSubmitter }}
        >
            {children}
        </SubmitterContext.Provider>
    );
}

export function useSubmitters() {
    return useContext(SubmitterContext);
}

/** The batch submitter configured for an application address, if any. */
export function useSubmitter(application?: string): Address | undefined {
    const { submitters } = useSubmitters();
    return application ? submitters[application.toLowerCase()] : undefined;
}

/**
 * Mirrors the application's batch submitter into a ?submitter= query param so
 * the address bar is a shareable link, and offers a submitter suggested by
 * such a link. A suggestion is never adopted silently: it decides which inputs
 * are shown as batches of signed user operations, so a banner asks first.
 * Must be mounted inside an application route.
 */
export function SubmitterUrlSync({ application }: { application: string }) {
    const { submitters, setSubmitter } = useSubmitters();
    const registered = submitters[application.toLowerCase()];
    const location = useLocation();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState<string | null>(null);

    // The submitter this page last mirrored into the param; after a removal
    // the param still carries it for one render, which must not be re-offered.
    const mirrored = useRef(registered);
    useEffect(() => {
        mirrored.current = registered;
    }, [registered]);

    const raw = new URLSearchParams(location.search).get(URL_PARAM)?.trim();
    const suggested = raw && isAddress(raw) ? getAddress(raw) : undefined;
    const pending =
        suggested &&
        suggested !== registered &&
        suggested !== dismissed &&
        suggested !== mirrored.current
            ? suggested
            : null;

    useEffect(() => {
        if (pending) return; // keep the suggested param while the banner is up
        const params = new URLSearchParams(location.search);
        if ((params.get(URL_PARAM) ?? undefined) !== registered) {
            if (registered) params.set(URL_PARAM, registered);
            else params.delete(URL_PARAM);
            navigate(
                { pathname: location.pathname, search: params.toString() },
                { replace: true },
            );
        }
    }, [location, registered, pending, navigate]);

    if (!pending) return null;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="min-w-0">
                This link suggests{" "}
                <code className="font-mono break-all">{pending}</code> as this
                application's sequencer batch submitter. Inputs it sent will be
                shown as batches of user operations — only accept it if you know
                it is the right address.
            </span>
            <span className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setSubmitter(application, pending)}
                    className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 cursor-pointer"
                >
                    Set submitter
                </button>
                <button
                    type="button"
                    onClick={() => setDismissed(pending)}
                    className="rounded-md border border-amber-400 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100 cursor-pointer dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
                >
                    Dismiss
                </button>
            </span>
        </div>
    );
}
