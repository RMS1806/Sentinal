import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSentinelStore } from '../../store';
import { ZONES, ARCHETYPE_COLORS, PRIORITY_QUEUE } from '../../data/bengaluru';
import type { ImpactWeights } from '../../types';

const JUNCTION_MULT = 1.25;

const DEFAULT_WEIGHTS: ImpactWeights = {
  'Parking in a Main Road': 1.0,
  'Parking near Road Crossing': 0.95,
  'Parking near Traffic Light/Zebra': 0.95,
  'Double Parking': 0.9,
  'Parking on Footpath': 0.7,
  'Near Bus-Stop/School/Hospital': 0.7,
  'Wrong Parking': 0.55,
  'No Parking': 0.45,
  'Non-Parking Violation': 0.1,
};

const SLIDER_COLORS = [
  '#FF6B5E','#FF6B5E','#FF6B5E',
  '#FFB23E','#FFB23E','#FFB23E',
  '#7c5cbf','#7c5cbf','#c9c6c0',
];

const VTYPE_COLORS = { mainRoad: '#FF6B5E', wrongParking: '#7c5cbf', noParking: '#cca742', other: '#c9c6c0' };

function computeImpact(z: typeof ZONES[0], w: ImpactWeights): number {
  const jMult = z.topViolations.some((v) => v.toLowerCase().includes('junction')) ? JUNCTION_MULT : 1.0;
  const score =
    z.violationMix.mainRoad     * w['Parking in a Main Road'] +
    z.violationMix.wrongParking * w['Wrong Parking'] +
    z.violationMix.noParking    * w['No Parking'] +
    z.violationMix.other        * w['Non-Parking Violation'];
  return Math.min(100, Math.round(score * jMult));
}

function computeDefaultImpact(z: typeof ZONES[0]): number {
  return computeImpact(z, DEFAULT_WEIGHTS);
}

const TS = { fontFamily: 'Space Mono', fontSize: 10, color: '#494551' };

const BAND_LABELS: Record<string, string> = {
  'EarlyAM(05-11)': 'Early Morning',
  'Midday(11-15)': 'Midday',
  'Afternoon(15-22)': 'Afternoon',
  'Night(22-05)': 'Night',
};

export default function ImpactAnalysis() {
  const { impactWeights, setImpactWeight, resetImpactWeights, selectedDow, selectedTimeBand } = useSentinelStore();

  /* ── slot-aware demand scaling ── */
  const slotData = useMemo(() => {
    const key = `${selectedDow}|${selectedTimeBand}`;
    const entries = PRIORITY_QUEUE[key] ?? [];
    const maxFc = Math.max(...entries.map((e) => e.forecast), 1);
    const map: Record<string, { norm: number; forecast: number }> = {};
    entries.forEach((e) => { map[e.zoneId] = { norm: e.forecast / maxFc, forecast: e.forecast }; });
    return map;
  }, [selectedDow, selectedTimeBand]);

  /* ── per-zone impacts, demand-scaled by current slot ── */
  const zoneImpacts = useMemo(() =>
    ZONES.map((z) => {
      const demand = slotData[z.id]?.norm ?? 0.3;
      const demandFactor = 0.38 + demand * 0.62;
      const weighted = Math.min(100, Math.round(computeImpact(z, impactWeights) * demandFactor));
      const raw      = Math.min(100, Math.round(computeDefaultImpact(z) * demandFactor));
      return { ...z, weighted, raw, delta: weighted - raw, demand, slotForecast: slotData[z.id]?.forecast ?? 0 };
    }).sort((a, b) => b.weighted - a.weighted),
  [impactWeights, slotData]);

  const top8 = zoneImpacts.slice(0, 8);

  /* ── 1. Raw vs Weighted grouped bar ── */
  const rankingOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { name: string; value: number; seriesName: string }[]) =>
        `<span style="font-family:Space Mono;font-size:11px"><strong>${p[0].name}</strong><br/>` +
        p.map((s) => `${s.seriesName}: <strong>${s.value}</strong>`).join('<br/>') + '</span>',
    },
    legend: {
      data: ['Default weights', 'Live weights'],
      bottom: 0, textStyle: TS,
    },
    grid: { top: 8, bottom: 32, left: 10, right: 20, containLabel: true },
    xAxis: {
      type: 'value', max: 100,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } },
      axisLabel: TS,
    },
    yAxis: {
      type: 'category',
      data: top8.map((z) => z.name),
      axisLabel: { ...TS, fontSize: 11, fontFamily: 'Plus Jakarta Sans' },
    },
    series: [
      {
        name: 'Default weights', type: 'bar',
        data: top8.map((z) => z.raw),
        barGap: '-100%', barCategoryGap: '40%',
        itemStyle: { color: '#7c5cbf', opacity: 0.22, borderRadius: [0, 4, 4, 0] },
        z: 1,
      },
      {
        name: 'Live weights', type: 'bar',
        data: top8.map((z) => ({
          value: z.weighted,
          itemStyle: {
            color: z.weighted >= 70 ? '#FF6B5E' : z.weighted >= 50 ? '#FFB23E' : '#7c5cbf',
            borderRadius: [0, 4, 4, 0],
          },
          label: { show: true, position: 'right', formatter: `${z.weighted}`, ...TS },
        })),
        barCategoryGap: '40%',
        z: 2,
      },
    ],
  }), [top8]);

  /* ── 2. Violation contribution stacked bar ── */
  const contribOption = useMemo(() => {
    const zones = zoneImpacts.slice(0, 10);
    const makeContrib = (z: typeof zones[0]) => ({
      mainRoad:     Math.round(z.violationMix.mainRoad     * impactWeights['Parking in a Main Road']),
      wrongParking: Math.round(z.violationMix.wrongParking * impactWeights['Wrong Parking']),
      noParking:    Math.round(z.violationMix.noParking    * impactWeights['No Parking']),
      other:        Math.round(z.violationMix.other        * impactWeights['Non-Parking Violation']),
    });
    const contribs = zones.map(makeContrib);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: ['Main Road Parking', 'Wrong Parking', 'No Parking', 'Other'],
        bottom: 0, textStyle: TS,
      },
      grid: { top: 8, bottom: 36, left: 10, right: 20, containLabel: true },
      xAxis: {
        type: 'value',
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } },
        axisLabel: TS,
      },
      yAxis: {
        type: 'category',
        data: zones.map((z) => z.name),
        axisLabel: { ...TS, fontSize: 10, fontFamily: 'Plus Jakarta Sans' },
      },
      series: [
        { name: 'Main Road Parking', type: 'bar', stack: 'total', data: contribs.map((c) => c.mainRoad),     itemStyle: { color: VTYPE_COLORS.mainRoad } },
        { name: 'Wrong Parking',     type: 'bar', stack: 'total', data: contribs.map((c) => c.wrongParking), itemStyle: { color: VTYPE_COLORS.wrongParking } },
        { name: 'No Parking',        type: 'bar', stack: 'total', data: contribs.map((c) => c.noParking),    itemStyle: { color: VTYPE_COLORS.noParking } },
        { name: 'Other',             type: 'bar', stack: 'total', data: contribs.map((c) => c.other),        itemStyle: { color: VTYPE_COLORS.other } },
      ],
    };
  }, [zoneImpacts, impactWeights]);

  /* ── 3. Forecast vs Impact scatter (slot-aware) ── */
  const scatterOption = useMemo(() => {
    const maxFc = Math.max(...zoneImpacts.map((z) => z.slotForecast), 1);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p: { data: [number, number, number, string, string] }) => {
          const [fc, imp, , name, arch] = p.data;
          return `<span style="font-family:Space Mono;font-size:11px"><strong>${name}</strong><br/>${arch}<br/>Forecast: ${fc} violations · Impact: ${imp}</span>`;
        },
      },
      grid: { top: 16, bottom: 36, left: 48, right: 16 },
      xAxis: {
        type: 'value', name: `${selectedDow} ${BAND_LABELS[selectedTimeBand]} — Forecast Violations`, nameLocation: 'middle', nameGap: 28,
        nameTextStyle: TS,
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } },
        axisLabel: TS,
      },
      yAxis: {
        type: 'value', name: 'Impact Score', nameLocation: 'middle', nameGap: 40,
        nameTextStyle: TS,
        min: 0, max: 100,
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } },
        axisLabel: TS,
      },
      series: [{
        type: 'scatter',
        symbolSize: (d: number[]) => 8 + d[2] * 22,
        data: zoneImpacts.map((z) => [
          z.slotForecast,
          z.weighted,
          Math.max(0, z.trendMoM),
          z.name,
          z.archetype,
        ]),
        itemStyle: {
          color: (p: { data: [number, number, number, string, string] }) =>
            ARCHETYPE_COLORS[p.data[4]] ?? '#7c5cbf',
          opacity: 0.82,
          borderWidth: 1.5,
          borderColor: '#fef9f1',
        },
        label: {
          show: true, position: 'top',
          formatter: (p: { data: unknown[] }) => String(p.data[3]).split(' ')[0],
          ...TS, fontSize: 9,
        },
      }],
      markLine: {
        silent: true,
        lineStyle: { type: 'dashed', color: '#e7e2db' },
        data: [{ type: 'average', name: 'Avg Impact' }],
      },
    };
  }, [zoneImpacts, selectedDow, selectedTimeBand]);

  /* ── delta for re-ranking panel ── */
  const topDefault = useMemo(() =>
    [...ZONES].map((z) => ({ id: z.id, name: z.name, raw: computeDefaultImpact(z) }))
      .sort((a, b) => b.raw - a.raw)
      .map((z, i) => ({ ...z, defaultRank: i + 1 })),
  []);

  const reranked = useMemo(() =>
    zoneImpacts.slice(0, 6).map((z) => {
      const prev = topDefault.find((t) => t.id === z.id)?.defaultRank ?? 20;
      return { ...z, prevRank: prev, move: prev - (zoneImpacts.findIndex((zi) => zi.id === z.id) + 1) };
    }),
  [zoneImpacts, topDefault]);

  return (
    <div className="flex gap-4 p-4 h-full overflow-hidden">
      {/* ── Left: Charts ── */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-headline-lg text-[22px] text-on-surface">Impact Analysis</h1>
            <p className="font-body-md text-[12px] text-on-surface-variant mt-0.5 max-w-lg">
              Rankings and scores update with the day &amp; time band selected in the sidebar.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="clay-inset rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-severity-green animate-pulse shrink-0" />
              <span className="font-label-mono text-[10px] text-primary">
                {selectedDow} · {BAND_LABELS[selectedTimeBand]}
              </span>
            </div>
            <div className="clay-inset rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="ms text-tertiary-container" style={{ fontSize: 13 }}>science</span>
              <span className="font-label-mono text-[10px] text-secondary">
                score = severity × demand
              </span>
            </div>
          </div>
        </div>

        {/* ── Chart 1: Zone rankings ── */}
        <div className="clay-card p-5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-md text-[14px] text-on-surface">Zone Impact Rankings</h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary-container opacity-30" />
                <span className="font-label-mono text-[10px] text-on-surface-variant">Default weights</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: '#FF6B5E' }} />
                <span className="font-label-mono text-[10px] text-on-surface-variant">Live weights</span>
              </div>
            </div>
          </div>
          <ReactECharts option={rankingOption} style={{ height: 240 }} notMerge />
        </div>

        {/* ── Chart 2: Contribution breakdown ── */}
        <div className="clay-card p-5 shrink-0">
          <h3 className="font-headline-md text-[14px] text-on-surface mb-1">
            What's Driving Each Zone's Score
          </h3>
          <p className="font-label-mono text-[10px] text-on-surface-variant mb-3">
            Stacked segments = each violation type's weighted contribution to the total impact score
          </p>
          <ReactECharts option={contribOption} style={{ height: 260 }} notMerge />
        </div>

        {/* ── Chart 3: Forecast vs Impact scatter ── */}
        <div className="clay-card p-5 shrink-0">
          <h3 className="font-headline-md text-[14px] text-on-surface mb-1">
            Forecast vs Severity — Where to Deploy?
          </h3>
          <p className="font-label-mono text-[10px] text-on-surface-variant mb-3">
            X-axis = predicted violations for <strong>{selectedDow} {BAND_LABELS[selectedTimeBand]}</strong>. Top-right = deploy first. Bubble = MoM growth.
          </p>
          <ReactECharts option={scatterOption} style={{ height: 260 }} notMerge />
        </div>

        {/* Transparency note */}
        <div className="clay-inset rounded-xl p-4 flex gap-3 shrink-0">
          <span className="ms text-tertiary-container shrink-0" style={{ fontSize: 20 }}>lightbulb</span>
          <div>
            <p className="font-label-mono text-[11px] text-primary font-bold mb-1">Model Transparency</p>
            <p className="font-label-mono text-[10px] text-on-surface-variant leading-relaxed">
              No direct traffic-flow field exists in the dataset. Impact = severity-weighted violation mix × junction proximity multiplier (×1.25 for named junctions). The sliders let you stress-test whether rankings remain logical — drag "Parking in Main Road" to zero and observe how commercial zones drop below residential ones.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Sliders + Live Re-rank ── */}
      <div className="w-[280px] flex flex-col gap-4 overflow-y-auto shrink-0">

        {/* Live re-ranking */}
        <div className="clay-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 border-b border-surface-container-high pb-2 mb-1">
            <span className="ms text-severity-coral" style={{ fontSize: 16 }}>leaderboard</span>
            <h3 className="font-headline-md text-[13px] text-on-surface">Live Re-rank</h3>
          </div>
          {reranked.map((z, i) => (
            <div key={z.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-label-mono text-[10px] text-white shrink-0 ${
                i === 0 ? 'bg-severity-coral' : i === 1 ? 'bg-severity-amber' : 'bg-primary-container'
              }`}>
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-label-mono text-[11px] text-on-surface truncate">{z.name}</p>
                <div className="w-full h-1.5 bg-surface-container-high rounded-full mt-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${z.weighted}%`,
                      background: z.weighted >= 70 ? '#FF6B5E' : z.weighted >= 50 ? '#FFB23E' : '#7c5cbf',
                    }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-metric-display text-[14px] text-primary">{z.weighted}</span>
                {z.move !== 0 && (
                  <div className={`flex items-center gap-0.5 justify-end font-label-mono text-[9px] ${z.move > 0 ? 'text-severity-coral' : 'text-severity-green'}`}>
                    <span className="ms" style={{ fontSize: 10 }}>{z.move > 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                    {Math.abs(z.move)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Severity sliders */}
        <div className="clay-card p-4 flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
            <div className="flex items-center gap-2">
              <span className="ms text-primary" style={{ fontSize: 16 }}>tune</span>
              <h3 className="font-headline-md text-[13px] text-on-surface">Severity Weights</h3>
            </div>
            <button
              onClick={resetImpactWeights}
              className="font-label-mono text-[10px] text-on-surface-variant hover:text-primary transition-colors"
            >
              Reset
            </button>
          </div>

          {(Object.keys(DEFAULT_WEIGHTS) as (keyof ImpactWeights)[]).map((key, i) => {
            const val = impactWeights[key];
            const def = DEFAULT_WEIGHTS[key];
            const color = SLIDER_COLORS[i];
            const changed = Math.abs(val - def) > 0.01;
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label className={`font-label-mono text-[10px] leading-tight pr-2 ${changed ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                    {key.replace('Parking ', '').replace('near ', '').replace('Near ', '')}
                  </label>
                  <span className="font-metric-display text-[16px] shrink-0" style={{ color }}>
                    {val.toFixed(2)}
                    {changed && <span className="font-label-mono text-[9px] text-on-surface-variant ml-1">({def.toFixed(2)})</span>}
                  </span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={val}
                  onChange={(e) => setImpactWeight(key, parseFloat(e.target.value))}
                  style={{ accentColor: color } as React.CSSProperties}
                  className="w-full"
                />
              </div>
            );
          })}

          <div className="clay-inset rounded-xl p-2 mt-auto">
            <p className="font-label-mono text-[10px] text-on-surface-variant">
              Junction mult: <strong className="text-primary">×{JUNCTION_MULT}</strong> for violations at named junctions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
