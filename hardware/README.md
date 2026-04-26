# Surface Communication Buoy

## Overview

The surface buoy is the communication gateway between the underwater sensor node and the cloud platform.

The buoy is not designed as the main sensing unit. Its primary role is to receive data from the underwater device, attach location and gateway metadata, and transmit the telemetry to the cloud database through LTE, LoRaWAN, or satellite communication.

Environmental data such as wind direction, wind speed, and PM10 is collected mainly from external sources such as satellite-based datasets, weather models, air-quality datasets, and nearby local meteorological stations.

## System Role

The buoy connects the underwater sensor node to the cloud.

```text
Underwater Sensor Node
        |
        | RS485 / waterproof cable
        v
Surface Communication Buoy
        |
        | LTE / LoRaWAN / Satellite Uplink
        v
Cloud API
        |
        v
Database
        |
        v
Dashboard / Alerts / ML Model
```

## Main Design Principle

The underwater device does not communicate directly with satellites.

Radio communication, GPS, LTE, LoRaWAN, and satellite uplink are handled above the water by the surface buoy. This keeps the underwater node smaller, cheaper, and more durable.

Correct design:

```text
Underwater node -> Surface communication buoy -> Cloud database
```

Incorrect design:

```text
Underwater node -> Satellite directly
```

## What the Buoy Does

The buoy handles:

```text
Receives data from the underwater sensor node
Adds gateway ID
Adds GPS position
Adds timestamp
Checks power status
Stores temporary backup data if needed
Sends telemetry to the cloud
Works as communication bridge for multiple local monitoring points
```

## What the Buoy Does Not Do

The buoy is not the primary source for all environmental data.

It does not need to physically measure every weather and air-quality parameter. For wind direction, wind speed, and PM10, the system can use external datasets from satellites, weather APIs, Copernicus services, air-quality sources, and local meteorological stations.

This reduces hardware cost and makes the buoy more reliable.

## External Environmental Data Sources

The platform combines underwater sensor data with external environmental data.

| Data Type | Source | Use |
|---|---|---|
| Wind direction | Local meteorological station, weather API, ERA5/Copernicus | Determines if wind is blowing toward the coast |
| Wind speed | Local meteorological station, weather API, ERA5/Copernicus | Estimates aerosol transport strength |
| PM10 | Local air-quality station, local meteorological station, air-quality API | Indicates airborne particle concentration |
| Aerosol proxy | Satellite aerosol products / atmospheric datasets | Supports regional air-quality estimation |
| Wave height | Copernicus Marine / weather model | Supports aerosolization risk |
| Sea surface temperature | Satellite / Copernicus Marine | Supports bloom-growth conditions |
| Chlorophyll-a | Sentinel-3 / Sentinel-2 | Detects algae biomass signal |
| Currents | Copernicus Marine | Estimates bloom transport |
| Salinity | Copernicus Marine + local underwater node | Supports water-mass and runoff analysis |

## Important Note About PM10

PM10 is not directly measured by the underwater device.

PM10 can come from:

```text
Sea spray
Dust
Traffic
Smoke
Construction
Industrial particles
```

Because of that, PM10 should not be used alone as proof of red tide or toxic algae.

Correct use:

```text
High bloom probability
+ onshore wind
+ wave activity
+ PM10 increase
= higher respiratory exposure risk
```

Incorrect use:

```text
High PM10 = red tide
```

## Communication Flow

```text
1. Underwater node measures water quality
2. Underwater node sends packet to buoy through RS485 cable
3. Buoy receives packet
4. Buoy adds GPS and gateway metadata
5. Buoy sends packet to cloud API
6. Cloud API stores data in database
7. Backend fetches external weather, satellite, and PM10 data
8. ML model combines all inputs
9. Dashboard shows local bloom risk and alerts
```

## Data Fusion Architecture

```text
Underwater IoT Data
  - temperature
  - pH
  - dissolved oxygen
  - turbidity
  - salinity
  - nitrate/phosphate if available

External Environmental Data
  - wind direction
  - wind speed
  - PM10
  - wave height
  - chlorophyll-a
  - sea surface temperature
  - currents

Combined Model
  - bloom growth risk
  - bloom confirmation confidence
  - respiratory exposure risk
  - alert severity
```

## Buoy Hardware

### Required Components

| Component | Purpose |
|---|---|
| Floating buoy body | Keeps the system above the water |
| Waterproof electronics enclosure | Protects gateway electronics |
| Gateway microcontroller | Handles local communication and telemetry |
| RS485 interface | Receives underwater sensor data |
| LTE / LoRaWAN / satellite module | Sends data to cloud |
| GPS module | Provides location and drift detection |
| Solar panel | Charges the battery |
| LiFePO4 battery | Powers the buoy system |
| Charge controller | Manages solar charging |
| IP68 cable connector | Connects to underwater sensor node |
| Antenna | Supports LTE, LoRaWAN, or satellite communication |

### Optional Components

| Component | Purpose |
|---|---|
| Local wind sensor | Backup if no local station is available |
| PM10/PM2.5 sensor | Backup if no local air-quality station is available |
| SD card | Local data backup |
| IMU | Buoy motion and tilt detection |
| Status LED | Local debugging |

## Recommended Hardware Configuration

### MVP Configuration

```text
ESP32 gateway
RS485 module
LTE module
GPS module
10-20 W solar panel
LiFePO4 battery
Waterproof enclosure
IP68 underwater cable connector
```

### Remote Deployment Configuration

```text
STM32 or industrial gateway controller
RS485 / Modbus interface
Satellite IoT module
GPS module
20-50 W solar panel
LiFePO4 battery
MPPT charge controller
Waterproof enclosure
Local SD backup
```

### Low-Cost Deployment Configuration

```text
ESP32 gateway
LoRaWAN module
GPS module
Small solar panel
LiFePO4 battery
Waterproof enclosure
```

## Communication Options

### LTE / 4G

Best for coastal areas with mobile coverage.

Advantages:

```text
Cheap data transfer
Easy cloud connection
Supports HTTP and MQTT
Good bandwidth
Fast debugging
```

Disadvantages:

```text
Requires cellular coverage
Uses more power than LoRaWAN
```

### LoRaWAN

Best when a LoRaWAN gateway exists nearby.

Advantages:

```text
Low power
Long range
Low operating cost
Good for small telemetry packets
```

Disadvantages:

```text
Requires LoRaWAN infrastructure
Limited payload size
Low data rate
```

### Satellite IoT

Best for remote coastlines.

Advantages:

```text
Works without local infrastructure
Useful for remote monitoring points
Good backup communication channel
```

Disadvantages:

```text
Higher cost
Higher latency
Small payload size
Requires compact packet encoding
```

## Buoy Telemetry Packet

The buoy forwards underwater sensor data and adds gateway metadata.

```json
{
  "gateway_id": "BUOY-001",
  "device_id": "UW-POINT-001",
  "timestamp": "2026-04-25T10:30:00Z",
  "lat": 43.77,
  "lon": 7.52,
  "temp_c": 23.4,
  "ph": 8.1,
  "dissolved_oxygen_mg_l": 5.8,
  "turbidity_ntu": 18,
  "salinity_psu": 36.2,
  "battery_percent": 87,
  "buoy_battery_percent": 76,
  "signal_type": "lte",
  "signal_strength": -84
}
```

## Compact Satellite Packet

For satellite transmission, use short keys and compact payloads.

```json
{
  "g": "B001",
  "d": "U001",
  "ts": 1777113000,
  "la": 43.77,
  "lo": 7.52,
  "t": 23.4,
  "p": 8.1,
  "o": 5.8,
  "tb": 18,
  "s": 36.2,
  "b": 87
}
```

## External Data Packet

External weather and air-quality data can be fetched by the backend using the buoy location.

```json
{
  "source": "local_meteostation",
  "station_id": "METEO-PORT-01",
  "timestamp": "2026-04-25T10:30:00Z",
  "lat": 43.77,
  "lon": 7.52,
  "wind_speed_m_s": 5.4,
  "wind_direction_deg": 220,
  "pm10_ug_m3": 42
}
```

## Cloud Backend Flow

```text
1. Receive buoy telemetry packet
2. Validate gateway token
3. Validate device ID
4. Store underwater sensor readings
5. Store gateway health data
6. Fetch latest external environmental data for the same location
7. Match readings by timestamp and geospatial zone
8. Run bloom-risk and exposure-risk logic
9. Store risk score
10. Trigger alert if threshold is exceeded
```

## Database Tables

### devices

```sql
create table devices (
  id uuid primary key default gen_random_uuid(),
  device_code text unique not null,
  device_type text not null,
  location_name text,
  lat double precision not null,
  lon double precision not null,
  installed_at timestamptz default now(),
  status text default 'active',
  firmware_version text,
  last_seen timestamptz
);
```

### sensor_readings

```sql
create table sensor_readings (
  id bigserial primary key,
  device_id uuid references devices(id),
  gateway_id uuid references devices(id),
  timestamp timestamptz not null,
  temp_c double precision,
  ph double precision,
  dissolved_oxygen_mg_l double precision,
  turbidity_ntu double precision,
  conductivity_us_cm double precision,
  salinity_psu double precision,
  nitrate_mg_l double precision,
  phosphate_mg_l double precision,
  battery_percent double precision,
  created_at timestamptz default now()
);
```

### gateway_status

```sql
create table gateway_status (
  id bigserial primary key,
  gateway_id uuid references devices(id),
  timestamp timestamptz not null,
  lat double precision,
  lon double precision,
  battery_percent double precision,
  battery_voltage double precision,
  signal_type text,
  signal_strength double precision,
  communication_status text,
  created_at timestamptz default now()
);
```

### external_environmental_data

```sql
create table external_environmental_data (
  id bigserial primary key,
  source text not null,
  station_id text,
  timestamp timestamptz not null,
  lat double precision,
  lon double precision,
  wind_speed_m_s double precision,
  wind_direction_deg double precision,
  pm10_ug_m3 double precision,
  wave_height_m double precision,
  sea_surface_temp_c double precision,
  chlorophyll_a_mg_m3 double precision,
  current_u double precision,
  current_v double precision,
  created_at timestamptz default now()
);
```

### risk_scores

```sql
create table risk_scores (
  id bigserial primary key,
  zone_id text not null,
  timestamp timestamptz not null,
  bloom_growth_score double precision,
  bloom_confirmation_score double precision,
  respiratory_exposure_score double precision,
  severity text,
  created_at timestamptz default now()
);
```

## Risk Logic

### Bloom Growth Risk

```text
High water temperature
+ salinity change
+ nutrient increase
+ satellite chlorophyll increase
= increased bloom-growth risk
```

### Bloom Confirmation Risk

```text
Satellite chlorophyll signal
+ local turbidity increase
+ local pH variation
+ dissolved oxygen trend
= higher bloom confirmation confidence
```

### Respiratory Exposure Risk

```text
Bloom probability
+ onshore wind direction
+ wind speed
+ wave height
+ PM10 increase
= respiratory exposure risk
```

## Alert Rules

```text
If buoy battery < 20%:
    alert_type = low_buoy_battery
    severity = warning

If buoy moves more than 50 m from deployment point:
    alert_type = buoy_drift
    severity = warning

If no packet is received for more than 30 minutes:
    alert_type = gateway_offline
    severity = warning

If bloom probability is high and wind is onshore:
    alert_type = coastal_exposure_risk
    severity = high

If bloom probability is high, wind is onshore, and PM10 is elevated:
    alert_type = respiratory_exposure_risk
    severity = high
```

## Deployment Notes

The buoy should be anchored near the monitored coastal point.

The underwater sensor cable should not carry the mechanical load of the buoy. Use a separate mooring rope and strain relief.

Recommended deployment:

```text
Surface buoy anchored with mooring line
Underwater sensor node mounted below or nearby
RS485 cable protected and strain-relieved
Solar panel exposed above water
Antenna mounted clear of water splash zone
```

## Maintenance

| Task | Frequency |
|---|---|
| Clean solar panel | Every 2-4 weeks |
| Inspect antenna | Monthly |
| Inspect waterproof electronics box | Monthly |
| Check cable gland | Monthly |
| Inspect mooring line | Monthly |
| Check battery health | Monthly |
| Check GPS drift history | Monthly |
| Update firmware | As needed |
| Inspect corrosion | Monthly |

## Cost Estimate

### MVP Communication Buoy

| Component | Estimated Cost |
|---|---:|
| Buoy body | €30-80 |
| ESP32 gateway | €5-8 |
| RS485 module | €2-5 |
| LTE module | €30-80 |
| GPS module | €5-15 |
| Solar panel | €15-40 |
| LiFePO4 battery | €30-80 |
| Charge controller | €10-30 |
| Waterproof electronics box | €15-40 |
| Antenna | €10-30 |
| Connectors and cables | €20-50 |

Estimated total:

```text
€170-450
```

### Satellite Communication Buoy

| Component | Estimated Cost |
|---|---:|
| Buoy body | €30-80 |
| Gateway controller | €5-30 |
| Satellite IoT module | €100-500+ |
| GPS module | €5-15 |
| Solar panel | €20-50 |
| LiFePO4 battery | €40-100 |
| Charge controller | €10-40 |
| Waterproof enclosure | €20-60 |
| Antenna and connectors | €30-100 |

Estimated total:

```text
€300-1000+
```

Final cost depends on the satellite provider, subscription plan, payload size, and transmission frequency.

## Repository Structure

```text
project-root/
  firmware/
    underwater-node/
    surface-communication-buoy/
  backend/
    supabase-functions/
    database-schema/
    external-data-ingestion/
  hardware/
    buoy/
      wiring/
      enclosure/
      bom/
    underwater-node/
      wiring/
      enclosure/
      bom/
  docs/
    communication-buoy.md
    deployment.md
    maintenance.md
    calibration.md
  README.md
```

## Summary

The buoy is a communication gateway, not the main environmental sensing unit.

The underwater node collects local water-quality data. The buoy receives that data and transmits it to the cloud. Wind direction, wind speed, PM10, wave height, sea surface temperature, and chlorophyll data are collected from external sources such as satellites, Copernicus services, weather APIs, air-quality APIs, and local meteorological stations.

This design keeps the local hardware cheaper, smaller, and more durable while still giving the platform enough environmental data for bloom-risk and respiratory-exposure prediction.
