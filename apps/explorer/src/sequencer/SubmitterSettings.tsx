import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { filterInputClass } from "../components/table";
import { Section } from "../components/ui";
import { useSubmitters } from "./registry";

/** Registration UI for an application's sequencer batch submitter. */
export function SubmitterSettings({ application }: { application: string }) {
    const { submitters, setSubmitter, removeSubmitter } = useSubmitters();
    const submitter = submitters[application.toLowerCase()];
    const [draft, setDraft] = useState<string>(submitter ?? "");
    const trimmed = draft.trim();
    const valid = isAddress(trimmed);
    const unchanged = valid && getAddress(trimmed) === submitter;

    return (
        <Section title="Sequencer batch submitter">
            <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    If this application runs behind a Cartesi sequencer, the
                    address its batch submitter posts batches from. Inputs sent
                    by it are decoded as batches of signed user operations and
                    unfold in the inputs list; inputs from anyone else stay
                    direct inputs. The node does not know this address — take it
                    from the application's deployment.
                </p>
                <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setSubmitter(application, trimmed);
                    }}
                >
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="0x…"
                        spellCheck={false}
                        className={`${filterInputClass} min-w-0 flex-1`}
                    />
                    <button
                        type="submit"
                        disabled={!valid || unchanged}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-default disabled:opacity-50 cursor-pointer"
                    >
                        {submitter ? "Update" : "Set"}
                    </button>
                    {submitter && (
                        <button
                            type="button"
                            onClick={() => {
                                removeSubmitter(application);
                                setDraft("");
                            }}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Remove
                        </button>
                    )}
                </form>
                {trimmed !== "" && !valid && (
                    <p className="text-xs text-red-700 dark:text-red-400">
                        Not an address.
                    </p>
                )}
            </div>
        </Section>
    );
}
