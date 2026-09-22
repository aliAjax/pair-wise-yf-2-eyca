import type { Bench, MaterialType } from '@/types';
import { MATERIAL_LABELS, SEAT_SURFACE_LABELS } from '@/types';
import type { SeatSurfaceType } from '@/types';

/** 雨后坐面复核记录（独立于长椅档案存储，刷新保留） */
export interface SeatCheckRecord {
  benchId: string;
  /** 坐面状态；旧记录可能缺该字段，按待复核处理 */
  surface?: SeatSurfaceType;
  /** 确认时间（ISO） */
  checkedAt: string;
}

export type SeatCheckStatus = 'eligible' | 'pending';

export interface SeatCheckResult {
  status: SeatCheckStatus;
  record: SeatCheckRecord | null;
  /** 待复核原因（eligible 时为 null） */
  reason: string | null;
  /** 有效期截止时间（eligible 时有值） */
  expiresAt: Date | null;
  /** 剩余有效分钟数（eligible 时有值） */
  remainingMinutes: number | null;
}

/** 各材质雨后确认有效期（分钟）：木质/石质 90，金属 30，塑料 45，混合 60 */
export const SEAT_VALIDITY_MINUTES: Record<MaterialType, number> = {
  wood: 90,
  stone: 90,
  metal: 30,
  plastic: 45,
  mixed: 60,
};

export function getSeatValidityMinutes(material: MaterialType): number {
  return SEAT_VALIDITY_MINUTES[material];
}

function pendingResult(reason: string, record: SeatCheckRecord | null): SeatCheckResult {
  return { status: 'pending', record, reason, expiresAt: null, remainingMinutes: null };
}

/**
 * 判定一张长椅雨后是否适坐。
 * 待复核：无确认记录 / 旧记录缺坐面 / 坐面非干燥 /
 *         确认早于最近材质或遮阴调整 / 确认超过材质对应有效期。
 */
export function getSeatCheckResult(
  bench: Bench,
  record: SeatCheckRecord | undefined | null,
  now: Date = new Date(),
): SeatCheckResult {
  if (!record) {
    return pendingResult('雨后尚未登记坐面复核', null);
  }

  if (!record.surface) {
    return pendingResult('旧记录缺少坐面状态，请重新复核', record);
  }

  if (record.surface !== 'dry') {
    return pendingResult(`坐面${SEAT_SURFACE_LABELS[record.surface]}，暂不适坐`, record);
  }

  const checkedTime = new Date(record.checkedAt).getTime();
  if (Number.isNaN(checkedTime)) {
    return pendingResult('确认时间无效，请重新复核', record);
  }

  // 旧长椅可能没有材质/遮阴调整时间，退回以创建时间为准
  const adjustedTime = new Date(bench.materialShadeUpdatedAt ?? bench.createdAt).getTime();
  if (!Number.isNaN(adjustedTime) && checkedTime < adjustedTime) {
    return pendingResult('确认时间早于最近的材质或遮阴调整，请重新复核', record);
  }

  const validityMinutes = SEAT_VALIDITY_MINUTES[bench.material];
  const expiresAtTime = checkedTime + validityMinutes * 60 * 1000;
  if (now.getTime() > expiresAtTime) {
    return pendingResult(
      `${MATERIAL_LABELS[bench.material]}确认有效期为 ${validityMinutes} 分钟，已超时，请重新复核`,
      record,
    );
  }

  return {
    status: 'eligible',
    record,
    reason: null,
    expiresAt: new Date(expiresAtTime),
    remainingMinutes: Math.max(0, Math.floor((expiresAtTime - now.getTime()) / 60000)),
  };
}

export function isSeatEligible(
  bench: Bench,
  record: SeatCheckRecord | undefined | null,
  now: Date = new Date(),
): boolean {
  return getSeatCheckResult(bench, record, now).status === 'eligible';
}
