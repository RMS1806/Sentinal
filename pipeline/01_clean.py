"""
01_clean.py — SENTINEL Data Pipeline Step 1
Load raw CSV, clean, parse timestamps, derive features, output clean.parquet
"""
import pandas as pd
import numpy as np
from pathlib import Path

RAW_GLOB = "../jan_to_may_police_violation_anonymized*.csv"
OUT_PATH = Path("../public/data/clean.parquet")

IST_OFFSET = pd.Timedelta(hours=5, minutes=30)

VIOLATION_SEVERITY = {
    'PARKING IN A MAIN ROAD': 1.00,
    'NEAR ROAD CROSSING': 0.95,
    'NEAR TRAFFIC LIGHT/ZEBRA': 0.95,
    'DOUBLE PARKING': 0.90,
    'PARKING ON FOOTPATH': 0.70,
    'NEAR BUS-STOP/SCHOOL/HOSPITAL': 0.70,
    'OPPOSITE PARKED VEHICLE': 0.65,
    'WRONG PARKING': 0.55,
    'NO PARKING': 0.45,
}

def get_time_band(hour: int) -> str:
    if 5 <= hour < 11: return 'EarlyAM(05-11)'
    if 11 <= hour < 15: return 'Midday(11-15)'
    if 15 <= hour < 22: return 'Afternoon(15-22)'
    return 'Night(22-05)'

def main():
    import glob
    files = glob.glob(RAW_GLOB)
    if not files:
        print("ERROR: No CSV files found matching pattern:", RAW_GLOB)
        print("Place the dataset CSV in the project root.")
        return

    print(f"Loading {len(files)} file(s)...")
    df = pd.concat([pd.read_csv(f, low_memory=False) for f in files], ignore_index=True)
    print(f"Raw rows: {len(df):,}")

    # ── Constraint C: drop rejected / duplicate ──────────────────────────
    if 'validation_status' in df.columns:
        before = len(df)
        df = df[~df['validation_status'].str.lower().isin(['rejected', 'duplicate'])]
        dropped = before - len(df)
        print(f"Dropped {dropped:,} rows ({dropped/before*100:.1f}%) rejected/duplicate")

    # ── Parse timestamps (IST) ───────────────────────────────────────────
    ts_col = next((c for c in df.columns if 'created' in c.lower() and 'datetime' in c.lower()), None)
    if ts_col:
        df['created_ist'] = pd.to_datetime(df[ts_col], errors='coerce', utc=True).dt.tz_convert('Asia/Kolkata').dt.tz_localize(None)
        df = df.dropna(subset=['created_ist'])
        df['dow'] = df['created_ist'].dt.day_name()
        df['hour'] = df['created_ist'].dt.hour
        df['month'] = df['created_ist'].dt.to_period('M').astype(str)
        df['time_band'] = df['hour'].apply(get_time_band)
        df['is_weekend'] = df['dow'].isin(['Saturday', 'Sunday'])

    # ── Clean coordinates ────────────────────────────────────────────────
    lat_col = next((c for c in df.columns if 'lat' in c.lower()), None)
    lon_col = next((c for c in df.columns if 'lon' in c.lower() or 'lng' in c.lower()), None)
    if lat_col and lon_col:
        df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
        df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')
        df = df[df[lat_col].between(12.80, 13.29) & df[lon_col].between(77.44, 77.77)]
        df = df.rename(columns={lat_col: 'lat', lon_col: 'lon'})

    # ── Severity weight ──────────────────────────────────────────────────
    vtype_col = next((c for c in df.columns if 'violation' in c.lower() and 'type' in c.lower()), None)
    if vtype_col:
        df[vtype_col] = df[vtype_col].str.upper().str.strip()
        df['severity_weight'] = df[vtype_col].map(VIOLATION_SEVERITY).fillna(0.10)

    print(f"Clean rows: {len(df):,}")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)
    print(f"Saved: {OUT_PATH}")

if __name__ == "__main__":
    main()
