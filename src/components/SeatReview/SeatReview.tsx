import { useEffect, useState } from 'react';
import { CloudRain, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Bench, SeatConditionType } from '@/types';
import { SEAT_CONDITION_LABELS } from '@/types';
import { useBenchStore } from '@/store/useBenchStore';
import {
  getSeatReviewStatus,
  getSeatReviewRemainingMinutes,
  needsSeatReview,
  SEAT_REVIEW_VALID_MINUTES,
} from '@/utils/seatReview';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CONDITION_STYLES: Record<SeatConditionType, string> = {
  dry: 'bg-moss-green text-white hover:bg-moss-light',
  wet: 'bg-ochre text-white hover:bg-ochre/90',
  puddled: 'bg-sky-600 text-white hover:bg-sky-500',
};

const REGISTER_CONDITIONS: SeatConditionType[] = ['dry', 'wet', 'puddled'];

/** 详情页：雨后适坐复核登记面板 */
export function SeatReviewPanel({ bench }: { bench: Bench }) {
  const confirmSeatReview = useBenchStore((state) => state.confirmSeatReview);

  // 每 30 秒重算一次，使超时状态与剩余时间自动更新
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const now = new Date();
  const result = getSeatReviewStatus(bench, now);
  const isOk = result.status === 'ok';
  const remaining = getSeatReviewRemainingMinutes(bench, now);
  const validMinutes = SEAT_REVIEW_VALID_MINUTES[bench.material];
  const currentCondition = bench.seatReview?.seatCondition;

  return (
    <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-2">
      <div className="flex items-center gap-2 mb-4">
        <CloudRain className="w-5 h-5 text-ochre" />
        <h2 className="font-serif text-lg font-semibold text-deep-brown">
          雨后适坐复核
        </h2>
      </div>

      <div
        className={`flex items-start gap-3 p-3 rounded-lg mb-4 ${
          isOk ? 'bg-moss-green/10' : 'bg-ochre/10'
        }`}
      >
        {isOk ? (
          <CheckCircle2 className="w-5 h-5 text-moss-green flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
        )}
        <div>
          <div className={`text-sm font-medium ${isOk ? 'text-moss-green' : 'text-ochre'}`}>
            {isOk ? '坐面干燥，可放心落座' : '待复核'}
          </div>
          <div className="text-xs text-ink-light mt-0.5">
            {isOk
              ? `材质有效期 ${validMinutes} 分钟，剩余约 ${remaining} 分钟`
              : result.reason}
          </div>
        </div>
      </div>

      {bench.seatReview?.confirmedAt && (
        <div className="flex justify-between text-xs text-ink-light mb-4">
          <span>确认时间</span>
          <span className="text-deep-brown">
            {formatDateTime(bench.seatReview.confirmedAt)}
            {currentCondition && (
              <span className="ml-1.5">（{SEAT_CONDITION_LABELS[currentCondition]}）</span>
            )}
          </span>
        </div>
      )}

      <div className="text-xs text-ink-light mb-2">登记雨后坐面状况（记录确认时间）</div>
      <div className="grid grid-cols-3 gap-2">
        {REGISTER_CONDITIONS.map((condition) => (
          <button
            key={condition}
            type="button"
            onClick={() => confirmSeatReview(bench.id, condition)}
            className={`px-2 py-2 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5 ${
              currentCondition === condition
                ? CONDITION_STYLES[condition]
                : 'bg-white/60 text-ink-light hover:bg-white'
            }`}
          >
            {SEAT_CONDITION_LABELS[condition]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 列表卡片：待复核角标 */
export function SeatReviewBadge({ bench }: { bench: Bench }) {
  if (!needsSeatReview(bench)) return null;

  return (
    <div className="absolute bottom-3 left-3 px-2 py-1 bg-ochre/90 backdrop-blur-sm rounded-full text-xs font-medium text-white flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      待复核
    </div>
  );
}
