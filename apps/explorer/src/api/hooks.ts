import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type {
  CartesiClient,
  GetEpochParams,
  GetInputParams,
  GetMatchParams,
  GetOutputParams,
  GetReportParams,
  GetTournamentParams,
  GetWithdrawalParams,
  ListCommitmentsParams,
  ListEpochsParams,
  ListInputsParams,
  ListMatchAdvancesParams,
  ListMatchesParams,
  ListOutputsParams,
  ListReportsParams,
  ListTournamentsParams,
  ListWithdrawalsParams,
} from '@cartesi/rpc'
import { rpc } from './client'
import { useServer } from '../server'

export interface ListOptions {
  limit?: number
  offset?: number
  descending?: boolean
}

// Filter values arrive as free-form strings (URL params, text inputs), so the
// hook signatures take strings and each call casts its assembled params to the
// @cartesi/rpc param type — the wire shape is the same, only the hex template
// types are wider here.
function useRpc<T>(
  key: readonly unknown[],
  run: (client: CartesiClient) => PromiseLike<T>,
  enabled = true,
) {
  const { server } = useServer()
  return useQuery<T>({
    queryKey: [server, ...key],
    queryFn: () => rpc(server, run),
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

// Node

export const useChainId = () =>
  useRpc(['cartesi_getChainId'], (c) => c.request('cartesi_getChainId'))

export const useNodeVersion = () =>
  useRpc(['cartesi_getNodeVersion'], (c) => c.request('cartesi_getNodeVersion'))

// Applications

export const useApplications = (opts: ListOptions = {}) =>
  useRpc(['cartesi_listApplications', opts], (c) => c.request('cartesi_listApplications', opts))

export const useApplication = (application: string) =>
  useRpc(['cartesi_getApplication', application], (c) =>
    c.request('cartesi_getApplication', { application }),
  )

export const useProcessedInputCount = (application: string) =>
  useRpc(['cartesi_getProcessedInputCount', application], (c) =>
    c.request('cartesi_getProcessedInputCount', { application }),
  )

export const useLastAcceptedEpochIndex = (application: string) =>
  useRpc(['cartesi_getLastAcceptedEpochIndex', application], (c) =>
    c.request('cartesi_getLastAcceptedEpochIndex', { application }),
  )

// Epochs

export const useEpochs = (
  application: string,
  filters: { status?: string } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listEpochs', application, filters, opts], (c) =>
    c.request('cartesi_listEpochs', { application, ...filters, ...opts } as ListEpochsParams),
  )

export const useEpoch = (application: string, epochIndex: string) =>
  useRpc(['cartesi_getEpoch', application, epochIndex], (c) =>
    c.request('cartesi_getEpoch', { application, epoch_index: epochIndex } as GetEpochParams),
  )

// Inputs

export const useInputs = (
  application: string,
  filters: { epoch_index?: string; sender?: string } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listInputs', application, filters, opts], (c) =>
    c.request('cartesi_listInputs', { application, ...filters, ...opts } as ListInputsParams),
  )

export const useInput = (application: string, inputIndex: string) =>
  useRpc(['cartesi_getInput', application, inputIndex], (c) =>
    c.request('cartesi_getInput', { application, input_index: inputIndex } as GetInputParams),
  )

// Outputs

export const useOutputs = (
  application: string,
  filters: {
    epoch_index?: string
    input_index?: string
    output_type?: string
    voucher_address?: string
  } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listOutputs', application, filters, opts], (c) =>
    c.request('cartesi_listOutputs', { application, ...filters, ...opts } as ListOutputsParams),
  )

export const useOutput = (application: string, outputIndex: string) =>
  useRpc(['cartesi_getOutput', application, outputIndex], (c) =>
    c.request('cartesi_getOutput', { application, output_index: outputIndex } as GetOutputParams),
  )

// Reports

export const useReports = (
  application: string,
  filters: { epoch_index?: string; input_index?: string } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listReports', application, filters, opts], (c) =>
    c.request('cartesi_listReports', { application, ...filters, ...opts } as ListReportsParams),
  )

export const useReport = (application: string, reportIndex: string) =>
  useRpc(['cartesi_getReport', application, reportIndex], (c) =>
    c.request('cartesi_getReport', { application, report_index: reportIndex } as GetReportParams),
  )

// Withdrawals

export const useWithdrawals = (
  application: string,
  filters: { account_index?: string } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listWithdrawals', application, filters, opts], (c) =>
    c.request('cartesi_listWithdrawals', {
      application,
      ...filters,
      ...opts,
    } as ListWithdrawalsParams),
  )

export const useWithdrawal = (application: string, accountIndex: string) =>
  useRpc(['cartesi_getWithdrawal', application, accountIndex], (c) =>
    c.request('cartesi_getWithdrawal', {
      application,
      account_index: accountIndex,
    } as GetWithdrawalParams),
  )

// Tournaments

export const useTournaments = (
  application: string,
  filters: {
    epoch_index?: string
    level?: string
    parent_tournament_address?: string
    parent_match_id_hash?: string
  } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listTournaments', application, filters, opts], (c) =>
    c.request('cartesi_listTournaments', {
      application,
      ...filters,
      ...opts,
    } as ListTournamentsParams),
  )

export const useTournament = (application: string, address: string) =>
  useRpc(['cartesi_getTournament', application, address], (c) =>
    c.request('cartesi_getTournament', { application, address } as GetTournamentParams),
  )

// Commitments

export const useCommitments = (
  application: string,
  filters: { epoch_index?: string; tournament_address?: string } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listCommitments', application, filters, opts], (c) =>
    c.request('cartesi_listCommitments', {
      application,
      ...filters,
      ...opts,
    } as ListCommitmentsParams),
  )

// Matches

export const useMatches = (
  application: string,
  filters: { epoch_index?: string; tournament_address?: string } = {},
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listMatches', application, filters, opts], (c) =>
    c.request('cartesi_listMatches', { application, ...filters, ...opts } as ListMatchesParams),
  )

export const useMatch = (
  application: string,
  epochIndex: string,
  tournamentAddress: string,
  idHash: string,
) =>
  useRpc(['cartesi_getMatch', application, epochIndex, tournamentAddress, idHash], (c) =>
    c.request('cartesi_getMatch', {
      application,
      epoch_index: epochIndex,
      tournament_address: tournamentAddress,
      id_hash: idHash,
    } as GetMatchParams),
  )

export const useMatchAdvances = (
  application: string,
  epochIndex: string,
  tournamentAddress: string,
  idHash: string,
  opts: ListOptions = {},
) =>
  useRpc(['cartesi_listMatchAdvances', application, epochIndex, tournamentAddress, idHash, opts], (c) =>
    c.request('cartesi_listMatchAdvances', {
      application,
      epoch_index: epochIndex,
      tournament_address: tournamentAddress,
      id_hash: idHash,
      ...opts,
    } as ListMatchAdvancesParams),
  )
