import type { SeatSurfaceType } from '@/types';
import type { SeatCheckRecord } from '@/utils/seatCheck';

const SEAT_CHECK_STORAGE_KEY = 'bench-seat-check-data';

type Listener = (records: SeatCheckRecord[]) => void;

let cache: SeatCheckRecord[] | null = null;
const listeners = new Set<Listener>();

function loadRecords(): SeatCheckRecord[] {
  try {
    const data = localStorage.getItem(SEAT_CHECK_STORAGE_KEY);
    if (data) {
      const parsed: unknown = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is SeatCheckRecord =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as SeatCheckRecord).benchId === 'string' &&
            typeof (item as SeatCheckRecord).checkedAt === 'string',
        );
      }
    }
  } catch (error) {
    console.error('Failed to load seat check records:', error);
  }
  return [];
}

function persist(records: SeatCheckRecord[]): void {
  try {
    localStorage.setItem(SEAT_CHECK_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save seat check records:', error);
  }
}

function commit(next: SeatCheckRecord[]): void {
  cache = next;
  persist(next);
  listeners.forEach((listener) => listener(next));
}

/** 读取全部复核记录（会话内缓存，刷新页面后从 localStorage 恢复） */
export function getSeatCheckRecords(): SeatCheckRecord[] {
  if (cache === null) {
    cache = loadRecords();
  }
  return cache;
}

export function getSeatCheckByBench(benchId: string): SeatCheckRecord | undefined {
  return getSeatCheckRecords().find((record) => record.benchId === benchId);
}

/**
 * 登记雨后坐面复核。只更新当前长椅，其余记录保持不变。
 */
export function recordSeatCheck(benchId: string, surface: SeatSurfaceType): SeatCheckRecord {
  const record: SeatCheckRecord = {
    benchId,
    surface,
    checkedAt: new Date().toISOString(),
  };
  commit(
    getSeatCheckRecords()
      .filter((item) => item.benchId !== benchId)
      .concat(record),
  );
  return record;
}

/** 删除长椅时清理对应复核记录 */
export function removeSeatCheck(benchId: string): void {
  commit(getSeatCheckRecords().filter((item) => item.benchId !== benchId));
}

export function subscribeSeatChecks(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
