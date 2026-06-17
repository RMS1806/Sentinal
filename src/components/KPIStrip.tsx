import { useSentinelStore } from '../store';
import {
  TOTAL_VALID_VIOLATIONS, TOTAL_HOTSPOTS, TOP_PRIORITY_ZONE,
  AVG_IMPACT, REPEAT_OFFENDER_PCT, ZONES, EDA_DATA,
} from '../data/bengaluru';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  accent?: 'primary' | 'error' | 'tertiary';
  onClick?: () => void;
  active?: boolean;
}

function KPICard({ label, value, sub, icon, accent = 'primary', onClick, active }: KPICardProps) {
  const accentClass = accent === 'error' ? 'text-error' : accent === 'tertiary' ? 'text-tertiary-container' : 'text-primary';
  return (
    <button
      onClick={onClick}
      className={`clay-card p-4 flex flex-col gap-1 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${active ? 'ring-2 ring-primary-container' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-label-mono text-[11px] text-on-surface-variant tracking-wider">{label}</p>
        <span className={`ms ${accentClass}`} style={{fontSize:16}}>{icon}</span>
      </div>
      <p className={`font-metric-display leading-tight truncate ${accentClass} ${value.length > 12 ? 'text-[15px]' : 'text-[22px]'}`}>{value}</p>
      {sub && <p className="font-label-mono text-[10px] text-on-surface-variant mt-0.5 truncate">{sub}</p>}
    </button>
  );
}

export default function KPIStrip() {
  const { selectedZoneId, setSelectedZoneId, setSelectedZone, setFilterChip, selectedVehicleTypes } = useSentinelStore();

  function fmt(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
    return String(n);
  }

  const baseCount = selectedZoneId
    ? (ZONES.find((z) => z.id === selectedZoneId)?.count ?? TOTAL_VALID_VIOLATIONS)
    : TOTAL_VALID_VIOLATIONS;

  const vehicleFilteredCount = selectedVehicleTypes.length > 0
    ? Math.round(baseCount * (
        EDA_DATA.vehicles
          .filter((v) => selectedVehicleTypes.includes(v.type))
          .reduce((s, v) => s + v.count, 0) /
        EDA_DATA.vehicles
          .filter((v) => ['Scooter','Car','Motorcycle','Passenger Auto'].includes(v.type))
          .reduce((s, v) => s + v.count, 0)
      ))
    : baseCount;

  const filteredCount = vehicleFilteredCount;

  const filteredHotspots = selectedZoneId
    ? (ZONES.find((z) => z.id === selectedZoneId)?.giClass !== 'NotSignificant' ? 1 : 0)
    : TOTAL_HOTSPOTS;

  function clearFilter() {
    setSelectedZoneId(null);
    setSelectedZone(null);
    setFilterChip(null);
  }

  return (
    <div className="grid grid-cols-5 gap-3 px-4 pt-4 pb-2">
      <KPICard
        label={selectedVehicleTypes.length > 0 ? selectedVehicleTypes.join(' + ').toUpperCase() : 'TOTAL VIOLATIONS'}
        value={fmt(filteredCount)}
        sub={selectedVehicleTypes.length > 0 ? 'Vehicle-filtered violations' : '248,376 enforcement records'}
        icon={selectedVehicleTypes.length > 0 ? 'directions_car' : 'warning'}
        onClick={clearFilter}
      />
      <KPICard
        label="ACTIVE HOTSPOTS"
        value={String(filteredHotspots)}
        sub="Zones with elevated activity"
        icon="location_on"
        accent="error"
      />
      <KPICard
        label="TOP PRIORITY ZONE"
        value={TOP_PRIORITY_ZONE.name}
        sub={`Impact ${TOP_PRIORITY_ZONE.impactIndex} · ${TOP_PRIORITY_ZONE.archetype}`}
        icon="emergency"
        accent="error"
      />
      <KPICard
        label="REPEAT OFFENDERS"
        value={`${REPEAT_OFFENDER_PCT}%`}
        sub="34.2% of violations from 15.3% of plates"
        icon="repeat"
        accent="tertiary"
      />
      <KPICard
        label="AVG IMPACT INDEX"
        value={String(AVG_IMPACT)}
        sub="Weighted severity / 100"
        icon="speed"
      />
    </div>
  );
}
