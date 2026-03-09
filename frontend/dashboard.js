(function () {
  'use strict';

  let cpuChart;
  let donutChart;

  // const API_BASE = 'http://127.0.0.1:8000';
  const API_BASE = "http://localhost:8000";
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

  function runSystem() {
    const btn = document.querySelector('.btn-run');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    }
    fetch(`${API_BASE}/run-system`, {
      method: "GET"
    })
      .then((res) => res.json())
      .then((data) => {
        updateStats(data);
        updateProgressBars(data);
        updateDonutChart(data);
        updateKPI(data);
        updateAssetTags(data);
        generateAgentLogs(data);
        updateAgentMessageList(data);
        updateCPUChart();
        flashUpdatedCards();
      })
      .catch((err) => {
        console.error(err);
        const log = document.getElementById('logList');
        if (log) {
          log.innerHTML = '';
          const li = document.createElement('li');
          li.textContent = 'Error: Could not reach API. Is the backend running on port 8000?';
          li.style.color = '#ef4444';
          log.appendChild(li);
        }
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-play-circle"></i> Run Optimization';
        }
      });
  }

  function updateStats(data) {
    setText('scaleUp', data.scale_up);
    setText('scaleDown', data.scale_down);
    setText('maintain', data.maintain);
  }


  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function updateProgressBars(data) {
    const total = (data.scale_up || 0) + (data.scale_down || 0) + (data.maintain || 0) || 1;
    const pct = (v) => Math.min(100, Math.round((v / total) * 100));
    setProgress('progressScaleUp', pct(data.scale_up));
    setProgress('progressScaleDown', pct(data.scale_down));
    setProgress('progressMaintain', pct(data.maintain));
  }

  function setProgress(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
  }

  function flashUpdatedCards() {
    var cards = document.querySelectorAll('.project-card');
    cards.forEach(function (el) { el.classList.add('card-updated'); });
    setTimeout(function () {
      cards.forEach(function (el) { el.classList.remove('card-updated'); });
    }, 600);
  }

  function updateDonutChart(data) {
    const ctx = document.getElementById('donutChart');
    if (!ctx) return;
    const scaleUp = data.scale_up || 0;
    const scaleDown = data.scale_down || 0;
    const maintain = data.maintain || 0;
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Scale Up', 'Scale Down', 'Maintain'],
        datasets: [{
          data: [scaleUp, scaleDown, maintain],
          backgroundColor: ['#eab308', '#ef4444', '#3b82f6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }
        },
        cutout: '65%'
      }
    });
  }

  function updateKPI(data) {
    const total = (data.scale_up || 0) + (data.scale_down || 0) + (data.maintain || 0);
    setText('kpiTotal', total);
    setText('kpiProgress', data.scale_up || 0);
    setText('kpiUpcoming', data.maintain || 0);
  }

  function updateAssetTags(data) {
    const container = document.getElementById('assetTags');
    if (!container) return;
    const scaleUp = data.scale_up || 0;
    const scaleDown = data.scale_down || 0;
    const maintain = data.maintain || 0;
    const total = scaleUp + scaleDown + maintain;
    container.innerHTML = [
      '<span class="asset-tag video">Scale Up (' + scaleUp + ')</span>',
      '<span class="asset-tag company">Scale Down (' + scaleDown + ')</span>',
      '<span class="asset-tag docs">Maintain (' + maintain + ')</span>',
      '<span class="asset-tag dribble">Total (' + total + ')</span>'
    ].join('');
  }

  const AGENT_LOG_MESSAGES = [
    'Monitoring Agent → Collected CPU metrics',
    'Analysis Agent → Detected workload pattern',
    'Prediction Agent → Predicted CPU usage',
    'Performance Agent → Recommended scaling',
    'Cost Agent → Evaluated infrastructure cost',
    'Decision Agent → Balanced performance and cost'
  ];

  function generateAgentLogs(data) {
    const log = document.getElementById('logList');
    if (!log) return;
    log.innerHTML = '';
    AGENT_LOG_MESSAGES.forEach(function (text) {
      const li = document.createElement('li');
      li.textContent = text;
      log.appendChild(li);
    });
  }

  function updateAgentMessageList(data) {
    const list = document.getElementById('agentLogList');
    if (!list) return;
    const items = [
      { letter: 'M', name: 'Monitoring', preview: 'Collected CPU metrics' },
      { letter: 'A', name: 'Analysis', preview: 'Detected workload pattern' },
      { letter: 'P', name: 'Prediction', preview: 'Predicted CPU usage' },
      { letter: 'Perf', name: 'Performance', preview: 'Recommended scaling' },
      { letter: 'C', name: 'Cost', preview: 'Evaluated infrastructure cost' },
      { letter: 'D', name: 'Decision', preview: 'Balanced performance and cost' }
    ];
    list.innerHTML = items
      .map(function (x) {
        return '<li><div class="msg-avatar">' + x.letter.charAt(0) + '</div><div class="msg-body"><div class="msg-name">' + x.name + '</div><div class="msg-preview">' + x.preview + '</div></div></li>';
      })
      .join('');
  }

  function updateCPUChart() {
    const ctx = document.getElementById('cpuChart');
    if (!ctx) return;
    const len = 10;
    const data = Array.from({ length: len }, function () { return Math.round(Math.random() * 60 + 20); });
    if (cpuChart) cpuChart.destroy();
    cpuChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MONTHS.slice(0, len),
        datasets: [
          {
            label: 'CPU Usage %',
            data: data,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.15)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { min: 0, max: 100, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function openSimulation() {
    window.location.href = 'simulation.html';
  }

  function initNav() {
    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.addEventListener('click', function () {
        if (this.classList.contains('active')) return;
        document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
        this.classList.add('active');
      });
    });
  }

  function initChartPeriod() {
    const sel = document.getElementById('chartMonth');
    if (sel) {
      sel.addEventListener('change', function () {
        updateCPUChart();
      });
    }
  }

  function initDonutPlaceholder() {
    const ctx = document.getElementById('donutChart');
    if (!ctx || donutChart) return;
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Scale Up', 'Scale Down', 'Maintain'],
        datasets: [{ data: [0, 0, 0], backgroundColor: ['#eab308', '#ef4444', '#3b82f6'], borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } },
        cutout: '65%'
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      updateCPUChart();
      initDonutPlaceholder();
      initNav();
      initChartPeriod();
      startStream();   // start websocket
    });
  } else {
    updateCPUChart();
    initDonutPlaceholder();
    initNav();
    initChartPeriod();
  }

  window.runSystem = runSystem;
  window.openSimulation = openSimulation;
})();
function animateAgents() {

  const agents = document.querySelectorAll(".pipeline .agent");

  let i = 0;

  const interval = setInterval(() => {

    agents.forEach(a => a.classList.remove("active"));

    agents[i].classList.add("active");

    i++;

    if (i >= agents.length) {
      clearInterval(interval);
    }

  }, 400);

}
document.addEventListener("DOMContentLoaded", () => {
  startStream();
});
function startStream() {

  const socket = new WebSocket("ws://127.0.0.1:8000/stream");

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onmessage = (event) => {

    const data = JSON.parse(event.data);

    console.log("Stream data:", data);

    animateAgents();

    updateStats(data);
    updateProgressBars(data);
    updateDonutChart(data);
    updateKPI(data);
    updateAssetTags(data);

  };

}