# RedMetrics Bill of Materials

## Scope

This bill of materials describes one sustainable field-ready RedMetrics monitoring device for a fixed sea coastline deployment. It focuses on durability, repairability, replaceable sensors, sealed electronics, low power operation, and optional solar-assisted charging.

The underwater sensing module and the surface buoy are treated as one integrated monitoring device.

## Price Assumptions

- Currency: EUR.
- Prices are approximate estimated ranges, not exact vendor quotes.
- Final prices depend on supplier, waterproof rating, cable length, sensor grade, import cost, VAT, shipping, and availability.
- The list focuses on sustainable field-ready hardware, not the cheapest prototype.
- Sensor examples are suggestions only. Equivalent parts can be used after compatibility, calibration, and waterproofing checks.
- High-end oceanographic nutrient analyzers can cost much more than the ranges shown here.

## Sustainable Field-Ready BOM

| Component | Suggested example | Purpose | Quantity | Estimated unit price EUR | Estimated subtotal EUR | Notes |
|---|---|---:|---:|---:|---:|---|
| ESP32-S3 development board | Espressif ESP32-S3-DevKitC-1 or equivalent | Main controller for reading sensors, creating payloads, local backup, and communication control | 1 | 12-30 | 12-30 | Use a board with enough GPIO, stable USB programming, and good ESP32-S3 support. |
| pH sensor/probe suitable for water monitoring | Atlas Scientific pH kit, industrial pH probe, or equivalent | Measures acidity or alkalinity of seawater | 1 | 180-450 | 180-450 | Field use needs calibration, probe storage care, and replaceable probe support. |
| Electrical conductivity sensor/probe | Atlas Scientific conductivity kit, industrial EC probe, or equivalent | Measures dissolved ions and supports salinity/runoff interpretation | 1 | 220-600 | 220-600 | Select probe range for seawater conductivity. |
| Nitrate sensor | Vernier/PASCO/YSI nitrate ISE, or field nitrate sensor equivalent | Measures nitrate nutrient concentration | 1 | 300-1,500 | 300-1,500 | Nutrient sensors are expensive and need careful calibration. Field UV nitrate sensors can exceed this range. |
| Phosphate sensor | Phosphate ISE approach, colorimetric phosphate module, or equivalent | Measures phosphate nutrient concentration | 1 | 400-2,000 | 400-2,000 | Phosphate is difficult for low-cost continuous sensing; final selection should be validated in pilot tests. |
| Turbidity sensor | Optical turbidity sensor/probe, industrial turbidity probe, or equivalent | Measures suspended particles and water clarity | 1 | 80-350 | 80-350 | Optical surfaces need cleaning and anti-fouling planning. |
| Waterproof temperature sensor | DS18B20 waterproof probe, PT1000 probe, or equivalent | Measures water temperature and supports interpretation of other readings | 1 | 10-90 | 10-90 | DS18B20 is simple; PT1000 is more robust for field-grade builds. |
| Dissolved oxygen sensor/probe | Atlas Scientific dissolved oxygen kit, optical DO probe, or equivalent | Measures oxygen available in the water | 1 | 250-650 | 250-650 | Optical DO is more field-friendly but usually more expensive. |
| Waterproof enclosure | IP67/IP68 polycarbonate, PVC, or marine enclosure | Protects dry electronics from water and salt exposure | 1 | 80-250 | 80-250 | Must support cable glands, inspection, and service access. |
| Surface buoy body | Marine buoy body or custom HDPE buoy assembly | Provides physical visibility, flotation, and surface mounting | 1 | 150-500 | 150-500 | Size depends on battery, solar panel, sea state, and installation visibility needs. |
| Cable glands | IP68 cable glands | Seals cable entry points | 6 | 5-20 | 30-120 | Use correct cable diameter and marine-compatible material. |
| Waterproof connectors | IP67/IP68 circular connectors or wet-mate style connectors | Allows sensor and module replacement without cutting cables | 8 | 10-35 | 80-280 | Higher-grade marine connectors can cost much more. |
| Internal mounting plate | Acrylic, aluminum, fiberglass, or 3D-machined plate | Holds electronics securely inside the enclosure | 1 | 10-50 | 10-50 | Should avoid short circuits and simplify servicing. |
| Marine-grade cables | UV-resistant and saltwater-resistant cable | Connects sensors, buoy electronics, and power paths | 10 m | 3-12 per m | 30-120 | Cable length depends on depth and mounting geometry. |
| Rechargeable battery pack | LiFePO4 or protected lithium battery pack | Powers device during night, cloudy days, and communication outages | 1 | 80-250 | 80-250 | Capacity depends on reading interval, sensor power, and communication module. |
| Battery protection module | BMS or battery protection board | Protects battery from overcharge, overdischarge, and unsafe current | 1 | 15-60 | 15-60 | Match battery chemistry and current requirements. |
| Solar panel | 20-50 W marine or outdoor solar panel | Extends deployment life with solar-assisted charging | 1 | 40-150 | 40-150 | Must be mounted above water and cleaned during maintenance. |
| Solar charge controller | LiFePO4-compatible MPPT or PWM controller | Manages charging from the solar panel to the battery | 1 | 20-100 | 20-100 | MPPT is preferred when budget allows. |
| Voltage regulation module | Buck converter and low-noise regulator modules | Provides stable 5 V and 3.3 V rails for electronics and sensors | 2 | 5-25 | 10-50 | Use regulators with enough current margin and heat tolerance. |
| Local storage module if needed | MicroSD module, FRAM module, or onboard flash usage | Stores unsent payloads when communication fails | 1 | 5-20 | 5-20 | LittleFS on ESP32 flash may be enough for early versions. |
| Antenna or communication module placeholder | External antenna, LTE-M/NB-IoT module, LoRa module, or coastal Wi-Fi gateway module | Provides communication path from surface buoy to internet | 1 | 20-120 | 20-120 | Final choice depends on coastal coverage and power budget. |
| Mounting rope / anchor / fixed installation hardware | Marine rope, small anchor, fixed bracket, or pier mounting hardware | Keeps the device at one local monitoring point | 1 set | 40-200 | 40-200 | Must match local water depth, currents, waves, and regulations. |
| Corrosion-resistant screws and fasteners | Stainless steel 316 or marine-grade fasteners | Holds enclosure, buoy, brackets, and internal parts | 1 set | 10-40 | 10-40 | Avoid mixed metals where corrosion risk is high. |
| Sealant / gasket material | Marine silicone, EPDM gasket, or enclosure gasket replacement | Improves sealing and maintenance reliability | 1 set | 10-50 | 10-50 | Use materials compatible with saltwater and enclosure material. |
| Miscellaneous wiring and connectors | Ferrules, terminal blocks, heat shrink, cable ties, fuses, and headers | Completes internal electrical assembly | 1 set | 30-100 | 30-100 | Include spare connectors for field repair. |

## Estimated Total Price Range

Approximate estimated total per complete RedMetrics device:

```text
2,100 EUR to 8,100 EUR
```

This range is intentionally wide because nitrate and phosphate sensing can dominate the hardware cost. A lower-cost prototype can be built for less, but a sustainable field-ready device should budget for better sensors, waterproofing, serviceable connectors, reliable power, and corrosion-resistant installation hardware.

## Cost Drivers

The largest cost drivers are:

- Nitrate and phosphate measurement hardware.
- Dissolved oxygen sensor grade.
- Waterproof and corrosion-resistant mechanical parts.
- Connector quality and cable length.
- Communication module selection.
- Battery capacity and solar charging requirements.

## Items Not Included in the Estimate

The estimated total does not include:

- Shipping, VAT, customs, or import fees.
- Installation labor or boat access.
- Cellular subscription or SIM cost.
- Supabase or cloud service cost.
- Calibration fluids and replacement membranes over the full deployment life.
- Spare sensors for long-term maintenance.
- Certification, regulatory approvals, or environmental permits.

## Procurement Guidance

Before purchasing parts, confirm:

- The selected sensors can operate in seawater conditions.
- Conductivity range is suitable for saltwater.
- Probes can be calibrated with available calibration solutions.
- Connectors and cable glands match the selected cable diameters.
- Battery chemistry matches the solar charge controller.
- The communication module has coverage at the exact coastline site.
- The enclosure can be opened and resealed during maintenance.

The BOM should be reviewed after a pilot deployment because real field conditions often change the required cable length, mounting approach, enclosure size, and anti-fouling needs.
