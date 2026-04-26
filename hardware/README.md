# Underwater IoT Water-Quality Monitoring System

## Overview

This project defines a coastal water-quality monitoring system for harmful algal bloom and red-tide risk detection.

The system consists of two connected hardware units:

1. Underwater IoT Sensor Node
2. Surface Communication Buoy

The underwater node collects local water-quality measurements. The surface buoy works mainly as a communication gateway. It receives data from the underwater node, adds GPS and gateway metadata, and transmits telemetry to the cloud database using LTE, LoRaWAN, or satellite communication.

Wind direction, wind speed, PM10, wave height, sea surface temperature, chlorophyll-a, and other environmental inputs are collected mainly from satellite datasets, Copernicus services, weather APIs, air-quality APIs, and nearby local meteorological stations.

The system is designed for deployment at multiple coastal monitoring points.

## System Architecture

```text
Underwater IoT Sensor Node
        |
        | RS485 + power cable
        v
Surface Communication Buoy
        |
        | LTE / LoRaWAN / Satellite Uplink
        v
Cloud API / Edge Function
        |
        v
PostgreSQL / Supabase Database
        |
        v
Dashboard / Alerts / ML Model
```

## Data Flow

```text
1. Underwater sensors measure water quality
2. Microcontroller reads and validates sensor data
3. Data is stored locally as backup
4. Telemetry is sent to the surface buoy through RS485
5. Buoy adds GPS, timestamp, signal, and power metadata
6. Buoy sends data to cloud API
7. Backend fetches satellite, weather, PM10, and local meteo-station data
8. Database stores local and external data
9. ML model calculates bloom risk and exposure risk
10. Dashboard shows readings, maps, and alerts
```

## Main Design Principle

The underwater device does not communicate directly with satellites.

Satellite, GPS, LTE, and LoRa communication are handled above the water by the surface buoy. The underwater node uses a waterproof wired connection to the buoy.

Correct design:

```text
Underwater node -> RS485 cable -> Surface communication buoy -> Cloud database
```

Incorrect design:

```text
Underwater node -> Satellite directly
```

## Hardware Units

# 1. Underwater IoT Sensor Node

## Purpose

The underwater node measures local water-quality parameters that indicate bloom growth conditions or ecosystem stress.

It does not directly identify every algae species. Instead, it measures physical and chemical indicators that support harmful algal bloom detection when combined with satellite, weather, and local meteorological data.

## Main Measurements

| Parameter | Unit | Purpose |
|---|---:|---|
| Water temperature | °C | Detects warm conditions that support algae growth |
| pH | pH | Tracks chemical and biological activity |
| Dissolved oxygen | mg/L | Detects ecosystem stress and decomposition |
| Turbidity | NTU | Tracks suspended particles and possible biomass changes |
| Conductivity | µS/cm or mS/cm | Measures electrical conductivity of water |
| Salinity | PSU | Detects seawater/freshwater mixing and runoff |
| Nitrate | mg/L | Tracks nitrogen nutrient input |
| Phosphate | mg/L | Tracks phosphorus nutrient input |
| Battery voltage | V / % | Tracks power system health |
| Leak detection | Boolean | Detects water inside electronics chamber |

## Physical Design

Recommended form factor:

```text
Vertical cylindrical marine probe
```

Recommended dimensions:

```text
Length: 25-35 cm
Diameter: 6-10 cm
Weight: 0.8-1.5 kg
```

Recommended structure:

```text
Top section: sealed electronics chamber
Bottom section: replaceable wet sensor head
Outer protection: slotted sensor cage
Connection: waterproof cable to surface buoy
```

## Underwater Node Structure

```text
            Cable to surface buoy
                    |
            IP68 connector
                    |
        +-----------------------+
        | Dry electronics       |
        | chamber               |
        |                       |
        | MCU                   |
        | RS485 module          |
        | Power regulation      |
        | SD backup storage     |
        | Leak detector         |
        +-----------+-----------+
                    |
        +-----------+-----------+
        | Replaceable wet       |
        | sensor head           |
        |                       |
        | Temperature           |
        | pH                    |
        | Dissolved oxygen      |
        | Turbidity             |
        | Conductivity          |
        | Optional nutrients    |
        +-----------------------+
```

## Main Components

| Component | Recommended Option | Notes |
|---|---|---|
| Microcontroller | ESP32 for MVP, STM32 for production | ESP32 is easier for prototyping |
| Communication | RS485 transceiver | Reliable wired underwater communication |
| Local storage | MicroSD card or flash memory | Used for backup logging |
| Power input | 12 V from buoy | Regulated locally to 5 V and 3.3 V |
| Temperature sensor | DS18B20 waterproof probe | Cheap and simple |
| pH sensor | Industrial pH probe with BNC connector | Requires calibration |
| Dissolved oxygen sensor | Galvanic DO for MVP, optical DO for production | Optical is better but more expensive |
| Turbidity sensor | Optical turbidity probe | Requires clean optical window |
| Conductivity sensor | EC probe | Used to estimate salinity |
| Nitrate sensor | Ion-selective or UV nitrate sensor | Optional, expensive |
| Phosphate sensor | Colorimetric module | Optional, complex |
| Leak detector | Internal moisture sensor | Mandatory for real deployment |
| Enclosure | PVC, polycarbonate, or POM/Delrin | Must be sealed properly |

## Sensor Details

### Temperature Sensor

Measures water temperature in degrees Celsius.

Example:

```json
{
  "temp_c": 23.4
}
```

Use:

```text
Detects warm water conditions
Supports bloom growth analysis
Helps compensate conductivity readings
Helps interpret dissolved oxygen levels
```

Recommended sensor:

```text
DS18B20 waterproof temperature probe
```

### pH Sensor

Measures acidity or basicity of the water.

Example:

```json
{
  "ph": 8.1
}
```

Use:

```text
Tracks chemical changes
Detects biological activity
Detects abnormal water chemistry
Supports bloom confidence scoring
```

Maintenance:

```text
Calibrate with pH 4, pH 7, and pH 10 buffer solutions
Clean regularly
Replace when drift becomes too high
```

### Dissolved Oxygen Sensor

Measures oxygen concentration in water.

Example:

```json
{
  "dissolved_oxygen_mg_l": 5.8
}
```

Use:

```text
Detects ecosystem stress
Detects oxygen depletion
Helps identify bloom decay or organic pollution
Supports fish-life risk analysis
```

Interpretation:

```text
> 7 mg/L      Good oxygen availability
5-7 mg/L     Acceptable
3-5 mg/L     Stressful for aquatic life
< 3 mg/L     Hypoxic risk
```

### Turbidity Sensor

Measures water cloudiness caused by suspended particles.

Example:

```json
{
  "turbidity_ntu": 18
}
```

Use:

```text
Detects suspended particles
Tracks possible algae biomass changes
Detects runoff, sediment, or pollution events
Improves local bloom confidence when combined with satellite chlorophyll data
```

Limitation:

```text
High turbidity does not automatically mean red tide.
```

### Conductivity and Salinity Sensor

Measures electrical conductivity and estimates salinity.

Example:

```json
{
  "conductivity_us_cm": 52000,
  "salinity_psu": 36.2
}
```

Use:

```text
Detects freshwater inflow
Detects coastal mixing
Detects runoff events
Helps classify local water conditions
```

Temperature compensation is required for accurate salinity estimation.

### Nitrate Sensor

Measures nitrate concentration.

Example:

```json
{
  "nitrate_mg_l": 1.4
}
```

Use:

```text
Tracks nitrogen nutrient input
Detects agricultural runoff
Detects sewage or stormwater influence
Supports bloom-growth risk estimation
```

Limitation:

```text
Nitrate sensors are expensive and require calibration.
For a low-cost MVP, nitrate should be optional.
```

### Phosphate Sensor

Measures phosphate concentration.

Example:

```json
{
  "phosphate_mg_l": 0.08
}
```

Use:

```text
Tracks phosphorus nutrient input
Supports nutrient-loading analysis
Helps identify bloom-supporting conditions
```

Limitation:

```text
Phosphate measurement is difficult in a small low-cost underwater device.
It is better implemented as a premium or future module.
```

### Leak Detection Sensor

Detects water inside the sealed electronics chamber.

Example:

```json
{
  "leak_detected": false
}
```

Use:

```text
Protects electronics
Sends maintenance warnings
Allows emergency shutdown
Prevents silent device failure
```

### Power Monitoring

Measures battery voltage, current, and power status.

Example:

```json
{
  "battery_percent": 87,
  "battery_voltage": 12.4
}
```

Use:

```text
Tracks energy health
Detects power failure
Detects abnormal current draw
Supports maintenance planning
```

## Underwater Node Materials

| Part | Material | Reason |
|---|---|---|
| Main body | PVC, polycarbonate, or POM/Delrin | Waterproof, machinable, corrosion-resistant |
| End caps | POM/Delrin or machined PVC | Strong sealing surface |
| Screws and bolts | 316 stainless steel | Marine corrosion resistance |
| Sensor cage | POM, PVC, nylon, or 316 stainless steel | Mechanical protection |
| O-rings | Silicone or EPDM | Waterproof sealing |
| Cable gland | IP68-rated nylon or stainless steel | Waterproof cable entry |
| Internal holder | PETG, ASA, or ABS | Holds electronics |
| Optical window | Acrylic, polycarbonate, or glass | Required for optical sensors |
| Anti-fouling ring | Copper | Reduces biological growth |

Avoid:

```text
PLA structural parts
Normal steel screws
Unsealed 3D-printed housings
Hot glue waterproofing
Exposed electronics
```

## Waterproofing Requirements

Recommended features:

```text
Double O-ring sealed end caps
IP68 waterproof cable connector
Marine epoxy around cable exits
Silicone grease on O-rings
Internal desiccant pack
Leak detection sensor
```

Minimum test before deployment:

```text
Submerge device for 24 hours
Check internal moisture
Check leak sensor
Inspect connector and O-rings
Verify sensor readings after test
```

## Underwater Node Communication

Recommended communication:

```text
RS485 over waterproof marine cable
```

Cable wiring:

```text
Wire 1: +12 V
Wire 2: GND
Wire 3: RS485 A
Wire 4: RS485 B
```

Recommended protocol:

```text
MVP: JSON over serial
Production: Modbus RTU over RS485
```

## Underwater Node Sampling Rate

Recommended modes:

```text
Normal mode: every 5-10 minutes
Alert mode: every 1 minute
Low-power mode: every 10-15 minutes
```

Sampling frequency can increase when abnormal changes are detected.

## Underwater Node Data Packet

```json
{
  "device_id": "UW-POINT-001",
  "timestamp": "2026-04-25T10:30:00Z",
  "temp_c": 23.4,
  "ph": 8.1,
  "dissolved_oxygen_mg_l": 5.8,
  "turbidity_ntu": 18,
  "conductivity_us_cm": 52000,
  "salinity_psu": 36.2,
  "nitrate_mg_l": 1.4,
  "phosphate_mg_l": 0.08,
  "battery_percent": 87,
  "leak_detected": false
}
```

# 2. Surface Communication Buoy

## Purpose

The surface buoy is mainly a communication device.

It connects the underwater node to the cloud platform. It receives underwater sensor data, adds gateway metadata, and sends the packet to the database through LTE, LoRaWAN, or satellite uplink.

The buoy does not need to physically measure wind direction, wind speed, or PM10. Those values are collected by the backend from satellite datasets, Copernicus services, weather APIs, air-quality APIs, and nearby local meteorological stations.

## What the Buoy Handles

```text
Receives underwater sensor data
Adds gateway ID
Adds GPS location
Adds timestamp
Checks buoy battery status
Checks communication status
Stores backup packet if cloud connection fails
Sends telemetry to cloud API
Works as a gateway for one or more local underwater nodes
```

## What the Buoy Does Not Need to Measure

```text
Wind direction
Wind speed
PM10
Wave height
Sea surface temperature
Chlorophyll-a
Currents
```

These values can be pulled from external services by the backend.

This keeps the buoy cheaper, simpler, and more reliable.

## External Environmental Data Sources

| Data Type | Source | Use |
|---|---|---|
| Wind direction | Local meteorological station, weather API, ERA5/Copernicus | Determines if wind is blowing toward the coast |
| Wind speed | Local meteorological station, weather API, ERA5/Copernicus | Estimates aerosol transport strength |
| PM10 | Local air-quality station, local meteorological station, air-quality API | Indicates airborne particle concentration |
| Aerosol proxy | Satellite atmospheric datasets | Supports regional air-quality estimation |
| Wave height | Copernicus Marine / weather model | Supports aerosolization risk |
| Sea surface temperature | Satellite / Copernicus Marine | Supports bloom-growth conditions |
| Chlorophyll-a | Sentinel-3 / Sentinel-2 | Detects algae biomass signal |
| Currents | Copernicus Marine | Estimates bloom transport |
| Salinity | Copernicus Marine + local underwater node | Supports water-mass and runoff analysis |

## Important Note About PM10

PM10 should not be treated as direct proof of red tide.

PM10 can come from:

```text
Sea spray
Dust
Traffic
Smoke
Construction
Industrial particles
```

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

## Physical Design

Recommended form factor:

```text
Toroidal buoy or compact floating platform
```

Recommended dimensions:

```text
Diameter: 40-80 cm
Height above water: 20-50 cm
```

Main parts:

```text
Floating body
Solar panel
Waterproof electronics enclosure
Battery
Charge controller
Gateway controller
GPS module
LTE / LoRaWAN / satellite module
Antenna
Cable connector to underwater node
```

## Buoy Structure

```text
            Antenna
               |
        +--------------+
        | Solar panel  |
        +--------------+
        | Waterproof   |
        | electronics  |
        | box          |
        +--------------+
        | Floating     |
        | buoy body    |
        +------+-------+
               |
               | Waterproof cable
               |
        Underwater sensor node
```

## Buoy Materials

| Part | Material | Reason |
|---|---|---|
| Floating body | HDPE, polyethylene foam, or marine plastic | Buoyant and durable |
| Electronics enclosure | IP67/IP68 polycarbonate box | Protects electronics |
| Fasteners | 316 stainless steel | Corrosion resistance |
| Antenna mount | Fiberglass, plastic, or stainless steel | Outdoor durability |
| Solar panel frame | Anodized aluminum or plastic | Lightweight |
| Cable entry | IP68 cable gland | Waterproof routing |
| Mooring hardware | 316 stainless steel or marine rope | Anchoring |

Avoid:

```text
Indoor electrical boxes
Normal steel
Exposed connectors
Unsealed cable entries
```

## Buoy Electronics

| Component | Recommended Option | Purpose |
|---|---|---|
| Gateway controller | ESP32 for MVP, STM32 or industrial gateway for production | Controls data transfer |
| RS485 module | MAX485 or industrial RS485 transceiver | Receives underwater node data |
| LTE module | SIM7600, SIM7080, Quectel EC25 | Sends data using cellular network |
| Satellite module | Kinéis, Iridium, Astrocast-type module | Remote-area communication |
| LoRaWAN module | SX1276/SX1262 based module | Long-range low-power communication |
| GPS module | u-blox GNSS | Location and drift detection |
| Solar panel | 10-20 W MVP, 20-50 W production | Power generation |
| Battery | LiFePO4 | Energy storage |
| Charge controller | LiFePO4 solar charger or MPPT | Battery management |
| Local backup | SD card or flash memory | Stores packets when offline |

## Communication Options

### LTE / 4G

Best when mobile coverage is available.

Advantages:

```text
Cheap data transfer
Supports HTTPS and MQTT
Good bandwidth
Easy debugging
```

Disadvantages:

```text
Requires cellular coverage
Higher power draw than LoRaWAN
```

### LoRaWAN

Best when a LoRaWAN gateway is nearby.

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

Best for remote coastlines without mobile coverage.

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

Satellite should be used for compact telemetry packets, not large JSON payloads at high frequency.

## GPS

The buoy contains the GPS module because GPS does not work underwater.

GPS data:

```json
{
  "lat": 43.77,
  "lon": 7.52
}
```

Use:

```text
Geospatial database mapping
Device location tracking
Drift detection
Matching sensor data with satellite pixels
```

Drift alert:

```text
If buoy moves more than 50 m from deployment location:
    create maintenance alert
```

## Buoy Power System

Recommended configuration:

```text
Solar panel: 10-20 W MVP, 20-50 W production
Battery: LiFePO4, 6-12 Ah MVP, 12-30 Ah production
Charge controller: LiFePO4 compatible charger or MPPT
Output to underwater node: 12 V
Local regulation: 5 V and 3.3 V
```

Power modes:

```text
Normal mode: wake every 5-10 minutes
Alert mode: send more frequently
Low-power mode: batch data and transmit less often
```

## Buoy Cloud Packet

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
  "conductivity_us_cm": 52000,
  "salinity_psu": 36.2,
  "nitrate_mg_l": 1.4,
  "phosphate_mg_l": 0.08,
  "underwater_battery_percent": 87,
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

# 3. External Data Ingestion

## Purpose

External data completes the model. The underwater node gives local water-quality data. The buoy gives communication and location. The backend adds environmental context from satellites, weather models, air-quality sources, and local meteorological stations.

## External Data Packet

Example packet from local meteorological or air-quality station:

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

Example packet from satellite/ocean data service:

```json
{
  "source": "copernicus_marine",
  "zone_id": "COASTAL-ZONE-001",
  "timestamp": "2026-04-25T10:30:00Z",
  "sea_surface_temp_c": 23.9,
  "chlorophyll_a_mg_m3": 4.2,
  "wave_height_m": 0.7,
  "current_u": 0.12,
  "current_v": -0.04
}
```

## Backend Data Fusion

```text
Underwater node data:
  temperature
  pH
  dissolved oxygen
  turbidity
  salinity
  nitrate/phosphate if available

Buoy data:
  gateway ID
  GPS location
  timestamp
  battery status
  signal type
  signal strength

External data:
  wind direction
  wind speed
  PM10
  wave height
  chlorophyll-a
  sea surface temperature
  currents

Model output:
  bloom growth score
  bloom confirmation score
  respiratory exposure score
  alert severity
```

# 4. Cloud Backend

## API Flow

```text
1. Receive buoy telemetry packet
2. Validate gateway token
3. Validate device ID
4. Store underwater sensor readings
5. Store gateway health data
6. Fetch latest external environmental data for same location
7. Match readings by timestamp and geospatial zone
8. Run bloom-risk and exposure-risk logic
9. Store risk score
10. Trigger alert if threshold is exceeded
```

## Recommended MVP Endpoint

```text
POST /api/telemetry
```

## Example API Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DEVICE_TOKEN" \
  -d '{
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
    "underwater_battery_percent": 87,
    "buoy_battery_percent": 76,
    "signal_type": "lte"
  }'
```

# 5. Database Schema

## devices

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

## sensor_readings

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
  underwater_battery_percent double precision,
  leak_detected boolean,
  created_at timestamptz default now()
);
```

## gateway_status

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

## external_environmental_data

```sql
create table external_environmental_data (
  id bigserial primary key,
  source text not null,
  station_id text,
  zone_id text,
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

## risk_scores

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

## alerts

```sql
create table alerts (
  id bigserial primary key,
  device_id uuid references devices(id),
  timestamp timestamptz default now(),
  alert_type text,
  severity text,
  message text,
  value double precision,
  threshold double precision
);
```

# 6. Risk Logic

## Bloom Growth Risk

```text
High water temperature
+ salinity change
+ nutrient increase
+ satellite chlorophyll increase
= increased bloom-growth risk
```

## Bloom Confirmation Risk

```text
Satellite chlorophyll signal
+ local turbidity increase
+ local pH variation
+ dissolved oxygen trend
= higher bloom confirmation confidence
```

## Respiratory Exposure Risk

```text
Bloom probability
+ onshore wind direction
+ wind speed
+ wave height
+ PM10 increase
= respiratory exposure risk
```

# 7. Alert Rules

```text
If leak_detected = true:
    alert_type = device_leak
    severity = critical

If underwater_battery_percent < 20:
    alert_type = low_underwater_battery
    severity = warning

If buoy_battery_percent < 20:
    alert_type = low_buoy_battery
    severity = warning

If buoy moves more than 50 m from deployment point:
    alert_type = buoy_drift
    severity = warning

If no packet is received for more than 30 minutes:
    alert_type = gateway_offline
    severity = warning

If temperature is high and turbidity is rising and dissolved oxygen is falling:
    alert_type = possible_bloom_stress
    severity = warning

If bloom probability is high and wind is onshore:
    alert_type = coastal_exposure_risk
    severity = high

If bloom probability is high, wind is onshore, and PM10 is elevated:
    alert_type = respiratory_exposure_risk
    severity = high
```

# 8. Maintenance

## Underwater Node

| Task | Frequency |
|---|---|
| Clean sensor head | Every 1-2 weeks |
| Check biofouling | Every 1-2 weeks |
| Calibrate pH probe | Every 2-4 weeks |
| Calibrate DO sensor | Monthly or per manufacturer |
| Inspect O-rings | Every service visit |
| Replace desiccant | Every service visit |
| Inspect cable gland | Every service visit |
| Check corrosion | Monthly |

## Surface Communication Buoy

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

# 9. Estimated Cost

## Underwater Node MVP

| Component | Estimated Cost |
|---|---:|
| ESP32 | €5-8 |
| Temperature sensor | €2-5 |
| pH sensor | €20-60 |
| Turbidity sensor | €10-20 |
| Conductivity sensor | €30-60 |
| RS485 module | €2-5 |
| Waterproof case | €20-50 |
| Cable glands/connectors | €10-20 |
| Mounting hardware | €10-25 |
| Leak detection | €2-5 |

Estimated total:

```text
€120-250
```

## Underwater Node Advanced

Includes dissolved oxygen, better enclosure, and industrial probes.

Estimated total:

```text
€300-800+
```

## Surface Communication Buoy MVP

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

## Surface Communication Buoy Satellite Version

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

# 10. Deployment

Recommended deployment locations:

```text
Coastal beaches
Aquaculture farms
Harbor entrances
River outflow zones
Tourism zones
Marine protected areas
Coastal health monitoring points
```

Recommended underwater node placement:

```text
0.5-1 m above seabed
or
1-2 m below surface for near-surface bloom monitoring
```

The underwater sensor cable should not carry mechanical load. Use a separate mooring rope and strain relief.

Recommended deployment:

```text
Surface buoy anchored with mooring line
Underwater sensor node mounted below or nearby
RS485 cable protected and strain-relieved
Solar panel exposed above water
Antenna mounted clear of water splash zone
```

# 11. Development Roadmap

## MVP

```text
Underwater node with temperature, pH, turbidity, salinity
Surface communication buoy with LTE, GPS, solar, battery
Supabase database
External weather and PM10 data ingestion
Basic dashboard
Simple alert rules
```

## Version 2

```text
Add dissolved oxygen
Add better enclosure
Add RS485 Modbus
Add local SD backup
Add buoy drift detection
Add cloud validation
Add external satellite/Copernicus data ingestion
```

## Version 3

```text
Add chlorophyll sensor
Add nitrate/phosphate module
Add satellite uplink
Add ML bloom-risk model
Add multi-point deployment dashboard
Add respiratory exposure model
```

# 12. Repository Structure

```text
project-root/
  firmware/
    underwater-node/
    surface-communication-buoy/
  backend/
    supabase-functions/
    database-schema/
    external-data-ingestion/
  dashboard/
    web-app/
  hardware/
    underwater-node/
      wiring/
      enclosure/
      bom/
    buoy/
      wiring/
      enclosure/
      bom/
  docs/
    underwater-node.md
    communication-buoy.md
    deployment.md
    maintenance.md
    calibration.md
  README.md
```

# Summary

The system uses an underwater sensor node and a surface communication buoy.

The underwater node measures local water-quality data. The buoy acts as the communication gateway and sends the data to the cloud. Wind direction, wind speed, PM10, wave height, sea surface temperature, chlorophyll-a, and current data are collected from external sources such as satellites, Copernicus services, weather APIs, air-quality APIs, and local meteorological stations.

This design keeps the underwater device small and durable while keeping the buoy focused on power, GPS, communication, and cloud transmission.
