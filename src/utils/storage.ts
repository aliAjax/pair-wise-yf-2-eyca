import type { Bench } from '@/types';

const STORAGE_KEY = 'bench-archive-data';

/** seatReview 来自独立存储，主数据不持久化该字段 */
function stripSeatReview(benches: Bench[]): Bench[] {
  return benches.map(({ seatReview: _seatReview, ...bench }) => {
    void _seatReview;
    return bench;
  });
}

export function loadBenches(): Bench[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load benches from localStorage:', error);
  }
  return [];
}

export function saveBenches(benches: Bench[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripSeatReview(benches)));
  } catch (error) {
    console.error('Failed to save benches to localStorage:', error);
  }
}

export function clearBenches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear benches from localStorage:', error);
  }
}
