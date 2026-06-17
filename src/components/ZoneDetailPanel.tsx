import { useSentinelStore } from '../store';
import { ARCHETYPE_COLORS, GI_COLORS } from '../data/bengaluru';
import type { Zone } from '../types';

const GI_LABELS: Record<string, string> = {
  Hot99: 'Hotspot 99%', Hot95: 'Hotspot 95%', Hot90: 'Hotspot 90%',
  NotSignificant: 'Not Significant', Cold: 'Cold Spot',
};

interface DonutProps { wrongParking: number; noParking: number; mainRoad: number; other: number }
function Donut({ wrongParking, noParking, mainRoad, other }: DonutProps) {
  const data = [
    { pct: wrongParking, color: '#7c5cbf' },
    { pct: noParking, color: '#cca742' },
    { pct: mainRoad, color: '#FF6B5E' },
    { pct: other, color: '#c9c6c0' },
  ];
  let cumulative = 0;
  const r = 36, cx = 44, cy = 44, strokeW = 10;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 88 88" className="w-28 h-28">
      {data.map((d, i) => {
        const dash = (d.pct / 100) * circ;
        const offset = -(cumulative / 100) * circ;
        cumulative += d.pct;
        return (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r - strokeW / 2 - 2} fill="#f2ede6" />
    </svg>
  );
}

interface MiniBarProps { label: string; pct: number; color: string }
function MiniBar({ label, pct, color }: MiniBarProps) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-label-mono text-[10px] text-on-surface-variant">{label}</span>
        <span className="font-label-mono text-[10px] text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ZoneDetailPanel({ zone }: { zone: Zone }) {
  const { setSelectedZoneId, setSelectedZone } = useSentinelStore();
  const archetypeColor = ARCHETYPE_COLORS[zone.archetype] ?? '#7c5cbf';
  const giColor = GI_COLORS[zone.giClass] ?? '#c9c6c0';

  function close() {
    setSelectedZoneId(null);
    setSelectedZone(null);
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-headline-md text-[18px] text-primary leading-tight">{zone.name}</h3>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full font-label-mono text-[10px] text-white"
              style={{ background: archetypeColor }}
            >{zone.archetype}</span>
            <span
              className="px-2 py-0.5 rounded-full font-label-mono text-[10px]"
              style={{ background: giColor + '33', color: giColor }}
            >{GI_LABELS[zone.giClass]} (z={zone.giZscore.toFixed(1)})</span>
          </div>
        </div>
        <button
          onClick={close}
          className="w-7 h-7 clay-pill flex items-center justify-center text-on-surface-variant shrink-0"
        >
          <span className="ms" style={{fontSize:14}}>close</span>
        </button>
      </div>

      {/* Coordinates */}
      <div className="clay-inset rounded-xl p-3">
        <p className="font-label-mono text-[10px] text-on-surface-variant mb-0.5">COORDINATES</p>
        <p className="font-metric-display text-[13px] text-primary">{zone.lat.toFixed(4)}° N, {zone.lon.toFixed(4)}° E</p>
        <p className="font-label-mono text-[10px] text-on-surface-variant mt-1">{zone.stationName}</p>
      </div>

      {/* Violation mix donut */}
      <div>
        <p className="font-label-mono text-[10px] text-on-surface-variant mb-2 tracking-wider">VIOLATION MIX</p>
        <div className="flex items-center gap-4">
          <Donut {...zone.violationMix} />
          <div className="flex flex-col gap-2 flex-1">
            {[
              { label: 'Wrong Parking', pct: zone.violationMix.wrongParking, color: '#7c5cbf' },
              { label: 'No Parking', pct: zone.violationMix.noParking, color: '#cca742' },
              { label: 'Main Road', pct: zone.violationMix.mainRoad, color: '#FF6B5E' },
              { label: 'Other', pct: zone.violationMix.other, color: '#c9c6c0' },
            ].map((d) => <MiniBar key={d.label} {...d} />)}
          </div>
        </div>
      </div>

      {/* Impact gauge */}
      <div>
        <div className="flex justify-between mb-1.5">
          <p className="font-label-mono text-[10px] text-on-surface-variant tracking-wider">IMPACT INDEX</p>
          <p className="font-metric-display text-[18px] text-primary">{zone.impactIndex}<span className="text-[12px] text-on-surface-variant">/100</span></p>
        </div>
        <div className="h-3 w-full bg-surface-container-high rounded-full clay-inset overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${zone.impactIndex}%`,
              background: zone.impactIndex > 80 ? '#FF6B5E' : zone.impactIndex > 60 ? '#FFB23E' : '#2BC48A',
            }}
          />
        </div>
      </div>

      {/* MoM trend */}
      <div className="clay-inset rounded-xl p-3">
        <p className="font-label-mono text-[10px] text-on-surface-variant mb-1">MONTH-ON-MONTH TREND</p>
        <div className="flex items-center gap-2">
          <span className={`ms ${zone.trendMoM >= 0 ? 'text-error' : 'text-severity-green'}`} style={{fontSize:20}}>
            {zone.trendMoM >= 0 ? 'trending_up' : 'trending_down'}
          </span>
          <span className={`font-metric-display text-[20px] ${zone.trendMoM >= 0 ? 'text-error' : 'text-severity-green'}`}>
            {zone.trendMoM >= 0 ? '+' : ''}{(zone.trendMoM * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Repeat offenders */}
      <div className="clay-inset rounded-xl p-3">
        <p className="font-label-mono text-[10px] text-on-surface-variant mb-1">REPEAT OFFENDERS</p>
        <p className="font-metric-display text-[20px] text-tertiary-container">{zone.repeatOffenderPct.toFixed(1)}%</p>
        <p className="font-label-mono text-[10px] text-on-surface-variant">of violations from repeat plates</p>
      </div>

      {/* Top violations */}
      <div>
        <p className="font-label-mono text-[10px] text-on-surface-variant mb-2 tracking-wider">TOP VIOLATIONS</p>
        <div className="flex flex-col gap-1">
          {zone.topViolations.map((v, i) => (
            <div key={v} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full clay-inset flex items-center justify-center font-label-mono text-[10px] text-primary shrink-0">{i + 1}</div>
              <span className="font-label-mono text-[11px] text-on-surface-variant">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
