import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";
import { getAddress, isAddress, type Address } from "viem";

const STORAGE_KEY = "cartesi-explorer.submitters";

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
