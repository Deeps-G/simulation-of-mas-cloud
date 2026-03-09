from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


NUMERIC_COLS = [
    "cpu_usage",
    "memory_usage_MB",
    "disk_io_MBps",
    "network_traffic_Mbps",
    "active_instances",
    "response_time_ms",
    "cost_per_hour_$",
]


@dataclass(frozen=True)
class FeatureConfig:
    lookback: int = 5


def _safe_float(x) -> float:
    try:
        return float(x)
    except Exception:
        return float("nan")


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    ts = pd.to_datetime(out["timestamp"], errors="coerce")
    out["minute_of_day"] = ts.dt.hour.fillna(0).astype(int) * 60 + ts.dt.minute.fillna(0).astype(int)
    out["day_of_week"] = ts.dt.dayofweek.fillna(0).astype(int)
    return out


def add_lookback_features(df: pd.DataFrame, cfg: FeatureConfig) -> pd.DataFrame:
    out = df.copy()
    for k in range(1, cfg.lookback + 1):
        out[f"cpu_lag_{k}"] = out["cpu_usage"].shift(k)
        out[f"traffic_lag_{k}"] = out["network_traffic_Mbps"].shift(k)
        out[f"rt_lag_{k}"] = out["response_time_ms"].shift(k)
    out["cpu_roll_mean"] = out["cpu_usage"].rolling(cfg.lookback, min_periods=1).mean()
    out["traffic_roll_mean"] = out["network_traffic_Mbps"].rolling(cfg.lookback, min_periods=1).mean()
    out["rt_roll_mean"] = out["response_time_ms"].rolling(cfg.lookback, min_periods=1).mean()
    out["traffic_diff_1"] = out["network_traffic_Mbps"].diff(1)
    out["cpu_diff_1"] = out["cpu_usage"].diff(1)
    return out


def build_feature_frame(df: pd.DataFrame, cfg: FeatureConfig) -> pd.DataFrame:
    out = add_time_features(df)
    out = add_lookback_features(out, cfg)
    # Workload type one-hot
    if "workload_type" in out.columns:
        out = pd.get_dummies(out, columns=["workload_type"], prefix="wl", dummy_na=True)
    return out


def feature_columns(df_features: pd.DataFrame) -> List[str]:
    # exclude identifiers/targets
    exclude = {"job_id", "timestamp", "sla_violation"}
    cols = [c for c in df_features.columns if c not in exclude]
    return cols


def row_to_feature_vector(
    df_features: pd.DataFrame,
    feature_cols: List[str],
    row_index: int,
) -> np.ndarray:
    row = df_features.iloc[row_index]
    vec = np.array([_safe_float(row.get(c)) for c in feature_cols], dtype=float)
    vec = np.nan_to_num(vec, nan=0.0, posinf=0.0, neginf=0.0)
    # Return a DataFrame to preserve feature names for sklearn.
    return pd.DataFrame([vec], columns=feature_cols)

