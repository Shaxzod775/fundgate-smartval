import type {
  DataRoomBlocker,
  DataRoomBlockerReasonInput,
  DataRoomGateApiResponse,
  DataRoomRequiredError,
} from '../../services/api';

export const DATA_ROOM_REASON_MIN_LENGTH = 3;
export const DATA_ROOM_REASON_MAX_LENGTH = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDataRoomRequiredError<T>(
  response: DataRoomGateApiResponse<T>,
): response is DataRoomRequiredError {
  if (response.success || response.error !== 'data_room_required' || !isRecord(response.data)) {
    return false;
  }

  const data = response.data;
  return typeof data.meetingUpdatedAt === 'string' && Array.isArray(data.blockers);
}

export function initialDataRoomReasons(blockers: DataRoomBlocker[]): Record<string, string> {
  return Object.fromEntries(blockers.map((blocker) => [blocker.startupId, blocker.managerReason || '']));
}

export function isValidDataRoomReason(reason: string | undefined): boolean {
  const length = (reason || '').trim().length;
  return length >= DATA_ROOM_REASON_MIN_LENGTH && length <= DATA_ROOM_REASON_MAX_LENGTH;
}

export function areAllDataRoomReasonsValid(
  blockers: DataRoomBlocker[],
  reasons: Record<string, string>,
): boolean {
  return blockers.length > 0
    && blockers.every((blocker) => isValidDataRoomReason(reasons[blocker.startupId]));
}

export function toDataRoomReasonInputs(
  blockers: DataRoomBlocker[],
  reasons: Record<string, string>,
): DataRoomBlockerReasonInput[] {
  return blockers.map((blocker) => ({
    startupId: blocker.startupId,
    reason: (reasons[blocker.startupId] || '').trim(),
  }));
}
