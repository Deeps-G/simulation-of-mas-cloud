import pandas as pd
from agents import *
from ml.models import ensure_models, load_models
from ml.features import build_feature_frame, row_to_feature_vector


def run_system(mode: str = "ml"):

    df = pd.read_csv("../data/synthetic_cloud_dataset_1000.csv")

    scale_up = 0
    scale_down = 0
    maintain = 0
    anomaly_hits = 0
    avg_pred_cpu = 0.0
    used_mode = mode

    # Precompute features/models once (massive speedup).
    ensure_models(df)
    models = load_models()
    feats = build_feature_frame(df, models.cfg)
    anom_frame = feats[models.anom_cols].astype(float).fillna(0.0)

    for index, row in df.iterrows():

        metrics = monitoring_agent(row)

        status = analysis_agent(metrics)

        X_cpu = row_to_feature_vector(feats, models.cpu_feature_cols, index)
        predicted_cpu = float(models.cpu.predict(X_cpu)[0])
        avg_pred_cpu += float(predicted_cpu)
        anom = float(models.anomaly.decision_function(anom_frame.iloc[[index]])[0])
        if anom < -0.02:
            anomaly_hits += 1

        perf = performance_agent(status, predicted_cpu, metrics["instances"])

        cost = cost_agent(metrics)

        # Decision routing
        if mode == "heuristic":
            decision_instances = decision_agent(perf, cost)
        elif mode == "rl":
            delta = decision_agent_rl(df, index)
            decision_instances = max(1, int(metrics["instances"]) + int(delta))
        else:
            # ML label -> instances adjustment
            X_dec = row_to_feature_vector(feats, models.decision_feature_cols, index)
            label = str(models.decision.predict(X_dec)[0])
            if label == "scale_up":
                decision_instances = int(metrics["instances"]) + 1
            elif label == "scale_down":
                decision_instances = max(1, int(metrics["instances"]) - 1)
            else:
                decision_instances = int(metrics["instances"])

        if decision_instances > metrics["instances"]:
            scale_up += 1

        elif decision_instances < metrics["instances"]:
            scale_down += 1

        else:
            maintain += 1

    n = max(1, len(df))
    return {
        "scale_up": scale_up,
        "scale_down": scale_down,
        "maintain": maintain,
        "mode": used_mode,
        "avg_predicted_cpu": round(avg_pred_cpu / n, 2),
        "anomaly_events": anomaly_hits
    }