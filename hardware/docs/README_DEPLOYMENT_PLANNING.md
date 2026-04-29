# RedMetrics Deployment Planning

## Purpose

This document explains how many RedMetrics monitoring devices may be needed for a sea coastline deployment. The device is fixed in one local monitoring point and measures local water quality around that point. It does not move or drift.

The goal is to choose enough monitoring points to capture meaningful local changes without overbuilding the first deployment.

## Deployment Assumptions

| Area | Assumption |
|---|---|
| Device type | Fixed RedMetrics monitoring device |
| Deployment area | Sea coastline |
| Movement | No drifting or mobile operation |
| Measurement coverage | Local water quality around each monitoring point |
| Reading interval | 30 minutes or 60 minutes |
| Placement method | Fixed rope, anchor, bracket, pier mount, or approved local installation hardware |

## Recommended Node Spacing

Node spacing depends on risk level, coastline shape, water flow, pollution sources, red tide risk, ports, river inflows, and required data precision.

Recommended first planning ranges:

| Zone type | Recommended spacing |
|---|---:|
| High-risk red tide zones | 1 node every 500 m to 1 km |
| Lower-risk monitoring zones | 1 node every 2 km to 5 km |

Dense placement improves local detail, but increases cost, maintenance work, and installation complexity.

## Node Count Formula

Use this simple planning formula:

```text
number_of_nodes = coastline_length_km / spacing_km
```

Because partial devices are not possible, round up:

```text
rounded_nodes = ceil(coastline_length_km / spacing_km)
```

Example:

```text
coastline_length_km = 10
spacing_km = 2

number_of_nodes = 10 / 2 = 5
rounded_nodes = ceil(5) = 5
```

## Example Node Counts

| Coastline length | High precision 0.5 km spacing | Balanced high-risk 1 km spacing | Lower-risk dense 2 km spacing | Lower-risk sparse 5 km spacing |
|---:|---:|---:|---:|---:|
| 5 km | 10 nodes | 5 nodes | 3 nodes | 1 node |
| 10 km | 20 nodes | 10 nodes | 5 nodes | 2 nodes |
| 25 km | 50 nodes | 25 nodes | 13 nodes | 5 nodes |
| 50 km | 100 nodes | 50 nodes | 25 nodes | 10 nodes |

These values are planning estimates. Final placement should be adjusted after site review and pilot deployment.

## Where Denser Placement Is Needed

Use denser placement near local hotspots where water quality can change quickly or unevenly.

Important hotspot examples:

- Ports and marinas.
- River outlets and drainage channels.
- Fish farms and aquaculture zones.
- Industrial zones and wastewater discharge areas.
- Calm bays with limited water exchange.
- Known red tide or harmful algal bloom zones.
- Tourist beaches where early warning has high value.

These areas may need spacing closer to 0.5 km or 1 km, even if the rest of the coastline uses wider spacing.

## Where Wider Placement Can Be Used

Wider spacing can be considered when:

- The coastline is open and well mixed.
- There are no major river inflows nearby.
- Pollution sources are limited.
- Historical red tide risk is low.
- The deployment goal is broad trend monitoring rather than detailed hotspot tracking.

For these areas, 2 km to 5 km spacing may be enough for early planning.

## Using Copernicus and Satellite Data

Copernicus and satellite data can help identify where RedMetrics devices should be placed.

Useful satellite-assisted planning inputs:

- Sea surface temperature patterns.
- Chlorophyll-a concentration patterns.
- Turbidity or water color changes.
- Historical bloom or red tide indicators.
- Coastal current and water movement context.
- River plume visibility after rain events.

Satellite data gives wide-area context, while RedMetrics provides local hardware measurements at fixed points.

## How Local Hardware Readings Help

Local RedMetrics readings validate and improve external observations by measuring the actual water conditions at the deployment site.

Local hardware can:

- Confirm whether satellite-observed changes are visible in the water at a specific point.
- Detect local nutrient changes near inflows that satellite data may not resolve.
- Provide frequent readings during cloudy weather when optical satellite data is limited.
- Build a reliable local baseline for each monitoring point.
- Support dashboard and analysis layers with direct water quality data.

## Pilot Deployment Recommendation

A practical first deployment should start with a small pilot before scaling.

Recommended pilot approach:

1. Select 2 to 5 representative monitoring points.
2. Include at least one suspected hotspot.
3. Include at least one lower-risk reference point.
4. Run the devices for several weeks.
5. Compare RedMetrics readings with satellite/Copernicus observations.
6. Adjust spacing, mounting depth, and maintenance schedule.
7. Scale to the full coastline plan after the pilot.

## Final Placement Checklist

Before final installation, confirm:

- Local permission and installation rules.
- Safe access for maintenance.
- Expected waves, currents, and storms.
- Water depth and sensor mounting depth.
- Nearby pollution sources or nutrient inflows.
- Communication coverage at the surface buoy.
- Solar exposure and shadow risk.
- Anchor or fixed mounting safety.
- Biofouling and cleaning requirements.

The final deployment map should combine risk analysis, satellite context, field access, and pilot results.
