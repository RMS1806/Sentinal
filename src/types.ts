export type TabId = 'hotspot' | 'patrol' | 'impact' | 'explore';
export type MapLayer = 'heat' | 'cluster' | 'priority';
export type ZoneArchetype =
  | 'Market-Choke'
  | 'Metro-Spillover'
  | 'Commercial-Strip'
  | 'Hospital-School'
  | 'Residential-Overflow'
  | 'Transit-Corridor';
export type GiClass = 'Hot99' | 'Hot95' | 'Hot90' | 'NotSignificant' | 'Cold';
export type TimeBand = 'EarlyAM(05-11)' | 'Midday(11-15)' | 'Afternoon(15-22)' | 'Night(22-05)';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Zone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  count: number;
  impactIndex: number;
  archetype: ZoneArchetype;
  giClass: GiClass;
  giZscore: number;
  topViolations: string[];
  trendMoM: number;
  polygon: [number, number][];
  stationName: string;
  vehicleMix: { scooter: number; car: number; motorcycle: number; auto: number };
  violationMix: { wrongParking: number; noParking: number; mainRoad: number; other: number };
  repeatOffenderPct: number;
}

export interface PriorityEntry {
  rank: number;
  zoneId: string;
  zoneName: string;
  priority: number;
  forecast: number;
  impactIndex: number;
  trend: number;
  why: string;
  demandScore: number;
  impactScore: number;
  trendScore: number;
  archetype: ZoneArchetype;
}

export type PriorityQueue = Record<string, PriorityEntry[]>;

export interface ModelMetrics {
  lightgbm_poisson: { mae: number; poisson_deviance: number };
  poisson_glm: { mae: number };
  naive_baseline: { mae: number };
}

export interface EDAData {
  monthly: { month: string; count: number }[];
  daily: { day: string; count: number }[];
  violations: { type: string; count: number; weight: number }[];
  vehicles: { type: string; count: number }[];
  stations: { name: string; count: number }[];
  junctions: { name: string; count: number }[];
  repeatOffenders: { pct_vehicles: number; pct_violations: number };
}

export interface ImpactWeights {
  'Parking in a Main Road': number;
  'Parking near Road Crossing': number;
  'Parking near Traffic Light/Zebra': number;
  'Double Parking': number;
  'Parking on Footpath': number;
  'Near Bus-Stop/School/Hospital': number;
  'Wrong Parking': number;
  'No Parking': number;
  'Non-Parking Violation': number;
}

export interface PriorityWeights {
  demand: number;
  impact: number;
  trend: number;
}
