// Fan Curve Explorer - Plotly.js
// Two illustrative fans (Curve A, Curve B): pressure and BHP curves plus a six-question
// differentiation quiz (stall region vs. stable; overloading vs. non-overloading power).
// CANVAS_HEIGHT: 662
// Data are ILLUSTRATIVE, not Twin City Fan published ratings.

(function () {
  'use strict';

  var NARROW = (window.innerWidth || 800) < 600;
  var PLOT_HEIGHT = NARROW ? 390 : 430;
  var TICKS = NARROW ? [0, 4000, 8000, 12000, 16000] : [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000];

  // ---- Illustrative data (from the chapter specification) ----
  var CFM = [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000];
  var CURVES = {
    A: {
      name: 'Curve A (Illustrative)',
      color: '#1f5fa8',
      fsp: [4.6, 4.8, 4.9, 4.8, 4.5, 4.0, 3.2, 2.0, 0.4],
      bhp: [4.0, 5.0, 6.0, 7.0, 8.1, 9.0, 9.5, 9.4, 8.8],
      stallBelow: 4000
    },
    B: {
      name: 'Curve B (Illustrative)',
      color: '#c25a00',
      fsp: [2.2, 2.0, 1.9, 2.0, 2.05, 1.8, 1.5, 1.0, 0.4],
      bhp: [1.6, 2.0, 2.5, 3.1, 3.8, 4.5, 5.2, 5.8, 6.3],
      stallBelow: 8000
    }
  };

  // Straight-line interpolation between listed points
  function interp(xs, ys, x) {
    for (var i = 0; i < xs.length - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
        return ys[i] + t * (ys[i + 1] - ys[i]);
      }
    }
    return ys[ys.length - 1];
  }

  function fmt(v) {
    // up to two decimals, trailing zeros trimmed (2.05, 4.9, 4.0 -> "4.0")
    var s = (Math.round(v * 100) / 100).toFixed(2);
    s = s.replace(/0$/, '');
    return s;
  }

  function commas(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ---- Questions (fixed order) ----
  var QUESTIONS = [
    {
      text: 'Is 3,000 CFM on Curve A in the stall region?',
      choices: ['Yes', 'No'], answer: 'Yes',
      why: "Curve A's pressure peaks at 4,000 CFM; 3,000 CFM is to the left of the peak.",
      mark: { type: 'point', curve: 'A', cfm: 3000 }
    },
    {
      text: 'Is 9,000 CFM on Curve A in the stall region?',
      choices: ['Yes', 'No'], answer: 'No',
      why: "9,000 CFM is to the right of Curve A's 4,000 CFM peak, where pressure falls steadily as airflow rises.",
      mark: { type: 'point', curve: 'A', cfm: 9000 }
    },
    {
      text: 'Is 6,000 CFM on Curve B in the stall region?',
      choices: ['Yes', 'No'], answer: 'Yes',
      why: "Curve B's right-hand pressure peak is at 8,000 CFM; 6,000 CFM is to its left, in the unstable dip region.",
      mark: { type: 'point', curve: 'B', cfm: 6000 }
    },
    {
      text: 'Is 11,000 CFM on Curve B in the stall region?',
      choices: ['Yes', 'No'], answer: 'No',
      why: "11,000 CFM is to the right of Curve B's 8,000 CFM peak.",
      mark: { type: 'point', curve: 'B', cfm: 11000 }
    },
    {
      text: 'Which curve has a non-overloading power curve?',
      choices: ['Curve A', 'Curve B'], answer: 'Curve A',
      why: "Curve A's BHP peaks at 9.5 at 12,000 CFM and then falls; Curve B's BHP rises at every step to 16,000 CFM.",
      mark: { type: 'power' }
    },
    {
      text: 'What is the highest BHP anywhere on Curve A (the motor size that cannot be overloaded at this speed, before drive losses)?',
      numeric: true, answer: 9.5, tolerance: 0.1, unit: 'BHP',
      why: 'The BHP column of Curve A reaches its maximum, 9.5, at 12,000 CFM.',
      mark: { type: 'maxbhp' }
    }
  ];

  var PROMPT = 'Two fans, one speed each. Where is it safe to run them, and which one can overload its motor?';

  // ---- State ----
  var state;
  function resetState() {
    state = { index: 0, answered: false, results: [], marks: [], showStall: false };
  }

  // ---- Styles ----
  var css = [
    'body { background: aliceblue; }',
    '.fce { font-family: Arial, Helvetica, sans-serif; color: #1b2733; padding: 6px 10px 4px 10px; box-sizing: border-box; }',
    '.fce h1 { font-size: 19px; margin: 2px 0 2px 0; }',
    '.fce .prompt { font-size: 14px; margin: 0 0 2px 0; color: #34475a; }',
    '.fce .plot { width: 100%; height: ' + PLOT_HEIGHT + 'px; background: white; border: 1px solid #c9d6e3; border-radius: 4px; }',
    '.fce .quiz { margin-top: 6px; background: white; border: 1px solid #c9d6e3; border-radius: 4px; padding: 7px 10px; min-height: 124px; box-sizing: border-box; }',
    '.fce .qnum { font-size: 12px; color: #5b6b7b; margin-bottom: 2px; }',
    '.fce .qtext { font-size: 15px; font-weight: bold; margin-bottom: 6px; }',
    '.fce .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }',
    '.fce button { font-size: 14px; padding: 5px 14px; border: 1px solid #1f5fa8; border-radius: 4px; background: #e8f0fa; color: #133c6b; cursor: pointer; }',
    '.fce button:hover:not(:disabled) { background: #d2e2f5; }',
    '.fce button:disabled { opacity: 0.55; cursor: default; }',
    '.fce button.chosen { background: #1f5fa8; color: white; opacity: 1; }',
    '.fce button.next { border-color: #2d7a3a; background: #e6f4e8; color: #1d5426; }',
    '.fce input[type=number] { font-size: 14px; width: 90px; padding: 4px 6px; border: 1px solid #8aa0b5; border-radius: 4px; }',
    '.fce .feedback { font-size: 14px; margin-top: 6px; line-height: 1.35; }',
    '.fce .feedback.ok { color: #1d6b2a; }',
    '.fce .feedback.bad { color: #a3281b; }',
    '.fce .feedback.note { color: #5b6b7b; }',
    '.fce .score { font-size: 15px; font-weight: bold; margin: 2px 0 4px 0; }',
    '.fce .summary { font-size: 13px; color: #34475a; margin-bottom: 6px; line-height: 1.35; }'
  ].join('\n');

  // ---- Plot construction ----
  function hoverData(c) {
    return CFM.map(function (_, i) { return [fmt(c.fsp[i]), fmt(c.bhp[i])]; });
  }

  function baseTraces() {
    var traces = [];
    ['A', 'B'].forEach(function (key) {
      var c = CURVES[key];
      var tmpl = '<b>' + c.name + '</b><br>Airflow: %{x:,} CFM<br>' +
        'Fan static pressure: %{customdata[0]} in. wg<br>BHP: %{customdata[1]}<extra></extra>';
      traces.push({
        x: CFM, y: c.fsp, customdata: hoverData(c), type: 'scatter', mode: 'lines+markers',
        name: c.name, legendgroup: key, line: { color: c.color, width: 2.5 },
        marker: { size: 6, color: c.color }, xaxis: 'x', yaxis: 'y', hovertemplate: tmpl
      });
      traces.push({
        x: CFM, y: c.bhp, customdata: hoverData(c), type: 'scatter', mode: 'lines+markers',
        name: c.name + ' BHP', legendgroup: key, showlegend: false,
        line: { color: c.color, width: 2.5, dash: 'dot' },
        marker: { size: 6, color: c.color, symbol: 'square' }, xaxis: 'x2', yaxis: 'y2', hovertemplate: tmpl
      });
    });
    return traces;
  }

  function stallTraces() {
    var traces = [];
    ['A', 'B'].forEach(function (key) {
      var c = CURVES[key];
      var xs = [], ys = [];
      for (var i = 0; i < CFM.length; i++) {
        if (CFM[i] <= c.stallBelow) { xs.push(CFM[i]); ys.push(c.fsp[i]); }
      }
      traces.push({
        x: xs, y: ys, type: 'scatter', mode: 'lines', hoverinfo: 'skip',
        name: key + ' stall region', showlegend: false,
        line: { color: c.color, width: 14 }, opacity: 0.22, xaxis: 'x', yaxis: 'y'
      });
    });
    return traces;
  }

  function markTraces() {
    var traces = [];
    state.marks.forEach(function (m) {
      if (m.type === 'point') {
        var c = CURVES[m.curve];
        var y = interp(CFM, c.fsp, m.cfm);
        traces.push({
          x: [m.cfm], y: [y], type: 'scatter', mode: 'markers+text', showlegend: false,
          text: ['Q' + m.q + ': ' + commas(m.cfm)], textposition: m.curve === 'A' ? 'top center' : 'bottom center',
          textfont: { size: 12, color: '#1b2733' },
          marker: { size: 13, color: 'rgba(255,255,255,0.9)', line: { color: m.correct ? '#1d8a2e' : '#c0392b', width: 3 } },
          hovertemplate: '<b>Q' + m.q + ': Curve ' + m.curve + ' at ' + commas(m.cfm) + ' CFM</b><br>' +
            'Fan static pressure: about ' + fmt(y) + ' in. wg<br>' +
            (m.cfm < c.stallBelow ? 'In the stall region' : 'Stable (right of the peak)') + '<extra></extra>',
          xaxis: 'x', yaxis: 'y'
        });
      } else if (m.type === 'maxbhp') {
        traces.push({
          x: [12000], y: [9.5], type: 'scatter', mode: 'markers', showlegend: false,
          marker: { size: 15, color: 'rgba(255,255,255,0.9)', line: { color: m.correct ? '#1d8a2e' : '#c0392b', width: 3 } },
          hovertemplate: '<b>Q6: Curve A maximum BHP</b><br>9.5 BHP at 12,000 CFM<extra></extra>',
          xaxis: 'x2', yaxis: 'y2'
        });
      }
    });
    return traces;
  }

  function annotations() {
    var ann = [
      { text: 'Illustrative data, standard air, one fixed speed per fan', xref: 'paper', yref: 'paper', x: 0, y: 1.0, xanchor: 'left', yanchor: 'bottom', showarrow: false, font: { size: 12, color: '#5b6b7b' } }
    ];
    var hasPower = state.marks.some(function (m) { return m.type === 'power'; });
    if (hasPower) {
      ann.push({ x: 12000, y: 9.5, xref: 'x2', yref: 'y2', text: 'A: peaks, then falls (non-overloading)', showarrow: true, arrowhead: 2, ax: -30, ay: 46, font: { size: 12, color: CURVES.A.color }, bgcolor: 'rgba(255,255,255,0.85)', xanchor: 'right' });
      ann.push({ x: 16000, y: 6.3, xref: 'x2', yref: 'y2', text: 'B: rises at every step (overloading)', showarrow: true, arrowhead: 2, ax: -24, ay: 40, font: { size: 12, color: CURVES.B.color }, bgcolor: 'rgba(255,255,255,0.85)', xanchor: 'right' });
    }
    if (state.showStall) {
      ann.push({ x: 2000, y: 4.8, xref: 'x', yref: 'y', text: 'A stall: below 4,000 CFM', showarrow: false, yshift: -22, font: { size: 12, color: CURVES.A.color }, bgcolor: 'rgba(255,255,255,0.85)' });
      ann.push({ x: 2400, y: 2.0, xref: 'x', yref: 'y', text: 'B stall: below 8,000 CFM', showarrow: false, yshift: -20, font: { size: 12, color: CURVES.B.color }, bgcolor: 'rgba(255,255,255,0.85)' });
    }
    return ann;
  }

  function shapes() {
    if (!state.showStall) return [];
    return ['A', 'B'].map(function (key) {
      var c = CURVES[key];
      return { type: 'line', xref: 'x', yref: 'y', x0: c.stallBelow, x1: c.stallBelow, y0: 0, y1: 6.2,
        line: { color: c.color, width: 1.5, dash: 'dash' } };
    });
  }

  function layout() {
    return {
      height: PLOT_HEIGHT,
      margin: { l: 58, r: 14, t: NARROW ? 44 : 26, b: 40 },
      paper_bgcolor: 'white', plot_bgcolor: 'white',
      hovermode: 'closest',
      showlegend: true,
      legend: { orientation: 'h', x: 1, xanchor: 'right', y: NARROW ? 1.07 : 1.0, yanchor: 'bottom', font: { size: 12 } },
      xaxis: { domain: [0, 1], anchor: 'y', range: [-300, 16500], tickvals: TICKS, showticklabels: false, gridcolor: '#e6edf4', zeroline: false },
      yaxis: { domain: [0.52, 1], range: [0, 6.2], dtick: 1, title: { text: 'FSP (in. wg)', font: { size: 12 }, standoff: 6 }, gridcolor: '#e6edf4', zeroline: false, fixedrange: true },
      xaxis2: { domain: [0, 1], anchor: 'y2', matches: 'x', range: [-300, 16500], tickvals: TICKS, tickformat: ',', title: { text: 'Airflow (CFM)', font: { size: 12 }, standoff: 4 }, gridcolor: '#e6edf4', zeroline: false },
      yaxis2: { domain: [0, 0.42], range: [0, 11], dtick: 2, title: { text: 'BHP', font: { size: 12 }, standoff: 6 }, gridcolor: '#e6edf4', zeroline: false, fixedrange: true },
      annotations: annotations(),
      shapes: shapes()
    };
  }

  var plotEl, quizEl;

  function drawPlot() {
    var traces = baseTraces();
    if (state.showStall) traces = stallTraces().concat(traces);
    traces = traces.concat(markTraces());
    Plotly.react(plotEl, traces, layout(), { displayModeBar: false, responsive: true });
  }

  // ---- Quiz rendering ----
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderQuiz(feedback) {
    quizEl.innerHTML = '';
    if (state.index >= QUESTIONS.length) { renderSummary(); return; }
    var q = QUESTIONS[state.index];
    quizEl.appendChild(el('div', 'qnum', 'Question ' + (state.index + 1) + ' of ' + QUESTIONS.length));
    quizEl.appendChild(el('div', 'qtext', q.text));
    var row = el('div', 'row');
    var chosen = state.results[state.index] ? state.results[state.index].given : null;

    if (q.numeric) {
      var input = el('input');
      input.type = 'number'; input.step = '0.1'; input.min = '0';
      input.placeholder = 'BHP';
      input.setAttribute('aria-label', 'Highest BHP on Curve A');
      if (state.answered) { input.value = chosen; input.disabled = true; }
      var unit = el('span', null, q.unit);
      var submit = el('button', null, 'Submit');
      submit.disabled = state.answered;
      var doSubmit = function () {
        if (state.answered) return;
        var v = parseFloat(input.value);
        if (isNaN(v)) { renderFeedbackOnly('Type a number of BHP, then press Submit.', 'note'); return; }
        answer(input.value, Math.abs(v - q.answer) <= q.tolerance + 1e-9);
      };
      submit.addEventListener('click', doSubmit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSubmit(); });
      row.appendChild(input); row.appendChild(unit); row.appendChild(submit);
    } else {
      q.choices.forEach(function (choice) {
        var b = el('button', chosen === choice ? 'chosen' : null, choice);
        b.disabled = state.answered;
        b.addEventListener('click', function () { answer(choice, choice === q.answer); });
        row.appendChild(b);
      });
    }

    if (state.answered) {
      var next = el('button', 'next', state.index === QUESTIONS.length - 1 ? 'See score' : 'Next question');
      next.addEventListener('click', function () {
        state.index += 1; state.answered = false;
        if (state.index >= QUESTIONS.length) { state.showStall = true; drawPlot(); }
        renderQuiz();
      });
      row.appendChild(next);
    }
    quizEl.appendChild(row);
    var fbEl = el('div', 'feedback');
    fbEl.id = 'fce-feedback';
    quizEl.appendChild(fbEl);
    if (feedback) { fbEl.textContent = feedback.text; fbEl.className = 'feedback ' + feedback.cls; }
  }

  function renderFeedbackOnly(text, cls) {
    var fb = document.getElementById('fce-feedback');
    if (fb) { fb.textContent = text; fb.className = 'feedback ' + cls; }
  }

  function answer(given, correct) {
    if (state.answered) return;
    var q = QUESTIONS[state.index];
    state.answered = true;
    state.results[state.index] = { given: given, correct: correct };
    var m = {}; for (var k in q.mark) m[k] = q.mark[k];
    m.q = state.index + 1; m.correct = correct;
    state.marks.push(m);
    drawPlot();
    var text, cls;
    if (correct) {
      text = 'Correct. ' + q.why; cls = 'ok';
    } else {
      var ans = q.numeric ? (q.answer + ' ' + q.unit) : q.answer;
      text = 'Not quite. The correct answer is ' + ans + '. ' + q.why; cls = 'bad';
    }
    renderQuiz({ text: text, cls: cls });
  }

  function renderSummary() {
    var n = state.results.filter(function (r) { return r && r.correct; }).length;
    var score = el('div', 'score', n + ' of 6 correct' + (n >= 5 ? ' — Mastery reached' : ''));
    quizEl.appendChild(score);
    var s = el('div', 'summary',
      'The shaded segments mark each stall region: Curve A below 4,000 CFM, Curve B below 8,000 CFM. ' +
      'Curve B’s stall region covers half its airflow range. The pressure peak is the edge of the stall region, ' +
      'not the best selection point; select well to the right of it.' +
      (n >= 5 ? '' : ' Mastery needs 5 of 6; review the stall region and power curve sections, then start over.'));
    quizEl.appendChild(s);
    var row = el('div', 'row');
    var again = el('button', null, 'Start over');
    again.addEventListener('click', function () { resetState(); drawPlot(); renderQuiz(); });
    row.appendChild(again);
    quizEl.appendChild(row);
  }

  // ---- Build page ----
  function init() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var main = document.querySelector('main');
    var wrap = el('div', 'fce');
    wrap.appendChild(el('h1', null, 'Fan Curve Explorer'));
    wrap.appendChild(el('p', 'prompt', PROMPT));
    plotEl = el('div', 'plot');
    wrap.appendChild(plotEl);
    quizEl = el('div', 'quiz');
    wrap.appendChild(quizEl);
    main.appendChild(wrap);

    resetState();
    drawPlot();
    renderQuiz();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
