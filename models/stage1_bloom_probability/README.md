# Stage 1 — Bloom Probability

Calibrated LightGBM binary classifier predicting whether a HAB bloom occurs in the **next 7 days** at the Ligurian Genoa zone.

| | |
|---|---|
| **Inputs** | 16 daily features in `data/processed/merged_features.csv` (see `features.py::FEATURES`) — chlorophyll, SST, currents, salinity, NDCI, seasonal encodings, IoT chemistry |
| **Target** | `bloom_label` (forward-looking 7-day shift, constructed in Phase 4) |
| **Model** | `lightgbm.LGBMClassifier` with PRD §4 PARAMS, wrapped in `CalibratedClassifierCV(method="isotonic", cv=3)` |
| **Validation** | `TimeSeriesSplit(5)` AUC printed per fold + mean during training |
| **Output** | `data/models/stage1_lgbm.pkl` — joblib bundle `{"model": calibrated, "features": [...]}` |

## Usage

Train:
```
python -m models.stage1_bloom_probability.train
```

Predict:
```python
from models.stage1_bloom_probability.predict import predict_bloom_probability
p = predict_bloom_probability(features_today_dict)  # -> float in [0, 1]
```
