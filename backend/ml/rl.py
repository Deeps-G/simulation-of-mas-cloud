from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd


ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
Q_PATH = ARTIFACT_DIR / "q_table.json"


ACTIONS = (-1, 0, 1)  # scale_down, maintain, scale_up (by 1 instance)


def _bucket(x: float, edges: list[float]) -> int:
    for i, e in enumerate(edges):
        if x < e:
            return i
    return len(edges)


@dataclass(frozen=True)
class RLConfig:
    cpu_edges: tuple[float, ...] = (25, 40, 55, 70, 80, 90)
    traffic_edges: tuple[float, ...] = (40, 70, 100, 140, 180, 220)
    rt_edges: tuple[float, ...] = (40, 70, 100, 140, 180)
    inst_edges: tuple[int, ...] = (1, 2, 3, 4, 5, 6)
    gamma: float = 0.95
    alpha: float = 0.08
    eps: float = 0.1
    episodes: int = 12


def state_from_row(row: pd.Series, cfg: RLConfig) -> Tuple[int, int, int, int]:
    cpu_b = _bucket(float(row["cpu_usage"]), list(cfg.cpu_edges))
    tr_b = _bucket(float(row["network_traffic_Mbps"]), list(cfg.traffic_edges))
    rt_b = _bucket(float(row["response_time_ms"]), list(cfg.rt_edges))
    inst_b = _bucket(float(row["active_instances"]), [float(x) for x in cfg.inst_edges])
    return (cpu_b, tr_b, rt_b, inst_b)


def reward_from_row(row: pd.Series) -> float:
    # Penalize SLA violations heavily, response time moderately, and cost lightly.
    sla = int(row.get("sla_violation", 0) or 0)
    rt = float(row.get("response_time_ms", 0) or 0.0)
    cost = float(row.get("cost_per_hour_$", 0) or 0.0)
    cpu = float(row.get("cpu_usage", 0) or 0.0)

    penalty = 0.0
    if sla == 1:
        penalty += 8.0
    if rt > 120:
        penalty += (rt - 120) / 40.0
    if cpu > 85:
        penalty += (cpu - 85) / 30.0

    return -(0.6 * cost + penalty)


def train_q_table(df: pd.DataFrame, cfg: RLConfig | None = None, seed: int = 42) -> Dict[str, list[float]]:
    cfg = cfg or RLConfig()
    rng = np.random.default_rng(seed)
    q: Dict[str, list[float]] = {}

    def q_get(s: Tuple[int, int, int, int]) -> np.ndarray:
        key = ",".join(map(str, s))
        if key not in q:
            q[key] = [0.0, 0.0, 0.0]
        return np.array(q[key], dtype=float)

    n = len(df)
    for _ep in range(cfg.episodes):
        i = 0
        while i < n - 2:
            row = df.iloc[i]
            s = state_from_row(row, cfg)

            if rng.random() < cfg.eps:
                a_idx = int(rng.integers(0, 3))
            else:
                a_idx = int(np.argmax(q_get(s)))

            # Simulate effect of action on next-step cpu/rt using simple heuristics:
            # more instances reduces cpu & response time; fewer increases.
            next_row = df.iloc[i + 1].copy()
            inst = int(row["active_instances"])
            new_inst = max(1, inst + ACTIONS[a_idx])

            scale_factor = inst / new_inst
            next_row["cpu_usage"] = float(next_row["cpu_usage"]) * scale_factor
            next_row["response_time_ms"] = float(next_row["response_time_ms"]) * scale_factor
            next_row["active_instances"] = new_inst
            # cost changes with instances (approx)
            next_row["cost_per_hour_$"] = float(next_row["cost_per_hour_$"]) * (new_inst / max(1, inst))

            r = reward_from_row(next_row)
            s2 = state_from_row(next_row, cfg)

            q_s = q_get(s)
            q_s2 = q_get(s2)
            td = r + cfg.gamma * float(np.max(q_s2)) - float(q_s[a_idx])
            q_s[a_idx] = float(q_s[a_idx] + cfg.alpha * td)

            key = ",".join(map(str, s))
            q[key] = q_s.tolist()
            i += 1

    return q


def save_q_table(q: Dict[str, list[float]]) -> None:
    Q_PATH.write_text(json.dumps(q, indent=2), encoding="utf-8")


def load_q_table() -> Dict[str, list[float]]:
    if not Q_PATH.exists():
        return {}
    return json.loads(Q_PATH.read_text(encoding="utf-8"))


def ensure_q_table(df: pd.DataFrame) -> None:
    if Q_PATH.exists():
        return
    q = train_q_table(df)
    save_q_table(q)


def choose_action(row: pd.Series, q: Dict[str, list[float]], cfg: RLConfig | None = None) -> int:
    cfg = cfg or RLConfig()
    s = state_from_row(row, cfg)
    key = ",".join(map(str, s))
    vals = q.get(key)
    if not vals:
        return 0  # maintain
    a_idx = int(np.argmax(np.array(vals, dtype=float)))
    return ACTIONS[a_idx]

