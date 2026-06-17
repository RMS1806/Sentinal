import { useSentinelStore } from '../store';

const TABS = [
  { id: 'hotspot' as const, icon: 'map', label: 'Hotspot Map' },
  { id: 'patrol' as const, icon: 'route', label: 'Patrol Plan' },
  { id: 'impact' as const, icon: 'analytics', label: 'Impact' },
  { id: 'explore' as const, icon: 'explore', label: 'Explore' },
];

export default function Header() {
  const { activeTab, setActiveTab, filterChip, setFilterChip, darkMode, toggleDarkMode, toggleNotifications } = useSentinelStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 clay-header flex items-center px-6 gap-6">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full clay-raised flex items-center justify-center bg-primary-container">
          <span className="ms text-on-primary-container" style={{fontSize:18}}>security</span>
        </div>
        <span className="font-metric-display text-[28px] text-primary tracking-tighter leading-none">SENTINEL</span>
      </div>

      {/* Tab navigation */}
      <nav className="flex gap-1 bg-surface-container rounded-full p-1 shadow-clay-inset">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-label-mono text-label-mono transition-all duration-200 ${
              activeTab === t.id
                ? 'bg-primary-container text-on-primary-container shadow-[inset_-3px_-3px_6px_rgba(255,255,255,0.3),inset_3px_3px_6px_rgba(0,0,0,0.2)]'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
            }`}
          >
            <span className="ms" style={{fontSize:16}}>{t.icon}</span>
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Filter chip */}
      {filterChip && (
        <div className="flex items-center gap-2 clay-inset rounded-full px-4 py-2 text-sm font-label-mono text-primary">
          <span className="ms" style={{fontSize:14}}>filter_alt</span>
          <span>{filterChip}</span>
          <button
            onClick={() => setFilterChip(null)}
            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="ms" style={{fontSize:14}}>close</span>
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live status indicator */}
      <div className="flex items-center gap-1.5 clay-inset rounded-full px-3 py-1.5 hidden md:flex">
        <span className="w-2 h-2 rounded-full bg-severity-green animate-pulse shrink-0" />
        <span className="font-label-mono text-[11px] text-primary">Bengaluru · Live</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 clay-pill flex items-center justify-center text-primary hover:scale-105 transition-transform"
        >
          <span className="ms" style={{fontSize:18}}>{darkMode ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <button
          onClick={toggleNotifications}
          className="w-9 h-9 clay-pill flex items-center justify-center text-primary hover:scale-105 transition-transform relative"
        >
          <span className="ms" style={{fontSize:18}}>notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full shadow-[0_0_6px_rgba(186,26,26,0.7)]"></span>
        </button>
      </div>
    </header>
  );
}
