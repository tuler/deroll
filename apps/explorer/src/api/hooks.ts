import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { rpcCall } from './client'
import { useServer } from '../server'
import type {
  Application,
  Commitment,
  Epoch,
  GetResult,
  HexUint,
  Input,
  ListResult,
  Match,
  MatchAdvanced,
  Output,
  Report,
  Tournament,
  Withdrawal,
} from './types'

export interface ListOptions {
  limit?: number
  offset?: number
  descending?: boolean
}

function useRpc<T>(method: string, params: Record<string, unknown> = {}, enabled = true) {
  const { server } = useServer()
  return useQuery<T>({
    queryKey: [server, method, params],
    queryFn: () => rpcCall<T>(server, method, params),
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

// Node

export const useChainId = () => useRpc<GetResult<HexUint>>('cartesi_getChainId')

export const useNodeVersion = () => useRpc<GetResult<string>>('cartesi_getNodeVersion')

// Applications

export const useApplications = (opts: ListOptions = {}) =>
  useRpc<ListResult<Application>>('cartesi_listApplications', { ...opts })

export const useApplication = (application: string) =>
  useRpc<GetResult<Application>>('cartesi_getApplication', { application })

export const useProcessedInputCount = (application: string) =>
  useRpc<GetResult<HexUint>>('cartesi_getProcessedInputCount', { application })

export const useLastAcceptedEpochIndex = (application: string) =>
  useRpc<GetResult<HexUint>>('cartesi_getLastAcceptedEpochIndex', { application })

// Epochs

export const useEpochs = (
  application: string,
  filters: { status?: string } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Epoch>>('cartesi_listEpochs', { application, ...filters, ...opts })

export const useEpoch = (application: string, epochIndex: HexUint) =>
  useRpc<GetResult<Epoch>>('cartesi_getEpoch', { application, epoch_index: epochIndex })

// Inputs

export const useInputs = (
  application: string,
  filters: { epoch_index?: HexUint; sender?: string } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Input>>('cartesi_listInputs', { application, ...filters, ...opts })

export const useInput = (application: string, inputIndex: HexUint) =>
  useRpc<GetResult<Input>>('cartesi_getInput', { application, input_index: inputIndex })

// Outputs

export const useOutputs = (
  application: string,
  filters: {
    epoch_index?: HexUint
    input_index?: HexUint
    output_type?: string
    voucher_address?: string
  } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Output>>('cartesi_listOutputs', { application, ...filters, ...opts })

export const useOutput = (application: string, outputIndex: HexUint) =>
  useRpc<GetResult<Output>>('cartesi_getOutput', { application, output_index: outputIndex })

// Reports

export const useReports = (
  application: string,
  filters: { epoch_index?: HexUint; input_index?: HexUint } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Report>>('cartesi_listReports', { application, ...filters, ...opts })

export const useReport = (application: string, reportIndex: HexUint) =>
  useRpc<GetResult<Report>>('cartesi_getReport', { application, report_index: reportIndex })

// Withdrawals

export const useWithdrawals = (
  application: string,
  filters: { account_index?: HexUint } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Withdrawal>>('cartesi_listWithdrawals', { application, ...filters, ...opts })

export const useWithdrawal = (application: string, accountIndex: HexUint) =>
  useRpc<GetResult<Withdrawal>>('cartesi_getWithdrawal', {
    application,
    account_index: accountIndex,
  })

// Tournaments

export const useTournaments = (
  application: string,
  filters: {
    epoch_index?: HexUint
    level?: HexUint
    parent_tournament_address?: string
    parent_match_id_hash?: string
  } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Tournament>>('cartesi_listTournaments', { application, ...filters, ...opts })

export const useTournament = (application: string, address: string) =>
  useRpc<GetResult<Tournament>>('cartesi_getTournament', { application, address })

// Commitments

export const useCommitments = (
  application: string,
  filters: { epoch_index?: HexUint; tournament_address?: string } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Commitment>>('cartesi_listCommitments', { application, ...filters, ...opts })

// Matches

export const useMatches = (
  application: string,
  filters: { epoch_index?: HexUint; tournament_address?: string } = {},
  opts: ListOptions = {},
) => useRpc<ListResult<Match>>('cartesi_listMatches', { application, ...filters, ...opts })

export const useMatch = (
  application: string,
  epochIndex: HexUint,
  tournamentAddress: string,
  idHash: string,
) =>
  useRpc<GetResult<Match>>('cartesi_getMatch', {
    application,
    epoch_index: epochIndex,
    tournament_address: tournamentAddress,
    id_hash: idHash,
  })

export const useMatchAdvances = (
  application: string,
  epochIndex: HexUint,
  tournamentAddress: string,
  idHash: string,
  opts: ListOptions = {},
) =>
  useRpc<ListResult<MatchAdvanced>>('cartesi_listMatchAdvances', {
    application,
    epoch_index: epochIndex,
    tournament_address: tournamentAddress,
    id_hash: idHash,
    ...opts,
  })
