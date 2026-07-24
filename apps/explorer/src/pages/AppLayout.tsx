import { keepPreviousData } from "@tanstack/react-query";
import { NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import {
    useApplication,
    useEpochs,
    useInputs,
    useOutputs,
    useReports,
    useTournaments,
    useWithdrawals,
} from "@cartesi/wagmi";
import type { Application } from "../api/types";
import { Crumbs, ErrorBox, Hex, Spinner, StatusBadge } from "../components/ui";
import { DecoderUrlSync } from "../decoder/registry";

export interface AppContext {
    /** Route param: application name or address, used in API calls and links. */
    appParam: string;
    application: Application;
}

export function useApp() {
    return useOutletContext<AppContext>();
}

function Tab({
    to,
    label,
    count,
    end,
}: {
    to: string;
    label: string;
    count?: number;
    end?: boolean;
}) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                    isActive
                        ? "border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`
            }
        >
            {label}
            {count !== undefined && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                    {count.toLocaleString()}
                </span>
            )}
        </NavLink>
    );
}

export function AppLayout() {
    const { app = "" } = useParams();
    const result = useApplication({ application: app });

    // totalCount probes for tab badges
    const peek = {
        application: app,
        limit: 1,
        placeholderData: keepPreviousData,
    };
    const epochs = useEpochs(peek);
    const inputs = useInputs(peek);
    const outputs = useOutputs(peek);
    const reports = useReports(peek);
    const withdrawals = useWithdrawals(peek);
    const tournaments = useTournaments(peek);

    if (result.isPending)
        return <Spinner label={`Loading application ${app}…`} />;
    if (result.isError) {
        return (
            <div className="space-y-4">
                <Crumbs
                    items={[{ label: "Applications", to: "/" }, { label: app }]}
                />
                <ErrorBox error={result.error} />
            </div>
        );
    }

    const application = result.data;
    const base = `/apps/${app}`;

    return (
        <div className="space-y-4">
            <Crumbs
                items={[
                    { label: "Applications", to: "/" },
                    { label: application.name },
                ]}
            />

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {application.name}
                    </h1>
                    <StatusBadge status={application.status} />
                    {!application.enabled && <StatusBadge status="DISABLED" />}
                    <StatusBadge status={application.consensusType} />
                    <Hex value={application.applicationAddress} full />
                </div>
                {application.reason && (
                    <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        {application.reason}
                    </p>
                )}
                <nav className="mt-2 -mb-3 flex overflow-x-auto">
                    <Tab to={base} label="Overview" end />
                    <Tab
                        to={`${base}/epochs`}
                        label="Epochs"
                        count={epochs.data?.pagination.totalCount}
                    />
                    <Tab
                        to={`${base}/inputs`}
                        label="Inputs"
                        count={inputs.data?.pagination.totalCount}
                    />
                    <Tab
                        to={`${base}/outputs`}
                        label="Outputs"
                        count={outputs.data?.pagination.totalCount}
                    />
                    <Tab
                        to={`${base}/reports`}
                        label="Reports"
                        count={reports.data?.pagination.totalCount}
                    />
                    <Tab
                        to={`${base}/withdrawals`}
                        label="Withdrawals"
                        count={withdrawals.data?.pagination.totalCount}
                    />
                    <Tab
                        to={`${base}/tournaments`}
                        label="Tournaments"
                        count={tournaments.data?.pagination.totalCount}
                    />
                </nav>
            </div>

            <DecoderUrlSync application={application.applicationAddress} />

            <Outlet
                context={{ appParam: app, application } satisfies AppContext}
            />
        </div>
    );
}
