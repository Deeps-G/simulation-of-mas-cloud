
# 🚀 AutoScale AI – Intelligent Cloud Auto-Scaling with Multi-Agent Systems

🌐 Live Demo:
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://autoscaleai.netlify.app/) or visit- 🚀 https://autoscaleai.netlify.app/

AutoScale AI is an AI-driven cloud infrastructure simulation platform that demonstrates how Multi-Agent Systems (MAS) and Machine Learning can automatically monitor workloads, predict future resource demand, and dynamically scale infrastructure.

The system simulates a real cloud environment where multiple intelligent agents collaborate to optimize system performance and cost.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [AI Models Used](#ai-models-used)
- [Agent Pipeline](#agent-pipeline)
- [Dashboard Features](#dashboard-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Live Demo](#live-demo)
- [Future Improvements](#future-improvements)

# 📌 Project Overview

Modern cloud systems face two major challenges:

• Over-provisioning → wasted resources and higher cost
• Under-provisioning → performance degradation and system crashes

AutoScale AI solves this by using AI agents and predictive models to make intelligent scaling decisions in real time.

The platform monitors infrastructure metrics, predicts future CPU demand, detects anomalies, and automatically determines whether to:
Scale Up
Scale Down
Maintain Current Capacity

# 🧠 System Architecture
The project follows a Multi-Agent System architecture, where each agent performs a specific task in the decision pipeline.
                                                Monitoring Agent
                                                       ↓
                                                 Analysis Agent
                                                       ↓
                                          Prediction Agent (Machine Learning)
                                                       ↓
                                                Performance Agent
                                                       ↓
                                                   Cost Agent
                                                       ↓
                                                  Decision Agent
                                             
Each agent processes information and passes insights to the next stage before the final scaling decision is made.

# 🤖 AI / Machine Learning Components
1️⃣ CPU Forecasting Model

A Random Forest Regressor predicts future CPU load based on historical metrics.
Purpose: Predict upcoming workload spikes.

2️⃣ Anomaly Detection

An Isolation Forest model detects abnormal workload patterns.
Purpose: Identify unusual system behavior or traffic spikes

3️⃣ Decision Model

Combines predictions and anomaly scores to determine the optimal scaling action.
Possible actions:
Scale Up
Scale Down
Maintain

# 📊 Dashboard Features
The interactive dashboard visualizes real-time system behavior.

# Infrastructure Metrics

• CPU prediction graph
• Scaling decisions
• Resource utilization

# AI Insights
Displays:

Predicted CPU load
Anomaly score
AI scaling decision
Active Instances
Shows currently active cloud virtual machines.

# Example:

VM1 VM2 VM3 VM4 VM5 VM6

# 🌐 Real-Time Data Streaming
The dashboard uses WebSockets to stream live data from the backend.

Benefits:
Real-time updates
No page refresh required
Continuous AI decision pipeline

# 🖥 Simulation Environment
The project also includes a cloud infrastructure simulation interface that visualizes:

• data center regions
• server nodes
• request traffic patterns
• CPU usage
• agent decision pipeline
This helps demonstrate how AI agents respond to changing workloads.

# ⚙️ Tech Stack
# Frontend
HTML
CSS
JavaScript
Chart.js
WebSockets
# Backend
Python
FastAPI
# Machine Learning
Scikit-learn
Random Forest Regressor
Isolation Forest
# Deployment
Netlify (Frontend)

# 📂 Project Structure
simulation-of-mas-cloud
│
├── backend
│   ├── agents.py
│   ├── controller.py
│   ├── models.py
│   ├── main.py
│   └── ml
│        ├── cpu_forecaster.joblib
│        ├── anomaly_model.joblib
│        └── decision_model.joblib
│
├── frontend
│   ├── index.html
│   ├── simulation.html
│   ├── dashboard.js
│   └── simulation.js
│
├── requirements.txt
└── README.md

# 🚀 How to Run Locally
1️⃣ Clone the repository
git clone https://github.com/your-username/simulation-of-mas-cloud.git
cd simulation-of-mas-cloud
2️⃣ Install dependencies
pip install -r requirements.txt
3️⃣ Start backend server
python main.py
4️⃣ Run frontend
cd frontend
python -m http.server 3000

Open in browser:
http://localhost:3000

# 📈 Example Workflow

1️⃣ Monitoring Agent collects system metrics
2️⃣ Analysis Agent detects workload pattern
3️⃣ Prediction Agent forecasts CPU usage
4️⃣ Performance Agent evaluates system capacity
5️⃣ Cost Agent checks infrastructure cost
6️⃣ Decision Agent determines scaling action

# Result:
Scale Up
Scale Down
Maintain

# 🔮 Future Improvements

Possible enhancements:

• Reinforcement Learning based scaling policy
• Real cloud integration (AWS / GCP / Azure)
• Kubernetes auto-scaling integration
• Deep learning workload forecasting
• Multi-cloud orchestration

👩‍💻 Author
Deepanshi Goyal
AI / ML Enthusiast | Engineering Student

⭐ If you like this project💌
Give it a ⭐ on GitHub!
