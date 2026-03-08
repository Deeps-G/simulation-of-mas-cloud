(function () {
  'use strict';

  const AGENT_NAMES = ['monitoring', 'analysis', 'prediction', 'performance', 'cost', 'decision'];
  var avgLoad = 0.4;
  var trafficTrend = 0;
  var lastDecision = 'MAINTAIN';

  function agentOutput(name) {
    if (name === 'monitoring') return 'CPU avg: ' + Math.round(avgLoad * 100) + '%, instances: ' + NUM_SERVERS + ', sampling 1s';
    if (name === 'analysis') return 'Pattern: ' + (avgLoad > 0.7 ? 'HIGH_LOAD' : avgLoad < 0.35 ? 'LOW_LOAD' : 'STABLE') + ', trend: ' + (trafficTrend > 0 ? 'rising' : 'falling');
    if (name === 'prediction') return 'Forecast: ' + Math.round(Math.min(99, avgLoad * 100 + trafficTrend * 15)) + '% in 5m, confidence: 0.92';
    if (name === 'performance') return 'Recommend: ' + (avgLoad > 0.72 ? 'SCALE_UP' : avgLoad < 0.3 ? 'SCALE_DOWN' : 'MAINTAIN') + ', target utilization: 60%';
    if (name === 'cost') return 'Delta: ' + (avgLoad > 0.72 ? '+$0.024/hr' : avgLoad < 0.3 ? '-$0.018/hr' : '$0.00') + ', budget within limit';
    if (name === 'decision') return 'Decision: ' + lastDecision + ' → applying in 30s';
    return '';
  }

  const NUM_SERVERS = 10;
  const TRAFFIC_HISTORY_LEN = 80;
  const SERVER_IDS = ['web-1a', 'web-1b', 'web-2a', 'web-2b', 'api-1', 'api-2', 'cache-1', 'cache-2', 'worker-1', 'worker-2'];

  var running = false;
  var speed = 2;
  var pipelineStep = 0;
  var pipelineInterval = null;
  var trafficData = [];
  var serverLoads = [];
  var scaleUpCount = 0;
  var scaleDownCount = 0;
  var maintainCount = 0;
  var requestsPerSec = 0;
  var agentLog = [];
  var spikePhase = 0;
  var timeSec = 0;

  var networkCanvas = document.getElementById('networkCanvas');
  var trafficCanvas = document.getElementById('trafficCanvas');
  var serversWrap = document.getElementById('serversWrap');
  var pipelineTrack = document.getElementById('pipelineTrack');
  var pipelineStatus = document.getElementById('pipelineStatus');
  var pipelineOutput = document.getElementById('pipelineOutput');
  var agentLogEl = document.getElementById('agentLog');
  var btnRun = document.getElementById('btnRun');
  var speedSelect = document.getElementById('speedSelect');

  function initServers() {
    serversWrap.innerHTML = '';
    serverLoads = [];
    for (var i = 0; i < NUM_SERVERS; i++) {
      serverLoads.push(0.25 + Math.random() * 0.35);
      var node = document.createElement('div');
      node.className = 'server-node';
      node.setAttribute('data-id', i);
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = SERVER_IDS[i] || 'vm-' + (i + 1);
      var cpu = document.createElement('span');
      cpu.className = 'cpu-pct';
      cpu.textContent = '0%';
      node.appendChild(cpu);
      node.appendChild(label);
      serversWrap.appendChild(node);
      updateServerNode(i);
    }
  }

  function updateServerNode(i) {
    var nodes = serversWrap.querySelectorAll('.server-node');
    var node = nodes[i];
    if (!node) return;
    var load = serverLoads[i];
    var pct = Math.round(load * 100);
    node.classList.remove('medium', 'high');
    if (load >= 0.7) node.classList.add('high');
    else if (load >= 0.4) node.classList.add('medium');
    var h = 28 + Math.round(load * 88);
    node.style.height = h + 'px';
    var cpuEl = node.querySelector('.cpu-pct');
    if (cpuEl) cpuEl.textContent = pct + '%';
  }

  function animateServers() {
    if (!running) return;
    timeSec += 0.016 * speed;
    var trafficFactor = Math.min(1, requestsPerSec / 120);
    for (var i = 0; i < NUM_SERVERS; i++) {
      var base = 0.2 + trafficFactor * 0.5;
      var wave = Math.sin(timeSec * 0.8 + i * 0.6) * 0.12;
      var noise = (Math.random() - 0.5) * 0.08;
      serverLoads[i] = Math.max(0.08, Math.min(0.98, base + wave + noise));
      updateServerNode(i);
    }
    var sum = 0;
    for (var j = 0; j < serverLoads.length; j++) sum += serverLoads[j];
    avgLoad = sum / serverLoads.length;
  }

  function initTraffic() {
    trafficData = [];
    for (var i = 0; i < TRAFFIC_HISTORY_LEN; i++) {
      trafficData.push(18 + Math.random() * 25);
    }
    spikePhase = 0;
  }

  function updateTraffic() {
    if (!trafficCanvas.getContext) return;
    var ctx = trafficCanvas.getContext('2d');
    var w = trafficCanvas.width;
    var h = trafficCanvas.height;
    if (running) {
      timeSec += 0.016 * speed;
      var base = 25 + Math.sin(timeSec * 0.4) * 12 + Math.sin(timeSec * 1.2) * 6;
      if (spikePhase > 0) {
        spikePhase--;
        base += 35 + (spikePhase / 20) * 25;
      } else if (Math.random() < 0.008 * speed) {
        spikePhase = 18 + Math.floor(Math.random() * 12);
      }
      trafficData.push(Math.min(120, Math.max(5, base + (Math.random() - 0.5) * 8)));
      trafficData.shift();
      requestsPerSec = Math.round(trafficData[trafficData.length - 1]);
      trafficTrend = trafficData.length >= 10 ? (trafficData[trafficData.length - 1] - trafficData[trafficData.length - 10]) / 10 : 0;
    }
    var paddingLeft = 36;
    var paddingBottom = 24;
    var chartW = w - paddingLeft - 8;
    var chartH = h - paddingBottom - 8;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    var maxVal = Math.max(1, Math.max.apply(null, trafficData));
    var gridStep = chartH / 4;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gy = 8 + g * gridStep;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, gy);
      ctx.lineTo(w - 8, gy);
      ctx.stroke();
    }
    var step = chartW / TRAFFIC_HISTORY_LEN;
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var i = 0; i < trafficData.length; i++) {
      var x = paddingLeft + i * step;
      var y = 8 + chartH - (trafficData[i] / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineTo(paddingLeft + (trafficData.length - 1) * step, 8 + chartH);
    ctx.lineTo(paddingLeft, 8 + chartH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.fillText('0', paddingLeft - 8, 8 + chartH + 4);
    ctx.fillText(Math.round(maxVal), paddingLeft - 18, 14);
    ctx.fillText('Last 60s', w - 50, h - 4);
  }

  var networkNodes = [];
  var networkEdges = [];
  var flowParticles = [];
  var REGIONS = [
    { name: 'us-east-1', x: 0.22, y: 0.5 },
    { name: 'eu-west-1', x: 0.5, y: 0.22 },
    { name: 'ap-south-1', x: 0.78, y: 0.5 }
  ];

  function initNetwork() {
    if (!networkCanvas.getContext) return;
    var cw = networkCanvas.width;
    var ch = networkCanvas.height;
    networkNodes = [];
    networkEdges = [];
    flowParticles = [];
    REGIONS.forEach(function (r) {
      var x = cw * r.x;
      var y = ch * r.y;
      var regionIdx = networkNodes.length;
      networkNodes.push({ x: x, y: y, r: 14, label: r.name, pulse: Math.random() * 6, isRegion: true });
      var numAz = 2 + Math.floor(Math.random() * 2);
      for (var a = 0; a < numAz; a++) {
        var angle = (a / numAz) * Math.PI * 0.6 - Math.PI * 0.3;
        var ax = x + 55 * Math.cos(angle);
        var ay = y + 40 * Math.sin(angle);
        networkNodes.push({ x: ax, y: ay, r: 7, label: 'az-' + (a + 1), pulse: Math.random() * 6, isRegion: false });
        networkEdges.push({ a: regionIdx, b: networkNodes.length - 1 });
        flowParticles.push({ edge: networkEdges.length - 1, t: Math.random(), speed: 0.4 + Math.random() * 0.3 });
      }
      var firstAz = networkNodes.length - numAz;
      for (var e = 0; e < numAz - 1; e++) {
        networkEdges.push({ a: firstAz + e, b: firstAz + e + 1 });
        flowParticles.push({ edge: networkEdges.length - 1, t: Math.random(), speed: 0.3 });
      }
    });
  }

  function drawNetwork() {
    if (!networkCanvas.getContext || !networkNodes.length) return;
    var ctx = networkCanvas.getContext('2d');
    var cw = networkCanvas.width;
    var ch = networkCanvas.height;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, 0, cw, ch);
    var time = Date.now() / 1000;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 1.5;
    networkEdges.forEach(function (edge) {
      var A = networkNodes[edge.a];
      var B = networkNodes[edge.b];
      if (!A || !B) return;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    });
    flowParticles.forEach(function (p) {
      var edge = networkEdges[p.edge];
      if (!edge) return;
      var A = networkNodes[edge.a];
      var B = networkNodes[edge.b];
      if (!A || !B) return;
      p.t += (0.0018 * speed) * (p.speed || 0.5) * (running ? 1 : 0.2);
      if (p.t > 1) p.t -= 1;
      var x = A.x + (B.x - A.x) * p.t;
      var y = A.y + (B.y - A.y) * p.t;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    networkNodes.forEach(function (n, i) {
      n.pulse += 0.02;
      var glow = 0.5 + 0.5 * Math.sin(n.pulse);
      var r = n.r + (running && n.isRegion ? 1.5 * Math.sin(time + i) : 0);
      ctx.fillStyle = 'rgba(6, 182, 212, ' + (0.25 + glow * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = n.isRegion ? '#06b6d4' : 'rgba(6, 182, 212, 0.85)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(n.label, n.x, n.y + (n.isRegion ? 22 : 16));
    });
  }

  function resizeCanvases() {
    function size(canvas) {
      var wrap = canvas.parentElement;
      var w = wrap.clientWidth;
      var h = wrap.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        return true;
      }
      return false;
    }
    if (size(networkCanvas)) initNetwork();
    size(trafficCanvas);
  }

  function setPipelineStep(step) {
    pipelineStep = step % AGENT_NAMES.length;
    var agents = pipelineTrack.querySelectorAll('.pipeline-agent');
    agents.forEach(function (el, i) {
      el.classList.remove('active', 'done');
      if (i < pipelineStep) el.classList.add('done');
      else if (i === pipelineStep) el.classList.add('active');
    });
    var name = AGENT_NAMES[pipelineStep];
    pipelineStatus.textContent = name.charAt(0).toUpperCase() + name.slice(1) + ' agent working...';
    if (pipelineOutput) {
      pipelineOutput.innerHTML = '<span class="agent-name">[' + name.toUpperCase() + ']</span> ' + agentOutput(name);
    }
    if (running && agentLogEl) {
      agentLog.push({ t: new Date(), msg: '[' + name.toUpperCase() + '] ' + agentOutput(name) });
      while (agentLog.length > 50) agentLog.shift();
      renderAgentLog();
    }
    if (pipelineStep === 5) {
      lastDecision = avgLoad > 0.72 ? 'SCALE_UP' : avgLoad < 0.3 ? 'SCALE_DOWN' : 'MAINTAIN';
      if (lastDecision === 'SCALE_UP') scaleUpCount++;
      else if (lastDecision === 'SCALE_DOWN') scaleDownCount++;
      else maintainCount++;
    }
  }

  function renderAgentLog() {
    if (!agentLogEl) return;
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    var slice = agentLog.slice(-12);
    agentLogEl.innerHTML = slice.map(function (e) {
      var ts = e.t.getHours() + ':' + pad2(e.t.getMinutes()) + ':' + pad2(e.t.getSeconds());
      return '<div class="log-line"><span class="ts">' + ts + '</span>' + e.msg + '</div>';
    }).reverse().join('');
  }

  function runPipelineCycle() {
    if (!running) return;
    setPipelineStep((pipelineStep + 1) % AGENT_NAMES.length);
  }

  function updateStats() {
    setText('statRequests', requestsPerSec);
    setText('statCpu', running ? Math.round(avgLoad * 100) + '%' : '—');
    setText('statScaleUp', scaleUpCount);
    setText('statScaleDown', scaleDownCount);
    setText('statMaintain', maintainCount);
    setText('statActive', running ? (pipelineStep + 1) : 0);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function toggleSimulation() {
    running = !running;
    if (running) {
      btnRun.innerHTML = '<i class="fas fa-stop"></i> Stop';
      btnRun.classList.add('running');
      setPipelineStep(0);
      pipelineInterval = setInterval(runPipelineCycle, 1400 / speed);
      pipelineStatus.textContent = 'Running...';
      if (pipelineOutput) pipelineOutput.innerHTML = '<span class="agent-name">[MONITORING]</span> ' + agentOutput('monitoring');
    } else {
      btnRun.innerHTML = '<i class="fas fa-play"></i> Start';
      btnRun.classList.remove('running');
      if (pipelineInterval) clearInterval(pipelineInterval);
      pipelineInterval = null;
      setPipelineStep(0);
      pipelineStatus.textContent = 'Idle';
      if (pipelineOutput) pipelineOutput.innerHTML = '<span class="agent-name">—</span> Waiting for run...';
    }
  }

  function setSpeed(val) {
    speed = Math.max(1, Math.min(3, parseInt(val, 10) || 2));
    if (pipelineInterval) {
      clearInterval(pipelineInterval);
      pipelineInterval = setInterval(runPipelineCycle, 1400 / speed);
    }
  }

  function gameLoop() {
    animateServers();
    updateTraffic();
    drawNetwork();
    updateStats();
    requestAnimationFrame(gameLoop);
  }

  function init() {
    resizeCanvases();
    setTimeout(function () { resizeCanvases(); }, 150);
    window.addEventListener('resize', resizeCanvases);
    initServers();
    initTraffic();
    initNetwork();
    setPipelineStep(0);
    updateStats();
    if (pipelineOutput) pipelineOutput.innerHTML = '<span class="agent-name">—</span> Click Start to run agents.';
    gameLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.toggleSimulation = toggleSimulation;
  window.setSpeed = setSpeed;
})();
