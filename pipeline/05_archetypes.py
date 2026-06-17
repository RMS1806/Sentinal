"""
05_archetypes.py — Zone Archetypes via K-Means
Features: violation mix %, time-band profile, weekend ratio, vehicle mix, impact index
Output: archetypes.json
"""
import json, numpy as np, pandas as pd
from pathlib import Path

IN_PATH  = Path("../public/data/clean.parquet")
OUT_PATH = Path("../public/data/archetypes.json")

ARCHETYPE_NAMES = {
    0: 'Market-Choke',
    1: 'Metro-Spillover',
    2: 'Commercial-Strip',
    3: 'Hospital-School',
    4: 'Residential-Overflow',
    5: 'Transit-Corridor',
}

def main():
    if not IN_PATH.exists():
        print("Run 01_clean.py first"); return
    df = pd.read_parquet(IN_PATH)

    station_col = next((c for c in df.columns if 'station' in c.lower()), None)
    if not station_col:
        print("No station column found"); return

    vtype_col = next((c for c in df.columns if 'violation' in c.lower() and 'type' in c.lower()), None)
    vehicle_col = next((c for c in df.columns if 'vehicle' in c.lower() and 'type' in c.lower()), None)

    # ── Build feature matrix per zone ─────────────────────────────────────
    zones = df[station_col].unique()
    feature_rows = []
    for zone in zones:
        zdf = df[df[station_col] == zone]
        n = len(zdf)
        if n < 50: continue
        row = {'zone': zone, 'count': n}

        if 'time_band' in zdf.columns:
            for band in ['EarlyAM(05-11)', 'Midday(11-15)', 'Afternoon(15-22)', 'Night(22-05)']:
                row[f'band_{band}'] = (zdf['time_band'] == band).mean()

        if 'is_weekend' in zdf.columns:
            row['weekend_ratio'] = zdf['is_weekend'].mean()

        if vtype_col:
            for vt in ['WRONG PARKING', 'NO PARKING', 'PARKING IN A MAIN ROAD']:
                row[f'vtype_{vt}'] = (zdf[vtype_col].str.upper() == vt).mean()

        if vehicle_col:
            for veh in ['SCOOTER', 'CAR', 'MOTORCYCLE']:
                row[f'veh_{veh}'] = (zdf[vehicle_col].str.upper() == veh).mean()

        if 'severity_weight' in zdf.columns:
            row['mean_severity'] = zdf['severity_weight'].mean()

        feature_rows.append(row)

    fdf = pd.DataFrame(feature_rows).fillna(0)
    feat_cols = [c for c in fdf.columns if c not in ['zone','count']]
    X = fdf[feat_cols].values

    # ── K-Means with silhouette selection ────────────────────────────────
    from sklearn.preprocessing import StandardScaler
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score

    X_scaled = StandardScaler().fit_transform(X)
    best_k, best_score, best_labels = 4, -1, None
    for k in range(4, 7):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        score = silhouette_score(X_scaled, labels)
        if score > best_score:
            best_k, best_score, best_labels = k, score, labels
    print(f"Best k={best_k}, silhouette={best_score:.3f}")

    fdf['cluster'] = best_labels

    # ── Hand-label clusters by dominant feature ───────────────────────────
    cluster_profiles = fdf.groupby('cluster')[feat_cols].mean()
    cluster_to_name = {}
    used_names = set()
    for c in range(best_k):
        prof = cluster_profiles.loc[c]
        if 'weekend_ratio' in prof and prof['weekend_ratio'] > 0.5:
            name = 'Market-Choke'
        elif 'band_EarlyAM(05-11)' in prof and prof['band_EarlyAM(05-11)'] > 0.5:
            name = 'Transit-Corridor'
        elif 'mean_severity' in prof and prof.get('mean_severity',0) < 0.4:
            name = 'Residential-Overflow'
        elif 'vtype_PARKING IN A MAIN ROAD' in prof and prof.get('vtype_PARKING IN A MAIN ROAD',0) > 0.1:
            name = 'Commercial-Strip'
        else:
            remaining = [n for n in ARCHETYPE_NAMES.values() if n not in used_names]
            name = remaining[0] if remaining else f'Zone-Type-{c}'
        used_names.add(name)
        cluster_to_name[c] = name

    fdf['archetype'] = fdf['cluster'].map(cluster_to_name)

    result = {
        'archetypes': fdf[['zone','cluster','archetype','count']].to_dict('records'),
        'k': best_k,
        'silhouette_score': round(best_score, 4),
        'archetype_names': cluster_to_name,
    }
    with open(OUT_PATH, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"Saved archetypes → {OUT_PATH}")

if __name__ == "__main__":
    main()
