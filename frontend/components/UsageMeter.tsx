interface UsageMeterProps {
  used?: number;
  limit?: number;
}

export default function UsageMeter({ used = 0, limit = 10 }: UsageMeterProps) {
  const unlimited = limit === -1;
  const safeUsed = Math.max(0, used);
  const safeLimit = unlimited ? safeUsed : Math.max(1, limit);
  const percent = unlimited ? 0 : Math.min(100, Math.round((safeUsed / safeLimit) * 100));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI Generations</h2>
          <p className="text-xs text-slate-500">
            {unlimited ? 'Unlimited access is currently enabled.' : 'Usage resets with your billing cycle.'}
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {unlimited ? `${safeUsed} / Unlimited` : `${safeUsed} / ${safeLimit}`}
        </p>
      </div>

      {!unlimited && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </section>
  );
}
