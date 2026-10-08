// Flow Control Power Comparator - Chart.js
// Three prediction challenges: rank outlet damper, variable inlet vanes and speed
// control by shaft power at a stated airflow, then estimate the best method's saving.
// All three series are illustrative (speed control = ideal cube law).
// CANVAS_HEIGHT: 710
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ---------- Content (from the chapter specification) ----------
  const TABLE = [
    // airflow, damper, vanes
    [50, 74, 52],
    [60, 80, 59],
    [70, 86, 67],
    [80, 91, 77],
    [90, 96, 88],
    [100, 100, 100]
  ];

  const METHODS = [
    { key: 'damper', name: 'Outlet damper', color: '#c0392b', dash: [] },
    { key: 'vanes', name: 'Variable inlet vanes', color: '#d68910', dash: [7, 4] },
    { key: 'speed', name: 'Speed control', color: '#1f6fb2', dash: [2, 3] }
  ];

  const CORRECT_ORDER = ['speed', 'vanes', 'damper']; // lowest to highest power
  const CORRECT_RANK_TEXT = 'Speed control, inlet vanes, outlet damper';

  const CHALLENGES = [
    {
      airflow: 80,
      saving: 39.8,
      wrong: 'The damper still drives the fan at full speed and burns most of the power; ' +
        'speed control at 80% flow needs about 0.8³ = 51% power.'
    },
    {
      airflow: 70,
      saving: 51.7,
      wrong: 'At 70% flow the damper saves only 14% of power; speed control needs about 0.7³ = 34%.'
    },
    {
      airflow: 50,
      saving: 61.5,
      wrong: 'Halving the flow with a damper still leaves about three-quarters of the power; ' +
        'halving the speed cuts power to one-eighth.'
    }
  ];
  const TOLERANCE = 3;      // percentage points
  const MAX_ATTEMPTS = 2;

  // ---------- Rules ----------
  function round1(v) { return Math.round(v * 10) / 10; }

  function speedPower(q) { return round1(100 * Math.pow(q / 100, 3)); }

  function interp(q, col) {
    for (let i = 0; i < TABLE.length - 1; i++) {
      const a = TABLE[i], b = TABLE[i + 1];
      if (q >= a[0] && q <= b[0]) {
        const t = (q - a[0]) / (b[0] - a[0]);
        return round1(a[col] + t * (b[col] - a[col]));
      }
    }
    return TABLE[TABLE.length - 1][col];
  }

  function powerOf(key, q) {
    if (key === 'damper') return interp(q, 1);
    if (key === 'vanes') return interp(q, 2);
    return speedPower(q);
  }

  function methodName(key) {
    return METHODS.find(function (m) { return m.key === key; }).name;
  }

  // ---------- State ----------
  const state = {
    index: 0,          // current challenge
    attempts: 0,
    resolved: false,   // current challenge finished (correct or missed)
    correct: 0,
    finished: false,   // all three done; selector unlocked
    selected: 70       // airflow selector default
  };

  // ---------- DOM ----------
  const main = document.querySelector('main');
  const style = document.createElement('style');
  style.textContent = `
    .fc-wrap { box-sizing: border-box; width: 100%; padding: 8px 12px; background: aliceblue;
      border: 1px solid silver; font-size: 14px; color: #222; }
    .fc-title { font-size: 17px; font-weight: bold; margin: 0 0 6px 0; }
    .fc-panel { background: white; border: 1px solid #ccd; border-radius: 6px; padding: 8px 10px; }
    .fc-q { font-weight: bold; margin-bottom: 6px; }
    .fc-row { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; margin-bottom: 6px; }
    .fc-row label { white-space: nowrap; }
    .fc-row select, .fc-row input[type=number] { font-size: 13px; padding: 2px 4px; }
    .fc-row select { max-width: 160px; }
    .fc-row input[type=number] { width: 70px; }
    .fc-row button { font-size: 13px; padding: 4px 12px; cursor: pointer; }
    .fc-feedback { min-height: 38px; padding: 4px 6px; border-radius: 4px; }
    .fc-ok { background: #e3f4e5; color: #1b5e20; }
    .fc-bad { background: #fdecea; color: #8e1b10; }
    .fc-info { background: #eef2f7; color: #333; }
    .fc-status { display: flex; justify-content: space-between; font-size: 13px; color: #444; margin-top: 4px; }
    .fc-chart { position: relative; height: 300px; margin-top: 8px; background: white;
      border: 1px solid #ccd; border-radius: 6px; }
    .fc-selector { margin-top: 8px; }
    .fc-selector input[type=range] { width: 220px; vertical-align: middle; }
    .fc-readout { font-size: 13px; min-height: 36px; }
    .fc-locked { color: #888; }
    .fc-foot { font-size: 12px; color: #555; margin-top: 4px; }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'fc-wrap';
  wrap.innerHTML = `
    <div class="fc-title">Flow Control Power Comparator</div>
    <div class="fc-panel">
      <div class="fc-q" id="fc-question"></div>
      <div class="fc-row">
        <span>Rank by power:</span>
        <label>Lowest <select id="fc-r0"></select></label>
        <label>Middle <select id="fc-r1"></select></label>
        <label>Highest <select id="fc-r2"></select></label>
      </div>
      <div class="fc-row">
        <label>Best method's saving vs. damper:
          <input type="number" id="fc-saving" step="0.1" min="0" max="100"> percentage points</label>
        <button id="fc-check">Check</button>
        <button id="fc-next" disabled>Next challenge</button>
      </div>
      <div class="fc-feedback fc-info" id="fc-feedback" aria-live="polite"></div>
      <div class="fc-status"><span id="fc-progress"></span><span id="fc-score"></span></div>
    </div>
    <div class="fc-chart"><canvas id="fc-canvas" aria-label="Shaft power versus airflow for three flow-control methods"></canvas></div>
    <div class="fc-selector">
      <div class="fc-row">
        <label id="fc-sel-label" class="fc-locked">Airflow selector:
          <input type="range" id="fc-airflow" min="50" max="100" step="5" value="70" disabled>
          <b id="fc-airflow-val">70%</b></label>
      </div>
      <div class="fc-readout" id="fc-readout"></div>
      <div class="fc-foot">All three curves are illustrative. Speed control is the ideal fan-law cube
        relation; real speed control has small drive losses, and a system with fixed static pressure
        saves less than the ideal cube value.</div>
    </div>
  `;
  main.appendChild(wrap);

  const $ = function (id) { return document.getElementById(id); };
  const rankSelects = [$('fc-r0'), $('fc-r1'), $('fc-r2')];
  rankSelects.forEach(function (sel) {
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '-- choose --';
    sel.appendChild(blank);
    METHODS.forEach(function (m) {
      const o = document.createElement('option');
      o.value = m.key;
      o.textContent = m.name;
      sel.appendChild(o);
    });
  });

  // ---------- Chart ----------
  const AIRFLOWS = [];
  for (let q = 50; q <= 100; q += 5) AIRFLOWS.push(q);

  const curveSets = METHODS.map(function (m) {
    return {
      label: m.name + ' (illustrative)',
      methodKey: m.key,
      data: AIRFLOWS.map(function (q) { return { x: q, y: powerOf(m.key, q) }; }),
      borderColor: m.color,
      backgroundColor: m.color,
      borderDash: m.dash,
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      tension: 0,
      cubicInterpolationMode: m.key === 'speed' ? 'monotone' : 'default',
      hidden: true
    };
  });

  const markerSet = {
    label: 'Marked airflow',
    isMarker: true,
    data: [],
    showLine: false,
    pointStyle: 'circle',
    pointRadius: 7,
    pointHoverRadius: 8,
    pointBackgroundColor: [],
    pointBorderColor: '#222',
    pointBorderWidth: 2,
    hidden: true
  };

  // Draws a vertical guide at the marked airflow and value labels beside marker points.
  const markerLabels = {
    id: 'markerLabels',
    afterDatasetsDraw: function (chart) {
      const mIdx = chart.data.datasets.length - 1;
      const meta = chart.getDatasetMeta(mIdx);
      if (!chart.isDatasetVisible(mIdx) || !meta.data.length) return;
      const ctx = chart.ctx;
      const xs = chart.scales.x;
      const area = chart.chartArea;
      const px = xs.getPixelForValue(chart.data.datasets[mIdx].data[0].x);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, area.top);
      ctx.lineTo(px, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 12px Arial';
      ctx.textBaseline = 'middle';
      // Place labels on the side with more room and avoid overlap.
      const leftSide = px > area.left + (area.right - area.left) * 0.75;
      const pts = meta.data.map(function (el, i) {
        return { y: el.y, x: el.x, d: chart.data.datasets[mIdx].data[i] };
      }).sort(function (a, b) { return a.y - b.y; });
      let lastY = -Infinity;
      pts.forEach(function (p) {
        let ly = Math.max(p.y, lastY + 15);
        lastY = ly;
        const txt = p.d.y.toFixed(1) + '%';
        const w = ctx.measureText(txt).width;
        const lx = leftSide ? p.x - 12 - w : p.x + 12;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(lx - 2, ly - 8, w + 4, 16);
        ctx.fillStyle = p.d.color;
        ctx.fillText(txt, lx, ly);
      });
      ctx.restore();
    }
  };

  const chart = new Chart($('fc-canvas'), {
    type: 'line',
    data: { datasets: curveSets.concat([markerSet]) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'nearest', intersect: true },
      scales: {
        x: {
          type: 'linear', min: 50, max: 100,
          ticks: { stepSize: 10, callback: function (v) { return v + '%'; } },
          title: { display: true, text: 'Airflow (% of design)' }
        },
        y: {
          min: 0, max: 100,
          ticks: { stepSize: 20, callback: function (v) { return v + '%'; } },
          title: { display: true, text: 'Shaft power (% of design)' }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 30, boxHeight: 0, font: { size: 12 },
            filter: function (item, data) { const ds = data.datasets[item.datasetIndex]; return !ds.isMarker && !ds.hidden; }
          },
          onClick: function () { /* legend toggling disabled so curves stay hidden until reveal */ }
        },
        tooltip: {
          filter: function (item) { return !item.dataset.isMarker; },
          callbacks: {
            title: function (items) { return 'Airflow: ' + items[0].parsed.x + '% of design'; },
            label: function (item) {
              return methodName(item.dataset.methodKey) + ': ' + item.parsed.y.toFixed(1) + '% power (illustrative)';
            }
          }
        }
      }
    },
    plugins: [markerLabels]
  });

  function setCurvesVisible(visible) {
    chart.data.datasets.forEach(function (ds) { ds.hidden = !visible; });
    chart.update();
  }

  function markAirflow(q) {
    markerSet.data = METHODS.map(function (m) {
      return { x: q, y: powerOf(m.key, q), color: m.color };
    });
    markerSet.pointBackgroundColor = METHODS.map(function (m) { return m.color; });
    chart.update();
  }

  // ---------- Challenge flow ----------
  function setFeedback(text, kind) {
    const fb = $('fc-feedback');
    fb.textContent = text;
    fb.className = 'fc-feedback fc-' + kind;
  }

  function updateStatus() {
    if (state.finished) {
      $('fc-progress').textContent = 'All challenges complete. Explore with the airflow selector.';
    } else {
      const left = MAX_ATTEMPTS - state.attempts;
      $('fc-progress').textContent = 'Challenge ' + (state.index + 1) + ' of 3' +
        (state.resolved ? '' : ' — attempts left: ' + left);
    }
    $('fc-score').textContent = 'Challenges correct: ' + state.correct + ' of 3';
  }

  function setInputsEnabled(on) {
    rankSelects.forEach(function (s) { s.disabled = !on; });
    $('fc-saving').disabled = !on;
    $('fc-check').disabled = !on;
  }

  function startChallenge(i) {
    state.index = i;
    state.attempts = 0;
    state.resolved = false;
    const c = CHALLENGES[i];
    $('fc-question').textContent = 'Challenge ' + (i + 1) + ': At ' + c.airflow +
      '% airflow, which method uses the least power, and how much does it save compared with an outlet damper?';
    rankSelects.forEach(function (s) { s.value = ''; });
    $('fc-saving').value = '';
    setInputsEnabled(true);
    $('fc-next').disabled = true;
    setCurvesVisible(false);
    setFeedback('Rank the three methods from lowest to highest shaft power at ' + c.airflow +
      '% airflow, type the saving, then press Check. The curves stay hidden until you commit.', 'info');
    updateStatus();
  }

  function reveal(q) {
    markAirflow(q);
    setCurvesVisible(true);
  }

  function resolve(wasCorrect) {
    state.resolved = true;
    if (wasCorrect) state.correct++;
    setInputsEnabled(false);
    reveal(CHALLENGES[state.index].airflow);
    if (state.index < CHALLENGES.length - 1) {
      $('fc-next').disabled = false;
    } else {
      finishAll();
    }
    updateStatus();
  }

  function onCheck() {
    if (state.resolved) return;
    const c = CHALLENGES[state.index];
    const order = rankSelects.map(function (s) { return s.value; });
    if (order.some(function (v) { return v === ''; }) || new Set(order).size !== 3) {
      setFeedback('Choose each of the three methods exactly once before checking.', 'info');
      return;
    }
    const raw = $('fc-saving').value.trim();
    const saving = parseFloat(raw);
    if (raw === '' || !isFinite(saving)) {
      setFeedback('Type the saving as a number of percentage points before checking.', 'info');
      return;
    }
    state.attempts++;
    const rankOk = order.every(function (k, i) { return k === CORRECT_ORDER[i]; });
    const savingOk = Math.abs(saving - c.saving) <= TOLERANCE;
    if (rankOk && savingOk) {
      setFeedback('Correct: ' + CORRECT_RANK_TEXT + '; saving ' + c.saving.toFixed(1) + ' percentage points.', 'ok');
      resolve(true);
    } else if (state.attempts < MAX_ATTEMPTS) {
      setFeedback(c.wrong, 'bad');
      updateStatus();
    } else {
      setFeedback(c.wrong + ' Correct answer: ' + CORRECT_RANK_TEXT + '; saving ' +
        c.saving.toFixed(1) + ' percentage points. This challenge counts as missed.', 'bad');
      resolve(false);
    }
  }

  function updateReadout() {
    const q = state.selected;
    const d = powerOf('damper', q), v = powerOf('vanes', q), s = powerOf('speed', q);
    $('fc-airflow-val').textContent = q + '%';
    $('fc-readout').innerHTML =
      'At <b>' + q + '%</b> airflow: outlet damper <b>' + d.toFixed(1) + '%</b>, inlet vanes <b>' +
      v.toFixed(1) + '%</b>, speed control <b>' + s.toFixed(1) + '%</b> power. ' +
      'Saving vs. damper: inlet vanes <b>' + round1(d - v).toFixed(1) + '</b> points, speed control <b>' +
      round1(d - s).toFixed(1) + '</b> points.';
  }

  function finishAll() {
    state.finished = true;
    const slider = $('fc-airflow');
    slider.disabled = false;
    $('fc-sel-label').classList.remove('fc-locked');
    state.selected = parseInt(slider.value, 10);
    updateReadout();
    markAirflow(state.selected);
  }

  $('fc-check').addEventListener('click', onCheck);
  $('fc-next').addEventListener('click', function () {
    if (state.resolved && state.index < CHALLENGES.length - 1) startChallenge(state.index + 1);
  });
  $('fc-airflow').addEventListener('input', function (e) {
    if (!state.finished) return;
    state.selected = parseInt(e.target.value, 10);
    updateReadout();
    markAirflow(state.selected);
  });

  $('fc-readout').innerHTML = '<span class="fc-locked">The airflow selector unlocks after all three challenges.</span>';
  startChallenge(0);
});
