import type { ContractType } from '../services/contracts.types';
import { useSorobanContract } from './useSorobanContract';

export interface BulkPaymentResult {
  totalRecipients: number;
  successfulPayments: number;
  failedPayments: number;
  transactionHash: string;
}

export interface VestingScheduleResult {
  scheduleId: string;
  beneficiary: string;
  totalAmount: string;
  startTime: number;
  endTime: number;
  releasedAmount: string;
}

export interface RevenueSplitResult {
  roundId: string;
  totalDistributed: string;
  participantCount: number;
  transactionHash: string;
}

function parseBulkPaymentResult(raw: unknown): BulkPaymentResult {
  const data = raw as Record<string, unknown>;
  return {
    totalRecipients: Number(data?.totalRecipients ?? 0),
    successfulPayments: Number(data?.successfulPayments ?? 0),
    failedPayments: Number(data?.failedPayments ?? 0),
    transactionHash: String(data?.transactionHash ?? ''),
  };
}

function parseVestingScheduleResult(raw: unknown): VestingScheduleResult {
  const data = raw as Record<string, unknown>;
  return {
    scheduleId: String(data?.scheduleId ?? ''),
    beneficiary: String(data?.beneficiary ?? ''),
    totalAmount: String(data?.totalAmount ?? '0'),
    startTime: Number(data?.startTime ?? 0),
    endTime: Number(data?.endTime ?? 0),
    releasedAmount: String(data?.releasedAmount ?? '0'),
  };
}

function parseRevenueSplitResult(raw: unknown): RevenueSplitResult {
  const data = raw as Record<string, unknown>;
  return {
    roundId: String(data?.roundId ?? ''),
    totalDistributed: String(data?.totalDistributed ?? '0'),
    participantCount: Number(data?.participantCount ?? 0),
    transactionHash: String(data?.transactionHash ?? ''),
  };
}

export function useBulkPaymentContract(contractId: string) {
  const hook = useSorobanContract<BulkPaymentResult>(contractId);

  return {
    ...hook,
    distribute: async (args: { recipients: string[]; amounts: string[]; asset?: string }) =>
      hook.invoke({
        method: 'distribute',
        args: [args.recipients, args.amounts, args.asset ?? null],
        parseResult: parseBulkPaymentResult,
      }),
    getPaymentStatus: async (paymentId: string) =>
      hook.invoke({
        method: 'get_payment_status',
        args: [paymentId],
        parseResult: (raw) => raw as { status: string; amount: string; timestamp: number },
      }),
  };
}

export function useVestingEscrowContract(contractId: string) {
  const hook = useSorobanContract<VestingScheduleResult>(contractId);

  return {
    ...hook,
    createSchedule: async (args: {
      beneficiary: string;
      amount: string;
      startTime: number;
      endTime: number;
      cliffDuration?: number;
    }) =>
      hook.invoke({
        method: 'create_vesting_schedule',
        args: [
          args.beneficiary,
          args.amount,
          BigInt(args.startTime),
          BigInt(args.endTime),
          BigInt(args.cliffDuration ?? 0),
        ],
        parseResult: parseVestingScheduleResult,
      }),
    release: async (scheduleId: string) =>
      hook.invoke({
        method: 'release',
        args: [scheduleId],
        parseResult: parseVestingScheduleResult,
      }),
    getSchedule: async (scheduleId: string) =>
      hook.invoke({
        method: 'get_schedule',
        args: [scheduleId],
        parseResult: parseVestingScheduleResult,
      }),
  };
}

export function useRevenueSplitContract(contractId: string) {
  const hook = useSorobanContract<RevenueSplitResult>(contractId);

  return {
    ...hook,
    createRound: async (args: { totalPrize: string; participants: string[]; weights?: number[] }) =>
      hook.invoke({
        method: 'create_round',
        args: [args.totalPrize, args.participants, args.weights ?? []],
        parseResult: parseRevenueSplitResult,
      }),
    distribute: async (roundId: string) =>
      hook.invoke({ method: 'distribute', args: [roundId], parseResult: parseRevenueSplitResult }),
    getRoundStatus: async (roundId: string) =>
      hook.invoke({
        method: 'get_round_status',
        args: [roundId],
        parseResult: (raw) =>
          raw as { status: string; totalDistributed: string; participantCount: number },
      }),
  };
}

export function getContractHook(contractType: ContractType) {
  switch (contractType) {
    case 'bulk_payment':
      return useBulkPaymentContract;
    case 'vesting_escrow':
      return useVestingEscrowContract;
    case 'revenue_split':
      return useRevenueSplitContract;
    default:
      return useSorobanContract;
  }
}
