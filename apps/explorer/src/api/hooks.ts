// Thin adapters over @cartesi/wagmi's publicL2 hooks: same hook per API
// method, with the explorer's shared query defaults applied in one place.
// The server URL comes from CartesiProvider (see main.tsx) and is part of
// every query key, so switching servers never serves another node's cache.

import {
  useApplication as useCartesiApplication,
  useApplications as useCartesiApplications,
  useChainId as useCartesiChainId,
  useCommitments as useCartesiCommitments,
  useEpoch as useCartesiEpoch,
  useEpochs as useCartesiEpochs,
  useInput as useCartesiInput,
  useInputs as useCartesiInputs,
  useLastAcceptedEpochIndex as useCartesiLastAcceptedEpochIndex,
  useMatch as useCartesiMatch,
  useMatchAdvances as useCartesiMatchAdvances,
  useMatches as useCartesiMatches,
  useNodeVersion as useCartesiNodeVersion,
  useOutput as useCartesiOutput,
  useOutputs as useCartesiOutputs,
  useProcessedInputCount as useCartesiProcessedInputCount,
  useReport as useCartesiReport,
  useReports as useCartesiReports,
  useTournament as useCartesiTournament,
  useTournaments as useCartesiTournaments,
  useWithdrawal as useCartesiWithdrawal,
  useWithdrawals as useCartesiWithdrawals,
} from '@cartesi/wagmi'
import { keepPreviousData } from '@tanstack/react-query'
import type { Address, Hash } from 'viem'
import type { OutputType } from './types'

export interface ListOptions {
  limit?: number
  offset?: number
  descending?: boolean
}

const defaults = {
  retry: 1,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const

// Node

export const useChainId = () => useCartesiChainId({ ...defaults })

export const useNodeVersion = () => useCartesiNodeVersion({ ...defaults })

// Applications

export const useApplications = (opts: ListOptions = {}) =>
  useCartesiApplications({ ...opts, ...defaults })

export const useApplication = (application: string) =>
  useCartesiApplication({ application, ...defaults })

export const useProcessedInputCount = (application: string) =>
  useCartesiProcessedInputCount({ application, ...defaults })

export const useLastAcceptedEpochIndex = (application: string) =>
  useCartesiLastAcceptedEpochIndex({ application, ...defaults })

// Epochs

export const useEpochs = (
  application: string,
  filters: { status?: string } = {},
  opts: ListOptions = {},
) =>
  useCartesiEpochs({
    application,
    status: filters.status as never,
    ...opts,
    ...defaults,
  })

export const useEpoch = (application: string, epochIndex: bigint) =>
  useCartesiEpoch({ application, epochIndex, ...defaults })

// Inputs

export const useInputs = (
  application: string,
  filters: { epochIndex?: bigint; sender?: string } = {},
  opts: ListOptions = {},
) =>
  useCartesiInputs({
    application,
    epochIndex: filters.epochIndex,
    sender: filters.sender as Address | undefined,
    ...opts,
    ...defaults,
  })

export const useInput = (application: string, inputIndex: bigint) =>
  useCartesiInput({ application, inputIndex, ...defaults })

// Outputs

export const useOutputs = (
  application: string,
  filters: {
    epochIndex?: bigint
    inputIndex?: bigint
    outputType?: OutputType
    voucherAddress?: string
  } = {},
  opts: ListOptions = {},
) =>
  useCartesiOutputs({
    application,
    epochIndex: filters.epochIndex,
    inputIndex: filters.inputIndex,
    outputType: filters.outputType,
    voucherAddress: filters.voucherAddress as Address | undefined,
    ...opts,
    ...defaults,
  })

export const useOutput = (application: string, outputIndex: bigint) =>
  useCartesiOutput({ application, outputIndex, ...defaults })

// Reports

export const useReports = (
  application: string,
  filters: { epochIndex?: bigint; inputIndex?: bigint } = {},
  opts: ListOptions = {},
) => useCartesiReports({ application, ...filters, ...opts, ...defaults })

export const useReport = (application: string, reportIndex: bigint) =>
  useCartesiReport({ application, reportIndex, ...defaults })

// Withdrawals

export const useWithdrawals = (
  application: string,
  filters: { accountIndex?: bigint } = {},
  opts: ListOptions = {},
) => useCartesiWithdrawals({ application, ...filters, ...opts, ...defaults })

export const useWithdrawal = (application: string, accountIndex: bigint) =>
  useCartesiWithdrawal({ application, accountIndex, ...defaults })

// Tournaments

export const useTournaments = (
  application: string,
  filters: {
    epochIndex?: bigint
    level?: bigint
    parentTournamentAddress?: string
    parentMatchIdHash?: string
  } = {},
  opts: ListOptions = {},
) =>
  useCartesiTournaments({
    application,
    epochIndex: filters.epochIndex,
    level: filters.level,
    parentTournamentAddress: filters.parentTournamentAddress as Address | undefined,
    parentMatchIdHash: filters.parentMatchIdHash as Hash | undefined,
    ...opts,
    ...defaults,
  })

export const useTournament = (application: string, address: string) =>
  useCartesiTournament({ application, address: address as Address, ...defaults })

// Commitments

export const useCommitments = (
  application: string,
  filters: { epochIndex?: bigint; tournamentAddress?: string } = {},
  opts: ListOptions = {},
) =>
  useCartesiCommitments({
    application,
    epochIndex: filters.epochIndex,
    tournamentAddress: filters.tournamentAddress as Address | undefined,
    ...opts,
    ...defaults,
  })

// Matches

export const useMatches = (
  application: string,
  filters: { epochIndex?: bigint; tournamentAddress?: string } = {},
  opts: ListOptions = {},
) =>
  useCartesiMatches({
    application,
    epochIndex: filters.epochIndex,
    tournamentAddress: filters.tournamentAddress as Address | undefined,
    ...opts,
    ...defaults,
  })

export const useMatch = (
  application: string,
  epochIndex: bigint,
  tournamentAddress: string,
  idHash: string,
) =>
  useCartesiMatch({
    application,
    epochIndex,
    tournamentAddress: tournamentAddress as Address,
    idHash: idHash as Hash,
    ...defaults,
  })

export const useMatchAdvances = (
  application: string,
  epochIndex: bigint,
  tournamentAddress: string,
  idHash: string,
  opts: ListOptions = {},
) =>
  useCartesiMatchAdvances({
    application,
    epochIndex,
    tournamentAddress: tournamentAddress as Address,
    idHash: idHash as Hash,
    ...opts,
    ...defaults,
  })
