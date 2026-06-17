import { useSentinelStore } from '../store';
import type { TabId, DayOfWeek, TimeBand } from '../types';
import { ZONES } from '../data/bengaluru';

const DAYS: DayOfWeek[] = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const BANDS: TimeBand[] = ['EarlyAM(05-11)','Midday(11-15)','Afternoon(15-22)','Night(22-05)'];
const BAND_LABELS = ['Early AM', 'Midday', 'Afternoon', 'Night'];

const STATIONS = [...new Set(ZONES.map((z) => z.stationName))];
const VEHICLE_TYPES = ['Scooter', 'Car', 'Motorcycle', 'Passenger Auto'];

const NAV_ITEMS: { id: TabId; icon: string; label: string }[] = [
  { id: 'hotspot', icon: 'map', label: 'Hotspot Map' },
  { id: 'patrol', icon: 'route', label: 'Patrol Plan' },
  { id: 'impact', icon: 'analytics', label: 'Impact' },
  { id: 'explore', icon: 'explore', label: 'Explore' },
];

export default function SideNav() {
  const {
    activeTab, setActiveTab,
    selectedDow, setSelectedDow,
    selectedTimeBand, setSelectedTimeBand,
    selectedVehicleTypes, toggleVehicleType,
    darkMode, toggleDarkMode,
    toggleSupport,
  } = useSentinelStore();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[282px] flex flex-col p-4 gap-4 overflow-y-auto z-40">
      <div className="clay-nav flex flex-col p-5 gap-4 flex-1">
        {/* Branding area */}
        <div className="clay-inset p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
            <span className="ms text-on-primary-container" style={{fontSize:16}}>shield</span>
          </div>
          <div>
            <p className="font-headline-md text-[14px] text-primary leading-tight">Bengaluru Traffic</p>
            <p className="font-label-mono text-[10px] text-on-surface-variant">248,376 valid records</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full font-label-mono text-label-mono transition-all duration-200 text-left ${
                activeTab === item.id
                  ? 'bg-primary-container text-on-primary-container shadow-[inset_-4px_-4px_8px_rgba(255,255,255,0.5),inset_4px_4px_8px_rgba(0,0,0,0.1)]'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'
              }`}
            >
              <span className="ms" style={{fontSize:18}}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-surface-container-high" />

        {/* Day-of-week filter */}
        <div>
          <p className="font-label-mono text-[11px] text-on-surface-variant mb-2 px-1 tracking-wider">DAY OF WEEK</p>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDow(d)}
                title={d}
                className={`h-8 rounded-lg font-label-mono text-[10px] transition-all duration-150 ${
                  selectedDow === d
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'clay-inset text-on-surface-variant hover:text-primary'
                }`}
              >
                {d[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Time band filter */}
        <div>
          <p className="font-label-mono text-[11px] text-on-surface-variant mb-2 px-1 tracking-wider">TIME BAND</p>
          <div className="flex flex-col gap-1">
            {BANDS.map((b, i) => (
              <button
                key={b}
                onClick={() => setSelectedTimeBand(b)}
                className={`px-3 py-2 rounded-full font-label-mono text-[12px] transition-all duration-150 text-left flex items-center gap-2 ${
                  selectedTimeBand === b
                    ? 'bg-primary-container text-on-primary-container shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.4),inset_2px_2px_4px_rgba(0,0,0,0.15)]'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                <span className="ms" style={{fontSize:14}}>schedule</span>
                {BAND_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle type filter */}
        <div>
          <p className="font-label-mono text-[11px] text-on-surface-variant mb-2 px-1 tracking-wider">VEHICLE TYPE</p>
          <div className="flex flex-wrap gap-1.5">
            {VEHICLE_TYPES.map((v) => (
              <button
                key={v}
                onClick={() => toggleVehicleType(v)}
                className={`px-3 py-1 rounded-full font-label-mono text-[11px] transition-all ${
                  selectedVehicleTypes.includes(v)
                    ? 'bg-primary-container text-on-primary-container'
                    : 'clay-inset text-on-surface-variant hover:text-primary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto" />

        {/* Footer links */}
        <div className="flex flex-col gap-1 border-t border-surface-container-high pt-3">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-3 px-4 py-2 rounded-full text-on-surface-variant hover:text-primary font-label-mono text-[13px] transition-colors"
          >
            <span className="ms" style={{fontSize:16}}>{darkMode ? 'light_mode' : 'dark_mode'}</span>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={toggleSupport}
            className="flex items-center gap-3 px-4 py-2 rounded-full text-on-surface-variant hover:text-primary font-label-mono text-[13px] transition-colors"
          >
            <span className="ms" style={{fontSize:16}}>groups</span> Team
          </button>
        </div>
      </div>
    </aside>
  );
}
