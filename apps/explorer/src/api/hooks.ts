import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { rpc } from './client'
import { useServer } from '../server'
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
} from './types'

export interface ListOptions {
  limit?: number
  offset?: number
  descending?: boolean
}

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

// Each hook assembles its request params once, and that same object feeds both
// the queryKey and the request — they cannot drift. Filter values arrive as
// free-form strings (URL params, text inputs), so hook signatures take strings
// and the assembled object is cast to the @cartesi/rpc param type: the wire
// shape is the same, only the hex template types are wider here.

// Node

export const useChainId = () =>
  useRpc(['cartesi_getChainId'], (c) => c.request('cartesi_getChainId'))

export const useNodeVersion = () =>
  useRpc(['cartesi_getNodeVersion'], (c) => c.request('cartesi_getNodeVersion'))

// Applications

export const useApplications = (opts: ListOptions = {}) =>
  useRpc(['cartesi_listApplications', opts], (c) => c.request('cartesi_listApplications', opts))

export const useApplication = (application: string) => {
  const params = { application }
  return useRpc(['cartesi_getApplication', params], (c) =>
    c.request('cartesi_getApplication', params),
  )
}

export const useProcessedInputCount = (application: string) => {
  const params = { application }
  return useRpc(['cartesi_getProcessedInputCount', params], (c) =>
    c.request('cartesi_getProcessedInputCount', params),
  )
}

export const useLastAcceptedEpochIndex = (application: string) => {
  const params = { application }
  return useRpc(['cartesi_getLastAcceptedEpochIndex', params], (c) =>
    c.request('cartesi_getLastAcceptedEpochIndex', params),
  )
}

// Epochs

export const useEpochs = (
  application: string,
  filters: { status?: string } = {},
  opts: ListOptions = {},
) => {
  const params = { application, ...filters, ...opts } as ListEpochsParams
  return useRpc(['cartesi_listEpochs', params], (c) => c.request('cartesi_listEpochs', params))
}

export const useEpoch = (application: string, epochIndex: string) => {
  const params = { application, epoch_index: epochIndex } as GetEpochParams
  return useRpc(['cartesi_getEpoch', params], (c) => c.request('cartesi_getEpoch', params))
}

// Inputs

export const useInputs = (
  application: string,
  filters: { epoch_index?: string; sender?: string } = {},
  opts: ListOptions = {},
) => {
  const params = { application, ...filters, ...opts } as ListInputsParams
  return useRpc(['cartesi_listInputs', params], (c) => c.request('cartesi_listInputs', params))
}

export const useInput = (application: string, inputIndex: string) => {
  const params = { application, input_index: inputIndex } as GetInputParams
  return useRpc(['cartesi_getInput', params], (c) => c.request('cartesi_getInput', params))
}

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
) => {
  const params = { application, ...filters, ...opts } as ListOutputsParams
  return useRpc(['cartesi_listOutputs', params], (c) => c.request('cartesi_listOutputs', params))
}

export const useOutput = (application: string, outputIndex: string) => {
  const params = { application, output_index: outputIndex } as GetOutputParams
  return useRpc(['cartesi_getOutput', params], (c) => c.request('cartesi_getOutput', params))
}

// Reports

export const useReports = (
  application: string,
  filters: { epoch_index?: string; input_index?: string } = {},
  opts: ListOptions = {},
) => {
  const params = { application, ...filters, ...opts } as ListReportsParams
  return useRpc(['cartesi_listReports', params], (c) => c.request('cartesi_listReports', params))
}

export const useReport = (application: string, reportIndex: string) => {
  const params = { application, report_index: reportIndex } as GetReportParams
  return useRpc(['cartesi_getReport', params], (c) => c.request('cartesi_getReport', params))
}

// Withdrawals

export const useWithdrawals = (
  application: string,
  filters: { account_index?: string } = {},
  opts: ListOptions = {},
) => {
  const params = { application, ...filters, ...opts } as ListWithdrawalsParams
  return useRpc(['cartesi_listWithdrawals', params], (c) =>
    c.request('cartesi_listWithdrawals', params),
  )
}

export const useWithdrawal = (application: string, accountIndex: string) => {
  const params = { application, account_index: accountIndex } as GetWithdrawalParams
  return useRpc(['cartesi_getWithdrawal', params], (c) =>
    c.request('cartesi_getWithdrawal', params),
  )
}

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
) => {
  const params = { application, ...filters, ...opts } as ListTournamentsParams
  return useRpc(['cartesi_listTournaments', params], (c) =>
    c.request('cartesi_listTournaments', params),
  )
}

export const useTournament = (application: string, address: string) => {
  const params = { application, address } as GetTournamentParams
  return useRpc(['cartesi_getTournament', params], (c) =>
    c.request('cartesi_getTournament', params),
  )
}

// Commitments

export const useCommitments = (
  application: string,
  filters: { epoch_index?: string; tournament_address?: string } = {},
  opts: ListOptions = {},
) => {
  const params = { application, ...filters, ...opts } as ListCommitmentsParams
  return useRpc(['cartesi_listCommitments', params], (c) =>
    c.request('cartesi_listCommitments', params),
  )
}

// Matches

export const useMatches = (
  application: string,
  filters: { epoch_index?: string; tournament_address?: string } = {},
  opts: ListOptions = {},
) => {
  const params = { application, ...filters, ...opts } as ListMatchesParams
  return useRpc(['cartesi_listMatches', params], (c) => c.request('cartesi_listMatches', params))
}

export const useMatch = (
  application: string,
  epochIndex: string,
  tournamentAddress: string,
  idHash: string,
) => {
  const params = {
    application,
    epoch_index: epochIndex,
    tournament_address: tournamentAddress,
    id_hash: idHash,
  } as GetMatchParams
  return useRpc(['cartesi_getMatch', params], (c) => c.request('cartesi_getMatch', params))
}

export const useMatchAdvances = (
  application: string,
  epochIndex: string,
  tournamentAddress: string,
  idHash: string,
  opts: ListOptions = {},
) => {
  const params = {
    application,
    epoch_index: epochIndex,
    tournament_address: tournamentAddress,
    id_hash: idHash,
    ...opts,
  } as ListMatchAdvancesParams
  return useRpc(['cartesi_listMatchAdvances', params], (c) =>
    c.request('cartesi_listMatchAdvances', params),
  )
}
