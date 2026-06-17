# SENTINEL — AI Parking Enforcement Intelligence

Predictive parking-enforcement intelligence for Bengaluru, built for the **Flipkart Gridlock Hackathon 2.0 (Round 2)**.

SENTINEL turns 248,376 real parking-enforcement records into a live decision tool that tells patrol commanders **where to deploy, when, and why** — across 20 zones and 28 time slots (7 days × 4 time bands), powered by a LightGBM-Poisson forecast model.

---

## Quick Start

**Prerequisites:** [Node.js 18+](https://nodejs.org/) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open the URL shown in the terminal (typically **http://localhost:5173**).

That's it — no backend, no API keys, no environment setup. All data is bundled.

### Production build (optional)

```bash
npm run build      # outputs to dist/
npm run preview    # serves the production build locally
```

---

## What's Inside

| Tab | What it does |
|-----|--------------|
| **Hotspot Map** | Live map with Heat, Priority, and Zone-Type layers. Switch day/time band and vehicle type to see forecasts update in real time. Click any zone for a full breakdown. |
| **Patrol Plan** | Zones ranked by priority score for the selected slot. Adjust team count and watch live coverage %. Tune the forecast/severity/growth weights. |
| **Impact Analysis** | Severity-weighted impact scoring with live re-ranking. Stress-test the model with 9 severity sliders. |
| **Explore** | Full exploratory data analysis — seasonal patterns, vehicle mix, top junctions and stations, repeat-offender rates. |

---

## Tech Stack

- **React 18 + TypeScript + Vite**
- **MapLibre GL** (CARTO Positron basemap)
- **ECharts** for data visualisation
- **Zustand** for state management
- **Tailwind CSS** with a custom Material-You design system

## Model Pipeline

The `pipeline/` folder contains the Python scripts used to clean the data, compute spatial statistics, train the LightGBM-Poisson forecaster, and generate the priority queue. The app ships with the pre-computed outputs, so **you do not need to run the pipeline to run the app**.

---

## Team — Co-Architects

- **Rajit Mohan Shrivastava** · rajitmonu@gmail.com
- **Kshitiz Goyal** · kshitgoz25@gmail.com

Built for Flipkart Gridlock Hackathon 2.0.
