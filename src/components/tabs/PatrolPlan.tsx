import { useMemo } from 'react';
import { useSentinelStore } from '../../store';
import { PRIORITY_QUEUE, ARCHETYPE_COLORS, MODEL_METRICS, ZONES, getVehicleShare, VEHICLE_KEY_MAP } from '../../data/bengaluru';
import type { PriorityEntry } from '../../types';

const TREND_ICON = (t: number) => t > 0.05 ? 'trending_up' : t < -0.05 ? 'trending_down' : 'trending_flat';
const TREND_COLOR = (t: number) => t > 0.05 ? '#ba1a1a' : t < -0.05 ? '#2BC48A' : '#cca742';

function SeverityBar({ value }: { value: number }) {
  const color = value >= 80 ? '#FF6B5E' : value >= 60 ? '#FFB23E' : '#2BC48A';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-surface-container-high rounded-full overflow-hidden clay-inset">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-metric-display text-[11px] text-primary w-6">{value}</span>
    </div>
  );
}

export default function PatrolPlan() {
  const {
    selectedDow, setSelectedDow, selectedTimeBand, setSelectedTimeBand,
    patrolTeams, setPatrolTeams,
    priorityWeights, setPriorityWeight,
    setSelectedZoneId, setSelectedZone, setFilterChip,
    selectedVehicleTypes,
  } = useSentinelStore();

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const BANDS = ['EarlyAM(05-11)','Midday(11-15)','Afternoon(15-22)','Night(22-05)'];
  const BAND_LABELS = ['Early AM (05-11)','Midday (11-15)','Afternoon (15-22)','Night (22-05)'];

  const queueKey = `${selectedDow}|${selectedTimeBand}`;
  const rawQueue: PriorityEntry[] = useMemo(() => PRIORITY_QUEUE[queueKey] ?? [], [queueKey]);

  /* live recompute priority with custom weights + vehicle filter */
  const queue: PriorityEntry[] = useMemo(() => {
    const { demand, impact, trend } = priorityWeights;
    const maxF = Math.max(...rawQueue.map((e) => e.forecast), 1);
    const sorted = rawQueue.map((e) => {
      const d = e.forecast / maxF;
      const i = e.impactIndex / 100;
      const t = Math.max(0, Math.min(1, 0.5 + e.trend));
      let priority = Math.round((Math.pow(d, demand) * Math.pow(i, impact) * Math.pow(t, trend)) * 100);
      if (selectedVehicleTypes.length > 0) {
        const zone = ZONES.find((z) => z.id === e.zoneId);
        if (zone) {
          const share = getVehicleShare(zone.vehicleMix, selectedVehicleTypes);
          priority = Math.round(priority * (0.35 + share * 0.65));
        }
      }
      return { ...e, priority };
    }).sort((a, b) => b.priority - a.priority);
    return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [rawQueue, priorityWeights, selectedVehicleTypes]);

  return (
    <div className="flex gap-4 p-4 h-full overflow-hidden">
      {/* ── Main queue panel ── */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Controls row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Day selector */}
          <div className="clay-raised rounded-full p-1 flex">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDow(d as typeof selectedDow)}
                className={`px-3 py-1.5 rounded-full font-label-mono text-[11px] transition-all ${
                  selectedDow === d
                    ? 'bg-primary-container text-on-primary-container shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.4),inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Band selector */}
          <div className="clay-raised rounded-full p-1 flex gap-1">
            {BANDS.map((b, i) => (
              <button
                key={b}
                onClick={() => setSelectedTimeBand(b as typeof selectedTimeBand)}
                className={`px-3 py-1.5 rounded-full font-label-mono text-[11px] transition-all flex items-center gap-1 ${
                  selectedTimeBand === b
                    ? 'bg-primary-container text-on-primary-container shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.4),inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="ms" style={{fontSize:12}}>schedule</span>
                {BAND_LABELS[i].split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Patrol teams */}
          <div className="clay-raised rounded-full flex items-center p-1 gap-1 ml-auto">
            <span className="font-label-mono text-[11px] text-on-surface-variant px-2">Teams:</span>
            <button onClick={() => setPatrolTeams(patrolTeams - 1)} className="w-7 h-7 rounded-full clay-inset flex items-center justify-center text-primary hover:scale-105">
              <span className="ms" style={{fontSize:14}}>remove</span>
            </button>
            <span className="font-metric-display text-[18px] text-primary w-8 text-center">{patrolTeams}</span>
            <button onClick={() => setPatrolTeams(patrolTeams + 1)} className="w-7 h-7 rounded-full clay-inset flex items-center justify-center text-primary hover:scale-105">
              <span className="ms" style={{fontSize:14}}>add</span>
            </button>
          </div>
        </div>

        {/* Queue header */}
        <div className="clay-card overflow-hidden flex flex-col flex-1">
          <div className="px-5 py-3 border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-headline-md text-[16px] text-on-surface">
              Dispatch Priority Queue
              <span className="font-label-mono text-[12px] text-on-surface-variant ml-3">
                {selectedDow} · {selectedTimeBand.replace(/\(.*\)/,'').trim()}
              </span>
            </h2>
            {selectedVehicleTypes.length > 0 && (
              <div className="flex items-center gap-1 bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-label-mono text-[10px] shrink-0">
                <span className="ms" style={{ fontSize: 12 }}>filter_alt</span>
                {selectedVehicleTypes.join(' + ')}
              </div>
            )}
          </div>

          {/* Column legend */}
          <div className="flex items-center gap-3 px-5 py-1.5 bg-surface-container-low border-b border-surface-container flex-wrap">
            {[
              { col: 'FORECAST', desc: 'AI-predicted violations for this slot' },
              { col: 'SEVERITY', desc: 'Weighted impact 0–100 (violation type × junction proximity)' },
              { col: 'MoM', desc: 'Month-over-month growth trend' },
              { col: 'SCORE', desc: 'demand⁰·⁵ × severity⁰·³ × trend⁰·² (tune via sliders →)' },
            ].map(({ col, desc }) => (
              <div key={col} className="flex items-center gap-1">
                <span className="font-label-mono text-[9px] text-primary font-bold">{col}</span>
                <span className="font-label-mono text-[9px] text-on-surface-variant">= {desc}</span>
              </div>
            ))}
          </div>

          {/* Table header */}
          <div className="grid px-5 py-2 font-label-mono text-[10px] text-on-surface-variant tracking-widest border-b border-surface-container"
               style={{gridTemplateColumns:'40px 1fr 80px 80px 60px 100px 1fr'}}>
            <div title="Dispatch priority rank">#</div>
            <div title="Zone / police station cluster">ZONE</div>
            <div className="text-right" title="LightGBM-Poisson predicted violation count for this day × time band">FORECAST</div>
            <div className="text-right" title="Severity-weighted impact index 0–100">SEVERITY</div>
            <div className="text-center" title="Month-over-month change: ↑ growing hotspot · → stable · ↓ declining">MoM</div>
            <div className="text-center" title="Composite priority score: demand^0.5 × severity^0.3 × trend^0.2">SCORE</div>
            <div className="pl-2" title="Plain-language rationale for this zone's rank">RATIONALE</div>
          </div>

          {/* Queue rows */}
          <div className="flex-1 overflow-y-auto">
            {queue.map((entry, idx) => {
              const isTop = idx < patrolTeams;
              const archetypeColor = ARCHETYPE_COLORS[entry.archetype] ?? '#7c5cbf';
              const priorityDotColor = entry.priority >= 80 ? '#FF6B5E' : entry.priority >= 60 ? '#FFB23E' : '#2BC48A';
              if (isTop) {
                return (
                  <button
                    key={entry.zoneId}
                    onClick={() => {
                      const z = ZONES.find((z) => z.id === entry.zoneId);
                      if (z) { setSelectedZoneId(z.id); setSelectedZone(z); setFilterChip(z.name); }
                    }}
                    className="w-full grid px-5 py-3 items-center clay-plum mx-3 my-1 rounded-xl transition-all hover:-translate-y-0.5 text-left"
                    style={{gridTemplateColumns:'40px 1fr 80px 80px 60px 100px 1fr', width:'calc(100% - 24px)'}}
                  >
                    <div className="font-metric-display text-[14px] text-on-primary-container opacity-80">
                      {String(entry.rank).padStart(2,'0')}
                    </div>
                    <div>
                      <p className="font-headline-md text-[13px] text-on-primary-container">{entry.zoneName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-label-mono text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white/90">
                          {entry.archetype}
                        </span>
                        {(() => {
                          const zone = ZONES.find((z) => z.id === entry.zoneId);
                          if (!zone) return null;
                          const mix = zone.vehicleMix;
                          const vks: Array<['scooter'|'car'|'motorcycle'|'auto', string]> = [['scooter','#c4b5fd'],['car','#fde68a'],['motorcycle','#fca5a5'],['auto','#6ee7b7']];
                          return (
                            <div className="flex h-1.5 w-14 rounded-full overflow-hidden gap-px">
                              {vks.map(([k, color]) => {
                                const isSelected = selectedVehicleTypes.length === 0 || selectedVehicleTypes.some(t => VEHICLE_KEY_MAP[t] === k);
                                return <div key={k} style={{ width: `${mix[k]}%`, background: color, opacity: isSelected ? 1 : 0.2 }} />;
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-right font-metric-display text-[14px] text-on-primary-container">{entry.forecast}</div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-12 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-white/80" style={{width:`${entry.impactIndex}%`}} />
                        </div>
                        <span className="font-metric-display text-[11px] text-on-primary-container w-6">{entry.impactIndex}</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <span className="ms" style={{fontSize:18, color: entry.trend > 0.05 ? '#ffdad6' : entry.trend < -0.05 ? '#d2f5e7' : '#f8efff'}}>
                        {TREND_ICON(entry.trend)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                      <div className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{width:`${entry.priority}%`}} />
                      </div>
                      <span className="font-metric-display text-[11px] text-on-primary-container w-7 shrink-0">{entry.priority}</span>
                    </div>
                    <div className="font-label-mono text-[10px] text-on-primary-container/70 pl-2 truncate">{entry.why}</div>
                  </button>
                );
              }
              return (
                <button
                  key={entry.zoneId}
                  onClick={() => {
                    const z = ZONES.find((z) => z.id === entry.zoneId);
                    if (z) { setSelectedZoneId(z.id); setSelectedZone(z); setFilterChip(z.name); }
                  }}
                  className="w-full grid px-5 py-3 items-center border-b border-surface-container transition-all hover:-translate-y-0.5 hover:bg-surface-container-low text-left"
                  style={{gridTemplateColumns:'40px 1fr 80px 80px 60px 100px 1fr'}}
                >
                  <div className="font-metric-display text-[14px] text-on-surface-variant flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{background: priorityDotColor}} />
                    {String(entry.rank).padStart(2,'0')}
                  </div>
                  <div>
                    <p className="font-headline-md text-[13px] text-on-surface">{entry.zoneName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-label-mono text-[9px] px-1.5 py-0.5 rounded-full text-white" style={{background: archetypeColor}}>
                        {entry.archetype}
                      </span>
                      {(() => {
                        const zone = ZONES.find((z) => z.id === entry.zoneId);
                        if (!zone) return null;
                        const mix = zone.vehicleMix;
                        const vks: Array<['scooter'|'car'|'motorcycle'|'auto', string]> = [['scooter','#7c5cbf'],['car','#cca742'],['motorcycle','#FF6B5E'],['auto','#2BC48A']];
                        return (
                          <div className="flex h-1.5 w-14 rounded-full overflow-hidden gap-px">
                            {vks.map(([k, color]) => {
                              const isSelected = selectedVehicleTypes.length === 0 || selectedVehicleTypes.some(t => VEHICLE_KEY_MAP[t] === k);
                              return <div key={k} style={{ width: `${mix[k]}%`, background: color, opacity: isSelected ? 1 : 0.15 }} />;
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right font-metric-display text-[14px] text-on-surface-variant">{entry.forecast}</div>
                  <div className="text-right">
                    <SeverityBar value={entry.impactIndex} />
                  </div>
                  <div className="flex justify-center">
                    <span className="ms" style={{fontSize:18, color: TREND_COLOR(entry.trend)}}>
                      {TREND_ICON(entry.trend)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <div className="flex-1 h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${entry.priority}%`, background: priorityDotColor}} />
                    </div>
                    <span className="font-metric-display text-[11px] text-on-surface-variant w-7 shrink-0">{entry.priority}</span>
                  </div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant pl-2 truncate">{entry.why}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right panel: weights + ML metrics ── */}
      <div className="w-64 flex flex-col gap-4 overflow-y-auto shrink-0">
        {/* Priority weight sliders */}
        <div className="clay-card p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-[14px] text-on-surface flex items-center gap-2">
              <span className="ms text-primary" style={{fontSize:16}}>tune</span>
              Score Weights
            </h3>
            <span className="font-label-mono text-[9px] text-on-surface-variant">SCORE = F^d × S^s × G^g</span>
          </div>
          {(Object.entries(priorityWeights) as [string, number][]).map(([key, val]) => {
            const meta: Record<string, { label: string; desc: string; col: string }> = {
              demand: { label: 'Forecast weight',  desc: 'How much predicted violation count drives rank',   col: '(F)' },
              impact: { label: 'Severity weight',  desc: 'How much the junction-weighted severity score drives rank', col: '(S)' },
              trend:  { label: 'Growth weight',    desc: 'How much month-over-month growth drives rank',     col: '(G)' },
            };
            const m = meta[key];
            return (
            <div key={key}>
              <div className="flex justify-between mb-0.5">
                <span className="font-label-mono text-[11px] text-on-surface">{m.label} <span className="text-primary">{m.col}</span></span>
                <span className="font-metric-display text-[14px] text-primary">{(val * 100).toFixed(0)}%</span>
              </div>
              <p className="font-label-mono text-[9px] text-on-surface-variant mb-1">{m.desc}</p>
              <input
                type="range" min="0.05" max="0.8" step="0.05"
                value={val}
                onChange={(e) => setPriorityWeight(key as keyof typeof priorityWeights, parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          );
          })}

        </div>

        {/* Patrol coverage card */}
        {(() => {
          const totalForecast = queue.reduce((s, z) => s + z.forecast, 0);
          const coveredForecast = queue.slice(0, patrolTeams).reduce((s, z) => s + z.forecast, 0);
          const coveragePct = totalForecast > 0 ? Math.round((coveredForecast / totalForecast) * 100) : 0;
          return (
            <div className="clay-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="ms text-primary" style={{fontSize:16}}>shield</span>
                <h3 className="font-headline-md text-[14px] text-on-surface">Patrol Coverage</h3>
              </div>
              <div className="clay-inset rounded-xl p-3 flex flex-col gap-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-label-mono text-[10px] text-on-surface-variant">Violations intercepted</span>
                  <span className="font-metric-display text-[20px] text-primary">{coveragePct}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${coveragePct}%`, background: coveragePct >= 70 ? '#2BC48A' : coveragePct >= 50 ? '#FFB23E' : '#FF6B5E' }}
                  />
                </div>
                <p className="font-label-mono text-[9px] text-on-surface-variant mt-0.5">
                  {patrolTeams} teams · top {patrolTeams} zones · {coveredForecast} of {totalForecast} predicted
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 clay-inset rounded-xl p-2 text-center">
                  <p className="font-metric-display text-[16px] text-primary">{patrolTeams}</p>
                  <p className="font-label-mono text-[9px] text-on-surface-variant">Teams</p>
                </div>
                <div className="flex-1 clay-inset rounded-xl p-2 text-center">
                  <p className="font-metric-display text-[16px] text-primary">{20 - patrolTeams}</p>
                  <p className="font-label-mono text-[9px] text-on-surface-variant">Unpatrolled</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Feature importance */}
        <div className="clay-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="ms text-primary" style={{fontSize:16}}>bar_chart</span>
            <h3 className="font-headline-md text-[14px] text-on-surface">Feature Importance</h3>
          </div>
          {[
            { feat: 'Lag-7 count', pct: 82 },
            { feat: 'Day of week', pct: 68 },
            { feat: 'Zone archetype', pct: 55 },
            { feat: 'Is weekend', pct: 48 },
            { feat: 'Time band', pct: 42 },
            { feat: 'Impact index', pct: 36 },
          ].map((f) => (
            <div key={f.feat}>
              <div className="flex justify-between mb-0.5">
                <span className="font-label-mono text-[10px] text-on-surface-variant">{f.feat}</span>
                <span className="font-label-mono text-[10px] text-primary">{f.pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary-container rounded-full" style={{width:`${f.pct}%`}} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
