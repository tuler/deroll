import { useCartesiClient } from "@cartesi/react";
import { useEffect, useState } from "react";
import { isRpcResponseError } from "../api/errors";
import { useDecoders } from "../decoder/registry";
import { useSubmitters } from "../sequencer/registry";
import { useServer } from "../server";
import { publishSnapshot } from "./client";
import { type AppConfig, SHARE_PARAM } from "./snapshot";

type State = "idle" | "busy" | "copied" | { error: string };

/**
 * Publishes the current configuration and copies a link to this page that
 * carries it. Only applications the node knows are included: local storage
 * holds configuration for every node ever visited, which is not this link's
 * to share.
 */
export function ShareButton() {
    const { server } = useServer();
    const { decoders } = useDecoders();
    const { submitters } = useSubmitters();
    const client = useCartesiClient();
    const [state, setState] = useState<State>("idle");

    useEffect(() => {
        if (state === "idle" || state === "busy") return;
        const timer = setTimeout(() => setState("idle"), 2500);
        return () => clearTimeout(timer);
    }, [state]);

    async function share() {
        setState("busy");
        try {
            const addresses = [
                ...new Set([
                    ...Object.keys(decoders),
                    ...Object.keys(submitters),
                ]),
            ];
            const known = await Promise.all(
                addresses.map((application) =>
                    client.getApplication({ application }).then(
                        () => true,
                        (e: unknown) => {
                            // The node answered that it has no such
                            // application; anything else is a real failure.
                            if (isRpcResponseError(e)) return false;
                            throw e;
                        },
                    ),
                ),
            );
            const apps: Record<string, AppConfig> = {};
            addresses.forEach((address, i) => {
                if (known[i])
                    apps[address] = {
                        decoder: decoders[address],
                        submitter: submitters[address],
                    };
            });

            const key = await publishSnapshot({ v: 1, server, apps });
            const url = new URL(window.location.href);
            url.searchParams.set(SHARE_PARAM, key);
            url.hash = "";
            try {
                await navigator.clipboard.writeText(url.href);
                setState("copied");
            } catch {
                window.prompt("Copy this link", url.href);
                setState("idle");
            }
        } catch (e) {
            setState({ error: e instanceof Error ? e.message : String(e) });
        }
    }

    const label =
        state === "busy"
            ? "Sharing…"
            : state === "copied"
              ? "Link copied"
              : state === "idle"
                ? "Share"
                : "Share failed";

    return (
        <button
            type="button"
            onClick={share}
            disabled={state === "busy"}
            aria-label={label}
            title={
                typeof state === "object"
                    ? `${label}: ${state.error}`
                    : state === "idle"
                      ? "Copy a short link to this page with this configuration"
                      : label
            }
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-neutral-800 cursor-pointer disabled:cursor-default disabled:opacity-50 ${
                typeof state === "object"
                    ? "text-red-400"
                    : state === "copied"
                      ? "text-emerald-400"
                      : "text-neutral-300 hover:text-white"
            }`}
        >
            {state === "copied" ? (
                <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m3 8.5 3.25 3.25L13 5" />
                </svg>
            ) : (
                <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                >
                    <circle cx="12" cy="3.5" r="2.25" />
                    <circle cx="4" cy="8" r="2.25" />
                    <circle cx="12" cy="12.5" r="2.25" />
                    <path
                        d="M12 3.5 4 8l8 4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.25"
                    />
                </svg>
            )}
        </button>
    );
}
