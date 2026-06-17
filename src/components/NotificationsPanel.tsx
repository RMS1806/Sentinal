import { useEffect, useRef } from 'react';
import { useSentinelStore } from '../store';
import { PRIORITY_QUEUE } from '../data/bengaluru';
import type { DayOfWeek, TimeBand } from '../types';

const DAY_NAMES: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BAND_MAP: { hours: [number, number]; band: TimeBand; label: string }[] = [
  { hours: [5, 11],  band: 'EarlyAM(05-11)',    label: 'Early Morning' },
  { hours: [11, 15], band: 'Midday(11-15)',       label: 'Midday' },
  { hours: [15, 22], band: 'Afternoon(15-22)',    label: 'Afternoon' },
  { hours: [22, 24], band: 'Night(22-05)',         label: 'Night' },
  { hours: [0, 5],   band: 'Night(22-05)',         label: 'Night' },
];

function getCurrentSlot(): { dow: DayOfWeek; band: TimeBand; bandLabel: string; timeStr: string } {
  const now = new Date();
  const dow = DAY_NAMES[now.getDay()];
  const h = now.getHours();
  const m = now.getMinutes();
  const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const found = BAND_MAP.find(({ hours }) => h >= hours[0] && h < hours[1]) ?? BAND_MAP[3];
  return { dow, band: found.band, bandLabel: found.label, timeStr };
}

const STATIC_ALERTS = [
  {
    icon: 'trending_up',
    color: '#FF6B5E',
    title: 'Magadi Road surging +66% MoM',
    body: 'Fastest-growing hotspot in the dataset. Demand is accelerating — increase patrol frequency.',
    time: '3 min ago',
  },
  {
    icon: 'repeat',
    color: '#FFB23E',
    title: 'High Ground PS: 42.3% repeat offenders',
    body: 'Highest recidivism in city. Presence-based deterrence has low ROI here — consider penalty escalation.',
    time: '8 min ago',
  },
  {
    icon: 'analytics',
    color: '#6343a4',
    title: 'Shivajinagar: consistent #1 zone',
    body: 'Ranks #1 or #2 across all time bands and days. Highest combined demand + severity score in the city.',
    time: '12 min ago',
  },
];

export default function NotificationsPanel() {
  const { showNotifications, toggleNotifications } = useSentinelStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const { dow, band, bandLabel, timeStr } = getCurrentSlot();
  const slotKey = `${dow}|${band}`;
  const topZones = (PRIORITY_QUEUE[slotKey] ?? []).slice(0, 3);

  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        toggleNotifications();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications, toggleNotifications]);

  return (
    <>
      {/* Backdrop */}
      {showNotifications && (
        <div className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px]" />
      )}

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-[380px] z-[100] flex flex-col"
        style={{
          transform: showNotifications ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div className="clay-nav h-full flex flex-col rounded-none rounded-l-3xl overflow-hidden shadow-[-12px_0_40px_rgba(99,67,164,0.15)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container-high">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                <span className="ms text-on-primary-container" style={{ fontSize: 16 }}>notifications_active</span>
              </div>
              <div>
                <p className="font-headline-md text-[15px] text-primary leading-tight">Live Alerts</p>
                <p className="font-label-mono text-[10px] text-on-surface-variant">{timeStr} · {dow} {bandLabel}</p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className="w-8 h-8 clay-inset rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="ms" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {/* Live slot title */}
            <div className="clay-inset rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-severity-green animate-pulse shrink-0" />
              <p className="font-label-mono text-[11px] text-primary tracking-wider">
                REAL-TIME · {dow.toUpperCase()} {bandLabel.toUpperCase()}
              </p>
            </div>

            {/* Top-3 dynamic alerts for current slot */}
            {topZones.length > 0 && (
              <div className="flex flex-col gap-2">
                {topZones.map((z, i) => (
                  <div key={z.zoneId} className="clay-card rounded-2xl p-4 flex gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-metric-display text-sm font-bold"
                      style={{
                        background: i === 0 ? '#FF6B5E22' : i === 1 ? '#FFB23E22' : '#6343a422',
                        color: i === 0 ? '#FF6B5E' : i === 1 ? '#FFB23E' : '#6343a4',
                      }}
                    >
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-headline-md text-[14px] text-on-surface leading-tight">{z.zoneName}</p>
                        <span className="font-label-mono text-[10px] text-on-surface-variant shrink-0">just now</span>
                      </div>
                      <p className="font-label-mono text-[11px] text-on-surface-variant mt-0.5">
                        {z.forecast} violations forecast · priority score {z.priority}
                      </p>
                      <p className="font-body-md text-[12px] text-on-surface-variant mt-1 leading-snug">{z.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 border-t border-surface-container-high" />
              <p className="font-label-mono text-[10px] text-on-surface-variant">ONGOING INTELLIGENCE</p>
              <div className="flex-1 border-t border-surface-container-high" />
            </div>

            {/* Static smart alerts */}
            {STATIC_ALERTS.map((alert) => (
              <div key={alert.title} className="clay-card rounded-2xl p-4 flex gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: alert.color + '22' }}
                >
                  <span className="ms" style={{ fontSize: 18, color: alert.color }}>{alert.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-headline-md text-[13px] text-on-surface leading-tight">{alert.title}</p>
                    <span className="font-label-mono text-[10px] text-on-surface-variant shrink-0">{alert.time}</span>
                  </div>
                  <p className="font-body-md text-[11px] text-on-surface-variant mt-1 leading-snug">{alert.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-surface-container-high">
            <p className="font-label-mono text-[10px] text-on-surface-variant text-center">
              Powered by LightGBM-Poisson · 28-slot forecast model · Updated live
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
