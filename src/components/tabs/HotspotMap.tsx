import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useSentinelStore } from '../../store';
import {
  ZONES, PRIORITY_QUEUE,
  getHeatmapGeoJSONForSlice, getZonesGeoJSONForSlice,
  ARCHETYPE_COLORS, getVehicleShare,
} from '../../data/bengaluru';
import ZoneDetailPanel from '../ZoneDetailPanel';
import type { MapLayer, DayOfWeek, TimeBand } from '../../types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const CENTER: [number, number] = [77.595, 12.972];
const LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'heat',     label: 'Heat' },
  { id: 'cluster',  label: 'Zone Type' },
  { id: 'priority', label: 'Priority' },
];
const DAYS: { full: DayOfWeek; short: string }[] = [
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
];
const BANDS: { id: TimeBand; label: string }[] = [
  { id: 'EarlyAM(05-11)', label: 'Early AM' },
  { id: 'Midday(11-15)', label: 'Midday' },
  { id: 'Afternoon(15-22)', label: 'Afternoon' },
  { id: 'Night(22-05)', label: 'Night' },
];

export default function HotspotMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const tooltipEl = useRef<HTMLDivElement | null>(null);
  const mapReady = useRef(false);

  // Keep refs so the async map-load callback always reads latest values
  const dowRef  = useRef<string>('Sunday');
  const bandRef = useRef<string>('EarlyAM(05-11)');

  const {
    activeMapLayer, setActiveMapLayer,
    selectedZone, selectedZoneId, setSelectedZoneId, setSelectedZone, setFilterChip,
    selectedDow, setSelectedDow, selectedTimeBand, setSelectedTimeBand,
    selectedVehicleTypes,
  } = useSentinelStore();

  // Keep refs in sync with store
  useEffect(() => { dowRef.current  = selectedDow; },       [selectedDow]);
  useEffect(() => { bandRef.current = selectedTimeBand; }, [selectedTimeBand]);

  /* ── initialise map once ── */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: CENTER,
      zoom: 11.5,
      minZoom: 9,
      maxZoom: 18,
    });
    map.current = m;

    const tooltip = document.createElement('div');
    tooltip.className = 'map-tooltip';
    tooltip.style.display = 'none';
    mapContainer.current.appendChild(tooltip);
    tooltipEl.current = tooltip;

    m.on('load', () => {
      const initKey  = `${dowRef.current}|${bandRef.current}`;
      const heatData = getHeatmapGeoJSONForSlice(initKey);
      const zonesData = getZonesGeoJSONForSlice(initKey);

      /* ── HEAT LAYER ── */
      m.addSource('heat-src', { type: 'geojson', data: heatData as GeoJSON.FeatureCollection });
      m.addLayer({
        id: 'heat-layer', type: 'heatmap', source: 'heat-src',
        paint: {
          'heatmap-weight':     ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity':  ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 4],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(43,196,138,0)',
            0.15, 'rgba(43,196,138,0.5)',
            0.4,  'rgba(255,178,62,0.7)',
            0.7,  'rgba(255,107,94,0.85)',
            1,    'rgba(255,107,94,1)'],
          'heatmap-radius':  ['interpolate', ['linear'], ['zoom'], 9, 22, 14, 60],
          'heatmap-opacity': 0.9,
        },
      });

      /* ── CLUSTER + PRIORITY LAYERS share the same source ── */
      m.addSource('zones-cluster-src', { type: 'geojson', data: zonesData as GeoJSON.FeatureCollection });
      m.addLayer({
        id: 'cluster-fill', type: 'fill', source: 'zones-cluster-src', layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'match', ['get', 'archetype'],
            'Market-Choke',        ARCHETYPE_COLORS['Market-Choke'],
            'Metro-Spillover',     ARCHETYPE_COLORS['Metro-Spillover'],
            'Commercial-Strip',    ARCHETYPE_COLORS['Commercial-Strip'],
            'Hospital-School',     ARCHETYPE_COLORS['Hospital-School'],
            'Residential-Overflow',ARCHETYPE_COLORS['Residential-Overflow'],
            ARCHETYPE_COLORS['Transit-Corridor'],
          ],
          'fill-opacity': ['interpolate', ['linear'], ['get', 'forecast_norm'], 0, 0.05, 1, 0.65],
        },
      });
      m.addLayer({
        id: 'cluster-outline', type: 'line', source: 'zones-cluster-src', layout: { visibility: 'none' },
        paint: {
          'line-color': ['match', ['get', 'archetype'],
            'Market-Choke',     ARCHETYPE_COLORS['Market-Choke'],
            'Metro-Spillover',  ARCHETYPE_COLORS['Metro-Spillover'],
            'Commercial-Strip', ARCHETYPE_COLORS['Commercial-Strip'],
            ARCHETYPE_COLORS['Transit-Corridor']],
          'line-width':   2,
          'line-opacity': ['interpolate', ['linear'], ['get', 'forecast_norm'], 0, 0.1, 1, 0.8],
        },
      });

      /* ── PRIORITY LAYER — zones coloured by current-slot priority score ── */
      m.addLayer({
        id: 'priority-fill', type: 'fill', source: 'zones-cluster-src', layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'priority'],
            0,  '#2BC48A',
            45, '#FFB23E',
            75, '#FF6B5E',
          ],
          'fill-opacity': ['interpolate', ['linear'], ['get', 'forecast_norm'], 0, 0.06, 1, 0.75],
        },
      });
      m.addLayer({
        id: 'priority-outline', type: 'line', source: 'zones-cluster-src', layout: { visibility: 'none' },
        paint: {
          'line-color': [
            'interpolate', ['linear'], ['get', 'priority'],
            0,  '#2BC48A',
            45, '#FFB23E',
            75, '#FF6B5E',
          ],
          'line-width':   2,
          'line-opacity': ['interpolate', ['linear'], ['get', 'forecast_norm'], 0, 0.15, 1, 0.9],
        },
      });

      /* ── Clickable hit-area (always on top) ── */
      m.addLayer({
        id: 'zone-hit', type: 'fill', source: 'zones-cluster-src',
        paint: { 'fill-color': 'transparent', 'fill-opacity': 0 },
      });

      /* ── HOVER tooltip — shows forecast for current slice ── */
      m.on('mousemove', 'zone-hit', (e) => {
        const props = e.features?.[0]?.properties;
        if (!props || !tooltipEl.current) return;
        m.getCanvas().style.cursor = 'pointer';
        tooltipEl.current.style.display = 'block';
        tooltipEl.current.style.left = e.point.x + 16 + 'px';
        tooltipEl.current.style.top  = e.point.y - 10 + 'px';
        const fc = props.forecast ?? '—';
        tooltipEl.current.innerHTML = `
          <strong style="font-family:Sora;font-size:13px;color:#6343a4">${props.name}</strong><br/>
          <span style="font-family:Space Mono;font-size:11px;color:#494551">${props.archetype}</span><br/>
          <span style="font-family:Space Mono;font-size:11px;color:#1d1b17">Forecast: <strong>${fc}</strong> · Impact ${props.impact_index}</span>
        `;
      });
      m.on('mouseleave', 'zone-hit', () => {
        m.getCanvas().style.cursor = '';
        if (tooltipEl.current) tooltipEl.current.style.display = 'none';
      });

      /* ── Click → fly to zone ── */
      m.on('click', 'zone-hit', (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const zone = ZONES.find((z) => z.id === props.zone_id);
        if (!zone) return;
        setSelectedZoneId(zone.id);
        setSelectedZone(zone);
        setFilterChip(zone.name);
        m.flyTo({ center: [zone.lon, zone.lat], zoom: 14, speed: 1.2, curve: 1.4 });
      });

      /* ── Pulsing marker on #1 impact zone ── */
      const topZone = ZONES.reduce((a, b) => (b.impactIndex > a.impactIndex ? b : a));
      const el = document.createElement('div');
      el.className = 'pulse-coral';
      el.style.cssText = 'width:14px;height:14px;background:#FF6B5E;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 12px rgba(255,107,94,0.7)';
      new maplibregl.Marker({ element: el }).setLngLat([topZone.lon, topZone.lat]).addTo(m);

      mapReady.current = true;
    });

    return () => { m.remove(); map.current = null; mapReady.current = false; };
  }, []);

  /* ── Update map sources when day, band, OR vehicle filter changes ── */
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady.current) return;

    const key = `${selectedDow}|${selectedTimeBand}`;
    const vFiltered = selectedVehicleTypes.length > 0;

    // Zone polygons: scale forecast_norm by vehicle share when filter active
    const rawZones = getZonesGeoJSONForSlice(key) as { type: string; features: any[] };
    const zonesData = vFiltered ? {
      ...rawZones,
      features: rawZones.features.map((f: any) => {
        const zone = ZONES.find((z) => z.id === f.properties.zone_id);
        const share = zone ? getVehicleShare(zone.vehicleMix, selectedVehicleTypes) : 0;
        return { ...f, properties: { ...f.properties, forecast_norm: f.properties.forecast_norm * share } };
      }),
    } : rawZones;

    // Heatmap: regenerate scatter points with vehicle-weighted density
    const entries = PRIORITY_QUEUE[key] ?? [];
    const maxFc = Math.max(...entries.map((e) => e.forecast), 1);
    const heatFeatures: object[] = [];
    entries.forEach((entry) => {
      const zone = ZONES.find((z) => z.id === entry.zoneId);
      if (!zone) return;
      const share = vFiltered ? getVehicleShare(zone.vehicleMix, selectedVehicleTypes) : 1;
      const nPts = Math.max(0, Math.ceil((entry.forecast / maxFc) * 80 * share));
      const w = (entry.impactIndex / 100) * share;
      for (let i = 0; i < nPts; i++) {
        const seed = i * 13 + zone.id.charCodeAt(1);
        heatFeatures.push({
          type: 'Feature', properties: { weight: w },
          geometry: {
            type: 'Point',
            coordinates: [
              parseFloat((zone.lon + Math.cos(seed * 1.1) * 0.009).toFixed(5)),
              parseFloat((zone.lat + Math.sin(seed * 0.7) * 0.007).toFixed(5)),
            ],
          },
        });
      }
    });

    (m.getSource('heat-src') as maplibregl.GeoJSONSource | undefined)
      ?.setData({ type: 'FeatureCollection', features: heatFeatures } as GeoJSON.FeatureCollection);
    (m.getSource('zones-cluster-src') as maplibregl.GeoJSONSource | undefined)
      ?.setData(zonesData as GeoJSON.FeatureCollection);
  }, [selectedDow, selectedTimeBand, selectedVehicleTypes]);

  /* ── Toggle layer visibility ── */
  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    const setVis = (ids: string[], vis: 'visible' | 'none') =>
      ids.forEach((id) => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', vis); });

    setVis(['heat-layer'],                        activeMapLayer === 'heat'     ? 'visible' : 'none');
    setVis(['cluster-fill', 'cluster-outline'],   activeMapLayer === 'cluster'  ? 'visible' : 'none');
    setVis(['priority-fill', 'priority-outline'], activeMapLayer === 'priority' ? 'visible' : 'none');
  }, [activeMapLayer]);

  /* ── Derive top-3 zones for current slice, vehicle-reweighted ── */
  const sliceKey   = `${selectedDow}|${selectedTimeBand}`;
  const rawQueue   = PRIORITY_QUEUE[sliceKey] ?? [];
  const sliceQueue = selectedVehicleTypes.length === 0 ? rawQueue : [...rawQueue]
    .map((entry) => {
      const zone = ZONES.find((z) => z.id === entry.zoneId);
      const share = zone ? getVehicleShare(zone.vehicleMix, selectedVehicleTypes) : 0;
      return { ...entry, priority: Math.round(entry.priority * (0.35 + share * 0.65)) };
    })
    .sort((a, b) => b.priority - a.priority)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const top3 = sliceQueue.slice(0, 3);

  return (
    <div className="flex gap-4 p-4 h-full overflow-hidden">
      {/* ── Map container ── */}
      <div className="flex-1 relative clay-card overflow-hidden">
        <div ref={mapContainer} className="absolute inset-0 rounded-[2rem]" />

        {/* Vehicle filter active banner */}
        {selectedVehicleTypes.length > 0 && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-full shadow-clay-sm font-label-mono text-[11px]">
            <span className="ms" style={{ fontSize: 14 }}>directions_car</span>
            {selectedVehicleTypes.join(' · ')}
          </div>
        )}

        {/* Layer toggle */}
        <div className="absolute top-4 right-4 z-10 flex gap-1 bg-surface rounded-full p-1 shadow-clay-sm">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveMapLayer(l.id)}
              className={`px-3 py-1.5 rounded-full font-label-mono text-[12px] transition-all ${
                activeMapLayer === l.id
                  ? 'bg-primary-container text-on-primary-container shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.3),inset_2px_2px_4px_rgba(0,0,0,0.2)]'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Day × Band interactive overlay */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
          <div className="flex gap-1 bg-surface p-1 rounded-full shadow-clay-sm">
            {DAYS.map((d) => (
              <button
                key={d.full}
                onClick={() => setSelectedDow(d.full)}
                className={`px-2.5 py-1 rounded-full font-label-mono text-[10px] transition-all ${
                  selectedDow === d.full
                    ? 'clay-inset text-primary font-bold'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-surface p-1 rounded-full shadow-clay-sm">
            {BANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedTimeBand(b.id)}
                className={`px-3 py-1 rounded-full font-label-mono text-[10px] transition-all ${
                  selectedTimeBand === b.id
                    ? 'clay-inset text-primary font-bold'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        {activeMapLayer === 'cluster' && (
          <div className="absolute bottom-20 right-4 z-10 clay-card p-3 rounded-xl flex flex-col gap-1">
            {Object.entries(ARCHETYPE_COLORS).map(([k, c]) => (
              <div key={k} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c }} />
                <span className="font-label-mono text-[10px] text-on-surface-variant">{k}</span>
              </div>
            ))}
          </div>
        )}
        {activeMapLayer === 'priority' && (
          <div className="absolute bottom-20 right-4 z-10 clay-card p-3 rounded-xl flex flex-col gap-2">
            <p className="font-label-mono text-[9px] text-on-surface-variant tracking-wider">PRIORITY SCORE</p>
            {[
              { label: 'High  (75+)', color: '#FF6B5E' },
              { label: 'Medium (45–75)', color: '#FFB23E' },
              { label: 'Low  (< 45)', color: '#2BC48A' },
            ].map((e) => (
              <div key={e.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: e.color }} />
                <span className="font-label-mono text-[10px] text-on-surface-variant">{e.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Zone detail / top-3 panel ── */}
      <div className={`w-[280px] clay-card p-5 flex flex-col transition-all duration-300 ${selectedZone ? 'opacity-100' : 'opacity-60'}`}>
        {selectedZone ? (
          <ZoneDetailPanel zone={selectedZone} />
        ) : (
          <div className="flex flex-col h-full gap-4">
            <div className="flex flex-col items-center text-center gap-2">
              <span className="ms text-on-surface-variant" style={{ fontSize: 40 }}>touch_app</span>
              <p className="font-label-mono text-[11px] text-on-surface-variant leading-relaxed">
                Click any zone on the map to drill in
              </p>
            </div>

            {/* Top 3 for current slice */}
            <div className="flex flex-col gap-2 flex-1">
              <p className="font-label-mono text-[10px] text-on-surface-variant tracking-wider">
                TOP PRIORITY · {selectedDow.slice(0, 3).toUpperCase()} {selectedTimeBand.replace(/\(.*\)/, '').trim().toUpperCase()}
              </p>
              {top3.map((entry, i) => {
                const zone = ZONES.find((z) => z.id === entry.zoneId);
                return (
                  <button
                    key={entry.zoneId}
                    onClick={() => {
                      if (zone) {
                        setSelectedZoneId(zone.id);
                        setSelectedZone(zone);
                        setFilterChip(zone.name);
                        map.current?.flyTo({ center: [zone.lon, zone.lat], zoom: 14, speed: 1.2 });
                      }
                    }}
                    className="flex items-center gap-2 clay-inset p-2 rounded-xl text-left hover:scale-[1.02] transition-transform"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-label-mono text-[10px] text-white shrink-0 ${
                      i === 0 ? 'bg-severity-coral' : i === 1 ? 'bg-severity-amber' : 'bg-primary-container'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-label-mono text-[11px] text-primary truncate">{entry.zoneName}</p>
                      <p className="font-label-mono text-[10px] text-on-surface-variant">
                        Forecast {entry.forecast} · P{entry.priority}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* All zones list */}
            <div className="flex flex-col gap-1 border-t border-surface-container-high pt-3 overflow-y-auto flex-1">
              <p className="font-label-mono text-[10px] text-on-surface-variant tracking-wider mb-1">ALL ZONES</p>
              {sliceQueue.slice(3).map((entry) => {
                const zone = ZONES.find((z) => z.id === entry.zoneId);
                return (
                  <button
                    key={entry.zoneId}
                    onClick={() => {
                      if (zone) {
                        setSelectedZoneId(zone.id);
                        setSelectedZone(zone);
                        setFilterChip(zone.name);
                        map.current?.flyTo({ center: [zone.lon, zone.lat], zoom: 13, speed: 1.2 });
                      }
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-label-mono text-[10px] text-on-surface-variant w-4 shrink-0">
                        {entry.rank}
                      </span>
                      <span className="font-label-mono text-[11px] text-on-surface truncate">{entry.zoneName}</span>
                    </div>
                    <span className="font-metric-display text-[11px] text-primary shrink-0 ml-2">
                      {entry.forecast}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
