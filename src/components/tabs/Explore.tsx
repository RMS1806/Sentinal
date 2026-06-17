import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EDA_DATA, ARCHETYPE_COLORS, ZONES } from '../../data/bengaluru';
import { useSentinelStore } from '../../store';

const CHART_TEXT_STYLE = { fontFamily: 'Space Mono', fontSize: 10, color: '#494551' };
const CHART_BG = 'transparent';

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`clay-card p-5 flex flex-col gap-3 ${className}`}>
      <h3 className="font-headline-md text-[15px] text-on-surface">{title}</h3>
      {children}
    </div>
  );
}

const VEH_COLORS = ['#6343a4', '#cca742', '#FF6B5E', '#2BC48A'];
const FILTER_TYPES = ['Scooter', 'Car', 'Motorcycle', 'Passenger Auto'];

export default function Explore() {
  const { selectedVehicleTypes } = useSentinelStore();
  /* ── Monthly trend ── */
  const monthlyOption = useMemo(() => ({
    backgroundColor: CHART_BG,
    tooltip: { trigger: 'axis', formatter: (p: {name:string;value:number}[]) => `<span style="font-family:Space Mono;font-size:11px">${p[0].name}: <strong>${p[0].value.toLocaleString()}</strong></span>` },
    grid: { top: 10, bottom: 30, left: 48, right: 12 },
    xAxis: { type: 'category', data: EDA_DATA.monthly.map((d) => d.month), axisLabel: CHART_TEXT_STYLE, axisLine: { lineStyle: { color: '#e7e2db' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { ...CHART_TEXT_STYLE, formatter: (v:number) => v >= 1000 ? (v/1000)+'k' : v }, splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      data: EDA_DATA.monthly.map((d) => d.count), type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color: '#6343a4', width: 2.5 },
      itemStyle: { color: '#6343a4', borderWidth: 2, borderColor: '#fef9f1' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,67,164,0.25)' }, { offset: 1, color: 'rgba(99,67,164,0)' }] } },
    }],
  }), []);

  /* ── Day-of-week bars ── */
  const dailyOption = useMemo(() => ({
    backgroundColor: CHART_BG,
    tooltip: { trigger: 'axis', formatter: (p: {name:string;value:number}[]) => `<span style="font-family:Space Mono;font-size:11px">${p[0].name}: <strong>${p[0].value.toLocaleString()}</strong></span>` },
    grid: { top: 10, bottom: 30, left: 10, right: 10, containLabel: true },
    xAxis: { type: 'category', data: EDA_DATA.daily.map((d) => d.day), axisLabel: CHART_TEXT_STYLE, axisLine: { lineStyle: { color: '#e7e2db' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { ...CHART_TEXT_STYLE, formatter: (v:number) => v >= 1000 ? (v/1000)+'k' : v }, splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      data: EDA_DATA.daily.map((d, i) => ({
        value: d.count,
        itemStyle: { color: i >= 5 ? '#FF6B5E' : '#7c5cbf', borderRadius: [4,4,0,0] },
      })),
      type: 'bar', barCategoryGap: '35%',
    }],
  }), []);

  /* ── Station leaderboard ── */
  const stationOption = useMemo(() => ({
    backgroundColor: CHART_BG,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, bottom: 8, left: 8, right: 50, containLabel: true },
    xAxis: { type: 'value', axisLabel: { ...CHART_TEXT_STYLE, formatter: (v:number) => v >= 1000 ? (v/1000)+'k' : v }, splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: EDA_DATA.stations.map((s) => s.name), axisLabel: CHART_TEXT_STYLE },
    series: [{
      data: EDA_DATA.stations.map((s, i) => ({
        value: s.count,
        itemStyle: { color: i === 0 ? '#FF6B5E' : i < 3 ? '#FFB23E' : '#7c5cbf', borderRadius: [0,4,4,0] },
      })),
      type: 'bar', barMaxWidth: 20, label: { show: true, position: 'right', formatter: (p:{value:number}) => p.value >= 1000 ? (p.value/1000).toFixed(1)+'k' : p.value, textStyle: CHART_TEXT_STYLE },
    }],
  }), []);

  /* ── Vehicle type donut — highlights selected types ── */
  const vehicleOption = useMemo(() => {
    const filtered = EDA_DATA.vehicles.filter((v) => FILTER_TYPES.includes(v.type));
    const totalFiltered = selectedVehicleTypes.length > 0
      ? filtered.filter((v) => selectedVehicleTypes.includes(v.type)).reduce((s, v) => s + v.count, 0)
      : null;
    return {
      backgroundColor: CHART_BG,
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) =>
        `<span style="font-family:Space Mono;font-size:11px"><strong>${p.name}</strong>: ${p.value.toLocaleString()} (${p.percent.toFixed(1)}%)</span>` },
      legend: { bottom: 0, textStyle: CHART_TEXT_STYLE },
      graphic: totalFiltered ? [{
        type: 'text', left: 'center', top: '36%',
        style: { text: `${(totalFiltered / 1000).toFixed(0)}k\nselected`, fill: '#6343a4', font: 'bold 14px Sora', textAlign: 'center' },
      }] : [],
      series: [{
        name: 'Vehicle', type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        data: filtered.map((v, i) => {
          const isActive = selectedVehicleTypes.length === 0 || selectedVehicleTypes.includes(v.type);
          return {
            name: v.type, value: v.count,
            itemStyle: {
              color: VEH_COLORS[i],
              opacity: isActive ? 1 : 0.12,
              borderWidth: isActive && selectedVehicleTypes.length > 0 ? 2 : 0,
              borderColor: '#fef9f1',
            },
            emphasis: {
              scale: isActive,
              scaleSize: 6,
              itemStyle: { shadowBlur: isActive ? 10 : 0, shadowColor: 'rgba(0,0,0,0.25)' },
            },
          };
        }),
        label: { show: false },
      }],
    };
  }, [selectedVehicleTypes]);

  /* ── Violation type chart ── */
  const violationOption = useMemo(() => ({
    backgroundColor: CHART_BG,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, bottom: 8, left: 8, right: 60, containLabel: true },
    xAxis: { type: 'value', axisLabel: { ...CHART_TEXT_STYLE, formatter: (v:number) => v >= 1000 ? (v/1000)+'k' : v }, splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: EDA_DATA.violations.filter((v) => v.count > 1000).map((v) => v.type.replace('Parking ','').replace('near ','').replace('/','/')), axisLabel: { ...CHART_TEXT_STYLE, fontSize: 9 } },
    series: [{
      data: EDA_DATA.violations.filter((v) => v.count > 1000).map((v, i) => ({
        value: v.count,
        itemStyle: { color: i === 0 ? '#7c5cbf' : i === 1 ? '#cca742' : '#FF6B5E', opacity: 1 - i * 0.08, borderRadius: [0,4,4,0] },
      })),
      type: 'bar', barMaxWidth: 16,
      label: { show: true, position: 'right', formatter: (p:{value:number}) => p.value >= 1000 ? (p.value/1000).toFixed(0)+'k' : p.value, textStyle: CHART_TEXT_STYLE },
    }],
  }), []);

  /* ── Junction load ── */
  const junctionOption = useMemo(() => ({
    backgroundColor: CHART_BG,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, bottom: 8, left: 8, right: 50, containLabel: true },
    xAxis: { type: 'value', axisLabel: { ...CHART_TEXT_STYLE, formatter: (v:number) => v >= 1000 ? (v/1000)+'k' : v }, splitLine: { lineStyle: { color: '#e7e2db', type: 'dashed' } }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: EDA_DATA.junctions.map((j) => j.name), axisLabel: CHART_TEXT_STYLE },
    series: [{
      data: EDA_DATA.junctions.map((j, i) => ({
        value: j.count,
        itemStyle: { color: i === 0 ? '#FF6B5E' : i < 2 ? '#FFB23E' : '#7c5cbf', borderRadius: [0,4,4,0] },
      })),
      type: 'bar', barMaxWidth: 20,
      label: { show: true, position: 'right', formatter: (p:{value:number}) => p.value >= 1000 ? (p.value/1000).toFixed(1)+'k' : p.value, textStyle: CHART_TEXT_STYLE },
    }],
  }), []);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <h1 className="font-headline-lg text-[22px] text-on-surface">Explore Data</h1>
        <p className="font-label-mono text-[12px] text-on-surface-variant mt-1">
          248,376 enforcement records · 20 zones · Bengaluru city-wide
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 pb-8">
        {/* Monthly trend */}
        <SectionCard title="Seasonal Violation Pattern" className="col-span-2">
          <div className="flex gap-4 mb-2">
            {[{l:'Weekday avg',v:'40.8k/day',c:'text-primary'},{l:'Weekend avg',v:'47.3k/day',c:'text-tertiary-container'},{l:'Peak period',v:'Weekends',c:'text-error'}].map((s) => (
              <div key={s.l}>
                <p className="font-label-mono text-[9px] text-on-surface-variant">{s.l}</p>
                <p className={`font-metric-display text-[18px] ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>
          <ReactECharts option={monthlyOption} style={{height: 180}} notMerge />
        </SectionCard>

        {/* Repeat offenders highlight */}
        <div className="clay-card p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-error opacity-10 rounded-full blur-2xl" />
          <div>
            <h3 className="font-headline-md text-[15px] text-on-surface">Repeat Offenders</h3>
            <p className="font-label-mono text-[11px] text-on-surface-variant mt-1">Plates flagged for multiple violations</p>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-metric-display text-[56px] leading-none text-error">{EDA_DATA.repeatOffenders.pct_violations}</span>
              <span className="font-metric-display text-[24px] text-error">%</span>
            </div>
            <p className="font-label-mono text-[11px] text-on-surface-variant">of all violations</p>
          </div>
          <div className="clay-inset rounded-xl p-3">
            <p className="font-label-mono text-[11px] text-primary">
              from only <strong>{EDA_DATA.repeatOffenders.pct_vehicles}%</strong> of vehicles
            </p>
            <div className="mt-2 h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-error rounded-full" style={{width: `${EDA_DATA.repeatOffenders.pct_vehicles}%`}} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-error">
            <span className="ms" style={{fontSize:14}}>trending_up</span>
            <span className="font-label-mono text-[10px]">+2.4% from last month</span>
          </div>
        </div>

        {/* Day of week */}
        <SectionCard title="Day-of-Week Pattern">
          <p className="font-label-mono text-[10px] text-on-surface-variant">Sunday highest (50.2k) · Monday lowest (34.7k)</p>
          <ReactECharts option={dailyOption} style={{height: 180}} notMerge />
        </SectionCard>

        {/* Station leaderboard */}
        <SectionCard title="Top Police Stations">
          <ReactECharts option={stationOption} style={{height: 180}} notMerge />
        </SectionCard>

        {/* Vehicle types */}
        <SectionCard title={selectedVehicleTypes.length > 0 ? `Vehicle Mix · ${selectedVehicleTypes.join(' + ')}` : 'Vehicle Type Mix'}>
          {selectedVehicleTypes.length > 0 && (() => {
            const sel = EDA_DATA.vehicles.filter((v) => selectedVehicleTypes.includes(v.type));
            const total = EDA_DATA.vehicles.filter((v) => FILTER_TYPES.includes(v.type)).reduce((s, v) => s + v.count, 0);
            const selTotal = sel.reduce((s, v) => s + v.count, 0);
            return (
              <div className="clay-inset rounded-xl p-2 flex items-center justify-between">
                <span className="font-label-mono text-[10px] text-on-surface-variant">Share of all violations</span>
                <span className="font-metric-display text-[18px] text-primary">
                  {((selTotal / total) * 100).toFixed(1)}%
                </span>
              </div>
            );
          })()}
          <ReactECharts option={vehicleOption} style={{height: 200}} notMerge />
        </SectionCard>

        {/* Violation types */}
        <SectionCard title="Violation Type Distribution" className="col-span-2">
          <ReactECharts option={violationOption} style={{height: 200}} notMerge />
        </SectionCard>

        {/* Junction load */}
        <SectionCard title="Junction Load">
          <p className="font-label-mono text-[10px] text-on-surface-variant">147.9k rows have no named junction</p>
          <ReactECharts option={junctionOption} style={{height: 160}} notMerge />
        </SectionCard>

        {/* Zone archetype breakdown */}
        <SectionCard title="Zone Archetypes" className="col-span-3">
          <div className="grid grid-cols-6 gap-3">
            {Object.entries(ARCHETYPE_COLORS).map(([arch, color]) => {
              const zoneCount = ZONES.filter((z) => z.archetype === arch).length;
              const totalCount = ZONES.filter((z) => z.archetype === arch).reduce((s, z) => s + z.count, 0);
              return (
                <div key={arch} className="clay-inset rounded-xl p-3 text-center">
                  <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{background: color + '33', border: `2px solid ${color}`}}>
                    <div className="w-3 h-3 rounded-full" style={{background: color}} />
                  </div>
                  <p className="font-label-mono text-[9px] text-on-surface-variant">{arch}</p>
                  <p className="font-metric-display text-[18px] mt-1" style={{color}}>{zoneCount}</p>
                  <p className="font-label-mono text-[9px] text-on-surface-variant">{(totalCount/1000).toFixed(0)}k violations</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Intelligence summary badge */}
        <div className="col-span-3 clay-card rounded-2xl p-5 flex items-center gap-6">
          {[
            { icon: 'location_on',   color: '#6343a4', label: 'Zones Monitored',    value: '20',       sub: 'across Bengaluru' },
            { icon: 'schedule',      color: '#FFB23E', label: 'Forecast Slots',     value: '28',       sub: '7 days × 4 time bands' },
            { icon: 'my_location',   color: '#FF6B5E', label: 'High-Priority Zones', value: '8',        sub: 'consistently top-ranked' },
            { icon: 'trending_up',   color: '#2BC48A', label: 'Fastest Growth',     value: '+66%',     sub: 'Magadi Road MoM' },
          ].map((s) => (
            <div key={s.label} className="flex-1 clay-inset rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + '22' }}>
                <span className="ms" style={{ fontSize: 20, color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <p className="font-metric-display text-[18px] text-primary leading-none">{s.value}</p>
                <p className="font-label-mono text-[10px] text-on-surface leading-tight mt-0.5">{s.label}</p>
                <p className="font-label-mono text-[9px] text-on-surface-variant">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
