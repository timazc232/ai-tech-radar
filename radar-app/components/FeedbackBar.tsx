'use client';

import { useState } from 'react';

const REASONS = ['已读', '不相关领域', '噪音', '重复'];

export function FeedbackBar({ eventId, compact = false }: { eventId: string; compact?: boolean }) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [acted, setActed] = useState<string | null>(null);

  async function sendFeedback(action: string, reason?: string) {
    const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const res = await fetch(`/api/events/${eventId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, clientRequestId: reqId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? '反馈失败');
      }
      setToast(reason ? `${action}: ${reason}` : action);
      setActed(action);
      setReasonOpen(false);
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-1'} relative flex-wrap`}>
      <FeedbackBtn active={acted === 'useful'} tone="green" onClick={() => sendFeedback('useful')} icon="up" label="有用" />
      <FeedbackBtn active={acted === 'irrelevant'} tone="red" onClick={() => setReasonOpen((v) => !v)} icon="down" label="不相关" />
      <FeedbackBtn active={acted === 'save'} tone="blue" onClick={() => sendFeedback('save')} icon="star" label="收藏" />
      <FeedbackBtn active={acted === 'later'} tone="slate" onClick={() => sendFeedback('later')} icon="clock" label="稍后" />
      {reasonOpen && (
        <div className="absolute top-9 left-0 sm:left-[88px] card-elevated p-1.5 shadow-2xl z-20 flex flex-col gap-0.5 min-w-[140px]">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => sendFeedback('irrelevant', r)}
              className="text-xs text-left px-2.5 py-1.5 hover:bg-[var(--bg-panel)] rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {toast && <span className="text-xs text-[var(--radar)] ml-1 mono">✓ {toast}</span>}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: 'hover:border-emerald-500/50 hover:text-emerald-400',
  red: 'hover:border-red-500/50 hover:text-red-400',
  blue: 'hover:border-sky-500/50 hover:text-sky-400',
  slate: 'hover:border-slate-500/50 hover:text-slate-300',
  activeGreen: 'border-emerald-500/60 text-emerald-400 bg-emerald-500/5',
  activeRed: 'border-red-500/60 text-red-400 bg-red-500/5',
  activeBlue: 'border-sky-500/60 text-sky-400 bg-sky-500/5',
  activeSlate: 'border-slate-500/60 text-slate-300 bg-slate-500/5',
};

function FeedbackBtn({
  active, tone, onClick, icon, label,
}: { active: boolean; tone: string; onClick: () => void; icon: string; label: string }) {
  const hover = TONES[tone] ?? '';
  const activeCls = active ? TONES[`active${tone[0].toUpperCase()}${tone.slice(1)}`] : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn !py-1 !px-2 ${active ? activeCls : hover}`}
    >
      <FeedbackIcon name={icon} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FeedbackIcon({ name }: { name: string }) {
  const cls = 'h-3.5 w-3.5';
  if (name === 'up') return <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M12 4 5 12h4v8h6v-8h4z" /></svg>;
  if (name === 'down') return <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M12 20l7-8h-4V4h-6v8H5z" /></svg>;
  if (name === 'star') return <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.6 9.1l5.8-.8z" /></svg>;
  return <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
