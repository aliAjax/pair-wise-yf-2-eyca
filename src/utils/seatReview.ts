import type { Bench, MaterialType, SeatConditionType } from '@/types';

/** 雨后复核有效期（分钟）：木质和石质 90，金属 30，塑料 45，混合 60 */
export const SEAT_REVIEW_VALID_MINUTES: Record<MaterialType, number> = {
  wood: 90,
  stone: 90,
  metal: 30,
  plastic: 45,
  mixed: 60,
};

export type SeatReviewStatus = 'ok' | 'pending';

export interface SeatReviewResult {
  status: SeatReviewStatus;
  /** 待复核原因（status 为 pending 时存在） */
  reason?: string;
  /** 复核失效时间（ISO），存在干燥且有效的复核时给出 */
  expiresAt?: string;
  review?: NonNullable<Bench['seatReview']>;
}

export const SEAT_REVIEW_PENDING_REASONS = {
  missing: '缺少雨后坐面确认',
  wet: '坐面潮湿，暂不宜坐',
  puddled: '坐面有积水，暂不宜坐',
  expired: '复核已超过材质有效时长',
  adjusted: '材质或遮阴已调整，确认记录失效',
} as const;

function isPending(
  bench: Bench,
  now: number,
): SeatReviewResult | null {
  const review = bench.seatReview;

  // 旧记录缺坐面（无复核记录）按待复核
  if (!review || !review.seatCondition || !review.confirmedAt) {
    return { status: 'pending', reason: SEAT_REVIEW_PENDING_REASONS.missing };
  }

  const condition: SeatConditionType = review.seatCondition;

  // 坐面非干燥（潮湿或积水）
  if (condition !== 'dry') {
    return {
      status: 'pending',
      reason:
        condition === 'puddled'
          ? SEAT_REVIEW_PENDING_REASONS.puddled
          : SEAT_REVIEW_PENDING_REASONS.wet,
      review,
    };
  }

  const confirmedAtMs = new Date(review.confirmedAt).getTime();

  // 确认时间早于最近材质、遮阴调整
  if (
    bench.materialShadeAdjustedAt &&
    confirmedAtMs < new Date(bench.materialShadeAdjustedAt).getTime()
  ) {
    return { status: 'pending', reason: SEAT_REVIEW_PENDING_REASONS.adjusted, review };
  }

  // 确认超时：按材质有效期判定
  const validMinutes = SEAT_REVIEW_VALID_MINUTES[bench.material] ?? 0;
  const expiresAt = new Date(confirmedAtMs + validMinutes * 60 * 1000);
  if (now >= expiresAt.getTime()) {
    return { status: 'pending', reason: SEAT_REVIEW_PENDING_REASONS.expired, review };
  }

  return { status: 'ok', expiresAt: expiresAt.toISOString(), review };
}

/** 判定一张长椅雨后适坐复核状态 */
export function getSeatReviewStatus(bench: Bench, now: Date = new Date()): SeatReviewResult {
  return (
    isPending(bench, now.getTime()) ?? { status: 'ok' as const }
  );
}

/** 是否需要雨后复核 */
export function needsSeatReview(bench: Bench, now: Date = new Date()): boolean {
  return getSeatReviewStatus(bench, now).status === 'pending';
}

/** 剩余有效分钟数（无效或非干燥返回 0） */
export function getSeatReviewRemainingMinutes(bench: Bench, now: Date = new Date()): number {
  const result = getSeatReviewStatus(bench, now);
  if (!result.expiresAt) return 0;
  return Math.max(0, Math.round((new Date(result.expiresAt).getTime() - now.getTime()) / 60000));
}
