// Fans in Parallel and Series Explorer - Plotly.js on the FanPedia MicroSim kit
// CANVAS_HEIGHT: 786
// Curve A (FP.curves, illustrative) combined two ways: two fans in parallel (airflows add at
// each pressure) and two in series (pressures add at each airflow), on a steep and a flat
// system curve. Three predictions, fixed order, one attempt each (FP.CardDeck), are committed
// before the combined curves are drawn; then Explore mode lets the learner switch system and
// configuration. Operating points follow the chapter 25 rule: 1 CFM search, only where each
// fan's own airflow is >= 4,000 CFM (right of the peak), rounded to 10 CFM and 0.01 in. wg.

(function () {
  'use strict';

  var C = FP.curves;
  var CH = FP.chart;
  var SIM_ID = 'ch25-parallel-series-explorer';
  var PEAK_Q = C.A.stallBelow;                          // 4,000 CFM per fan
  var Q_ZERO = 16500;                                    // Curve A extended to zero pressure

  // ---- Systems and configurations ----
  var SYSTEMS = {
    steep: { key: 'steep', name: 'Steep system', short: 'Steep', R: 4.0, k: C.kFromR(4.0),
      label: 'P = 4.0 × (Q ÷ 10,000)²' },
    flat: { key: 'flat', name: 'Flat system', short: 'Flat', R: 1.0, k: C.kFromR(1.0),
      label: 'P = 1.0 × (Q ÷ 10,000)²' }
  };
  var single = function (q) { return Math.max(0, C.pressureAt(C.A, q, { extrapolate: true })); };
  var par = C.parallel(C.A, 2), ser = C.series(C.A, 2);
  var CONFIGS = {
    one: { key: 'one', name: 'One fan', series: 0, n: 1, fn: single, perFan: function (q) { return q; } },
    parallel: { key: 'parallel', name: 'Two in parallel', series: 1, n: 2,
      fn: function (q) { return Math.max(0, par(q)); }, perFan: function (q) { return q / 2; } },
    series: { key: 'series', name: 'Two in series', series: 2, n: 1,
      fn: function (q) { return Math.max(0, ser(q)); }, perFan: function (q) { return q; } }
  };
  var CONFIG_ORDER = ['one', 'parallel', 'series'];

  // Operating point: search only where each fan's airflow is >= 4,000 CFM, then round.
  function opPoint(cfgKey, sysKey) {
    var cfg = CONFIGS[cfgKey];
    var qMin = PEAK_Q * (cfgKey === 'parallel' ? 2 : 1);
    var qMax = Q_ZERO * (cfgKey === 'parallel' ? 2 : 1);
    var op = C.operatingPoint(cfg.fn, SYSTEMS[sysKey].k, { qMin: qMin, qMax: qMax });
    return { q: Math.round(op.q / 10) * 10, p: Math.round(op.p * 100) / 100 };
  }
  var OPS = {};
  ['steep', 'flat'].forEach(function (s) {
    OPS[s] = {};
    CONFIG_ORDER.forEach(function (c) { OPS[s][c] = opPoint(c, s); });
  });
  function cfm(q) { return FP.fmt.cfm(q); }
  function opText(o) { return cfm(o.q) + ' at ' + FP.fmt.inwg(o.p); }

  // ---- Predictions (spec wording) ----
  var PREDICTIONS = [
    {
      id: 'p1', sys: 'steep', text: 'Steep system: add a second fan in parallel or in series. Which pair gives more airflow?',
      choices: ['Parallel', 'Series'], answer: 'Series',
      proof: 'Series ' + cfm(OPS.steep.series.q) + ' vs. parallel ' + cfm(OPS.steep.parallel.q) + ' on the steep system.',
      miss: 'On a steep system, more airflow costs much more pressure, so the pressure-adding series pair wins: 12,300 vs. 10,980 CFM.'
    },
    {
      id: 'p2', sys: 'flat', text: 'Flat system: which pair gives more airflow, parallel or series?',
      choices: ['Parallel', 'Series'], answer: 'Parallel',
      proof: 'Parallel ' + cfm(OPS.flat.parallel.q) + ' vs. series ' + cfm(OPS.flat.series.q) + ' on the flat system.',
      miss: 'On a flat system, little extra pressure is needed, so the airflow-adding parallel pair wins: 20,000 vs. 15,080 CFM.'
    },
    {
      id: 'p3', sys: 'steep', text: 'Steep system again: adding a second fan in parallel raises the airflow by about how much?',
      choices: ['About 10%', 'About 50%', 'About 100%'], answer: 'About 10%',
      proof: 'Parallel ' + cfm(OPS.steep.parallel.q) + ' vs. one fan ' + cfm(OPS.steep.one.q) + ', about ' +
        Math.round(100 * (OPS.steep.parallel.q / OPS.steep.one.q - 1)) + '% more air.',
      miss: 'Parallel fans double airflow only at the same pressure; on a steep system the operating point climbs the system curve, so the gain is about 10%.'
    }
  ];
  var LEAD = 'Add a second fan: in parallel or in series for more air?';
  var REVIEW = 'Reread "Fans in Parallel and in Series", then press Start over.';

  var deck = new FP.CardDeck({
    cards: PREDICTIONS, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'Predictions', mastery: PREDICTIONS.length, reviewPointer: REVIEW, id: SIM_ID,
    messages: {
      correct: function (res) { return FP.msg.OK + ' Correct. ' + res.card.proof; },
      missed: function (res) { return FP.msg.BAD + ' ' + res.card.miss; }
    }
  });

  var view = { sys: 'steep', cfg: 'one', chosen: null, message: null };
  var el = {};
  window.pse = { deck: deck, OPS: OPS, view: function () { return view; } };   // for testing

  function revealed() { return deck.state().phase === 'summary'; }
  function isNarrow() { return (el.plot.clientWidth || window.innerWidth || 800) < 600; }

  // ---- Plot ----
  function curveXY(fn, qEnd, step, from, to) {
    var xs = [], ys = [];
    for (var q = from; q <= Math.min(to, qEnd) + 1e-9; q += step) { xs.push(q); ys.push(fn(q)); }
    return { x: xs, y: ys };
  }

  function curveTraces(cfgKey, emphasis, narrow) {
    var cfg = CONFIGS[cfgKey];
    var s = CH.series(cfg.series);
    var qEnd = Q_ZERO * (cfgKey === 'parallel' ? 2 : 1);
    var stallEnd = PEAK_Q * (cfgKey === 'parallel' ? 2 : 1);
    var stable = curveXY(cfg.fn, qEnd, 100, stallEnd, 25000);
    var stall = curveXY(cfg.fn, qEnd, 100, 0, stallEnd);
    var w = emphasis ? 4 : 2.5;
    var hover = CH.hoverTemplate({ x: 'airflow', y: 'staticPressure', name: cfg.name + (cfgKey === 'one' ? ' (Curve A)' : '') });
    return [
      CH.plotlyTrace(cfg.series, { x: stable.x, y: stable.y, mode: 'lines',
        name: narrow ? { one: 'One fan', parallel: 'Parallel', series: 'Series' }[cfgKey] : cfg.name + (cfgKey === 'one' ? ' (Curve A)' : ''),
        legendgroup: cfgKey, line: { width: w }, hovertemplate: hover }),
      CH.plotlyTrace(cfg.series, { x: stall.x, y: stall.y, mode: 'lines', name: cfg.name + ' stall region', legendgroup: cfgKey,
        showlegend: false, line: { width: 1.5 }, opacity: 0.4,
        hovertemplate: CH.hoverTemplate({ x: 'airflow', y: 'staticPressure', name: cfg.name + ': stall region (each fan below 4,000 CFM)' }) })
    ];
  }

  function systemTrace(sysKey, faint, narrow) {
    var sys = SYSTEMS[sysKey];
    var xy = curveXY(function (q) { return C.systemPressure(sys.k, q); }, 25000, 250, 0, 25000);
    // Clip at the top of the plot so the hover stays on screen
    var xs = [], ys = [];
    xy.x.forEach(function (q, i) { if (xy.y[i] <= 11) { xs.push(q); ys.push(xy.y[i]); } });
    return CH.plotlyTrace(4, { x: xs, y: ys, mode: 'lines', name: sys.name + (faint || narrow ? '' : ' (' + sys.label + ')'),
      line: { width: faint ? 1.5 : 2.5, dash: faint ? 'dot' : 'dashdot', color: faint ? FP.tok('text-muted') : FP.tok('text') },
      opacity: faint ? 0.6 : 1, showlegend: !faint,
      hovertemplate: CH.hoverTemplate({ x: 'airflow', y: 'staticPressure', name: sys.name }) });
  }

  function opTrace(cfgKey, sysKey, selected) {
    var o = OPS[sysKey][cfgKey];
    var s = CH.series(CONFIGS[cfgKey].series);
    return {
      x: [o.q], y: [o.p], type: 'scatter', mode: selected ? 'markers+text' : 'markers', showlegend: false, cliponaxis: false,
      text: selected ? [FP.fmt.num(o.q) + ' CFM'] : undefined, textposition: 'middle right',
      textfont: { size: 13, color: FP.tok('text') },
      marker: { size: selected ? 15 : 10, symbol: 'diamond', color: selected ? s.color : '#ffffff',
        line: { color: selected ? FP.tok('text') : s.color, width: 2 } },
      hovertemplate: '<b>Operating point: ' + CONFIGS[cfgKey].name + ', ' + SYSTEMS[sysKey].short.toLowerCase() + ' system</b><br>' +
        'Airflow: ' + cfm(o.q) + '<br>Static pressure: ' + FP.fmt.inwg(o.p) + '<extra></extra>'
    };
  }

  function layout(narrow) {
    var ann = [];
    if (revealed()) {
      ann.push({ x: 2000, y: 9.75, xref: 'x', yref: 'y', text: 'stall region (faded)', showarrow: true, arrowhead: 2,
        ax: narrow ? 40 : 60, ay: narrow ? 20 : 16, font: { size: 12, color: FP.tok('text') }, bgcolor: 'rgba(255,255,255,0.9)' });
    }
    ann.push({ x: 1500, y: 4.75, xref: 'x', yref: 'y', text: 'stall region', showarrow: true, arrowhead: 2,
      ax: narrow ? 30 : 50, ay: narrow ? 30 : 34, font: { size: 12, color: FP.tok('text') }, bgcolor: 'rgba(255,255,255,0.9)' });
    return CH.plotlyLayout({
      height: narrow ? 250 : 340,
      margin: { l: narrow ? 46 : 58, r: 12, t: narrow ? 50 : 36, b: 44 },
      legend: { y: 1.02, x: 0, xanchor: 'left', font: { size: narrow ? 11 : 12 } },
      xaxis: { title: 'airflow', range: [0, 24500], dtick: narrow ? 8000 : 4000, fixedrange: true },
      yaxis: { title: narrow ? 'SP (in. wg)' : 'staticPressure', range: [0, 10.5], dtick: 2, fixedrange: true },
      annotations: ann
    });
  }

  var lastNarrow = null;
  function drawPlot() {
    var narrow = isNarrow();
    lastNarrow = narrow;
    el.plot.classList.toggle('narrow', narrow);
    var traces = [];
    if (!revealed()) {
      // Prediction phase: the single fan and the system of the current prediction only
      traces = traces.concat(curveTraces('one', false, narrow), [systemTrace(view.sys, false, narrow), opTrace('one', view.sys, true)]);
    } else {
      var other = view.sys === 'steep' ? 'flat' : 'steep';
      traces.push(systemTrace(other, true, narrow));
      CONFIG_ORDER.forEach(function (c) { traces = traces.concat(curveTraces(c, c === view.cfg, narrow)); });
      traces.push(systemTrace(view.sys, false, narrow));
      CONFIG_ORDER.forEach(function (c) { if (c !== view.cfg) traces.push(opTrace(c, view.sys, false)); });
      traces.push(opTrace(view.cfg, view.sys, true));
    }
    Plotly.react(el.plot, traces, layout(narrow), CH.merge(CH.merge({}, CH.plotlyConfig), { displayModeBar: false }));
  }

  // ---- Controls ----
  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function button(label, cls, onClick) {
    var b = make('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function render() {
    var s = deck.state();
    el.score.textContent = s.scoreLabel;
    FP.ui.progress(el.progress, s.results, s.phase === 'summary' ? -1 : s.index, 'Prediction');
    el.answers.innerHTML = '';
    el.readout.innerHTML = '';
    if (s.phase === 'summary') { renderExplore(); return; }

    var q = s.card;
    var answered = s.phase === 'feedback';
    el.qnum.textContent = 'Prediction ' + (s.index + 1) + ' of ' + s.count;
    el.prompt.textContent = q.text;
    q.choices.forEach(function (choice, i) {
      var mine = answered && view.chosen === choice;
      var b = button(choice + (mine ? ' (your prediction)' : ''), 'choice' + (mine ? ' pse-chosen' : ''), function () { choose(choice); });
      b.disabled = answered;
      b.setAttribute('aria-keyshortcuts', String(i + 1));
      el.answers.appendChild(b);
    });
    if (answered) {
      var next = button(s.isLast ? 'Reveal the curves' : 'Next prediction', null, advance);
      next.id = 'pse-next';
      el.answers.appendChild(next);
    }
    el.answers.appendChild(button(FP.msg.START_OVER, 'secondary', restart));
    if (view.message) FP.ui.feedback(el.feedback, view.message.kind, view.message.text, { announce: false });
    else el.feedback.textContent = '';
    el.keys.textContent = 'Keyboard: ' + q.choices.map(function (c, i) { return (i + 1) + ' = ' + c; }).join(', ') +
      '; Enter goes to the next prediction. ' + FP.msg.exploreLocked('prediction 3');
  }

  function toggleGroup(label, items, current, onPick) {
    var row = make('div', 'fp-row');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    row.appendChild(make('span', 'pse-group', label + ':'));
    items.forEach(function (it) {
      var b = button(it.label, 'choice', function () { onPick(it.key); });
      b.setAttribute('aria-pressed', it.key === current ? 'true' : 'false');
      if (it.keys) b.setAttribute('aria-keyshortcuts', it.keys);
      b.dataset.key = it.key;
      row.appendChild(b);
    });
    return row;
  }

  function renderExplore() {
    var sum = deck.summary();
    el.qnum.textContent = isNarrow() ? '' : FP.msg.EXPLORE;
    el.prompt.textContent = 'Switch system and configuration: the winner depends on the system curve, not on the fans.';
    el.answers.appendChild(toggleGroup('System', [
      { key: 'steep', label: 'Steep', keys: 's' }, { key: 'flat', label: 'Flat', keys: 'f' }
    ], view.sys, setSystem));
    el.answers.appendChild(toggleGroup('Configuration', [
      { key: 'one', label: 'One fan', keys: 'o' }, { key: 'parallel', label: 'Parallel', keys: 'p' },
      { key: 'series', label: 'Series', keys: 'r' }
    ], view.cfg, setConfig));
    el.answers.appendChild(button(FP.msg.START_OVER, 'secondary', restart));
    var lines = sum.lines.slice();
    if (sum.misses.length && !isNarrow()) {   // the progress chips show the misses on a narrow page
      lines.push('Missed: ' + sum.misses.map(function (m) {
        return 'prediction ' + (PREDICTIONS.indexOf(m.card) + 1) + ' (' + m.answer + ')';
      }).join(', ') + '.');
    }
    FP.ui.feedback(el.feedback, 'final', lines.join(' '), { announce: false });
    renderReadout();
    el.keys.textContent = isNarrow() ? 'Keys: S/F system; O/P/R configuration.'
      : 'Keyboard: S = steep, F = flat; O = one fan, P = parallel, R = series. Hover a curve or point for values.';
  }

  function renderReadout() {
    el.readout.innerHTML = '';
    var o = OPS[view.sys][view.cfg];
    var one = OPS[view.sys].one;
    var gain = view.cfg === 'one' ? '' : ' (' + (o.q >= one.q ? '+' : '') + Math.round(100 * (o.q / one.q - 1)) + '% airflow vs. one fan)';
    var line = make('p', 'pse-readout', CONFIGS[view.cfg].name + ', ' + SYSTEMS[view.sys].short.toLowerCase() + ' system: ' + opText(o) + gain);
    line.id = 'pse-op';
    var narrow = isNarrow();
    if (narrow) line.className = 'sr-only';   // the ▸ cell carries it on a narrow page; still announced and read
    el.readout.appendChild(line);
    var t = make('table', 'pse-table');
    t.setAttribute('aria-label', 'Operating points for each system and configuration');
    if (narrow) t.appendChild(make('caption', 'pse-caption', 'Operating points (CFM / in. wg)'));
    var head = make('tr');
    head.appendChild(make('th', null, 'System'));
    CONFIG_ORDER.forEach(function (c) { head.appendChild(make('th', null, narrow ? { one: 'One', parallel: 'Parallel', series: 'Series' }[c] : CONFIGS[c].name)); });
    t.appendChild(head);
    ['steep', 'flat'].forEach(function (s) {
      var tr = make('tr');
      tr.appendChild(make('th', null, SYSTEMS[s].short));
      CONFIG_ORDER.forEach(function (c) {
        var p = OPS[s][c];
        var td = make('td', s === view.sys && c === view.cfg ? 'pse-cur' : null,
          narrow ? FP.fmt.num(p.q) + ' / ' + FP.fmt.num(p.p, 2) : opText(p));
        if (s === view.sys && c === view.cfg) { td.setAttribute('aria-current', 'true'); td.textContent = '▸ ' + td.textContent; }
        tr.appendChild(td);
      });
      t.appendChild(tr);
    });
    el.readout.appendChild(t);
  }

  // ---- Actions ----
  function choose(choice) {
    if (deck.state().phase !== 'choose') return;
    var res = deck.place(choice);
    if (res.status === 'ignored') return;
    view.chosen = choice;
    view.message = { kind: res.kind, text: res.message };
    render();
    FP.announce('Your prediction: ' + choice + '. ' + res.message);
    var next = document.getElementById('pse-next');
    if (next) next.focus();
  }

  function advance() {
    if (deck.state().phase !== 'feedback') return;
    view.chosen = null; view.message = null;
    deck.next();
    var s = deck.state();
    if (s.phase === 'summary') {
      view.sys = 'steep'; view.cfg = 'parallel';
      drawPlot(); render();
      var sum = deck.summary();
      FP.announce('All combined curves revealed. ' + sum.lines.join(' ') + ' ' + document.getElementById('pse-op').textContent + '.');
      focusPressed(el.answers);
    } else {
      view.sys = s.card.sys;
      drawPlot(); render();
      FP.announce('Prediction ' + (s.index + 1) + ' of ' + s.count + '. ' + (s.card.sys === 'flat' ? 'The plot now shows the flat system. ' : 'The plot shows the steep system. ') + s.card.text);
      focusFirst();
    }
  }

  function setSystem(key) {
    if (!revealed()) return;
    view.sys = key;
    update(el.answers);
  }
  function setConfig(key) {
    if (!revealed()) return;
    view.cfg = key;
    update(el.answers);
  }
  function update(group) {
    drawPlot();
    render();
    FP.announce(document.getElementById('pse-op').textContent + '.');
    focusPressed(group);
  }
  function focusPressed(group) {
    var b = group.querySelector('button[aria-pressed="true"]');
    if (b) b.focus();
  }

  function restart() {
    deck.newRound();
    view = { sys: 'steep', cfg: 'one', chosen: null, message: null };
    drawPlot();
    render();
    FP.announce('Started over. Prediction 1 of ' + PREDICTIONS.length + '. ' + PREDICTIONS[0].text);
    focusFirst();
  }

  function focusFirst() {
    if (deck.state().phase !== 'choose') return;
    var f = el.answers.querySelector('button');
    if (f) f.focus();
  }

  // Number keys choose; Enter goes on; S/F and O/P/R switch in Explore mode.
  // Native Enter/Space on a focused button is left alone.
  function onKey(e) {
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    var s = deck.state();
    var k = e.key.toLowerCase();
    if (s.phase === 'choose' && /^[1-9]$/.test(k) && Number(k) <= s.card.choices.length) {
      e.preventDefault(); choose(s.card.choices[Number(k) - 1]);
    } else if (k === 'enter' && s.phase === 'feedback') {
      e.preventDefault(); advance();
    } else if (s.phase === 'summary') {
      var map = { s: [setSystem, 'steep'], f: [setSystem, 'flat'], o: [setConfig, 'one'], p: [setConfig, 'parallel'], r: [setConfig, 'series'] };
      if (map[k]) { e.preventDefault(); map[k][0](map[k][1]); }
    }
  }

  function setNote() {
    el.dataNote.textContent = FP.msg.note('Illustrative data', 'Curve A, Chapter 10', isNarrow() ? '' : 'standard air, 1,380 RPM per fan');
  }

  // ---- Build page ----
  function init() {
    ['lead', 'plot', 'dataNote', 'score', 'qnum', 'progress', 'prompt', 'answers', 'feedback', 'readout', 'keys'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
    el.lead.textContent = LEAD;
    setNote();
    document.addEventListener('keydown', onKey);
    var timer = null;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { if (isNarrow() !== lastNarrow) { drawPlot(); render(); setNote(); } }, 120);
    });
    drawPlot();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
