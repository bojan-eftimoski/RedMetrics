# RedMetrics Hardware System

## Purpose

RedMetrics is a fixed coastal water quality monitoring device for local sea coastline deployments. It measures important water quality parameters at one monitoring point, stores readings safely when communication is unavailable, and later sends the collected data to a Supabase database.

For documentation simplicity, the underwater sensing part and the surface buoy are described as one integrated RedMetrics monitoring device with two physical modules:

- Underwater sensing module
- Surface buoy and communication gateway module

The first field-ready concept focuses on long deployment life, modularity, low power operation, repairability, replaceable sensors, sealed electronics, and optional solar-assisted charging.

## Why Local Sea Water Monitoring Is Needed

Satellite and regional environmental data are useful for wide-area observation, but they cannot replace local water measurements at the exact coastline point where pollution, nutrient inflow, or red tide risk may appear.

Local hardware monitoring helps with:

- Detecting changes close to ports, river outlets, farms, industrial zones, and calm bays.
- Validating satellite or Copernicus observations with physical measurements.
- Tracking short-term water quality changes that can be missed by lower-frequency external datasets.
- Supporting early warning analysis for harmful algal bloom and red tide conditions.
- Building a reliable local historical dataset for a specific coastal point.

## System Assumptions

| Area | Assumption |
|---|---|
| Board | ESP32-S3 |
| Deployment environment | Sea coastline |
| Installation type | Fixed local monitoring point |
| Movement | The device does not move or drift |
| Power | Rechargeable battery with solar charging support |
| Reading interval | 30 minutes or 60 minutes |
| Cloud target | Supabase database in a later implementation |
| Communication direction | Device inserts data only; it does not read, update, or delete database records |

## Integrated Device Architecture

The RedMetrics device is designed as one monitoring system. The underwater module collects water quality data, while the surface buoy provides power support, physical visibility, and communication access above the water.

```text
Underwater sensors
        ↓
ESP32-S3 controller
        ↓
Local backup storage
        ↓
Surface buoy / communication gateway
        ↓
Internet
        ↓
Supabase database
        ↓
Dashboard / analysis layer
```

## Underwater Sensing Module

The underwater sensing module contains the water-contact sensors and sealed electronics. It is responsible for collecting clean numeric values for each reading cycle.

Main responsibilities:

- Keep sensors positioned at the selected monitoring depth.
- Protect electronics from water using a sealed enclosure.
- Allow sensor replacement without redesigning the full device.
- Collect measurements from all seven water quality sensors.
- Continue operating when one sensor fails, where possible.

The underwater section should use marine-ready materials, waterproof connectors, cable glands, and corrosion-resistant fasteners. The sensor area should be serviceable because probes require cleaning, calibration, and eventual replacement.

## Surface Buoy and Gateway Module

The surface buoy is part of the same integrated RedMetrics monitoring device. It is not a separate product. It supports the underwater sensing module by providing visibility, power support, and communication access.

Main responsibilities:

- Hold the visible floating structure above the fixed monitoring point.
- Support a rechargeable battery and optional solar panel.
- Provide a dry or protected area for gateway electronics where needed.
- Improve wireless signal quality by keeping antennas above water.
- Help technicians locate and service the installation.

The buoy should be physically fixed with rope, anchor, or local mounting hardware so the device remains assigned to one monitoring point.

## ESP32-S3 Controller Role

The ESP32-S3 controls the simple hardware flow:

1. Wake or start the reading cycle.
2. Read each water quality sensor.
3. Validate each sensor value.
4. Create a simple payload with one value per parameter.
5. Store the payload locally if communication is unavailable.
6. Send new and previously saved payloads when connection is restored.
7. Return to waiting mode until the next reading interval.

The controller should keep the logic simple and explainable. It should avoid frequent readings because sea deployments need low power operation and long battery life.

## Solar-Assisted Power Concept

The power system is designed around a rechargeable battery with optional solar charging support.

Recommended concept:

- Rechargeable battery pack powers the device between service visits.
- Solar panel on the surface buoy extends deployment life.
- Solar charge controller protects the battery and manages charging.
- Voltage regulation provides stable power for the ESP32-S3 and sensors.
- Reading intervals of 30 or 60 minutes reduce energy consumption.

The solar panel should be treated as support, not as the only power source. Coastal weather, shadows, waves, and salt buildup can reduce solar performance.

## Sensor Reading Cycle

The normal reading cycle should be slow and predictable:

```text
Wait for reading interval
        ↓
Check power and communication state
        ↓
Read pH
        ↓
Read conductivity
        ↓
Read nitrate
        ↓
Read phosphate
        ↓
Read turbidity
        ↓
Read temperature
        ↓
Read dissolved oxygen
        ↓
Validate readings
        ↓
Create payload
        ↓
Send or save locally
```

Recommended reading interval:

```text
30 minutes for higher local detail
60 minutes for lower power use and longer deployment life
```

The device should not stop the full cycle because one sensor fails. A failed or invalid value should be handled safely and logged.

## Payload Creation

Each payload should stay flat and easy to explain. It should contain one value per sensor and basic status fields.

| Field | Purpose |
|---|---|
| device_id | Identifies the RedMetrics monitoring device |
| timestamp | Time when the reading was collected |
| ph | pH reading |
| conductivity | Electrical conductivity reading |
| nitrate | Nitrate reading |
| phosphate | Phosphate reading |
| turbidity | Turbidity reading |
| temperature | Water temperature reading |
| dissolved_oxygen | Dissolved oxygen reading |
| connection_status | Shows whether communication was available |
| backup_status | Shows whether the payload was sent directly or saved locally |

The timestamp must represent the collection time. If internet time is unavailable, the device should mark the timestamp source clearly, for example by using a fallback uptime-based timestamp in the implementation.

## Offline Backup Concept

Sea deployments cannot assume constant internet access. RedMetrics should protect readings by saving failed or offline payloads locally.

Recommended first approach:

- Store unsent payloads as JSON lines in local flash storage or a simple storage module.
- Keep the original timestamp from the moment of collection.
- Retry saved payloads when communication is restored.
- Remove saved payloads only after a successful database insert response.
- Log backup failures clearly during development and field testing.

This behavior prevents short communication outages from causing silent data loss.

## Later Supabase Communication Concept

Supabase is the planned cloud database target for later implementation. The ESP32-S3 should use simple HTTP POST requests to insert new readings.

Important communication rules:

- The ESP32-S3 should only insert new records.
- The ESP32-S3 should not read records from Supabase.
- The ESP32-S3 should not update existing records.
- The ESP32-S3 should not delete records.
- Public testing configuration should use placeholders in code and documentation.
- Service role keys must never be placed on the ESP32.

For a real test deployment, the required Supabase configuration is:

- Project URL
- Anon public key for testing
- Table name
- Exact column names
- Row Level Security status
- Insert policy status

## Measured Parameters

| Parameter | Why it matters |
|---|---|
| pH | Shows acidity or alkalinity changes that can indicate biological activity, pollution, or chemical imbalance. |
| Conductivity | Tracks dissolved ions and helps identify salinity changes, freshwater inflow, runoff, or abnormal dissolved material. |
| Nitrate | Indicates nitrogen nutrient input from agriculture, wastewater, river inflow, or decomposition. High nitrate can support algae growth. |
| Phosphate | Indicates phosphorus nutrient input. Phosphate is often a limiting nutrient, so changes can be important for bloom risk analysis. |
| Turbidity | Shows suspended particles, sediment, organic matter, or possible biomass changes in the water column. |
| Temperature | Affects biological activity, dissolved oxygen behavior, algae growth conditions, and sensor compensation. |
| Dissolved oxygen | Indicates ecosystem health. Low oxygen can signal decomposition, bloom collapse, or stress for marine life. |

## Prototype vs Field-Ready Behavior

| Area | Prototype behavior | Field-ready behavior |
|---|---|---|
| Enclosure | Simple waterproof box for short tests | Sealed marine-ready enclosure with serviceable sensor access |
| Power | USB or small battery | Rechargeable battery with solar charging support |
| Communication | Wi-Fi during tests | Surface gateway with antenna or suitable coastal communication module |
| Sensors | Lower-cost development sensors | Replaceable water monitoring probes with calibration plan |
| Backup | Basic local save behavior | Reliable local backup with resend after connection recovery |
| Maintenance | Manual bench checks | Planned cleaning, calibration, seal inspection, and battery checks |
| Deployment | Short controlled test | Fixed sea coastline installation with anchor or mounting hardware |

## Field Maintenance Notes

Field-ready monitoring needs regular maintenance. The exact schedule depends on water conditions, biofouling, sensor grade, and deployment season.

Recommended maintenance checks:

- Clean sensor surfaces and optical windows.
- Inspect seals, cable glands, and connectors.
- Check corrosion on screws, mounting hardware, and contacts.
- Verify battery health and solar charging behavior.
- Recalibrate pH, conductivity, nitrate, phosphate, and dissolved oxygen sensors as required.
- Confirm that locally backed-up readings are being sent after connection recovery.

## Practical First Version Scope

The first RedMetrics hardware documentation supports a clear hackathon-friendly explanation:

- One fixed integrated monitoring device.
- Seven local water quality measurements.
- ESP32-S3 controller.
- 30-minute or 60-minute low-power reading cycle.
- Simple flat payload.
- Local backup when communication fails.
- Later insert-only Supabase communication.
- Sustainable field-ready bill of materials for a coastal deployment.
