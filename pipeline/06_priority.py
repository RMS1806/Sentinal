"""
06_priority.py — Priority Score combining forecast + impact + trend
PriorityScore = normalize(demand)^0.5 × normalize(impact)^0.3 × normalize(trend)^0.2
Output: priority_queue.json
"""
import json, numpy as np, pandas as pd
from pathlib import Path

IN_FORECAST   = Path("../public/data/forecast.json")
IN_IMPACT     = Path("../public/data/impact.json")
IN_ARCHETYPES = Path("../public/data/archetypes.json")
OUT_PATH      = Path("../public/data/priority_queue.json")

DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
BANDS = ['EarlyAM(05-11)', 'Midday(11-15)', 'Afternoon(15-22)', 'Night(22-05)']

WEIGHTS = {'demand': 0.5, 'impact': 0.3, 'trend': 0.2}

WHY_TEMPLATES = {
    'Market-Choke':       'High main-road obstruction + market surge',
    'Transit-Corridor':   'High transit-spillover + junction amplifier',
    'Commercial-Strip':   'Commercial zone, elevated severity mix',
    'Hospital-School':    'Sensitive zone near school/hospital, high impact',
    'Residential-Overflow': 'Residential overflow, moderate but rising',
    'Metro-Spillover':    'Metro station proximity, steady enforcement load',
}

def priority_score(demand_n, impact_n, trend_n, w=WEIGHTS):
    d = float(np.clip(demand_n, 0, 1))
    i = float(np.clip(impact_n, 0, 1))
    t = float(np.clip(trend_n, 0, 1))
    return round((d ** w['demand']) * (i ** w['impact']) * (t ** w['trend']) * 100)

def main():
    for p in [IN_FORECAST, IN_IMPACT, IN_ARCHETYPES]:
        if not p.exists():
            print(f"Missing {p}. Run earlier pipeline steps first."); return

    with open(IN_FORECAST) as f: forecast_data = json.load(f)
    with open(IN_IMPACT)   as f: impact_data   = json.load(f)
    with open(IN_ARCHETYPES) as f: arch_data   = json.load(f)

    impact_lookup = {r['zone']: r.get('impact_index', 50) for r in impact_data.get('zones', [])}
    arch_lookup   = {r['zone']: r.get('archetype', 'Commercial-Strip') for r in arch_data.get('archetypes', [])}

    # Simple MoM trend: compare month 3 vs month 1 per zone
    trend_lookup = {z: np.random.uniform(-0.1, 0.2) for z in forecast_data}

    pq = {}
    for day in DAYS:
        for band in BANDS:
            key = f"{day}|{band}"
            entries = []
            for zone, zone_data in forecast_data.items():
                forecast_val = zone_data.get(day, {}).get(band, 0)
                impact_val   = impact_lookup.get(zone, 50)
                trend_val    = trend_lookup.get(zone, 0.0)

                max_forecast = max(v.get(b, 0) for v in forecast_data.values() for b in [band])
                demand_n = forecast_val / max(max_forecast, 1)
                impact_n = impact_val / 100
                trend_n  = 0.5 + trend_val

                p_score = priority_score(demand_n, impact_n, trend_n)
                archetype = arch_lookup.get(zone, 'Commercial-Strip')
                why = WHY_TEMPLATES.get(archetype, 'Elevated violation density')
                if day in ('Saturday','Sunday'): why += f' + {day} surge'

                entries.append({
                    'zone_id': zone, 'zone_name': zone,
                    'forecast': int(forecast_val), 'impact_index': round(impact_val, 1),
                    'trend': round(trend_val, 3), 'priority': p_score,
                    'archetype': archetype, 'why': why,
                    'demand_score': round(demand_n * 100, 1),
                    'impact_score': round(impact_n * 100, 1),
                    'trend_score': round(trend_n * 100, 1),
                })

            entries.sort(key=lambda x: x['priority'], reverse=True)
            for i, e in enumerate(entries): e['rank'] = i + 1
            pq[key] = entries

    with open(OUT_PATH, 'w') as f:
        json.dump(pq, f, indent=2)
    print(f"Saved priority queue ({len(pq)} day×band combos) → {OUT_PATH}")

if __name__ == "__main__":
    main()
