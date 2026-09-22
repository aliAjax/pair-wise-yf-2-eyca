import { useEffect, useSyncExternalStore, useState } from 'react';
import { CloudRain, CheckCircle2, AlertTriangle, Droplets } from 'lucide-react';
import type { Bench, SeatSurfaceType } from '@/types';
import { MATERIAL_LABELS, SEAT_SURFACE_LABELS } from '@/types';
import type { SeatCheckRecord } from '@/utils/seatCheck';
import { getSeatCheckResult, getSeatValidityMinutes } from '@/utils/seatCheck';
import {
  getSeatCheckRecords,
  recordSeatCheck,
  subscribeSeatChecks,
} from '@/utils/seatCheckStorage';

/** 订阅全部雨后复核记录（存储变化时触发界面更新） */
export function useSeatCheckRecords(): SeatCheckRecord[] {
  return useSyncExternalStore(
    subscribeSeatChecks,
    getSeatCheckRecords,
    getSeatCheckRecords,
  );
}

export function useSeatCheckForBench(benchId: string): SeatCheckRecord | undefined {
  return useSeatCheckRecords().find((record) => record.benchId === benchId);
}

/** 定时触发界面刷新，使超时状态随时间自动生效 */
export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SURFACE_OPTIONS: SeatSurfaceType[] = ['dry', 'wet', 'pooled'];

interface SeatCheckPanelProps {
  bench: Bench;
}

/** 雨后适坐复核：详情页登记坐面状态并展示当前判定结果 */
export default function SeatCheckPanel({ bench }: SeatCheckPanelProps) {
  const record = useSeatCheckForBench(bench.id);
  const now = useNow();
  const [surface, setSurface] = useState<SeatSurfaceType>('dry');
  const result = getSeatCheckResult(bench, record, now);

  const handleConfirm = () => {
    recordSeatCheck(bench.id, surface);
  };

  return (
    <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-3">
      <h2 className="font-serif text-lg font-semibold text-deep-brown mb-1 flex items-center gap-2">
        <CloudRain className="w-5 h-5 text-ochre" />
        雨后适坐复核
      </h2>
      <p className="text-xs text-ink-light/70 mb-4">
        {MATERIAL_LABELS[bench.material]}坐面确认后 {getSeatValidityMinutes(bench.material)} 分钟内有效
      </p>

      {result.status === 'eligible' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-moss-green/10 text-moss-green">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">坐面干燥，可放心落座</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-light">坐面状态</span>
              <span className="text-deep-brown">
                {result.record?.surface ? SEAT_SURFACE_LABELS[result.record.surface] : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">确认时间</span>
              <span className="text-deep-brown">
                {result.record ? formatDateTime(new Date(result.record.checkedAt)) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">有效截止</span>
              <span className="text-deep-brown">
                {result.expiresAt ? formatDateTime(result.expiresAt) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">剩余有效</span>
              <span className="text-moss-green font-medium">
                {result.remainingMinutes !== null ? `${result.remainingMinutes} 分钟` : '-'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-ochre/10 text-ochre">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">待复核</div>
              <div className="text-xs text-ink-light mt-0.5">{result.reason}</div>
            </div>
          </div>
          {result.record && (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-light">坐面状态</span>
                <span className="text-deep-brown">
                  {result.record.surface ? SEAT_SURFACE_LABELS[result.record.surface] : '未记录'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-light">确认时间</span>
                <span className="text-deep-brown">
                  {formatDateTime(new Date(result.record.checkedAt))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-deep-brown/10">
        <label className="block text-xs text-ink-light mb-2">登记当前坐面</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {SURFACE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSurface(option)}
              className={`px-2 py-2 text-sm rounded-lg border transition-colors ${
                surface === option
                  ? 'border-moss-green bg-moss-green/10 text-moss-green font-medium'
                  : 'border-deep-brown/10 bg-white/50 text-ink-light hover:bg-white'
              }`}
            >
              {SEAT_SURFACE_LABELS[option]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-moss-green hover:bg-moss-light rounded-lg transition-colors"
        >
          <Droplets className="w-4 h-4" />
          确认雨后复核
        </button>
      </div>
    </div>
  );
}
