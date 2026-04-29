#include <Arduino.h>
#include <math.h>
#include <stdlib.h>

#define MANUAL_TEST_MODE true

const char* DEVICE_ID = "REDMETRICS_001";
const char* CONNECTION_STATUS = "test_mode";
const char* BACKUP_STATUS = "not_sent";

const unsigned long READING_INTERVAL_MS = 30UL * 60UL * 1000UL;

struct SensorReadings {
  float ph;
  float conductivity;
  float nitrate;
  float phosphate;
  float turbidity;
  float temperature;
  float dissolvedOxygen;
};

bool hasCompletedFirstCycle = false;
unsigned long lastReadingTimeMs = 0;

float readMockPh();
float readMockConductivity();
float readMockNitrate();
float readMockPhosphate();
float readMockTurbidity();
float readMockTemperature();
float readMockDissolvedOxygen();
SensorReadings readMockSensorValues();
SensorReadings readManualSensorValues();
bool isValidReading(float value, float minimumValue, float maximumValue);
String createPayload(const SensorReadings& readings);
void printPayload(const String& payload);
void runReadingCycle();

bool parseFloatLine(const String& input, float& value);
float readManualValue(const char* prompt, float minimumValue, float maximumValue);
String createTimestamp();

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(120000);
  delay(1000);

  if (MANUAL_TEST_MODE) {
    Serial.println("RedMetrics Manual Test Mode");
  } else {
    Serial.println("RedMetrics Mock Sensor Mode");
  }
}

void loop() {
  if (!hasCompletedFirstCycle || millis() - lastReadingTimeMs >= READING_INTERVAL_MS) {
    runReadingCycle();
    lastReadingTimeMs = millis();
    hasCompletedFirstCycle = true;
  }

  delay(100);
}

// Returns a safe placeholder pH reading for local testing.
float readMockPh() {
  return 7.10;
}

// Returns a safe placeholder conductivity reading for local testing.
float readMockConductivity() {
  return 430.00;
}

// Returns a safe placeholder nitrate reading for local testing.
float readMockNitrate() {
  return 4.20;
}

// Returns a safe placeholder phosphate reading for local testing.
float readMockPhosphate() {
  return 0.35;
}

// Returns a safe placeholder turbidity reading for local testing.
float readMockTurbidity() {
  return 12.50;
}

// Returns a safe placeholder temperature reading for local testing.
float readMockTemperature() {
  return 22.80;
}

// Returns a safe placeholder dissolved oxygen reading for local testing.
float readMockDissolvedOxygen() {
  return 8.40;
}

// Collects one placeholder value from each sensor.
SensorReadings readMockSensorValues() {
  SensorReadings readings;
  readings.ph = readMockPh();
  readings.conductivity = readMockConductivity();
  readings.nitrate = readMockNitrate();
  readings.phosphate = readMockPhosphate();
  readings.turbidity = readMockTurbidity();
  readings.temperature = readMockTemperature();
  readings.dissolvedOxygen = readMockDissolvedOxygen();
  return readings;
}

// Reads one manual value for each sensor from the Serial Monitor.
SensorReadings readManualSensorValues() {
  SensorReadings readings;
  readings.ph = readManualValue("Enter pH:", 0.0, 14.0);
  readings.conductivity = readManualValue("Enter conductivity:", 0.0, 200000.0);
  readings.nitrate = readManualValue("Enter nitrate:", 0.0, 1000.0);
  readings.phosphate = readManualValue("Enter phosphate:", 0.0, 1000.0);
  readings.turbidity = readManualValue("Enter turbidity:", 0.0, 4000.0);
  readings.temperature = readManualValue("Enter temperature:", -10.0, 85.0);
  readings.dissolvedOxygen = readManualValue("Enter dissolved oxygen:", 0.0, 20.0);
  return readings;
}

// Checks that a sensor value is numeric and inside a simple safe range.
bool isValidReading(float value, float minimumValue, float maximumValue) {
  return !isnan(value) && !isinf(value) && value >= minimumValue && value <= maximumValue;
}

// Creates a flat JSON payload for local Serial Monitor testing.
String createPayload(const SensorReadings& readings) {
  String payload;
  payload.reserve(320);

  payload += "{";
  payload += "\"device_id\":\"";
  payload += DEVICE_ID;
  payload += "\",";
  payload += "\"timestamp\":\"";
  payload += createTimestamp();
  payload += "\",";
  payload += "\"ph\":";
  payload += String(readings.ph, 2);
  payload += ",";
  payload += "\"conductivity\":";
  payload += String(readings.conductivity, 2);
  payload += ",";
  payload += "\"nitrate\":";
  payload += String(readings.nitrate, 2);
  payload += ",";
  payload += "\"phosphate\":";
  payload += String(readings.phosphate, 2);
  payload += ",";
  payload += "\"turbidity\":";
  payload += String(readings.turbidity, 2);
  payload += ",";
  payload += "\"temperature\":";
  payload += String(readings.temperature, 2);
  payload += ",";
  payload += "\"dissolved_oxygen\":";
  payload += String(readings.dissolvedOxygen, 2);
  payload += ",";
  payload += "\"connection_status\":\"";
  payload += CONNECTION_STATUS;
  payload += "\",";
  payload += "\"backup_status\":\"";
  payload += BACKUP_STATUS;
  payload += "\"";
  payload += "}";

  return payload;
}

// Prints the payload that would be sent in a later database version.
void printPayload(const String& payload) {
  Serial.println("Payload created:");
  Serial.println(payload);
}

// Runs one reading cycle and prints the generated payload locally.
void runReadingCycle() {
  SensorReadings readings;

  if (MANUAL_TEST_MODE) {
    readings = readManualSensorValues();
  } else {
    readings = readMockSensorValues();
  }

  String payload = createPayload(readings);
  printPayload(payload);
  Serial.println("Payload was not sent.");
}

bool parseFloatLine(const String& input, float& value) {
  if (input.length() == 0 || input.length() >= 32) {
    return false;
  }

  char buffer[32];
  input.toCharArray(buffer, sizeof(buffer));

  char* endPointer = nullptr;
  double parsedValue = strtod(buffer, &endPointer);

  if (endPointer == buffer || *endPointer != '\0') {
    return false;
  }

  value = (float)parsedValue;
  return true;
}

float readManualValue(const char* prompt, float minimumValue, float maximumValue) {
  while (true) {
    Serial.println(prompt);

    while (Serial.available() == 0) {
      delay(10);
    }

    String input = Serial.readStringUntil('\n');
    input.trim();

    float value = 0.0;
    if (parseFloatLine(input, value) && isValidReading(value, minimumValue, maximumValue)) {
      return value;
    }

    Serial.println("Invalid value. Try again.");
  }
}

String createTimestamp() {
  String timestamp = "uptime_ms_";
  timestamp += String(millis());
  return timestamp;
}
