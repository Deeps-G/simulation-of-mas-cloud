import pandas as pd
from agents import *


def run_system():

    df = pd.read_csv("../data/synthetic_cloud_dataset_1000.csv")

    scale_up = 0
    scale_down = 0
    maintain = 0

    for index, row in df.iterrows():

        metrics = monitoring_agent(row)

        status = analysis_agent(metrics)

        predicted_cpu = prediction_agent(df, index)

        perf = performance_agent(status, predicted_cpu, metrics["instances"])

        cost = cost_agent(metrics)

        decision = decision_agent(perf, cost)

        if decision > metrics["instances"]:
            scale_up += 1

        elif decision < metrics["instances"]:
            scale_down += 1

        else:
            maintain += 1

    return {
        "scale_up": scale_up,
        "scale_down": scale_down,
        "maintain": maintain
    }