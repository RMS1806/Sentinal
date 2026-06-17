"""
07_eda.py — Precompute all Explore-tab aggregates
Output: eda.json
"""
import json, numpy as np, pandas as pd
from pathlib import Path

IN_PATH  = Path("../public/data/clean.parquet")
OUT_PATH = Path("../public/data/eda.json")

def main():
    if not IN_PATH.exists():
        print("Run 01_clean.py first"); return
    df = pd.read_parquet(IN_PATH)
    print(f"EDA input: {len(df):,} rows")

    result = {}

    # ── Monthly counts ────────────────────────────────────────────────────
    if 'month' in df.columns:
        monthly = df.groupby('month').size().reset_index(name='count')
        result['monthly'] = monthly.to_dict('records')

    # ── Daily counts ──────────────────────────────────────────────────────
    if 'dow' in df.columns:
        days_order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        daily = df.groupby('dow').size().reset_index(name='count')
        daily['sort'] = daily['dow'].map({d:i for i,d in enumerate(days_order)})
        daily = daily.sort_values('sort')[['dow','count']].rename(columns={'dow':'day'})
        result['daily'] = daily.to_dict('records')

    # ── Violation types ───────────────────────────────────────────────────
    vtype_col = next((c for c in df.columns if 'violation' in c.lower() and 'type' in c.lower()), None)
    if vtype_col:
        viol = df[vtype_col].value_counts().reset_index()
        viol.columns = ['type','count']
        result['violations'] = viol.head(10).to_dict('records')

    # ── Vehicle types ─────────────────────────────────────────────────────
    vehicle_col = next((c for c in df.columns if 'vehicle' in c.lower() and 'type' in c.lower()), None)
    if vehicle_col:
        veh = df[vehicle_col].value_counts().reset_index()
        veh.columns = ['type','count']
        result['vehicles'] = veh.head(6).to_dict('records')

    # ── Station leaderboard ────────────────────────────────────────────────
    station_col = next((c for c in df.columns if 'station' in c.lower()), None)
    if station_col:
        stations = df.groupby(station_col).size().nlargest(10).reset_index(name='count')
        stations.columns = ['name','count']
        result['stations'] = stations.to_dict('records')

    # ── Junction load ─────────────────────────────────────────────────────
    junction_col = next((c for c in df.columns if 'junction' in c.lower()), None)
    if junction_col:
        junctions = df[df[junction_col].notna()].groupby(junction_col).size().nlargest(10).reset_index(name='count')
        junctions.columns = ['name','count']
        result['junctions'] = junctions.to_dict('records')

    # ── Repeat offenders ──────────────────────────────────────────────────
    plate_col = next((c for c in df.columns if 'vehicle' in c.lower() and 'number' in c.lower()), None)
    if plate_col:
        plate_counts = df[plate_col].value_counts()
        repeat = (plate_counts > 1).sum()
        total_plates = len(plate_counts)
        repeat_violations = plate_counts[plate_counts > 1].sum()
        result['repeat_offenders'] = {
            'pct_vehicles': round(repeat / total_plates * 100, 1),
            'pct_violations': round(repeat_violations / len(df) * 100, 1),
        }

    with open(OUT_PATH, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"Saved EDA → {OUT_PATH}")

if __name__ == "__main__":
    main()
