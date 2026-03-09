import numpy as np

from ml.features import FeatureConfig, build_feature_frame, row_to_feature_vector
from ml.models import ensure_models, load_models
from ml.rl import ensure_q_table, load_q_table, choose_action


# Monitoring Agent
def monitoring_agent(row):
    return {
        "cpu": row["cpu_usage"],
        "instances": row["active_instances"],
        "response_time": row["response_time_ms"],
        "sla": row["sla_violation"],
        "cost": row["cost_per_hour_$"]
    }


# Analysis Agent
def analysis_agent(metrics):
    if metrics["cpu"] > 85 or metrics["sla"] == 1:
        return "Overloaded"
    elif metrics["cpu"] < 30:
        return "Underutilized"
    else:
        return "Normal"


# Prediction Agent
def prediction_agent(df, current_index):

    # ML forecaster (RandomForestRegressor) with lookback features.
    ensure_models(df)
    models = load_models()
    feats = build_feature_frame(df, models.cfg)
    X = row_to_feature_vector(feats, models.cpu_feature_cols, current_index)
    predicted_cpu = float(models.cpu.predict(X)[0])
    return round(predicted_cpu, 2)


def anomaly_score(df, current_index):
    ensure_models(df)
    models = load_models()
    feats = build_feature_frame(df, models.cfg)
    anom_frame = feats[models.anom_cols].astype(float).fillna(0.0)
    # IsolationForest: higher (less negative) is more normal. We'll return a normalized-ish score.
    score = float(models.anomaly.decision_function(anom_frame.iloc[[current_index]])[0])
    return score


# Cost Agent
def cost_agent(metrics):

    if metrics["cpu"] < 40:
        return max(1, metrics["instances"] - 1)

    return metrics["instances"]


# Performance Agent
def performance_agent(status, predicted_cpu, instances):

    if predicted_cpu > 85:
        return instances + 1

    if predicted_cpu < 30:
        return max(1, instances - 1)

    return instances


# Decision Agent
def decision_agent(perf_suggestion, cost_suggestion):

    if perf_suggestion == cost_suggestion:
        return perf_suggestion

    return round((perf_suggestion + cost_suggestion) / 2)


def decision_agent_ml(df, current_index):
    ensure_models(df)
    models = load_models()
    feats = build_feature_frame(df, models.cfg)
    X = row_to_feature_vector(feats, models.decision_feature_cols, current_index)
    label = str(models.decision.predict(X)[0])
    return label


def decision_agent_rl(df, current_index):
    ensure_q_table(df)
    q = load_q_table()
    row = df.iloc[current_index]
    delta = int(choose_action(row, q))
    return delta


# Reporting Agent
def reporting_agent(job_id, cpu, predicted_cpu, old_instances, new_instances, cost):

    return (
        f"{job_id} | "
        f"CPU: {cpu}% | "
        f"Predicted CPU: {predicted_cpu}% | "
        f"Old Inst: {old_instances} | "
        f"New Inst: {new_instances} | "
        f"Cost/hr: ${cost}"
    )