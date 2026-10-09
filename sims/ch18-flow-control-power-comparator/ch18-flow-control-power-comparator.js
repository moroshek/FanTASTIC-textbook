// Flow Control Power Comparator - Chart.js on the FanPedia kit
// Three prediction challenges: rank outlet damper, variable inlet vanes and speed
// control by shaft power at a stated airflow, then estimate the best method's saving.
// All three series are illustrative (speed control = ideal cube law, FP.models).
// CANVAS_HEIGHT: 940
(function () {
  'use strict';

  // ---------- Content (from the chapter specification) ----------
  const AIR = [50, 60, 70, 80, 90, 100];          // airflow, % of design
  const DAMPER = [74, 80, 86, 91, 96, 100];       // outlet damper, % power
  const VANES = [52, 59, 67, 77, 88, 100];        // variable inlet vanes, % power

  // Series order fixes the kit series style (colour, dash, point shape).
  const METHODS = [
    { key: 'damper', name: 'Outlet damper', short: 'Damper' },
    { key: 'vanes', name: 'Variable inlet vanes', short: 'Vanes' },
    { key: 'speed', name: 'Speed control', short: 'Speed' }
  ];
  const CORRECT_ORDER = ['speed', 'vanes', 'damper'];   // lowest to highest power
  const CORRECT_RANK_TEXT = 'Speed control, inlet vanes, outlet damper';
  const TOLERANCE = { abs: 3 };                         // percentage points

  const ITEMS = [
    { airflow: 80, saving: 39.8,
      wrongText: 'The damper still drives the fan at full speed and burns most of the power; ' +
        'speed control at 80% flow needs about 0.8³ = 51% power.' },
    { airflow: 70, saving: 51.7,
      wrongText: 'At 70% flow the damper saves only 14% of power; speed control needs about 0.7³ = 34%.' },
    { airflow: 50, saving: 61.5,
      wrongText: 'Halving the flow with a damper still leaves about three-quarters of the power; ' +
        'halving the speed cuts power to one-eighth.' }
  ].map(function (c, i) {
    return Object.assign(c, {
      id: 'challenge-' + (i + 1) + '-' + c.airflow,
      prompt: 'Challenge ' + (i + 1) + ': At ' + c.airflow + '% airflow, which method uses the least power, ' +
        'and how much does it save compared with an outlet damper?',
      answerText: CORRECT_RANK_TEXT + '; saving ' + FP.fmt.num(c.saving, 1) + ' percentage points',
      check: isRight,
      // First wrong attempt: a hint naming the slip (no ranking, no saving, no worked numbers).
      hint: powerHint,
      // Spec feedback: correct shows only the answer; the final miss shows the challenge's text.
      why: function (v, item) { return isRight(v, item) ? '' : item.wrongText; }
    });
  });

  // ---------- Rules ----------
  const r1 = function (v) { return FP.models.round(v, 1); };
  function powerOf(key, q) {
    if (key === 'damper') return r1(FP.curves.interp(AIR, DAMPER, q));
    if (key === 'vanes') return r1(FP.curves.interp(AIR, VANES, q));
    // Fan laws on a system curve through zero: speed ratio = airflow ratio.
    return r1(100 * FP.models.fanLawRatios(q / 100).bhp);
  }
  function isRight(v, item) {
    return v.order.every(function (k, i) { return k === CORRECT_ORDER[i]; }) &&
      FP.check.numeric(v.saving, item.saving, TOLERANCE);
  }
  // Hint after a first wrong attempt. Names the rule or the slip; never states the ranking,
  // the saving or a method's power at the challenge airflow.
  function powerHint(v, item) {
    const near = function (x, t) { return Math.abs(x - t) <= TOLERANCE.abs; };
    const q = item.airflow;
    const orderOk = v.order.every(function (k, i) { return k === CORRECT_ORDER[i]; });
    const parts = [];
    if (!orderOk) {
      if (v.order[2] !== 'damper') {
        parts.push('Check the ranking: a damper only adds resistance while the fan keeps running at full speed. ' +
          'Where does that put its power?');
      } else {
        parts.push('Check the ranking: inlet vanes pre-spin the air, but slowing the fan cuts power with ' +
          'roughly the cube of the airflow ratio.');
      }
    }
    if (!FP.check.numeric(v.saving, item.saving, TOLERANCE)) {
      const best = powerOf('speed', q), damper = powerOf('damper', q);
      if (near(v.saving, 100 - q)) {
        parts.push('Power does not fall in proportion to airflow: with speed control it follows the cube ' +
          'of the airflow ratio, and the damper barely saves anything.');
      } else if (near(v.saving, damper - powerOf('vanes', q))) {
        parts.push('That saving is for inlet vanes. The question asks for the method with the lowest power.');
      } else if (near(v.saving, 100 - best)) {
        parts.push('That saving is measured from 100% design power. Measure it from the damper\'s power at ' +
          q + '% airflow.');
      } else if (near(v.saving, best)) {
        parts.push('That is the best method\'s power, not its saving. Saving = damper power − best method power.');
      } else {
        parts.push('Saving = damper power − best method power at ' + q + '% airflow, in percentage points; ' +
          'speed-control power ≈ 100 × (airflow ratio)³.');
      }
    }
    return parts.join(' ');
  }

  function methodName(key) { return METHODS.find(function (m) { return m.key === key; }).name; }
  const pct = function (v) { return FP.fmt.num(v, 1) + '%'; };

  // ---------- DOM ----------
  const $ = function (id) { return document.getElementById(id); };
  const rankSelects = [$('r0'), $('r1'), $('r2')];
  rankSelects.forEach(function (sel) {
    sel.add(new Option('-- choose --', ''));
    METHODS.forEach(function (m) { sel.add(new Option(m.name, m.key)); });
  });

  // ---------- Chart ----------
  FP.chart.chartjs(Chart);
  const AIRFLOWS = [];
  for (let q = 50; q <= 100; q += 5) AIRFLOWS.push(q);

  const curveSets = METHODS.map(function (m, i) {
    return FP.chart.chartjsDataset(i, {
      label: m.name + ' (illustrative)',
      methodKey: m.key,
      data: AIRFLOWS.map(function (q) { return { x: q, y: powerOf(m.key, q) }; }),
      hidden: true
    });
  });

  const markerSet = {
    label: 'Marked airflow',
    isMarker: true,
    data: [],
    showLine: false,
    pointRadius: 7,
    pointHoverRadius: 8,
    pointStyle: METHODS.map(function (m, i) { return FP.chart.series(i).pointStyle; }),
    pointBackgroundColor: METHODS.map(function (m, i) { return FP.chart.series(i).color; }),
    pointBorderColor: FP.tok('text'),
    pointBorderWidth: 2,
    hidden: true
  };

  // Vertical guide at the marked airflow, plus a named value label beside each
  // marker (dark text, so the method name, not the colour, carries the meaning).
  const markerLabels = {
    id: 'fcpcMarkerLabels',
    afterDatasetsDraw: function (chart) {
      const mIdx = chart.data.datasets.length - 1;
      const meta = chart.getDatasetMeta(mIdx);
      if (!chart.isDatasetVisible(mIdx) || !meta.data.length) return;
      const ctx = chart.ctx, area = chart.chartArea, ds = chart.data.datasets[mIdx];
      const px = chart.scales.x.getPixelForValue(ds.data[0].x);
      ctx.save();
      ctx.strokeStyle = FP.tok('text-muted');
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px, area.top); ctx.lineTo(px, area.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 12px ' + FP.FONT;
      ctx.textBaseline = 'middle';
      const leftSide = px > area.left + (area.right - area.left) * 0.6;
      const pts = meta.data.map(function (el, i) { return { x: el.x, y: el.y, d: ds.data[i] }; })
        .sort(function (a, b) { return a.y - b.y; });
      let lastY = -Infinity;
      pts.forEach(function (p) {
        const ly = Math.max(p.y, lastY + 17);
        lastY = ly;
        const txt = p.d.short + ' ' + pct(p.d.y);
        const w = ctx.measureText(txt).width;
        const lx = leftSide ? p.x - 14 - w : p.x + 14;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(lx - 3, ly - 8, w + 6, 16);
        ctx.strokeStyle = p.d.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(lx - 3, ly - 8, w + 6, 16);
        ctx.fillStyle = FP.tok('text');
        ctx.fillText(txt, lx, ly);
      });
      ctx.restore();
    }
  };

  const chart = new Chart($('chart'), {
    type: 'line',
    data: { datasets: curveSets.concat([markerSet]) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'nearest', intersect: true },
      scales: {
        x: FP.chart.chartjsScale('Airflow (% of design)', {
          min: 50, max: 100, ticks: { stepSize: 10, callback: function (v) { return v + '%'; } }
        }),
        y: FP.chart.chartjsScale('Shaft power (% of design)', {
          min: 0, max: 100, ticks: { stepSize: 20, callback: function (v) { return v + '%'; } }
        })
      },
      plugins: {
        legend: {
          labels: {
            filter: function (item, data) {
              const ds = data.datasets[item.datasetIndex];
              return !ds.isMarker && !ds.hidden;
            }
          },
          onClick: function () { /* no toggling: curves stay hidden until the reveal */ }
        },
        tooltip: {
          filter: function (item) { return !item.dataset.isMarker; },
          callbacks: {
            title: function (items) { return 'Airflow: ' + items[0].parsed.x + '% of design'; },
            label: function (item) {
              return methodName(item.dataset.methodKey) + ': ' + pct(item.parsed.y) + ' power (illustrative)';
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
    markerSet.data = METHODS.map(function (m, i) {
      return { x: q, y: powerOf(m.key, q), short: m.short, color: FP.chart.series(i).color };
    });
    chart.update();
  }

  // ---------- Challenge flow (FP.ChallengeRunner) ----------
  const runner = new FP.ChallengeRunner({
    items: ITEMS,
    attempts: 2,
    noun: 'Challenges',
    mastery: ITEMS.length,
    reviewPointer: 'Review the worked example "The Same 70% Flow Three Ways" and the Speed Control section',
    id: 'ch18-flow-control-power-comparator',
    onChange: render,
    onComplete: showSummary,
    onUnlockExplore: unlockExplore
  });

  let selected = 70;

  function setInputsEnabled(on) {
    rankSelects.forEach(function (s) { s.disabled = !on; });
    $('saving').disabled = !on;
    $('check').disabled = !on;
  }

  function render(st) {
    $('score').textContent = st.scoreLabel;
    $('attempt').textContent = st.phase === 'question' ? st.attemptLabel : '';
    FP.ui.progress($('progress'), st.results, st.phase === 'done' ? -1 : st.index, 'Challenge');
    $('exploreState').textContent = st.exploreLabel;
    $('next').hidden = st.phase !== 'resolved';
    $('check').hidden = st.phase === 'done';
    // After the last challenge the answer rows give way to Explore mode.
    document.querySelectorAll('.fcpc-answer').forEach(function (el) { el.hidden = st.phase === 'done'; });
    setInputsEnabled(st.phase === 'question');
  }

  function startChallenge() {
    const st = runner.state();
    const c = st.item;
    $('prompt').textContent = c.prompt;
    rankSelects.forEach(function (s) { s.value = ''; });
    $('saving').value = '';
    setCurvesVisible(false);
    FP.ui.feedback($('feedback'), 'info', 'Rank the three methods from lowest to highest shaft power at ' +
      c.airflow + '% airflow, type the saving, then press Check. The curves stay hidden until you commit.',
      { announce: false });
    render(st);
  }

  function onCheck() {
    const st = runner.state();
    if (st.phase !== 'question') return;
    const order = rankSelects.map(function (s) { return s.value; });
    if (order.some(function (v) { return v === ''; }) || new Set(order).size !== 3) {
      FP.ui.feedback($('feedback'), 'info', 'Choose each of the three methods exactly once before checking.');
      return;
    }
    const saving = FP.fmt.parseNumber($('saving').value);
    if (isNaN(saving)) {
      FP.ui.feedback($('feedback'), 'info', FP.msg.ENTER_NUMBER + ' for the saving, in percentage points.');
      $('saving').focus();
      return;
    }
    const res = runner.submit({ order: order, saving: saving });
    FP.ui.feedback($('feedback'), res.kind, res.message);
    if (res.status === 'correct' || res.status === 'missed') {
      markAirflow(st.item.airflow);
      setCurvesVisible(true);
      if (st.isLast) runner.next();          // after challenge 3 the chart stays and Explore unlocks
      else $('next').focus();
    }
  }

  function showSummary(summary) {
    const box = $('summary');
    box.innerHTML = '';
    summary.lines.forEach(function (line) {
      const p = document.createElement('div');
      p.textContent = line;
      box.appendChild(p);
    });
    if (summary.misses.length) {
      const ul = document.createElement('ul');
      summary.misses.forEach(function (m) {
        const li = document.createElement('li');
        // Compact: the full Why text was shown in that challenge's verdict.
        li.textContent = 'Missed challenge ' + (m.index + 1) + ' (' + m.item.airflow + '% airflow): saving ' +
          FP.fmt.num(m.item.saving, 1) + ' percentage points.';
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    FP.announce(summary.lines.join(' '));
  }

  function updateReadout() {
    const q = selected;
    const d = powerOf('damper', q), v = powerOf('vanes', q), s = powerOf('speed', q);
    $('airflowVal').textContent = q + '%';
    $('readout').innerHTML =
      'At <b>' + q + '%</b> airflow: outlet damper <b>' + pct(d) + '</b>, inlet vanes <b>' + pct(v) +
      '</b>, speed control <b>' + pct(s) + '</b> power. Saving vs. damper: inlet vanes <b>' +
      FP.fmt.num(r1(d - v), 1) + '</b> points, speed control <b>' + FP.fmt.num(r1(d - s), 1) + '</b> points.';
  }

  function unlockExplore() {
    const slider = $('airflow');
    slider.disabled = false;
    selected = parseInt(slider.value, 10);
    $('prompt').textContent = FP.msg.EXPLORE + ': move the airflow selector from 100% down to 50% and watch the gap between the damper and speed-control curves.';
    updateReadout();
    markAirflow(selected);
    slider.focus();
  }

  function startOver() {
    runner.restart();
    const slider = $('airflow');
    slider.value = 70;
    slider.disabled = true;
    selected = 70;
    $('airflowVal').textContent = '70%';
    $('readout').textContent = '';
    $('summary').textContent = '';
    startChallenge();
    rankSelects[0].focus();
  }

  // ---------- Events ----------
  $('check').addEventListener('click', onCheck);
  $('next').addEventListener('click', function () {
    if (runner.next()) { startChallenge(); rankSelects[0].focus(); }
  });
  $('startOver').addEventListener('click', startOver);
  $('airflow').addEventListener('input', function (e) {
    if (!runner.state().explore) return;
    selected = parseInt(e.target.value, 10);
    updateReadout();
    markAirflow(selected);
  });
  // Enter in a select or the saving box checks; Enter elsewhere (not on a button) goes to the next challenge.
  document.querySelector('main').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
    const phase = runner.state().phase;
    if (phase === 'question' && (e.target.tagName === 'SELECT' || e.target.id === 'saving')) {
      e.preventDefault(); onCheck();
    } else if (phase === 'resolved') {
      e.preventDefault(); $('next').click();
    }
  });

  startChallenge();
})();
