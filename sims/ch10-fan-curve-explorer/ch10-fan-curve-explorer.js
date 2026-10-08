// Fan Curve Explorer - Plotly.js on the FanPedia MicroSim kit
// CANVAS_HEIGHT: 800
// Two illustrative fans (Curve A, Curve B) from FP.curves: pressure and BHP curves plus a
// six-question differentiation quiz (stall region vs. stable; overloading vs. non-overloading
// power) run by FP.CardDeck (fixed order, one attempt each). Data are ILLUSTRATIVE, not Twin
// City Fan published ratings.

(function () {
  'use strict';

  var C = FP.curves;
  var CH = FP.chart;
  var CURVES = { A: C.A, B: C.B };
  var SERIES = { A: CH.series(0), B: CH.series(1) };
  var MASTERY = 5;

  // ---- Questions (fixed order; spec wording) ----
  var QUESTIONS = [
    {
      id: 'q1', text: 'Is 3,000 CFM on Curve A in the stall region?',
      choices: ['Yes', 'No'], answer: 'Yes',
      why: "Curve A's pressure peaks at 4,000 CFM; 3,000 CFM is to the left of the peak.",
      mark: { type: 'point', curve: 'A', cfm: 3000 }
    },
    {
      id: 'q2', text: 'Is 9,000 CFM on Curve A in the stall region?',
      choices: ['Yes', 'No'], answer: 'No',
      why: "9,000 CFM is to the right of Curve A's 4,000 CFM peak, where pressure falls steadily as airflow rises.",
      mark: { type: 'point', curve: 'A', cfm: 9000 }
    },
    {
      id: 'q3', text: 'Is 6,000 CFM on Curve B in the stall region?',
      choices: ['Yes', 'No'], answer: 'Yes',
      why: "Curve B's right-hand pressure peak is at 8,000 CFM; 6,000 CFM is to its left, in the unstable dip region.",
      mark: { type: 'point', curve: 'B', cfm: 6000 }
    },
    {
      id: 'q4', text: 'Is 11,000 CFM on Curve B in the stall region?',
      choices: ['Yes', 'No'], answer: 'No',
      why: "11,000 CFM is to the right of Curve B's 8,000 CFM peak.",
      mark: { type: 'point', curve: 'B', cfm: 11000 }
    },
    {
      id: 'q5', text: 'Which curve has a non-overloading power curve?',
      choices: ['Curve A', 'Curve B'], answer: 'Curve A',
      why: "Curve A's BHP peaks at 9.5 at 12,000 CFM and then falls; Curve B's BHP rises at every step to 16,000 CFM.",
      mark: { type: 'power' }
    },
    {
      id: 'q6', text: 'What is the highest BHP anywhere on Curve A (the motor size that cannot be overloaded at this speed, before drive losses)?',
      numeric: true, answer: 9.5, tolerance: 0.1, answerText: FP.fmt.bhp(9.5),
      why: 'The BHP column of Curve A reaches its maximum, 9.5, at 12,000 CFM.',
      mark: { type: 'maxbhp' }
    }
  ];

  var PROMPT = 'Two fans, one speed each. Where is it safe to run them, and which one can overload its motor?';
  var REVIEW = 'Review the stall region and power curve sections, then start over.';
  var STALL_SUMMARY = 'The shaded segments mark each stall region: Curve A below 4,000 CFM, Curve B below 8,000 CFM. ' +
    'Curve B’s stall region covers half its airflow range. The pressure peak is the edge of the stall region, ' +
    'not the best selection point; select well to the right of it.';

  // ---- Engine: FP.CardDeck, fixed order, one scored attempt per question ----
  var deck = new FP.CardDeck({
    cards: QUESTIONS, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'Questions', mastery: MASTERY, reviewPointer: REVIEW, id: 'ch10-fan-curve-explorer',
    check: function (q, choice) {
      return q.numeric ? FP.check.numeric(FP.fmt.parseNumber(choice), q.answer, { abs: q.tolerance })
        : choice === q.answer;
    }
  });

  var view = { marks: [], showStall: false, chosen: null, message: null };
  var el = {};

  // "4.9", "2.05", "4.0": one decimal unless the value needs two
  function val(v) {
    return FP.fmt.num(v, Math.round(v * 100) % 10 === 0 ? 1 : 2);
  }
  function isNarrow() { return (el.plot.clientWidth || window.innerWidth || 800) < 600; }

  // ---- Plot construction ----
  function curveTraces() {
    var traces = [];
    ['A', 'B'].forEach(function (key, i) {
      var c = CURVES[key];
      var custom = c.q.map(function (_, j) { return [val(c.p[j]), val(c.bhp[j])]; });
      var tmpl = '<b>' + c.name + '</b><br>Airflow: %{x:,} CFM<br>' +
        'Fan static pressure: %{customdata[0]} in. wg<br>BHP: %{customdata[1]}<extra></extra>';
      traces.push(CH.plotlyTrace(i, {
        x: c.q, y: c.p, customdata: custom, name: c.name, legendgroup: key,
        xaxis: 'x', yaxis: 'y', hovertemplate: tmpl
      }));
      traces.push(CH.plotlyTrace(i, {
        x: c.q, y: c.bhp, customdata: custom, name: c.name + ' BHP', legendgroup: key, showlegend: false,
        xaxis: 'x2', yaxis: 'y2', hovertemplate: tmpl
      }));
    });
    return traces;
  }

  function stallTraces() {
    return ['A', 'B'].map(function (key) {
      var c = CURVES[key];
      var xs = [], ys = [];
      c.q.forEach(function (q, j) { if (q <= c.stallBelow) { xs.push(q); ys.push(c.p[j]); } });
      return {
        x: xs, y: ys, type: 'scatter', mode: 'lines', hoverinfo: 'skip', showlegend: false,
        name: key + ' stall region', line: { color: SERIES[key].color, width: 14 }, opacity: 0.22,
        xaxis: 'x', yaxis: 'y'
      };
    });
  }

  // Correct: ✓ in the label, round marker, solid green ring. Incorrect: ✗, square marker, red ring.
  function markStyle(m, size) {
    return {
      size: size, symbol: m.correct ? 'circle' : 'square', color: 'rgba(255,255,255,0.9)',
      line: { color: FP.tok(m.correct ? 'correct' : 'incorrect'), width: 3 }
    };
  }
  function glyph(m) { return m.correct ? FP.msg.OK : FP.msg.BAD; }

  function markTraces(narrow) {
    var traces = [];
    view.marks.forEach(function (m) {
      if (m.type === 'point') {
        var c = CURVES[m.curve];
        var y = C.pressureAt(c, m.cfm);
        traces.push({
          x: [m.cfm], y: [y], type: 'scatter', mode: 'markers+text', showlegend: false, cliponaxis: false,
          text: ['Q' + m.q + ' ' + glyph(m) + ' ' + FP.fmt.num(m.cfm)],
          textposition: m.curve === 'A' && !narrow ? 'top center' : 'bottom center',
          textfont: { size: 12, color: FP.tok('text') }, marker: markStyle(m, 13),
          hovertemplate: '<b>Q' + m.q + ': Curve ' + m.curve + ' at ' + FP.fmt.cfm(m.cfm) + '</b><br>' +
            'Fan static pressure: about ' + val(y) + ' in. wg<br>' +
            (C.isStall(c, m.cfm) ? 'In the stall region' : 'Stable (right of the peak)') + '<extra></extra>',
          xaxis: 'x', yaxis: 'y'
        });
      } else if (m.type === 'maxbhp') {
        traces.push({
          x: [12000], y: [C.bhpAt(C.A, 12000)], type: 'scatter', mode: 'markers+text', showlegend: false, cliponaxis: false,
          text: ['Q6 ' + glyph(m)], textposition: 'top center', textfont: { size: 12, color: FP.tok('text') },
          marker: markStyle(m, 15),
          hovertemplate: '<b>Q6: Curve A maximum BHP</b><br>' + FP.fmt.bhp(9.5) + ' at ' + FP.fmt.cfm(12000) + '<extra></extra>',
          xaxis: 'x2', yaxis: 'y2'
        });
      }
    });
    return traces;
  }

  function note(x, y, axes, text, key, extra) {
    return CH.merge({
      x: x, y: y, xref: axes[0], yref: axes[1], text: text, font: { size: 12, color: FP.tok('text') },
      bgcolor: 'rgba(255,255,255,0.9)', bordercolor: SERIES[key].color, borderwidth: 1, borderpad: 2
    }, extra || {});
  }

  function annotations(narrow) {
    var ann = [];
    var br = narrow ? '<br>' : ' ';
    var power = view.marks.filter(function (m) { return m.type === 'power'; })[0];
    if (power) {
      var g = glyph(power) + ' ';
      ann.push(note(12000, 9.5, ['x2', 'y2'], g + 'A: peaks, then falls' + br + '(non-overloading)', 'A',
        { showarrow: true, arrowhead: 2, ax: narrow ? -70 : -30, ay: narrow ? 34 : 46, xanchor: 'right', arrowcolor: SERIES.A.color }));
      ann.push(note(16000, 6.3, ['x2', 'y2'], 'B: rises at every step' + br + '(overloading)', 'B',
        { showarrow: true, arrowhead: 2, ax: narrow ? -6 : -24, ay: narrow ? 56 : 40, xanchor: 'right', arrowcolor: SERIES.B.color }));
    }
    if (view.showStall) {
      if (narrow) {   // short labels at the top of each dashed stall line
        ['A', 'B'].forEach(function (key) {
          ann.push(note(CURVES[key].stallBelow, 6.2, ['x', 'y'], '← ' + key + ' stall', key,
            { showarrow: false, xanchor: 'right', yanchor: 'top', xshift: -2 }));
        });
      } else {
        ann.push(note(2000, 4.8, ['x', 'y'], 'A stall: below 4,000 CFM', 'A', { showarrow: false, yshift: -24 }));
        ann.push(note(2400, 2.0, ['x', 'y'], 'B stall: below 8,000 CFM', 'B', { showarrow: false, yshift: -22 }));
      }
    }
    return ann;
  }

  function shapes() {
    if (!view.showStall) return [];
    return ['A', 'B'].map(function (key) {
      return { type: 'line', xref: 'x', yref: 'y', x0: CURVES[key].stallBelow, x1: CURVES[key].stallBelow, y0: 0, y1: 6.2,
        line: { color: SERIES[key].color, width: 1.5, dash: 'dash' } };
    });
  }

  function layout(narrow) {
    var ticks = narrow ? [0, 4000, 8000, 12000, 16000] : C.CFM.slice();
    return CH.plotlyLayout({
      height: narrow ? 320 : 410,
      margin: { l: narrow ? 50 : 58, r: 14, t: narrow ? 50 : 26, b: 40 },
      legend: { y: narrow ? 1.04 : 1.0 },
      xaxis: { domain: [0, 1], anchor: 'y', range: [-300, 16500], tickvals: ticks, showticklabels: false },
      yaxis: { domain: [0.52, 1], range: [0, 6.2], dtick: 1, title: narrow ? 'FSP (in. wg)' : 'staticPressure', fixedrange: true },
      xaxis2: { domain: [0, 1], anchor: 'y2', matches: 'x', range: [-300, 16500], tickvals: ticks, title: 'airflow' },
      yaxis2: { domain: [0, 0.42], range: [0, 11], dtick: 2, title: narrow ? 'BHP' : 'bhp', fixedrange: true },
      annotations: annotations(narrow),
      shapes: shapes()
    });
  }

  var lastNarrow = null;
  function drawPlot() {
    var narrow = isNarrow();
    lastNarrow = narrow;
    el.plot.classList.toggle('narrow', narrow);
    var traces = (view.showStall ? stallTraces() : []).concat(curveTraces(), markTraces(narrow));
    Plotly.react(el.plot, traces, layout(narrow), CH.merge(CH.merge({}, CH.plotlyConfig), { displayModeBar: false }));
  }

  // ---- Quiz rendering ----
  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function render() {
    var s = deck.state();
    el.score.textContent = s.scoreLabel;
    FP.ui.progress(el.progress, s.results, s.phase === 'summary' ? -1 : s.index, 'Question');
    el.answers.innerHTML = '';
    if (s.phase === 'summary') { renderSummary(); return; }

    var q = s.card;
    var answered = s.phase === 'feedback';
    el.qnum.textContent = 'Question ' + (s.index + 1) + ' of ' + s.count;
    el.prompt.textContent = q.text;

    if (q.numeric) {
      var input = make('input', 'fce-answer');
      input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.id = 'fce-answer';
      input.setAttribute('aria-label', 'Highest BHP on Curve A');
      var lab = make('label', null, 'Highest BHP');
      lab.htmlFor = 'fce-answer';
      var submit = make('button', null, 'Submit');
      submit.type = 'button';
      if (answered) { input.value = view.chosen; input.disabled = true; submit.disabled = true; }
      submit.addEventListener('click', function () { choose(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); choose(input.value); }
      });
      el.answers.appendChild(lab); el.answers.appendChild(input);
      el.answers.appendChild(make('span', null, 'BHP')); el.answers.appendChild(submit);
      el.keys.textContent = 'Keyboard: type the value, Enter submits; then Enter goes to the next item.';
    } else {
      q.choices.forEach(function (choice, i) {
        var mine = answered && view.chosen === choice;
        var b = make('button', 'choice' + (mine ? ' fce-chosen' : ''), choice + (mine ? ' (your answer)' : ''));
        b.type = 'button'; b.disabled = answered;
        b.setAttribute('aria-keyshortcuts', String(i + 1));
        b.addEventListener('click', function () { choose(choice); });
        el.answers.appendChild(b);
      });
      el.keys.textContent = 'Keyboard: 1 = ' + q.choices[0] + ', 2 = ' + q.choices[1] + '; Enter goes to the next item.';
    }

    if (answered) {
      var next = make('button', null, s.isLast ? 'See score' : 'Next question');
      next.type = 'button'; next.id = 'fce-next';
      next.addEventListener('click', advance);
      el.answers.appendChild(next);
    }
    el.answers.appendChild(startOverButton());
    if (view.message) FP.ui.feedback(el.feedback, view.message.kind, view.message.text, { announce: false });
    else el.feedback.textContent = '';
  }

  function startOverButton() {
    var b = make('button', 'secondary', FP.msg.START_OVER);
    b.type = 'button';
    b.addEventListener('click', restart);
    return b;
  }

  function renderSummary() {
    var sum = deck.summary();
    el.qnum.textContent = '';
    // Spec wording: "n of 6 correct", with "Mastery reached" at 5 or more.
    el.prompt.textContent = sum.firstAttempt + ' of ' + sum.total + ' correct';
    var lines = [sum.lines[1], STALL_SUMMARY];
    if (sum.misses.length) {
      lines.push('Missed: ' + sum.misses.map(function (m) {
        return 'Q' + (QUESTIONS.indexOf(m.card) + 1) + ' (' + m.answer + ')';
      }).join(FP.msg.SEP) + '.');
    }
    var start = startOverButton();
    el.answers.appendChild(start);
    el.keys.textContent = 'Keyboard: Enter starts over.';
    FP.ui.feedback(el.feedback, 'final', lines.join(' '), { announce: false });
    FP.announce(el.prompt.textContent + '. ' + lines.join(' '));
    start.focus();
  }

  // ---- Actions ----
  function choose(raw) {
    var q = deck.state().card;
    if (deck.state().phase !== 'choose') return;
    if (q.numeric && isNaN(FP.fmt.parseNumber(raw))) {
      FP.ui.feedback(el.feedback, 'info', FP.msg.ENTER_NUMBER + ' of BHP, then press Submit.');
      return;
    }
    var res = deck.place(q.numeric ? String(raw).trim() : raw);
    if (res.status === 'ignored') return;
    var correct = res.status === 'correct';
    view.chosen = res.chosen;
    // Spec feedback: "Correct." followed by the Why text; a miss shows the answer and the Why at once.
    view.message = { kind: res.kind, text: correct ? FP.msg.OK + ' Correct. ' + q.why : res.message };
    var m = CH.merge({}, q.mark);
    m.q = deck.state().index + 1; m.correct = correct;
    view.marks.push(m);
    drawPlot();
    render();
    FP.announce(view.message.text);
    var next = document.getElementById('fce-next');
    if (next) next.focus();
  }

  function advance() {
    if (deck.state().phase !== 'feedback') return;
    view.chosen = null; view.message = null;
    deck.next();
    if (deck.state().phase === 'summary') { view.showStall = true; drawPlot(); }
    render();
    focusFirst();
  }

  function restart() {
    deck.newRound();
    view = { marks: [], showStall: false, chosen: null, message: null };
    drawPlot();
    render();
    FP.announce('Started over. Question 1 of ' + QUESTIONS.length + '.');
    focusFirst();
  }

  function focusFirst() {
    if (deck.state().phase !== 'choose') return;
    var f = el.answers.querySelector('input, button');
    if (f) f.focus();
  }

  // Keys 1/2 choose; Enter goes on. Native Enter/Space on a focused button or input is left alone.
  function onKey(e) {
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    var s = deck.state();
    if ((e.key === '1' || e.key === '2') && s.phase === 'choose' && !s.card.numeric) {
      e.preventDefault();
      choose(s.card.choices[Number(e.key) - 1]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (s.phase === 'feedback') advance();
      else if (s.phase === 'summary') restart();
    }
  }

  // ---- Build page ----
  function init() {
    ['lead', 'plot', 'dataNote', 'score', 'qnum', 'progress', 'prompt', 'answers', 'feedback', 'keys'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
    el.lead.textContent = PROMPT;
    el.dataNote.textContent = C.ILLUSTRATIVE_NOTE;
    document.addEventListener('keydown', onKey);
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (isNarrow() !== lastNarrow) drawPlot(); }, 120);
    });
    drawPlot();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
