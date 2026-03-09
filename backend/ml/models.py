from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.model_selection import train_test_split

from .features import FeatureConfig, build_feature_frame, feature_columns


ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class TrainReport:
    cpu_mae: float
    decision_acc: float


def _decision_label(df: pd.DataFrame) -> pd.Series:
    # Simple supervised label from CPU + SLA: treat overloaded as scale_up, underutilized as scale_down.
    cpu = df["cpu_usage"].astype(float)
    sla = df["sla_violation"].fillna(0).astype(int)
    label = np.where((cpu > 80) | (sla == 1), "scale_up", np.where(cpu < 30, "scale_down", "maintain"))
    return pd.Series(label, index=df.index, name="decision")


def train_models(
    df_raw: pd.DataFrame,
    cfg: Optional[FeatureConfig] = None,
    random_state: int = 42,
) -> TrainReport:
    cfg = cfg or FeatureConfig()
    df = df_raw.copy()

    # features
    feats = build_feature_frame(df, cfg)
    cols = feature_columns(feats)

    # targets
    y_cpu = df["cpu_usage"].astype(float)
    y_dec = _decision_label(df)

    # Basic split
    X_train, X_test, ycpu_train, ycpu_test, ydec_train, ydec_test = train_test_split(
        feats[cols], y_cpu, y_dec, test_size=0.2, random_state=random_state, shuffle=False
    )

    cpu_model = RandomForestRegressor(
        n_estimators=250,
        random_state=random_state,
        min_samples_leaf=2,
        n_jobs=-1,
    )
    cpu_model.fit(X_train, ycpu_train)
    cpu_pred = cpu_model.predict(X_test)
    cpu_mae = float(mean_absolute_error(ycpu_test, cpu_pred))

    dec_model = RandomForestClassifier(
        n_estimators=300,
        random_state=random_state,
        min_samples_leaf=2,
        n_jobs=-1,
    )
    dec_model.fit(X_train, ydec_train)
    dec_pred = dec_model.predict(X_test)
    decision_acc = float(accuracy_score(ydec_test, dec_pred))

    # Anomaly detection on traffic + response + cpu
    anom_cols = ["network_traffic_Mbps", "response_time_ms", "cpu_usage"]
    anom_frame = feats[anom_cols].astype(float).fillna(0.0)
    anom_model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=random_state,
    )
    anom_model.fit(anom_frame)

    # Save artifacts (model + feature columns + config)
    joblib.dump({"model": cpu_model, "feature_cols": cols, "cfg": cfg}, ARTIFACT_DIR / "cpu_forecaster.joblib")
    joblib.dump({"model": dec_model, "feature_cols": cols, "cfg": cfg}, ARTIFACT_DIR / "decision_model.joblib")
    joblib.dump({"model": anom_model, "anom_cols": anom_cols, "cfg": cfg}, ARTIFACT_DIR / "anomaly_model.joblib")

    return TrainReport(cpu_mae=cpu_mae, decision_acc=decision_acc)


@dataclass
class LoadedModels:
    cpu: Any
    decision: Any
    anomaly: Any
    cpu_feature_cols: list[str]
    decision_feature_cols: list[str]
    cfg: FeatureConfig
    anom_cols: list[str]


_CACHE: Optional[LoadedModels] = None


def load_models() -> LoadedModels:
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    cpu_pack = joblib.load(ARTIFACT_DIR / "cpu_forecaster.joblib")
    dec_pack = joblib.load(ARTIFACT_DIR / "decision_model.joblib")
    anom_pack = joblib.load(ARTIFACT_DIR / "anomaly_model.joblib")

    cfg = cpu_pack.get("cfg") or FeatureConfig()
    _CACHE = LoadedModels(
        cpu=cpu_pack["model"],
        decision=dec_pack["model"],
        anomaly=anom_pack["model"],
        cpu_feature_cols=list(cpu_pack["feature_cols"]),
        decision_feature_cols=list(dec_pack["feature_cols"]),
        cfg=cfg,
        anom_cols=list(anom_pack["anom_cols"]),
    )
    return _CACHE


def ensure_models(df_raw: pd.DataFrame) -> TrainReport | None:
    # If artifacts missing, train once.
    needed = ["cpu_forecaster.joblib", "decision_model.joblib", "anomaly_model.joblib"]
    if all((ARTIFACT_DIR / n).exists() for n in needed):
        return None
    return train_models(df_raw)

