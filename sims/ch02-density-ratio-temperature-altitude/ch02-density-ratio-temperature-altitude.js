// Density Ratio by Temperature and Altitude - Plotly.js on the FanPedia MicroSim kit
// CANVAS_HEIGHT: 880
// Four density-ratio curves (0, 2,500, 5,000 and 7,500 ft) against airstream temperature,
// a movable temperature marker with a hover-style readout, and five calculation challenges
// run by FP.ChallengeRunner (fixed order, two attempts). During a challenge the marker and
// hover readouts are locked so the learner calculates instead of reading the chart; each
// resolved challenge marks its point on the correct curve.
// Model: FP.models.densityRatio with the chapter's barometric pressures (standard atmosphere).

(function () {
  'use strict';

  var M = FP.models;
  var CH = FP.chart;
  var SIM_ID = 'ch02-density-ratio-temperature-altitude';

  // Chapter "Barometric Pressure" table (standard atmosphere)
  var ELEVATIONS = [
    { ft: 0, pb: 29.92 },
    { ft: 2500, pb: 27.31 },
    { ft: 5000, pb: 24.89 },
    { ft: 7500, pb: 22.65 }
  ];
  var T_MIN = 0, T_MAX = 1000, T_STEP = 10;

  function ratio(tempF, e) { return M.densityRatio(tempF, 0, { baroInHg: e.pb }); }
  function elevName(e) { return FP.fmt.num(e.ft) + ' ft'; }
  function r3(x) { return FP.fmt.num(x, 3); }

  // ---- Challenges (fixed order; spec table). model = the kit value rounded as the spec prints it. ----
  var CHALLENGES = [
    { id: 'dr-300-0', label: 'challenge 1', q: 'Density ratio at 300°F, sea level?',
      model: M.round(ratio(300, ELEVATIONS[0]), 3), decimals: 3, unit: '', tolerance: { abs: 0.01 },
      mark: { t: 300, e: 0, pos: 'top right' },
      wrong: '530 ÷ (300 + 460) = 530 ÷ 760 = 0.697. Add 460 to °F before dividing.' },
    { id: 'dr-70-5000', label: 'challenge 2', q: 'Density ratio at 70°F, 5,000 ft?',
      model: M.round(ratio(70, ELEVATIONS[2]), 3), decimals: 3, unit: '', tolerance: { abs: 0.01 },
      mark: { t: 70, e: 2, pos: 'top right' },
      wrong: '24.89 ÷ 29.92 = 0.832; at 70°F the temperature factor is 1.000.' },
    { id: 'dr-300-5000', label: 'challenge 3', q: 'Density ratio at 300°F, 5,000 ft?',
      model: M.round(ratio(300, ELEVATIONS[2]), 3), decimals: 3, unit: '', tolerance: { abs: 0.01 },
      mark: { t: 300, e: 2, pos: 'bottom left' },
      wrong: 'Multiply the two factors: 0.832 × 0.697 = 0.580.' },
    { id: 'dr-600-0', label: 'challenge 4', q: 'Density ratio at 600°F, sea level?',
      model: M.round(ratio(600, ELEVATIONS[0]), 3), decimals: 3, unit: '', tolerance: { abs: 0.01 },
      mark: { t: 600, e: 0, pos: 'top right' },
      wrong: '530 ÷ (600 + 460) = 530 ÷ 1,060 = 0.500.' },
    { id: 'catalog-pressure', label: 'challenge 5',
      q: 'A system needs 3.00 in. wg at 300°F, sea level. What standard-air pressure do you select from the catalog (in. wg)?',
      model: M.round(M.catalogFromActual(3.00, ratio(300, ELEVATIONS[0])), 2), decimals: 2, unit: 'in. wg',
      tolerance: { abs: 0.05 }, mark: { t: 300, e: 0, pressure: true, pos: 'bottom right' },
      wrong: 'Divide by the density ratio when going from the job to the catalog: 3.00 ÷ 0.697 = 4.30 in. wg. ' +
        'Multiplying gives 2.09, which would under-select the fan.' }
  ];
  var ITEMS = CHALLENGES.map(function (c) {
    return Object.assign({}, c, {
      prompt: c.q, hint: c.wrong, why: c.wrong,
      answerText: FP.fmt.num(c.model, c.decimals) + (c.unit ? ' ' + c.unit : '')
    });
  });
  var MASTERY = 4;

  var runner = new FP.ChallengeRunner({
    items: ITEMS, attempts: 2, noun: 'Challenges', mastery: MASTERY, id: SIM_ID,
    reviewPointer: 'Review "Standard Air" and the 300°F worked example, then press Start over',
    // Spec: correct reads "Correct: <value>."; wrong attempts use the "Feedback when wrong" text.
    messages: { correct: function (res) { return FP.msg.correct(res.item.answerText); } }
  });

  var view = { started: false, marks: [], message: null };
  var el = {};

  function isNarrow() { return (el.plot.clientWidth || window.innerWidth || 800) < 560; }
  // Challenge open: the marker and hover readouts are locked (calculate, don't read).
  function locked() { var s = runner.state(); return view.started && !s.explore && s.phase === 'question'; }
  function temp() { return Number(el.temp.value); }
  function elevIndex() { return Number(el.elev.value); }

  // ---- Plot ----
  var TS = [];
  for (var t = T_MIN; t <= T_MAX; t += T_STEP) TS.push(t);

  function curveTraces(hover) {
    return ELEVATIONS.map(function (e, i) {
      var ys = TS.map(function (tt) { return ratio(tt, e); });
      return CH.plotlyTrace(i, {
        x: TS, y: ys, mode: 'lines', name: elevName(e) + ' (' + FP.fmt.num(e.pb, 2) + ' in. Hg)',
        line: { width: i === elevIndex() ? 3.5 : 2.2 },
        customdata: ys.map(function (y) { return [r3(y), FP.fmt.num(0.075 * y, 4)]; }),
        hoverinfo: hover ? undefined : 'skip',
        hovertemplate: '<b>' + elevName(e) + ', ' + FP.fmt.num(e.pb, 2) + ' in. Hg</b><br>' +
          'Temperature: %{x}°F<br>Density ratio: %{customdata[0]}<br>Density: %{customdata[1]} lb/ft³<extra></extra>'
      });
    });
  }

  function markerTrace() {
    var e = ELEVATIONS[elevIndex()];
    var y = ratio(temp(), e);
    return {
      x: [temp()], y: [y], type: 'scatter', mode: 'markers', showlegend: false, name: 'Marker',
      marker: { size: 14, symbol: 'diamond', color: FP.tok('accent'), line: { color: FP.tok('text'), width: 1.5 } },
      hovertemplate: '<b>Marker</b><br>' + elevName(e) + ', ' + FP.fmt.num(e.pb, 2) + ' in. Hg<br>' +
        temp() + '°F<br>Density ratio: ' + r3(y) + '<br>Density: ' + FP.fmt.num(0.075 * y, 4) + ' lb/ft³<extra></extra>'
    };
  }

  // Resolved challenges: ✓ circle with a green ring, ✗ square with a red ring (never colour alone).
  function markTraces(narrow) {
    return view.marks.map(function (m) {
      var e = ELEVATIONS[m.e];
      var y = ratio(m.t, e);
      var g = m.correct ? FP.msg.OK : FP.msg.BAD;
      // narrow plots keep only "C1 ✓" (the value is in the hover text) so labels do not collide
      var text = 'C' + m.n + ' ' + g + (narrow ? '' : ' ' + (m.pressure ? '4.30 in. wg' : r3(y)));
      return {
        x: [m.t], y: [y], type: 'scatter', mode: 'markers', showlegend: false, cliponaxis: false,
        marker: { size: 13, symbol: m.correct ? 'circle' : 'square', color: 'rgba(255,255,255,0.9)',
          line: { color: FP.tok(m.correct ? 'correct' : 'incorrect'), width: 3 } },
        hovertemplate: '<b>Challenge ' + m.n + '</b><br>' + elevName(e) + ', ' + m.t + '°F<br>Density ratio: ' + r3(y) +
          (m.pressure ? '<br>3.00 ÷ ' + r3(y) + ' = 4.30 in. wg catalog' : '') + '<extra></extra>',
        label: text
      };
    });
  }

  // Mark labels as annotations on a white box, so they stay legible where they cross a curve.
  var LABEL_POS = {
    'top right': { xanchor: 'left', yanchor: 'bottom', xshift: 7, yshift: 5 },
    'bottom right': { xanchor: 'left', yanchor: 'top', xshift: 7, yshift: -5 },
    'bottom left': { xanchor: 'right', yanchor: 'top', xshift: -7, yshift: -5 }
  };
  function markLabels(narrow) {
    return markTraces(narrow).map(function (tr, i) {
      return CH.merge({ x: tr.x[0], y: tr.y[0], xref: 'x', yref: 'y', text: tr.label, showarrow: false,
        font: { size: 12, color: FP.tok('text') }, bgcolor: 'rgba(255,255,255,0.88)', borderpad: 1 },
        LABEL_POS[view.marks[i].pos]);
    });
  }

  function layout(narrow, hover) {
    return CH.plotlyLayout({
      height: narrow ? 270 : 360,
      margin: { l: narrow ? 52 : 60, r: 14, t: narrow ? 56 : 34, b: 44 },
      hovermode: hover ? 'closest' : false,
      legend: { y: 1.02, font: { size: narrow ? 11 : 12 } },
      xaxis: { range: [-10, 1010], dtick: narrow ? 200 : 100, title: 'Airstream temperature (°F)', fixedrange: true },
      yaxis: { range: [0.3, 1.2], dtick: 0.1, tickformat: '.1f', title: narrow ? 'Density ratio' : 'Density ratio (ρ ÷ 0.075)', fixedrange: true },
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 1, y1: 1,
        line: { color: FP.tok('text-muted'), width: 1.5, dash: 'dot' } }],
      annotations: [{ xref: 'paper', x: 1, xanchor: 'right', yref: 'y', y: 1, yanchor: 'bottom', showarrow: false,
        text: 'standard air, 1.000', font: { size: 12, color: FP.tok('text') } }].concat(markLabels(narrow))
    });
  }

  var lastNarrow = null;
  function drawPlot() {
    var narrow = isNarrow();
    lastNarrow = narrow;
    el.plot.classList.toggle('narrow', narrow);
    var hover = !locked();
    // marker under the challenge marks, so a mark at the marker's point stays visible
    var traces = curveTraces(hover).concat(hover ? [markerTrace()] : [], markTraces(narrow));
    Plotly.react(el.plot, traces, layout(narrow, hover),
      CH.merge(CH.merge({}, CH.plotlyConfig), { displayModeBar: false }));
  }

  function updateReadout() {
    el.tempValue.textContent = temp() + '°F';
    if (locked()) {
      el.readout.textContent = 'The marker and hover readouts are locked while a challenge is open: calculate the value, then Check.';
      return;
    }
    var e = ELEVATIONS[elevIndex()];
    var y = ratio(temp(), e);
    el.readout.textContent = temp() + '°F at ' + elevName(e) + ' (' + FP.fmt.num(e.pb, 2) + ' in. Hg): density ratio ' +
      r3(y) + ', density ' + FP.fmt.num(0.075 * y, 4) + ' lb/ft³. Temperature factor ' + r3(M.temperatureFactor(temp())) +
      ' × barometric factor ' + r3(e.pb / M.STD_BARO_INHG) + '.';
  }

  // ---- Challenge panel ----
  function render() {
    var s = runner.state();
    var isLocked = locked();
    el.temp.disabled = isLocked;
    el.elev.disabled = isLocked;
    el.start.hidden = view.started;
    el.startOver.hidden = !view.started;
    var asking = view.started && !s.explore && s.phase === 'question';
    var resolved = view.started && !s.explore && s.phase === 'resolved';
    el.answerRow.hidden = !(asking || resolved);
    FP.ui.progress(el.progress, s.results, view.started && !s.explore ? s.index : -1, 'Challenge');

    if (!view.started) {
      el.qnum.textContent = '';
      el.prompt.textContent = 'Move the marker and switch the elevation to see how the ratio changes. ' +
        'Then start the five challenges: type each value before the chart marks it.';
      el.keys.textContent = 'Keyboard: Tab to the temperature marker and use the arrow keys; Enter on Start challenges begins.';
      setFeedback(null);
      return;
    }
    if (s.explore) {
      var sum = runner.summary();
      el.qnum.textContent = FP.msg.EXPLORE + ' (not scored)';
      el.prompt.textContent = sum.firstAttempt + ' of ' + sum.total + ' correct on first attempt';
      var lines = [sum.lines[1]];
      if (sum.misses.length) {
        lines.push('Missed: ' + sum.misses.map(function (m) {
          return 'challenge ' + (m.index + 1) + ' (' + m.answer + ')';
        }).join(FP.msg.SEP) + '.');
      }
      lines.push('Explore: the ratio at 600°F is exactly half the ratio at 70°F, and each elevation curve is the sea-level curve times a constant.');
      setFeedback({ kind: 'final', text: lines.join(' ') });
      el.keys.textContent = 'Keyboard: Tab to the marker or elevation; Start over repeats the challenges.';
      return;
    }
    var item = s.item;
    el.qnum.textContent = 'Challenge ' + (s.index + 1) + ' of ' + ITEMS.length + (asking ? FP.msg.SEP + s.attemptLabel : '');
    el.prompt.textContent = item.q;
    el.unit.textContent = item.unit;
    el.answerLabel.textContent = item.unit ? 'Pressure' : 'Density ratio';
    el.answer.disabled = !asking;
    el.check.hidden = !asking;
    el.next.hidden = !resolved;
    el.next.textContent = s.isLast ? 'See score' : 'Next challenge';
    setFeedback(view.message);
    el.keys.textContent = 'Keyboard: type the value, Enter checks; then Enter goes to the next challenge.';
  }

  function setFeedback(m) {
    if (m) FP.ui.feedback(el.feedback, m.kind, m.text, { announce: false });
    else { el.feedback.className = 'fp-feedback'; el.feedback.textContent = ''; }
  }

  function refresh() { render(); updateReadout(); drawPlot(); }

  // ---- Actions ----
  function start() {
    view.started = true;
    view.message = null;
    refresh();
    FP.announce('Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].q);
    el.answer.value = '';
    el.answer.focus();
  }

  function check() {
    var res = runner.submit(el.answer.value);
    if (res.status === 'ignored') return;
    if (res.status === 'invalid') {
      view.message = { kind: 'info', text: FP.msg.ENTER_NUMBER + ', then press Check.' };
    } else {
      view.message = { kind: res.kind, text: res.message };
    }
    if (res.status === 'correct' || res.status === 'missed') {
      view.marks.push(Object.assign({ n: res.index + 1, correct: res.status === 'correct' }, res.item.mark));
      // show the challenge's curve under the marker for when the readouts unlock
      el.elev.value = String(res.item.mark.e);
      el.temp.value = String(res.item.mark.t);
    }
    refresh();
    FP.announce(view.message.text);
    if (!el.next.hidden) el.next.focus(); else el.answer.select();
  }

  function next() {
    if (!runner.next()) return;
    view.message = null;
    el.answer.value = '';
    refresh();
    var s = runner.state();
    if (s.explore) {
      FP.announce(el.prompt.textContent + '. ' + el.feedback.textContent);
      el.startOver.focus();
    } else {
      FP.announce('Challenge ' + (s.index + 1) + ' of ' + ITEMS.length + ': ' + s.item.q);
      el.answer.focus();
    }
  }

  function startOver() {
    runner.restart();
    view.marks = [];
    view.message = null;
    el.temp.value = '70';
    el.elev.value = '0';
    el.answer.value = '';
    refresh();
    FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].q);
    el.answer.focus();
  }

  // Enter goes to the next challenge when focus is not in a field or on a button.
  function onKey(e) {
    var tag = e.target && e.target.tagName;
    if (e.key !== 'Enter') return;
    if (tag === 'INPUT' && e.target.id === 'answer') { e.preventDefault(); check(); return; }
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
    if (view.started && runner.state().phase === 'resolved') { e.preventDefault(); next(); }
  }

  function init() {
    ['lead', 'plot', 'readout', 'temp', 'tempValue', 'elev', 'dataNote', 'progress', 'qnum', 'prompt',
      'answerRow', 'answerLabel', 'answer', 'unit', 'check', 'next', 'start', 'startOver', 'feedback', 'keys'
    ].forEach(function (id) { el[id] = document.getElementById(id); });
    ELEVATIONS.forEach(function (e, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = elevName(e) + ' (' + FP.fmt.num(e.pb, 2) + ' in. Hg)';
      el.elev.appendChild(o);
    });
    el.dataNote.textContent = FP.msg.note('Density ratio = (Pb ÷ 29.92) × (530 ÷ (T + 460))',
      'barometric pressures: Chapter 2 elevation table, standard atmosphere');
    el.temp.addEventListener('input', function () { updateReadout(); drawPlot(); });
    el.elev.addEventListener('change', function () { updateReadout(); drawPlot(); });
    el.start.addEventListener('click', start);
    el.check.addEventListener('click', check);
    el.next.addEventListener('click', next);
    el.startOver.addEventListener('click', startOver);
    document.addEventListener('keydown', onKey);
    var tm = null;
    window.addEventListener('resize', function () {
      clearTimeout(tm);
      tm = setTimeout(function () { if (isNarrow() !== lastNarrow) drawPlot(); else Plotly.Plots.resize(el.plot); }, 120);
    });
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
