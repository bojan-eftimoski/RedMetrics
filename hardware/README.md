# Underwater IoT Water-Quality Monitoring System

## Overview

This project defines a coastal water-quality monitoring system for harmful algal bloom and red-tide risk detection.

The system consists of two main hardware units:

1. Underwater IoT Sensor Node
2. Surface Gateway Buoy

The underwater node collects local water-quality measurements. The surface buoy powers the underwater node, receives its data, adds location and gateway metadata, and transmits the telemetry to a cloud database using LTE, LoRaWAN, or satellite communication.

The system is designed for deployment at multiple coastal monitoring points. Each local point provides real-time environmental data that can be combined with satellite data, weather data, and machine-learning models to estimate harmful algal bloom risk.

## System Architecture

```text
Underwater Sensor Node
        |
        | RS485 + power cable
        v
Surface Gateway Buoy
        |
        | LTE / LoRaWAN / Satellite
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
Water sensors measure local conditions
        |
Microcontroller reads and validates sensor data
        |
Data is stored locally as backup
        |
Telemetry is sent to the surface buoy through RS485
        |
Buoy adds GPS, timestamp, signal, and power metadata
        |
Buoy sends data to cloud API
        |
Cloud API validates packet and inserts it into database
        |
Dashboard and ML model use the data for risk scoring and alerts
```

## Main Design Principle

The underwater device does not communicate directly with satellites.

Satellite, GPS, LTE, and LoRa communication are handled by the surface buoy because radio signals do not work reliably underwater. The underwater node uses a waterproof wired connection to the buoy.

Correct architecture:

```text
Underwater node -> RS485 cable -> Surface buoy -> Cloud
```

Incorrect architecture:

```text
Underwater node -> Satellite
```

## Hardware Units

## 1. Underwater IoT Sensor Node

### Purpose

The underwater node measures local water-quality parameters that indicate bloom growth conditions or ecosystem stress.

It does not directly identify every algae species. Instead, it measures physical and chemical indicators that support harmful algal bloom detection when combined with satellite and weather data.

### Main Measurements

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

### Physical Design

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

### Device Structure

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

### Main Components

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

- Detects warm water conditions
- Supports bloom growth analysis
- Helps compensate conductivity readings
- Helps interpret dissolved oxygen levels

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

- Tracks chemical changes
- Detects biological activity
- Detects abnormal water chemistry
- Supports bloom confidence scoring

Maintenance:

- Calibrate with pH 4, pH 7, and pH 10 buffer solutions
- Clean regularly
- Replace when drift becomes too high

### Dissolved Oxygen Sensor

Measures oxygen concentration in water.

Example:

```json
{
  "dissolved_oxygen_mg_l": 5.8
}
```

Use:

- Detects ecosystem stress
- Detects oxygen depletion
- Helps identify bloom decay or organic pollution
- Supports fish-life risk analysis

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

- Detects suspended particles
- Tracks possible algae biomass changes
- Detects runoff, sediment, or pollution events
- Improves local bloom confidence when combined with chlorophyll or satellite data

Limitation:

High turbidity does not automatically mean red tide. It must be interpreted with other parameters.

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

- Detects freshwater inflow
- Detects coastal mixing
- Detects runoff events
- Helps classify local water conditions

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

- Tracks nitrogen nutrient input
- Detects agricultural runoff
- Detects sewage or stormwater influence
- Supports bloom-growth risk estimation

Limitation:

Nitrate sensors are expensive and require calibration. For a low-cost MVP, nitrate should be optional.

### Phosphate Sensor

Measures phosphate concentration.

Example:

```json
{
  "phosphate_mg_l": 0.08
}
```

Use:

- Tracks phosphorus nutrient input
- Supports nutrient-loading analysis
- Helps identify bloom-supporting conditions

Limitation:

Phosphate measurement is difficult in a small low-cost underwater device. It is better implemented as a premium or future module.

### Leak Detection Sensor

Detects water inside the sealed electronics chamber.

Example:

```json
{
  "leak_detected": false
}
```

Use:

- Protects electronics
- Sends maintenance warnings
- Allows emergency shutdown
- Prevents silent device failure

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

- Tracks energy health
- Detects power failure
- Detects abnormal current draw
- Supports maintenance planning

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

## 2. Surface Gateway Buoy

### Purpose

The surface buoy acts as the gateway between the underwater sensor node and the cloud database.

It handles:

```text
Power generation
Battery storage
GPS location
Communication with underwater node
LTE, LoRaWAN, or satellite uplink
Cloud telemetry transmission
Optional wind and air-quality measurements
```

### Physical Design

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
Optional wind sensor
Optional PM10 / PM2.5 sensor
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
| LTE module | SIM7600, SIM7080, Quectel EC25 | Sends data using cellular network |
| Satellite module | Kinéis, Iridium, Astrocast-type module | Remote-area communication |
| LoRaWAN module | SX1276/SX1262 based module | Long-range low-power communication |
| GPS module | u-blox GNSS | Location and drift detection |
| Solar panel | 10-20 W MVP, 20-50 W production | Power generation |
| Battery | LiFePO4 | Energy storage |
| Charge controller | LiFePO4 solar charger or MPPT | Battery management |
| Wind sensor | Anemometer + wind vane | Exposure risk analysis |
| PM sensor | PMS5003 or equivalent | Airborne particle measurement |

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
Requires mobile coverage
Higher power draw than LoRaWAN
```

### LoRaWAN

Best when a LoRaWAN gateway is nearby.

Advantages:

```text
Low power
Long range
Low operating cost
```

Disadvantages:

```text
Needs infrastructure
Low data rate
Limited payload size
```

### Satellite IoT

Best for remote coastlines without mobile coverage.

Advantages:

```text
Works in remote areas
Does not require local network infrastructure
```

Disadvantages:

```text
Higher cost
Small payload size
Higher latency
Requires packet compression
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

## Wind Sensor

Measures wind speed and wind direction.

Example:

```json
{
  "wind_speed_m_s": 5.4,
  "wind_direction_deg": 220
}
```

Use:

```text
Determines whether wind is blowing toward the coast
Supports respiratory exposure risk scoring
Improves aerosol transport estimation
```

## PM10 / PM2.5 Sensor

Measures airborne particulate matter near the surface.

Example:

```json
{
  "pm10_ug_m3": 42,
  "pm25_ug_m3": 18
}
```

Use:

```text
Detects airborne particles
Supports aerosol exposure risk estimation
Works as proxy for sea-spray transport when combined with wind and bloom data
```

Limitation:

PM10 does not prove toxin presence. It must be combined with bloom probability, wind direction, wave data, and local context.

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

The buoy receives data from the underwater node and adds gateway metadata.

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
  "battery_percent": 87,
  "buoy_battery_percent": 76,
  "signal_type": "satellite",
  "signal_strength": -93
}
```

For satellite transmission, compact payloads should be used.

Example compressed packet:

```json
{
  "g": "B001",
  "d": "U001",
  "t": 23.4,
  "p": 8.1,
  "o": 5.8,
  "tb": 18,
  "s": 36.2,
  "b": 87
}
```

## Cloud API

Recommended MVP endpoint:

```text
POST /api/telemetry
```

Processing steps:

```text
Receive packet
Check API key or device token
Validate gateway ID
Validate device ID
Validate value ranges
Add server timestamp
Insert into database
Update device last_seen
Run alert checks
Return success or error response
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
    "battery_percent": 87
  }'
```

## Database Schema

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
  buoy_battery_percent double precision,
  signal_type text,
  signal_strength double precision,
  created_at timestamptz default now()
);
```

### alerts

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

## Alert Logic

Example alert rules:

```text
If leak_detected = true:
    severity = critical
    alert_type = device_leak

If battery_percent < 20:
    severity = warning
    alert_type = low_battery

If buoy moves more than 50 m:
    severity = warning
    alert_type = buoy_drift

If temperature is high and turbidity is rising and dissolved oxygen is falling:
    severity = warning
    alert_type = possible_bloom_stress

If satellite bloom probability is high and local turbidity/chlorophyll is high:
    severity = high
    alert_type = bloom_confirmation

If bloom probability is high and wind is onshore and PM10 is elevated:
    severity = high
    alert_type = respiratory_exposure_risk
```

## Maintenance

### Underwater Node

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

### Surface Buoy

| Task | Frequency |
|---|---|
| Clean solar panel | Every 2-4 weeks |
| Inspect antenna | Monthly |
| Check buoy body | Monthly |
| Inspect cable gland | Monthly |
| Check battery health | Monthly |
| Clean PM sensor air path | Monthly |
| Inspect mooring line | Monthly |
| Check corrosion | Monthly |

## Estimated Cost

### Underwater Node MVP

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

### Underwater Node Advanced

Includes dissolved oxygen, better enclosure, and industrial probes.

Estimated total:

```text
€300-800+
```

### Underwater Node Premium

Includes nitrate, phosphate, chlorophyll, and industrial-grade sensors.

Estimated total:

```text
€800-2000+
```

### Surface Buoy MVP

| Component | Estimated Cost |
|---|---:|
| Buoy body | €30-80 |
| ESP32 gateway | €5-8 |
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

### Surface Buoy Satellite Version

Estimated total:

```text
€300-1000+
```

Final cost depends on satellite module, payload size, transmission frequency, and subscription plan.

## Deployment

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

The cable should not carry mechanical load. Use a separate mooring line and strain relief.

## Risk Scoring Inputs

The local IoT system can support bloom-risk scoring using:

```text
Water temperature
pH variation
Dissolved oxygen trend
Turbidity trend
Salinity changes
Nitrate/phosphate levels
Satellite chlorophyll-a
Sea surface temperature
Wind direction
Wind speed
Wave height
PM10 readings
```

Example rule:

```text
High water temperature
+ rising turbidity
+ falling dissolved oxygen
+ high satellite chlorophyll
= increased harmful algal bloom risk
```

Example respiratory exposure rule:

```text
High bloom probability
+ onshore wind
+ high wave activity
+ PM10 increase
= increased respiratory exposure risk
```

## Development Roadmap

### MVP

```text
Underwater node with temperature, pH, turbidity, salinity
Surface buoy with LTE, GPS, solar, battery
Supabase database
Basic dashboard
Simple alert rules
```

### Version 2

```text
Add dissolved oxygen
Add better enclosure
Add RS485 Modbus
Add local SD backup
Add buoy drift detection
Add cloud validation
```

### Version 3

```text
Add chlorophyll sensor
Add nitrate/phosphate module
Add satellite uplink
Add wind and PM10 sensors
Add ML bloom-risk model
Add multi-point deployment dashboard
```

## Repository Structure

```text
project-root/
  firmware/
    underwater-node/
    surface-buoy/
  backend/
    supabase-functions/
    database-schema/
  dashboard/
    web-app/
  hardware/
    bom/
    enclosure/
    wiring/
  docs/
    deployment.md
    maintenance.md
    calibration.md
  README.md
```

## Summary

This system uses a small underwater sensor node and a surface gateway buoy to collect and transmit coastal water-quality data.

The underwater node measures local water conditions. The buoy handles power, GPS, and communication. The cloud database stores the data and supports dashboards, alerts, and bloom-risk models.

The design keeps the underwater device simple, small, and durable while placing communication hardware above the water where LTE, GPS, LoRaWAN, and satellite systems can work reliably.
