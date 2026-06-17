import { create } from 'zustand';
import type { TabId, MapLayer, Zone, ImpactWeights, PriorityWeights, DayOfWeek, TimeBand } from '../types';

interface SentinelState {
  // Navigation
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // Map controls
  activeMapLayer: MapLayer;
  setActiveMapLayer: (layer: MapLayer) => void;

  // Selected zone (cross-filter anchor)
  selectedZoneId: string | null;
  setSelectedZoneId: (id: string | null) => void;
  selectedZone: Zone | null;
  setSelectedZone: (zone: Zone | null) => void;

  // Filter chips
  filterChip: string | null;
  setFilterChip: (chip: string | null) => void;

  // Temporal filters
  selectedDow: DayOfWeek;
  setSelectedDow: (dow: DayOfWeek) => void;
  selectedTimeBand: TimeBand;
  setSelectedTimeBand: (band: TimeBand) => void;

  // Patrol plan
  patrolTeams: number;
  setPatrolTeams: (n: number) => void;

  // Impact weights (live recompute)
  impactWeights: ImpactWeights;
  setImpactWeight: (key: keyof ImpactWeights, value: number) => void;
  resetImpactWeights: () => void;

  // Priority weights
  priorityWeights: PriorityWeights;
  setPriorityWeight: (key: keyof PriorityWeights, value: number) => void;

  // Global vehicle/violation filter
  selectedVehicleTypes: string[];
  toggleVehicleType: (type: string) => void;
  selectedViolationTypes: string[];
  toggleViolationType: (type: string) => void;

  // UI overlays
  darkMode: boolean;
  toggleDarkMode: () => void;
  showNotifications: boolean;
  toggleNotifications: () => void;
  showSupport: boolean;
  toggleSupport: () => void;
}

const DEFAULT_IMPACT_WEIGHTS: ImpactWeights = {
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

export const useSentinelStore = create<SentinelState>((set) => ({
  activeTab: 'hotspot',
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeMapLayer: 'heat',
  setActiveMapLayer: (layer) => set({ activeMapLayer: layer }),

  selectedZoneId: null,
  setSelectedZoneId: (id) => set({ selectedZoneId: id }),
  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),

  filterChip: null,
  setFilterChip: (chip) => set({ filterChip: chip }),

  selectedDow: 'Sunday',
  setSelectedDow: (dow) => set({ selectedDow: dow }),
  selectedTimeBand: 'EarlyAM(05-11)',
  setSelectedTimeBand: (band) => set({ selectedTimeBand: band }),

  patrolTeams: 6,
  setPatrolTeams: (n) => set({ patrolTeams: Math.max(1, Math.min(20, n)) }),

  impactWeights: { ...DEFAULT_IMPACT_WEIGHTS },
  setImpactWeight: (key, value) =>
    set((s) => ({ impactWeights: { ...s.impactWeights, [key]: value } })),
  resetImpactWeights: () => set({ impactWeights: { ...DEFAULT_IMPACT_WEIGHTS } }),

  priorityWeights: { demand: 0.5, impact: 0.3, trend: 0.2 },
  setPriorityWeight: (key, value) =>
    set((s) => ({ priorityWeights: { ...s.priorityWeights, [key]: value } })),

  selectedVehicleTypes: [],
  toggleVehicleType: (type) =>
    set((s) => ({
      selectedVehicleTypes: s.selectedVehicleTypes.includes(type)
        ? s.selectedVehicleTypes.filter((t) => t !== type)
        : [...s.selectedVehicleTypes, type],
    })),

  selectedViolationTypes: [],
  toggleViolationType: (type) =>
    set((s) => ({
      selectedViolationTypes: s.selectedViolationTypes.includes(type)
        ? s.selectedViolationTypes.filter((t) => t !== type)
        : [...s.selectedViolationTypes, type],
    })),

  darkMode: false,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle('dark', next);
      return { darkMode: next };
    }),

  showNotifications: false,
  toggleNotifications: () => set((s) => ({ showNotifications: !s.showNotifications })),

  showSupport: false,
  toggleSupport: () => set((s) => ({ showSupport: !s.showSupport })),
}));
