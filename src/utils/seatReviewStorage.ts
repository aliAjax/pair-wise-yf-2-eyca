import type { Bench, SeatReview } from '@/types';

const SEAT_REVIEW_KEY = 'bench-archive-seat-reviews';

type SeatReviewMap = Record<string, SeatReview>;

/** 读取全部雨后复核记录（刷新保留） */
export function loadSeatReviews(): SeatReviewMap {
  try {
    const data = localStorage.getItem(SEAT_REVIEW_KEY);
    if (data) {
      return JSON.parse(data) as SeatReviewMap;
    }
  } catch (error) {
    console.error('Failed to load seat reviews from localStorage:', error);
  }
  return {};
}

export function saveSeatReviews(reviews: SeatReviewMap): void {
  try {
    localStorage.setItem(SEAT_REVIEW_KEY, JSON.stringify(reviews));
  } catch (error) {
    console.error('Failed to save seat reviews to localStorage:', error);
  }
}

/** 将复核记录合并到长椅列表（旧记录缺坐面字段时按待复核处理） */
export function mergeSeatReviews(
  benches: Bench[],
  reviews: SeatReviewMap = loadSeatReviews(),
): Bench[] {
  return benches.map((bench) => {
    const review = reviews[bench.id];
    return review ? { ...bench, seatReview: review } : bench;
  });
}

/** 写入单张长椅的复核记录，返回更新后的全量映射 */
export function writeSeatReview(
  reviews: SeatReviewMap,
  benchId: string,
  review: SeatReview,
): SeatReviewMap {
  const next = { ...reviews, [benchId]: review };
  saveSeatReviews(next);
  return next;
}
