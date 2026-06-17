"""
03_impact.py — Congestion-Impact Index
impact = base_severity(violation_type) × junction_multiplier
Normalise 0-100 per zone. Output: impact.json
"""
import json, pandas as pd, numpy as np
from pathlib import Path

IN_PATH   = Path("../public/data/clean.parquet")
OUT_PATH  = Path("../public/data/impact.json")

SEVERITY = {
    'PARKING IN A MAIN ROAD': 1.00, 'NEAR ROAD CROSSING': 0.95,
    'NEAR TRAFFIC LIGHT/ZEBRA': 0.95, 'DOUBLE PARKING': 0.90,
    'PARKING ON FOOTPATH': 0.70, 'NEAR BUS-STOP/SCHOOL/HOSPITAL': 0.70,
    'OPPOSITE PARKED VEHICLE': 0.65, 'WRONG PARKING': 0.55,
    'NO PARKING': 0.45,
}
JUNCTION_MULT = 1.25

def main():
    if not IN_PATH.exists():
        print("Run 01_clean.py first"); return
    df = pd.read_parquet(IN_PATH)
    vtype_col = next((c for c in df.columns if 'violation' in c.lower() and 'type' in c.lower()), None)
    station_col = next((c for c in df.columns if 'station' in c.lower()), None)
    junction_col = next((c for c in df.columns if 'junction' in c.lower()), None)

    if vtype_col:
        df['sev'] = df[vtype_col].str.upper().str.strip().map(SEVERITY).fillna(0.10)
    else:
        df['sev'] = 0.45
    if junction_col:
        df['j_mult'] = df[junction_col].notna().map({True: JUNCTION_MULT, False: 1.0})
    else:
        df['j_mult'] = 1.0
    df['impact_score'] = df['sev'] * df['j_mult']

    group_col = station_col if station_col else 'lat_bin'
    if group_col == 'lat_bin':
        df['lat_bin'] = (df['lat'] * 50).round() / 50

    zone_impact = df.groupby(group_col)['impact_score'].agg(['sum','mean','count']).reset_index()
    zone_impact.columns = [group_col, 'impact_sum', 'impact_mean', 'count']
    max_sum = zone_impact['impact_sum'].max()
    zone_impact['impact_index'] = (zone_impact['impact_sum'] / max_sum * 100).round(1)

    result = {
        'zones': zone_impact.to_dict('records'),
        'weights': SEVERITY,
        'junction_multiplier': JUNCTION_MULT,
        'note': 'Impact Index = (violation_type_severity × junction_multiplier), normalised 0-100. No traffic-flow ground truth exists — this is a transparent severity index, not a regressor.',
    }
    with open(OUT_PATH, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"Saved impact data → {OUT_PATH}")

if __name__ == "__main__":
    main()
