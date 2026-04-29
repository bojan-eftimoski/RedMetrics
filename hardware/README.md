# RedMetrics Hardware

RedMetrics Hardware is an ESP32-S3 based sea coastline water monitoring device. It combines underwater sensing, surface buoy communication, local backup storage, and cloud-ready data transmission for later Supabase/database integration.

The repository is focused on a practical hardware prototype that is simple to explain, maintain, and extend during field testing.

## Overview

- Measures local sea water quality at a fixed monitoring point.
- Uses underwater sensors and a surface buoy/gateway as one integrated monitoring device.
- Prioritizes long deployment life, modular sensors, low power operation, repairability, and sealed electronics.
- Prepares simple payloads for later write-only Supabase/database integration.

## Measured Parameters

- pH
- Conductivity
- Nitrate
- Phosphate
- Turbidity
- Temperature
- Dissolved oxygen

## System Architecture

```txt
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

This README provides only the high-level entry point for the hardware repository. Detailed system design, cost planning, and deployment guidance are kept in the documentation files below.

## Documentation

- [Hardware System Overview](docs/README_HARDWARE_SYSTEM.md)
- [Bill of Materials](docs/README_BILL_OF_MATERIALS.md)
- [Deployment Planning](docs/README_DEPLOYMENT_PLANNING.md)

## Repository Scope

- This repository focuses on the RedMetrics hardware prototype.
- Hardware code is intended for ESP32-S3 and C++.
- Database communication is planned as a write-only insert flow.
- Frontend, dashboard, backend, and deployment documentation are outside the scope of this hardware README.

## Notes

- BOM prices are approximate estimates and must be validated before purchase.
- Deployment density depends on coastline shape, risk zones, currents, pollution sources, and monitoring precision.
- This is a hackathon/prototype-oriented hardware repository.
