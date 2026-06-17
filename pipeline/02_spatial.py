"""
02_spatial.py — Spatial hotspot discovery
H3 hex binning → Getis-Ord Gi* → HDBSCAN zones → KDE grid
Outputs: hotspots.geojson, hex_gi.json, kde_grid.json
"""
import json, numpy as np, pandas as pd
from pathlib import Path

IN_PATH = Path("../public/data/clean.parquet")
OUT_HOTSPOTS = Path("../public/data/hotspots.geojson")
OUT_HEX_GI   = Path("../public/data/hex_gi.json")
OUT_KDE      = Path("../public/data/kde_grid.json")

def main():
    if not IN_PATH.exists():
        print("Run 01_clean.py first"); return

    import h3
    import hdbscan
    from scipy.stats import zscore
    from sklearn.neighbors import KernelDensity

    df = pd.read_parquet(IN_PATH)
    df = df.dropna(subset=['lat', 'lon'])
    print(f"Spatial input: {len(df):,} rows")

    # ── H3 binning (resolution 9, ~174 m edge) ──────────────────────────
    df['h3_r9'] = df.apply(lambda r: h3.geo_to_h3(r['lat'], r['lon'], 9), axis=1)
    hex_counts = df.groupby('h3_r9').size().reset_index(name='count')

    # ── Getis-Ord Gi* (spatial lag approach) ────────────────────────────
    try:
        import libpysal.weights as lps_w
        from esda.getisord import G_Local
        coords = np.array([h3.h3_to_geo(h) for h in hex_counts['h3_r9']])
        w = lps_w.KNN.from_array(coords, k=6)
        w.transform = 'R'
        g_local = G_Local(hex_counts['count'].values, w)
        hex_counts['gi_zscore'] = g_local.Zs
        hex_counts['gi_pvalue'] = g_local.p_sim
        hex_counts['gi_class'] = 'NotSignificant'
        hex_counts.loc[hex_counts['gi_zscore'] > 3.29, 'gi_class'] = 'Hot99'
        hex_counts.loc[(hex_counts['gi_zscore'] > 1.96) & (hex_counts['gi_class'] == 'NotSignificant'), 'gi_class'] = 'Hot95'
        hex_counts.loc[(hex_counts['gi_zscore'] > 1.65) & (hex_counts['gi_class'] == 'NotSignificant'), 'gi_class'] = 'Hot90'
    except Exception as e:
        print(f"Gi* failed ({e}), using count zscore as proxy")
        hex_counts['gi_zscore'] = zscore(hex_counts['count'].values)
        hex_counts['gi_class'] = pd.cut(hex_counts['gi_zscore'], bins=[-np.inf, 1.65, 1.96, 3.29, np.inf],
                                         labels=['NotSignificant','Hot90','Hot95','Hot99'])

    # ── Build hex GeoJSON ────────────────────────────────────────────────
    hex_features = []
    for _, row in hex_counts.iterrows():
        boundary = h3.h3_to_geo_boundary(row['h3_r9'], geo_json=True)
        hex_features.append({
            'type': 'Feature',
            'properties': {
                'h3': row['h3_r9'], 'count': int(row['count']),
                'gi_zscore': round(float(row['gi_zscore']), 3),
                'gi_class': str(row['gi_class']),
            },
            'geometry': {'type': 'Polygon', 'coordinates': [boundary]},
        })
    with open(OUT_HEX_GI, 'w') as f:
        json.dump({'type': 'FeatureCollection', 'features': hex_features}, f)
    print(f"Saved {len(hex_features)} hex cells → {OUT_HEX_GI}")

    # ── HDBSCAN zone detection ────────────────────────────────────────────
    # Project to UTM 43N (metres) for meaningful eps
    from pyproj import Transformer
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
    coords_m = np.column_stack(transformer.transform(df['lon'].values, df['lat'].values))
    sample = df.sample(min(40000, len(df)), random_state=42)
    coords_s = np.column_stack(transformer.transform(sample['lon'].values, sample['lat'].values))

    clusterer = hdbscan.HDBSCAN(min_cluster_size=300, min_samples=30, cluster_selection_epsilon=150.0)
    labels = clusterer.fit_predict(coords_s)
    sample = sample.copy(); sample['cluster'] = labels

    from shapely.geometry import MultiPoint
    zone_features = []
    for label in set(labels):
        if label == -1: continue
        cluster_pts = sample[sample['cluster'] == label][['lat','lon']]
        centroid_lat, centroid_lon = cluster_pts['lat'].mean(), cluster_pts['lon'].mean()
        hull = MultiPoint(list(zip(cluster_pts['lon'], cluster_pts['lat']))).convex_hull
        if hull.geom_type == 'Polygon':
            coords_hull = list(hull.exterior.coords)
        else:
            coords_hull = [[centroid_lon, centroid_lat]]
        zone_id = f"Z{label+1:03d}"
        zone_features.append({
            'type': 'Feature',
            'properties': {
                'zone_id': zone_id,
                'count': int((labels == label).sum()),
                'centroid_lat': round(centroid_lat, 5),
                'centroid_lon': round(centroid_lon, 5),
            },
            'geometry': {'type': 'Polygon', 'coordinates': [coords_hull]},
        })
    hotspots_geojson = {'type': 'FeatureCollection', 'features': zone_features}
    with open(OUT_HOTSPOTS, 'w') as f:
        json.dump(hotspots_geojson, f)
    print(f"Saved {len(zone_features)} HDBSCAN zones → {OUT_HOTSPOTS}")

    # ── KDE grid for heat layer ───────────────────────────────────────────
    kde_sample = df.sample(min(20000, len(df)), random_state=0)[['lat','lon']].values
    kde = KernelDensity(bandwidth=0.0015, metric='haversine')
    kde.fit(np.deg2rad(kde_sample))
    lat_grid = np.linspace(12.80, 13.29, 80)
    lon_grid = np.linspace(77.44, 77.77, 80)
    lat_m, lon_m = np.meshgrid(lat_grid, lon_grid, indexing='ij')
    grid_pts = np.deg2rad(np.column_stack([lat_m.ravel(), lon_m.ravel()]))
    log_dens = kde.score_samples(grid_pts).reshape(80, 80)
    dens = np.exp(log_dens)
    dens_norm = ((dens - dens.min()) / (dens.max() - dens.min())).tolist()
    kde_data = {'lat_range': [12.80, 13.29], 'lon_range': [77.44, 77.77], 'grid_rows': 80, 'grid_cols': 80, 'density': dens_norm}
    with open(OUT_KDE, 'w') as f:
        json.dump(kde_data, f)
    print(f"Saved KDE grid → {OUT_KDE}")

if __name__ == "__main__":
    main()
