import numpy as np


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

    if current_index >= 5:
        recent_cpu = df["cpu_usage"].iloc[current_index-5:current_index]
        predicted_cpu = np.mean(recent_cpu)

    else:
        predicted_cpu = df["cpu_usage"].iloc[current_index]

    return round(predicted_cpu, 2)


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