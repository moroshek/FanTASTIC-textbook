// Damper Throttling Operating Point Explorer - Plotly.js on the FanPedia MicroSim kit
// CANVAS_HEIGHT: 906
// Predict-then-reveal: the learner closes an outlet damper in five fixed steps and, before each
// new system curve is drawn, predicts whether airflow and static pressure go up, down or stay the
// same. FP.CardDeck runs the five predictions (fixed order, one scored attempt each, mastery 5 of 5).
// Fan curve P = 6.0 - (Q/10,000)^2 and system curve P = 5.0 m (Q/10,000)^2 are ILLUSTRATIVE
// (chapter 19 spec Rules), not Twin City Fan published ratings.

(function () {
  'use strict';

  var CH = FP.chart;
  var CV = FP.curves;
  var ID = 'ch19-damper-throttling-explorer';
  var NOTE = 'Values are illustrative. Real fan curves are read from the catalog.';
  var PROMPT = 'If you close the damper one step, where will the fan operate?';
  var REVIEW = 'Review the section "Damper Throttling", then press Start over.';
  var END_NOTE = 'From wide open to Step 5, m rose 6 times but airflow fell by 56%, not by 6 times.';
  var Q_MAX = 16000;

  // ---- Model (spec Rules) ----
  function fanP(q) { var r = q / 10000; return 6.0 - r * r; }
  function kFor(m) { return 5.0 * m / 1e8; }            // P_sys = k Q^2 with Q in CFM
  function round(x, d) { var f = Math.pow(10, d); return Math.floor(x * f + 0.5 + 1e-9) / f; }  // halves up
  function opFor(m) {
    var s = 6.0 / (1 + 5.0 * m);                         // (Q/10,000)^2 at the intersection
    return { q: round(10000 * Math.sqrt(s), 0), p: round(6.0 - s, 2) };
  }

  var SETTINGS = [
    { label: 'Wide open', m: 1.0 }, { label: 'Step 1', m: 1.5 }, { label: 'Step 2', m: 2.0 },
    { label: 'Step 3', m: 3.0 }, { label: 'Step 4', m: 4.0 }, { label: 'Step 5', m: 6.0 }
  ].map(function (s) { var op = opFor(s.m); s.q = op.q; s.p = op.p; return s; });

  function mText(m) { return FP.fmt.num(m, 1); }
  function opText(s) { return FP.fmt.num(s.q) + ' CFM at ' + FP.fmt.num(s.p, 2) + ' in. wg'; }

  // ---- Engine: one card per closing step; the correct pair is always airflow lower, pressure higher ----
  var CARDS = SETTINGS.slice(1).map(function (s, i) {
    return { id: 'step' + (i + 1), step: i + 1, setting: s, answer: { q: 'lower', p: 'higher' },
      answerText: 'airflow lower, static pressure higher' };
  });
  var MSG_OK = 'Correct: closing the damper steepens the system curve, so the fan slides left and up its own curve to ';
  var MSG_P = 'The fan curve did not move. A steeper system curve meets the same fan curve at lower airflow, where this fan makes more pressure, not less.';
  var MSG_Q = 'More resistance always means less airflow at the new intersection.';

  var deck = new FP.CardDeck({
    cards: CARDS, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'Predictions', mastery: CARDS.length, reviewPointer: REVIEW, id: ID,
    check: function (card, c) { return c.q === 'lower' && c.p === 'higher'; },
    messages: {
      correct: function (res) {
        var s = res.card.setting;
        return FP.msg.OK + ' ' + MSG_OK + FP.fmt.num(s.q) + ' CFM at ' + FP.fmt.num(s.p, 2) + ' in. wg.';
      },
      missed: function (res) {
        var parts = [];
        if (res.chosen.q !== 'lower') parts.push(MSG_Q);
        if (res.chosen.p !== 'higher') parts.push(MSG_P);
        return FP.msg.BAD + ' ' + parts.join(' ') + ' New operating point: ' + opText(res.card.setting) + '.';
      }
    }
  });

  // ---- View state ----
  // phase: 'ready' (current setting shown, Close enabled) | 'predict' (choose, then Check)
  //        | 'revealed' (feedback shown) | 'free' (after Step 5 and Reset: step freely, unscored)
  var view;
  function freshView() {
    return { phase: 'ready', shown: 0, prev: null, pick: { q: null, p: null }, message: null, summary: null };
  }
  view = freshView();
  var el = {};
  var OPTS = [['higher', 'Higher'], ['lower', 'Lower'], ['same', 'Same']];

  function isNarrow() { return (el.drawing.clientWidth || window.innerWidth || 800) < 560; }
  function isStacked() { return (el.drawing.clientWidth || window.innerWidth || 800) < 600; }

  // ---- Plot ----
  function curveXs() { var xs = []; for (var q = 0; q <= Q_MAX; q += 200) xs.push(q); return xs; }

  function plotTraces() {
    var xs = curveXs();
    var cur = SETTINGS[view.shown];
    var traces = [CH.plotlyTrace(0, {
      x: xs, y: xs.map(fanP), mode: 'lines', name: 'Fan curve',
      hovertemplate: '<b>Fan curve</b><br>Airflow: %{x:,.0f} CFM<br>Static pressure: %{y:.2f} in. wg<extra></extra>'
    })];
    if (view.prev != null) {
      var pv = SETTINGS[view.prev];
      traces.push({
        x: xs, y: CV.systemPoints(kFor(pv.m), xs).map(function (pt) { return pt.p; }),
        type: 'scatter', mode: 'lines', name: 'Previous, m = ' + mText(pv.m),
        line: { color: FP.tok('text-muted'), width: 1.5, dash: 'dot' }, opacity: 0.8,
        hovertemplate: '<b>Previous system curve, m = ' + mText(pv.m) + '</b><br>Airflow: %{x:,.0f} CFM<br>Static pressure: %{y:.2f} in. wg<extra></extra>'
      });
    }
    traces.push(CH.plotlyTrace(1, {
      x: xs, y: xs.map(function (q) { return CV.systemPressure(kFor(cur.m), q); }), mode: 'lines',
      name: 'System curve, m = ' + mText(cur.m),
      hovertemplate: '<b>System curve, m = ' + mText(cur.m) + '</b><br>Airflow: %{x:,.0f} CFM<br>Static pressure: %{y:.2f} in. wg<extra></extra>'
    }));
    if (view.prev != null) {
      var p = SETTINGS[view.prev];
      traces.push({
        x: [p.q], y: [p.p], type: 'scatter', mode: 'markers', name: 'Previous operating point', showlegend: false,
        marker: { size: 11, symbol: 'circle-open', color: FP.tok('text-muted'), line: { width: 2, color: FP.tok('text-muted') } },
        hovertemplate: '<b>Previous operating point (' + p.label + ')</b><br>' + opText(p) + '<extra></extra>'
      });
    }
    traces.push({
      x: [cur.q], y: [cur.p], type: 'scatter', mode: 'markers', name: 'Operating point', showlegend: false,
      marker: { size: 13, symbol: 'diamond', color: FP.tok('primary-dark'), line: { width: 2, color: '#ffffff' } },
      hovertemplate: '<b>Operating point (' + cur.label + ')</b><br>' + opText(cur) + '<extra></extra>'
    });
    return traces;
  }

  // Values go in a paper-anchored box at the lower right, the one region no curve crosses,
  // so the label never clips at any width. Marker glyphs match the plotted symbols.
  function annotations(narrow) {
    var cur = SETTINGS[view.shown];
    var lines = ['<b>\u25C6 Operating point: ' + opText(cur) + '</b>'];
    if (view.prev != null) lines.push('\u25CB Previous: ' + opText(SETTINGS[view.prev]));
    return [{
      xref: 'paper', yref: 'paper', align: 'left',
      // narrow plots: below the axis title, so the box never covers the curves
      x: narrow ? 0 : 0.99, y: narrow ? -0.3 : 0.03, xanchor: narrow ? 'left' : 'right', yanchor: narrow ? 'top' : 'bottom',
      showarrow: false, text: lines.join('<br>'), font: { size: 12, color: FP.tok('text') },
      bgcolor: 'rgba(255,255,255,0.94)', bordercolor: FP.tok('primary'), borderwidth: 1, borderpad: 4
    }];
  }

  function layout(narrow) {
    return CH.plotlyLayout({
      height: narrow ? 340 : 360,
      margin: { l: narrow ? 48 : 58, r: 12, t: narrow ? 66 : 14, b: narrow ? 102 : 44 },
      legend: narrow ? { y: 1.02, font: { size: 12 } }
        : { orientation: 'v', x: 0.99, xanchor: 'right', y: 0.99, yanchor: 'top', bgcolor: 'rgba(255,255,255,0.9)', font: { size: 12 } },
      xaxis: { range: [0, Q_MAX], dtick: (el.plot.clientWidth || 800) < 520 ? 4000 : 2000, title: 'airflow', fixedrange: true },
      yaxis: { range: [0, 7], dtick: 1, title: narrow ? 'SP (in. wg)' : 'staticPressure', fixedrange: true },
      annotations: annotations(narrow)
    });
  }

  function drawPlot() {
    var narrow = isNarrow();
    el.plot.classList.toggle('narrow', narrow);
    el.split.classList.toggle('stacked', isStacked());
    Plotly.react(el.plot, plotTraces(), layout(narrow),
      CH.merge(CH.merge({}, CH.plotlyConfig), { displayModeBar: false }));
  }

  // ---- Controls ----
  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function buildGroups() {
    [['q', el.flowGroup, 'Airflow', 1], ['p', el.pressGroup, 'Static pressure', 4]].forEach(function (g) {
      OPTS.forEach(function (o, i) {
        var b = make('button', 'choice dte-opt', o[1]);
        b.type = 'button';
        b.dataset.key = g[0]; b.dataset.value = o[0];
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', g[2] + ' ' + o[1].toLowerCase());
        b.setAttribute('aria-keyshortcuts', String(g[3] + i));
        b.addEventListener('click', function () { pick(g[0], o[0]); });
        g[1].appendChild(b);
      });
    });
  }

  function optButtons() { return Array.prototype.slice.call(document.querySelectorAll('.dte-opt')); }

  function render() {
    var s = deck.state();
    var had = document.activeElement;
    el.score.textContent = s.scoreLabel;
    var curIdx = view.phase === 'predict' ? s.index : -1;
    FP.ui.progress(el.progress, s.results, curIdx, 'Step');

    var free = view.phase === 'free';
    var done = s.phase === 'summary';
    if (free) el.stepLabel.textContent = 'Explore mode (not scored) · ' + SETTINGS[view.shown].label;
    else if (done) el.stepLabel.textContent = 'All 5 steps done';
    else el.stepLabel.textContent = 'Step ' + (s.index + 1) + ' of ' + CARDS.length +
      (view.phase === 'predict' ? ' · predict, then Check' : '');

    if (view.phase === 'predict') el.prompt.textContent = 'Closing to ' + s.card.setting.label + ': ' + PROMPT.replace('If you close the damper one step, w', 'W');
    else if (free) el.prompt.textContent = 'Explore: close the damper step by step, or press Reset to return to wide open. Nothing here is scored.';
    else if (done) el.prompt.textContent = 'Challenge complete. Press Reset to step through the settings freely.';
    else el.prompt.textContent = PROMPT;

    // Prediction buttons: usable only while predicting; after Check they keep showing the choice.
    optButtons().forEach(function (b) {
      var on = view.pick[b.dataset.key] === b.dataset.value;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = view.phase !== 'predict';
    });

    var canClose = (view.phase === 'ready') || (view.phase === 'revealed' && !done) ||
      (free && view.shown < SETTINGS.length - 1);
    el.close.disabled = !canClose;
    el.close.hidden = done && !free;
    el.check.disabled = !(view.phase === 'predict' && view.pick.q && view.pick.p);
    el.check.hidden = free || done;
    el.reset.hidden = !(done || free);
    el.reset.disabled = free && view.shown === 0;

    if (view.message) FP.ui.feedback(el.feedback, view.message.kind, view.message.text, { announce: false });
    else { el.feedback.className = 'fp-feedback'; el.feedback.textContent = ''; }
    if (view.summary) FP.ui.feedback(el.summary, 'final', view.summary, { announce: false });
    else { el.summary.className = 'fp-feedback'; el.summary.textContent = ''; }

    renderTable();
    el.keys.textContent = isNarrow()
      ? 'Keys: 1-3 airflow, 4-6 pressure (higher, lower, same); Enter closes or checks.'
      : 'Keyboard: 1 / 2 / 3 = airflow higher / lower / same; 4 / 5 / 6 = static pressure higher / lower / same; ' +
        'Enter closes the damper one step or checks your prediction.';
    keepFocus(had);
  }

  // When the focused button became disabled or hidden, move focus to the next usable action.
  function keepFocus(had) {
    if (!had || had === document.body || !(had.disabled || had.hidden)) return;
    var order = [el.close, el.check, el.reset, el.startOver];
    for (var i = 0; i < order.length; i++) {
      if (!order[i].disabled && !order[i].hidden) { order[i].focus(); return; }
    }
  }

  function renderTable() {
    el.tbody.innerHTML = '';
    var last = view.phase === 'free' ? view.shown : Math.max(view.shown, revealedMax);
    SETTINGS.forEach(function (st, i) {
      var tr = make('tr', i === view.shown ? 'dte-cur' : '');
      var known = i <= last;
      tr.appendChild(make('td', null, st.label));
      tr.appendChild(make('td', null, mText(st.m)));
      if (known) {
        tr.appendChild(make('td', null, FP.fmt.num(st.q)));
        tr.appendChild(make('td', null, FP.fmt.num(st.p, 2)));
      } else {
        tr.appendChild(make('td', 'dte-hidden', '?'));
        tr.appendChild(make('td', 'dte-hidden', '?'));
      }
      el.tbody.appendChild(tr);
    });
  }
  var revealedMax = 0;   // highest setting revealed in the scored challenge (free mode reveals all)

  // ---- Actions ----
  function pick(key, value) {
    if (view.phase !== 'predict') return;
    view.pick[key] = value;
    render();
    var both = view.pick.q && view.pick.p;
    FP.announce((key === 'q' ? 'Airflow ' : 'Static pressure ') + value + ' selected.' +
      (both ? ' Press Check.' : ''));
    if (both) el.check.focus();          // Enter now presses Check
    else if (key === 'q') { var b = el.pressGroup.querySelector('button'); if (b) b.focus(); }
  }

  function closeStep() {
    var s = deck.state();
    if (view.phase === 'free') {
      if (view.shown >= SETTINGS.length - 1) return;
      view.prev = view.shown; view.shown++;
      drawPlot(); render();
      FP.announce(SETTINGS[view.shown].label + ', m = ' + mText(SETTINGS[view.shown].m) + '. Operating point: ' + opText(SETTINGS[view.shown]) + '.');
      return;
    }
    if (view.phase === 'revealed') {
      if (s.phase === 'summary') return;
      deck.next();
    } else if (view.phase !== 'ready') return;
    view.phase = 'predict';
    view.pick = { q: null, p: null };
    view.message = null;
    render();
    FP.announce('Closing the damper to ' + deck.state().card.setting.label +
      '. Predict airflow and static pressure, then press Check.');
    var first = el.flowGroup.querySelector('button');
    if (first) first.focus();
  }

  function check() {
    if (view.phase !== 'predict' || !view.pick.q || !view.pick.p) {
      if (view.phase === 'predict') FP.ui.feedback(el.feedback, 'info', 'Choose a direction for airflow and for static pressure, then press Check.');
      return;
    }
    var res = deck.place({ q: view.pick.q, p: view.pick.p });
    if (res.status === 'ignored') return;
    view.prev = view.shown;
    view.shown = res.card.step;
    revealedMax = Math.max(revealedMax, view.shown);
    view.message = { kind: res.kind, text: res.message };
    view.phase = 'revealed';
    var spoken = res.message;
    if (deck.state().isLast) {
      deck.next();                                   // closes the round: summary, completed/mastery events
      var sum = deck.summary();
      view.summary = sum.lines[0].replace('First-attempt score', 'Predictions correct') + '. ' +
        sum.lines[1] + ' ' + END_NOTE;
      spoken += ' ' + view.summary;
    }
    drawPlot();
    render();
    FP.announce(spoken);
    (deck.state().phase === 'summary' ? el.reset : el.close).focus();
  }

  function reset() {
    if (deck.state().phase !== 'summary') return;
    view.phase = 'free'; view.shown = 0; view.prev = null; view.pick = { q: null, p: null }; view.message = null;
    revealedMax = SETTINGS.length - 1;
    drawPlot(); render();
    FP.announce('Explore mode, not scored. Wide open: operating point ' + opText(SETTINGS[0]) + '.');
    if (!el.close.disabled) el.close.focus();
  }

  function startOver() {
    deck.newRound();
    view = freshView();
    revealedMax = 0;
    drawPlot(); render();
    FP.announce('Started over. Wide open: ' + opText(SETTINGS[0]) + '. ' + PROMPT);
    el.close.focus();
  }

  function onKey(e) {
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var n = Number(e.key);
    if (n >= 1 && n <= 6 && view.phase === 'predict') {
      e.preventDefault();
      pick(n <= 3 ? 'q' : 'p', OPTS[(n - 1) % 3][0]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (view.phase === 'predict') check();
      else if (!el.close.disabled && !el.close.hidden) closeStep();
    }
  }

  function init() {
    ['lead', 'plot', 'dataNote', 'score', 'progress', 'stepLabel', 'prompt', 'flowGroup', 'pressGroup',
      'close', 'check', 'reset', 'startOver', 'feedback', 'summary', 'tbody', 'keys', 'drawing', 'sideNote'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
    el.split = document.querySelector('.dte-split');
    el.sideNote.textContent = '? = not revealed yet. The bold row is the setting on the chart.';
    el.lead.textContent = 'Close an outlet damper one step at a time. Before each new system curve is drawn, predict what happens to airflow and static pressure.';
    el.dataNote.textContent = NOTE;
    el.close.addEventListener('click', closeStep);
    el.check.addEventListener('click', check);
    el.reset.addEventListener('click', reset);
    el.startOver.addEventListener('click', startOver);
    el.reset.textContent = 'Reset';
    el.startOver.textContent = FP.msg.START_OVER;
    buildGroups();
    document.addEventListener('keydown', onKey);
    var tm = null;
    window.addEventListener('resize', function () {
      clearTimeout(tm);
      tm = setTimeout(function () { drawPlot(); render(); }, 120);
    });
    drawPlot();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
