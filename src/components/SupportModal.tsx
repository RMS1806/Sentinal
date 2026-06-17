import { useEffect, useRef } from 'react';
import { useSentinelStore } from '../store';

const TEAM = [
  {
    name: 'Rajit Mohan Shrivastava',
    email: 'rajitmonu@gmail.com',
    phone: '+91 70219 46415',
    initials: 'RM',
    color: '#6343a4',
  },
  {
    name: 'Kshitiz Goyal',
    email: 'kshitgoz25@gmail.com',
    phone: '+91 92050 23325',
    initials: 'KG',
    color: '#FF6B5E',
  },
];

export default function SupportModal() {
  const { showSupport, toggleSupport } = useSentinelStore();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSupport) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        toggleSupport();
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleSupport(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [showSupport, toggleSupport]);

  if (!showSupport) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="clay-card relative z-10 w-[420px] p-7 flex flex-col gap-5"
        style={{ animation: 'modal-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Close */}
        <button
          onClick={toggleSupport}
          className="absolute top-4 right-4 w-8 h-8 clay-inset rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="ms" style={{ fontSize: 18 }}>close</span>
        </button>

        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl clay-raised bg-primary-container flex items-center justify-center">
            <span className="ms text-on-primary-container" style={{ fontSize: 24 }}>security</span>
          </div>
          <div>
            <p className="font-metric-display text-[22px] text-primary tracking-tighter leading-none">SENTINEL</p>
            <p className="font-label-mono text-[11px] text-on-surface-variant mt-0.5">AI Parking Intelligence · Bengaluru</p>
          </div>
        </div>

        {/* Hackathon badge */}
        <div className="clay-inset rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <span className="ms text-tertiary-container" style={{ fontSize: 20 }}>emoji_events</span>
          <div>
            <p className="font-headline-md text-[12px] text-primary leading-tight">Flipkart Gridlock Hackathon 2.0</p>
            <p className="font-label-mono text-[10px] text-on-surface-variant">Round 2 — Predictive Enforcement Intelligence</p>
          </div>
        </div>

        {/* Section title */}
        <div>
          <p className="font-label-mono text-[11px] text-on-surface-variant tracking-widest mb-3">CO-ARCHITECTS</p>
          <div className="flex flex-col gap-3">
            {TEAM.map((member) => (
              <div key={member.email} className="clay-card rounded-2xl p-4 flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-metric-display text-sm font-bold text-white"
                  style={{ background: member.color }}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline-md text-[14px] text-on-surface leading-tight">{member.name}</p>
                  <p className="font-label-mono text-[11px] text-primary mt-0.5">{member.email}</p>
                  <p className="font-label-mono text-[11px] text-on-surface-variant">{member.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="font-label-mono text-[10px] text-on-surface-variant text-center">
          Equal contributions in design, data engineering, and UI development
        </p>
      </div>

      <style>{`
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
