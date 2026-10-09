// Isolator Transmissibility Explorer - Plotly on the FanPedia kit (Chapter 22)
// CANVAS_HEIGHT: 870
// Three calculation challenges (FP.ChallengeRunner, two attempts, ±5%): the learner
// types the transmissibility T of an undamped isolator for a stated fan speed and
// static deflection before the curve is shown. Then Explore mode unlocks the speed
// slider and deflection list. Physics: FP.models (forcingFrequencyHz,
// naturalFrequencyHz = 3.13/sqrt(delta), frequencyRatio, transmissibility,
// percentIsolation, isolationStatus with the ch22 resonance band |r - 1| < 0.05).
(function () {
  'use strict';

  const SIM_ID = 'ch22-isolator-transmissibility-explorer';
  const M = FP.models;
  const R_ISO = Math.SQRT2;          // 1.414: amplification below, isolation above
  const T_CAP = 10;                  // plotted T is capped at 10
  const T_MIN = 0.01;                // bottom of the log axis

  // ---------- Content (chapter specification) ----------
  const DEFLECTIONS = [
    { d: 0.0625, label: 'Neoprene pad' },
    { d: 0.2, label: 'Rubber-in-shear' },
    { d: 0.3, label: 'Rubber-in-shear' },
    { d: 0.5, label: 'Rubber-in-shear' },
    { d: 1.0, label: 'Spring' },
    { d: 2.0, label: 'Spring' }
  ];
  const SPEED = { min: 300, max: 3600, step: 30, def: 1170 };

  function calc(rpm, d) {
    const fHz = M.forcingFrequencyHz(rpm);
    const fnHz = M.naturalFrequencyHz(d);
    const r = M.frequencyRatio(fHz, fnHz);
    const T = M.transmissibility(r);
    return { rpm: rpm, d: d, fHz: fHz, fnHz: fnHz, r: r, T: T, pct: M.percentIsolation(T),
      status: M.isolationStatus(r, { resonanceTol: 0.05 }) };
  }

  // 3 significant figures for display; answers are judged against the unrounded model.
  function sig3(x) {
    if (!isFinite(x)) return '∞';
    if (x === 0) return '0';
    const mag = Math.floor(Math.log10(Math.abs(x)));
    const d = Math.max(0, 2 - mag);
    return FP.fmt.num(M.round(x, d), d);
  }
  // "97.4% isolation" or "amplified ×2.76" (or "at or near resonance").
  function effect(c) {
    if (Math.abs(c.r - 1) < 0.05) return 'at or near resonance';
    return c.pct == null ? 'amplified ×' + sig3(c.T) : sig3(c.pct) + '% isolation';
  }

  const ITEMS = [
    { rpm: 1170, d: 1.0, chapterT: '0.026',
      prompt: 'Challenge 1: What fraction of the fan\'s force gets through a 1 in spring at 1170 RPM?',
      wrong: 'f = 19.5 Hz, f_n = 3.13 Hz, r = 6.23, T = 1/(6.23² − 1) = 0.026, about 97.4% isolation.' },
    { rpm: 1170, d: 0.0625, chapterT: '0.70',
      prompt: 'Challenge 2: The same 1170 RPM fan sits on neoprene pads (0.0625 in). What is T?',
      wrong: 'A pad\'s f_n is 12.52 Hz, so r = 1.56 and T = 1/(1.56² − 1) = 0.70: only about 30% isolation.' },
    { rpm: 600, d: 0.0625, chapterT: '2.76',
      prompt: 'Challenge 3: A slow fan at 600 RPM sits on the same neoprene pads (0.0625 in). What is T?',
      wrong: 'r = 10/12.52 = 0.80 is below 1.414, so T = 1/|0.80² − 1| = 2.76: the pad amplifies the force.' }
  ].map(function (it, i) {
    const c = calc(it.rpm, it.d);
    return Object.assign(it, {
      id: 'challenge-' + (i + 1) + '-' + it.rpm + 'rpm-' + it.d + 'in',
      label: 'challenge ' + (i + 1),
      model: c.T,
      calc: c,
      tolerance: { rel: 0.05 },
      answerText: 'T = ' + sig3(c.T),
      hint: it.wrong,
      why: it.wrong
    });
  });

  const runner = new FP.ChallengeRunner({
    items: ITEMS,
    attempts: 2,
    tolerance: { rel: 0.05 },
    noun: 'Challenges',
    mastery: ITEMS.length,
    reviewPointer: 'Rework the frequency ratio first, then T = 1/|r² − 1|',
    id: SIM_ID,
    // Spec wording: correct "Correct: T = <model>, <percent isolation or amplification>.";
    // wrong: the challenge's "Feedback when wrong"; after the second wrong attempt the
    // worked calculation is shown and the challenge counts as missed.
    messages: {
      correct: function (res) { return '✓ Correct: T = ' + sig3(res.item.model) + ', ' + effect(res.item.calc) + '.'; },
      retry: function (res) { return '✗ Not quite. ' + res.item.wrong + ' Try again (1 attempt left).'; },
      missed: function (res) {
        return '✗ Not quite. The answer is T = ' + sig3(res.item.model) + '. Worked calculation: ' + res.item.wrong + ' This one counts as missed.';
      }
    },
    onComplete: showSummary,
    onUnlockExplore: unlockExplore
  });

  // ---------- DOM ----------
  const $ = function (id) { return document.getElementById(id); };
  const speedEl = $('speed'), deflEl = $('defl');
  DEFLECTIONS.forEach(function (o, i) {
    deflEl.add(new Option(FP.fmt.numUpTo(o.d, 4) + ' in, ' + o.label, String(i)));
  });

  let view = { calc: null, learner: null, showCurve: false };

  // ---------- Plot ----------
  const CURVE_X = [], CURVE_Y = [];
  for (let i = 0; i <= 1000; i++) {
    const r = i / 100;
    CURVE_X.push(r);
    CURVE_Y.push(Math.min(T_CAP, M.transmissibility(r)));
  }
  function narrow() { return $('plot').clientWidth < 520; }
  function rgba(hex, a) {
    const v = parseInt(String(hex).replace('#', ''), 16);
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
  }
  function clampT(t) { return Math.max(T_MIN, Math.min(T_CAP, t)); }

  function draw() {
    const nar = narrow();
    $('plot').classList.toggle('narrow', nar);
    const traces = [];
    traces.push(FP.chart.plotlyTrace(0, {
      name: 'T = 1/|r² − 1| (undamped)', x: CURVE_X, y: CURVE_Y, mode: 'lines', visible: view.showCurve,
      hovertemplate: 'r = %{x:.2f}<br>T = %{y:.3g}<extra></extra>'
    }));
    const c = view.calc;
    if (c && view.showCurve) {
      const ty = clampT(c.T);
      traces.push(FP.chart.plotlyTrace(1, {
        name: 'Operating point (model)', x: [Math.min(c.r, 10)], y: [ty], mode: 'markers',
        marker: { size: 13, line: { color: FP.tok('text'), width: 2 } },
        hovertemplate: 'Model<br>r = ' + sig3(c.r) + '<br>T = ' + sig3(c.T) + '<extra></extra>'
      }));
      if (view.learner != null) {
        traces.push(FP.chart.plotlyTrace(3, {
          name: 'Your answer', x: [Math.min(c.r, 10)], y: [clampT(view.learner)], mode: 'markers',
          marker: { size: 12, symbol: 'diamond-open', line: { width: 3 } },
          hovertemplate: 'Your answer<br>T = ' + sig3(view.learner) + '<extra></extra>'
        }));
      }
    }
    const shapes = [
      { type: 'rect', xref: 'x', yref: 'paper', x0: 0, x1: R_ISO, y0: 0, y1: 1, line: { width: 0 },
        fillcolor: rgba(FP.tok('accent'), 0.12), layer: 'below' },
      { type: 'rect', xref: 'x', yref: 'paper', x0: R_ISO, x1: 10, y0: 0, y1: 1, line: { width: 0 },
        fillcolor: rgba(FP.tok('primary'), 0.06), layer: 'below' },
      { type: 'line', xref: 'x', yref: 'paper', x0: 1, x1: 1, y0: 0, y1: 1,
        line: { color: FP.tok('text'), width: 2, dash: 'dot' } },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 1, y1: 1,
        line: { color: FP.tok('text-muted'), width: 1, dash: 'dash' } }
    ];
    const ann = [
      { x: 0.7, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false,
        text: nar ? 'Amplification<br>r < 1.414' : 'Amplification (r < 1.414)', font: { size: 12, color: FP.tok('accent-text') } },
      { x: 5.7, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false,
        text: 'Isolation (r ≥ 1.414)', font: { size: 12, color: FP.tok('primary-dark') } },
      { x: 1, y: Math.log10(T_CAP), xref: 'x', yref: 'y', xanchor: 'left', yanchor: 'top', showarrow: false,
        text: ' Resonance (r = 1)', font: { size: 12, color: FP.tok('text') } },
      { x: 10, y: 0, xref: 'x', yref: 'y', xanchor: 'right', yanchor: 'bottom', showarrow: false,
        text: 'T = 1: rigid mount', font: { size: 12, color: FP.tok('text-muted') } }
    ];
    if (c && view.showCurve && view.learner != null) {
      ann.push({ x: Math.min(c.r, 10), y: Math.log10(clampT(view.learner)), xref: 'x', yref: 'y',
        ax: c.r > 7 ? -60 : 50, ay: -24, showarrow: true, arrowhead: 0, arrowcolor: FP.tok('text-muted'),
        text: 'Your answer ' + sig3(view.learner), font: { size: 12, color: FP.tok('text') }, bgcolor: 'rgba(255,255,255,0.85)' });
      ann.push({ x: Math.min(c.r, 10), y: Math.log10(clampT(c.T)), xref: 'x', yref: 'y',
        ax: c.r > 7 ? -60 : 50, ay: 26, showarrow: true, arrowhead: 0, arrowcolor: FP.tok('text-muted'),
        text: 'Model ' + sig3(c.T), font: { size: 12, color: FP.tok('text') }, bgcolor: 'rgba(255,255,255,0.85)' });
    }
    if (!view.showCurve) {
      ann.push({ x: 0.5, y: 0.45, xref: 'paper', yref: 'paper', showarrow: false,
        text: 'The curve appears after you check your answer.', font: { size: 13, color: FP.tok('text-muted') } });
    }
    const layout = FP.chart.plotlyLayout({
      margin: { l: 58, r: 12, t: nar ? 40 : 30, b: 46 },
      showlegend: view.showCurve && !nar,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: -0.2, yanchor: 'top' },
      xaxis: { title: 'Frequency ratio r = f / fₙ', range: [0, 10], tickformat: '', dtick: 1, fixedrange: true },
      yaxis: { title: 'Transmissibility T', type: 'log', range: [Math.log10(T_MIN), Math.log10(T_CAP) + 0.05],
        tickvals: [0.01, 0.03, 0.1, 0.3, 1, 3, 10], ticktext: ['0.01', '0.03', '0.1', '0.3', '1', '3', '10'], fixedrange: true },
      shapes: shapes,
      annotations: ann
    });
    if (view.showCurve && !nar) layout.margin.b = 72;
    Plotly.react($('plot'), traces, layout, FP.chart.merge(FP.chart.merge({}, FP.chart.plotlyConfig), { displayModeBar: false }));
  }

  // ---------- Readout ----------
  function readout(c, hidden) {
    const box = $('readout');
    box.innerHTML = '';
    function item(name, val) {
      const s = document.createElement('span');
      s.appendChild(document.createTextNode(name + ' '));
      const b = document.createElement('b');
      b.textContent = val;
      s.appendChild(b);
      box.appendChild(s);
    }
    if (!c || hidden) {
      ['f', 'fₙ', 'r', 'T', 'Isolation'].forEach(function (n) { item(n + ':', '?'); });
      return;
    }
    item('f:', sig3(c.fHz) + ' Hz');
    item('fₙ:', sig3(c.fnHz) + ' Hz');
    item('r:', sig3(c.r));
    item('T:', Math.abs(c.r - 1) < 0.05 ? sig3(c.T) + ' (plotted capped at 10)' : sig3(c.T));
    item('Isolation:', c.pct == null && Math.abs(c.r - 1) >= 0.05 ? 'none, amplified ×' + sig3(c.T) : (c.pct == null ? 'none' : sig3(c.pct) + '%'));
    const st = document.createElement('span');
    st.className = 'ite-status';
    st.textContent = Math.abs(c.r - 1) < 0.05 ? '▲ At or near resonance'
      : c.status === 'isolating' ? '▼ Isolation region' : '▲ Amplification region';
    box.appendChild(st);
  }

  // ---------- Inputs ----------
  function setInputs(rpm, d) {
    speedEl.value = String(rpm);
    $('speedVal').textContent = FP.fmt.num(rpm) + ' RPM';
    speedEl.setAttribute('aria-valuetext', FP.fmt.num(rpm) + ' RPM');
    const i = DEFLECTIONS.findIndex(function (o) { return o.d === d; });
    deflEl.value = String(i);
  }
  function setInputsEnabled(on) { speedEl.disabled = !on; deflEl.disabled = !on; }
  function explore() {
    if (!runner.state().explore) return;
    const rpm = Number(speedEl.value);
    const d = DEFLECTIONS[Number(deflEl.value)].d;
    setInputs(rpm, d);
    view = { calc: calc(rpm, d), learner: null, showCurve: true };
    readout(view.calc, false);
    draw();
  }
  speedEl.addEventListener('input', explore);
  deflEl.addEventListener('change', explore);

  // ---------- Challenge flow ----------
  function render() {
    const st = runner.state();
    $('score').textContent = st.scoreLabel;
    $('attempt').textContent = st.phase === 'question' ? st.attemptLabel : (st.explore ? FP.msg.EXPLORE : '');
    FP.ui.progress($('progress'), st.results, st.phase === 'done' ? -1 : st.index, 'Challenge');
    $('next').hidden = st.phase !== 'resolved';
    $('check').hidden = st.phase !== 'question';
    $('answer').disabled = st.phase !== 'question';
    $('answerRow').querySelectorAll('label, #answer').forEach(function (el) { el.hidden = st.phase === 'done'; });
    $('next').textContent = st.isLast ? 'Finish' : 'Next challenge';
  }

  function startChallenge() {
    const st = runner.state();
    const it = st.item;
    $('prompt').textContent = it.prompt;
    $('answer').value = '';
    setInputs(it.rpm, it.d);
    setInputsEnabled(false);
    view = { calc: it.calc, learner: null, showCurve: false };
    readout(it.calc, true);
    draw();
    FP.ui.feedback($('feedback'), 'info', 'Type T as a decimal (for example 0.5 or 2.4) and press Check. Within ±5% of the model counts as correct.', { announce: false });
    render();
  }

  function onCheck() {
    const st = runner.state();
    if (st.phase !== 'question') return;
    const raw = $('answer').value;
    const res = runner.submit(raw);
    if (res.status === 'ignored') return;
    FP.ui.feedback($('feedback'), res.kind, res.message);
    if (res.status === 'invalid') { $('answer').focus(); render(); return; }
    if (res.status === 'retry') { $('answer').select(); render(); return; }
    view = { calc: st.item.calc, learner: res.value, showCurve: true };
    readout(st.item.calc, false);
    draw();
    render();
    $('next').focus();
  }

  function showSummary(summary) {
    const box = $('summary');
    box.innerHTML = '';
    summary.lines.forEach(function (line) {
      const p = document.createElement('div');
      p.textContent = line;
      box.appendChild(p);
    });
    const p = document.createElement('div');
    p.textContent = 'Explore mode: try 420 RPM with 0.2 in (resonance), and any pad setting below about 1,060 RPM (amplification).';
    box.appendChild(p);
    FP.announce(summary.lines.join(' '));
  }

  function unlockExplore() {
    setInputsEnabled(true);
    $('prompt').textContent = FP.msg.EXPLORE + ': change the fan speed and the deflection. The point, readouts and region label update at once.';
    $('feedback').textContent = '';
    $('feedback').className = 'fp-feedback';
    explore();
    speedEl.focus();
  }

  function startOver() {
    runner.restart();
    $('summary').textContent = '';
    startChallenge();
    $('answer').focus();
  }

  $('check').addEventListener('click', onCheck);
  $('next').addEventListener('click', function () {
    if (!runner.next()) return;
    if (runner.state().phase === 'question') { startChallenge(); $('answer').focus(); }
    else render();
  });
  $('startOver').addEventListener('click', startOver);
  document.querySelector('main').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
    const phase = runner.state().phase;
    if (phase === 'question' && e.target.id === 'answer') { e.preventDefault(); onCheck(); }
    else if (phase === 'resolved') { e.preventDefault(); $('next').click(); }
  });
  let rt = null;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });

  startChallenge();
})();
