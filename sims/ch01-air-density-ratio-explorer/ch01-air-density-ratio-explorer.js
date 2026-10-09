// Air Density Ratio Explorer - Chart.js on the FanPedia kit
// CANVAS_HEIGHT: 1030
// Chapter 1 (Air, Pressure and the Fan): density ratio against air temperature for four
// site altitudes, a movable marker, and four challenges (six entries) on the two
// correction rules: actual SP = catalog SP x DR; catalog SP to select at = actual SP / DR.
// DR from FP.models.densityRatio (530 / (T + 460) x (1 - 6.8754e-6 h)^5.2559).
(function () {
  'use strict';

  const M = FP.models;
  const SIM_ID = 'ch01-air-density-ratio-explorer';
  const ALTS = [0, 2000, 5000, 8000];
  const RATIO_TOL = { abs: 0.005 };
  const SP_TOL = { abs: 0.03 };
  const MINUS = '−';

  const $ = id => document.getElementById(id);
  const dr3 = v => FP.fmt.num(v, 3);
  const ft = h => FP.fmt.num(h) + ' ft';

  // ---------- Challenges (spec order). Model values are unrounded; displays round. ----------
  const D1 = M.densityRatio(250, 0), D2 = M.densityRatio(70, 5000), D3 = M.densityRatio(120, 5000), D4 = M.densityRatio(600, 0);
  const CHALLENGES = [
    { situation: '250°F at sea level. The catalog shows 4.0 in. wg at standard air (illustrative).',
      prompt: 'A fan rated at standard air will handle 250°F air. How much pressure will it really develop?',
      temp: 250, alt: 0, spLabel: 'Actual static pressure' },
    { situation: '70°F at 5,000 ft. The job needs 2.0 in. wg of actual static pressure (illustrative).',
      prompt: 'What static pressure should you look up in the standard-air catalog to select this fan?',
      temp: 70, alt: 5000, spLabel: 'Catalog SP to select at' },
    { situation: '120°F at 5,000 ft: a dryer exhaust on the same mountain site.',
      prompt: 'What is the density ratio when both temperature and altitude apply?', temp: 120, alt: 5000 },
    { situation: '600°F at sea level: an oven exhaust.',
      prompt: 'What is the density ratio of 600°F air?', temp: 600, alt: 0 }
  ];

  // Six entries. why = the spec's "Feedback when wrong" text (split between the ratio and
  // the pressure entry of challenges 1 and 2, so the ratio feedback does not give away the
  // pressure). hint = the retry text, which names the rule without the number.
  const ENTRIES = [
    { id: 'c1-ratio', ch: 0, kind: 'ratio', model: D1, decimals: 3, tolerance: RATIO_TOL,
      why: '530 ÷ (250 + 460) = 0.746. Use absolute temperature, not 70 ÷ 250.',
      hint: v => near(v, 70 / 250) ? 'You divided the °F values (70 ÷ 250). Use absolute temperature: 530 ÷ (T + 460).'
        : near(v, 1 / D1) ? 'That is upside down: hot air is lighter, so the ratio is below 1. Use 530 ÷ (T + 460).'
          : 'Use absolute temperature, not °F: DR = 530 ÷ (T + 460) at sea level.' },
    { id: 'c1-sp', ch: 0, kind: 'sp', model: 4.0 * D1, decimals: 2, unit: 'in. wg', tolerance: SP_TOL,
      why: 'Actual SP = 4.0 × 0.746 = 2.99 in. wg.',
      hint: v => near(v, 4.0 / D1, 0.03) ? 'You divided. To predict what the fan really develops, multiply the catalog SP by the density ratio.'
        : 'Actual SP = catalog SP × DR. Hot air is thinner, so the fan develops less pressure than the catalog shows.' },
    { id: 'c2-ratio', ch: 1, kind: 'ratio', model: D2, decimals: 3, tolerance: RATIO_TOL,
      why: 'At 70°F only altitude matters: 0.832.',
      hint: () => 'At 70°F the temperature factor is 1.000, so only altitude matters. Read the 5,000 ft pressure ratio.' },
    { id: 'c2-sp', ch: 1, kind: 'sp', model: 2.0 / D2, decimals: 2, unit: 'in. wg', tolerance: SP_TOL,
      why: 'To select, divide: 2.0 ÷ 0.832 = 2.40 in. wg. Multiplying would undersize the fan.',
      hint: v => near(v, 2.0 * D2, 0.03) ? 'You multiplied. Multiplying would undersize the fan: to select from a standard-air catalog, divide.'
        : 'To select from a standard-air catalog, convert the requirement to catalog conditions: divide by the density ratio.' },
    { id: 'c3-ratio', ch: 2, kind: 'ratio', model: D3, decimals: 3, tolerance: RATIO_TOL,
      why: 'Multiply both effects: 530 ÷ 580 = 0.914, times 0.832 = 0.760.',
      hint: v => near(v, M.temperatureFactor(120)) ? 'That is the temperature factor alone. Multiply it by the 5,000 ft pressure ratio too.'
        : near(v, D2) ? 'That is the altitude ratio alone. Multiply it by the temperature factor 530 ÷ (T + 460) too.'
          : 'Both effects apply: multiply the temperature factor 530 ÷ (T + 460) by the altitude pressure ratio.' },
    { id: 'c4-ratio', ch: 3, kind: 'ratio', model: D4, decimals: 3, tolerance: RATIO_TOL, label: 'challenge 4',
      why: '530 ÷ (600 + 460) = 530 ÷ 1,060 = 0.500: the air weighs half as much as standard air.',
      hint: v => near(v, 530 / 600) ? 'You left out the 460. Absolute temperature is T + 460 degrees Rankine.'
        : near(v, 70 / 600) ? 'You divided the °F values. Use absolute temperature: 530 ÷ (T + 460).'
          : 'Use absolute temperature: 600°F is 600 + 460 degrees Rankine.' }
  ];
  ENTRIES.forEach(e => {
    e.answerText = e.kind === 'ratio' ? dr3(e.model) : FP.fmt.num(e.model, 2) + ' in. wg';
  });
  function near(v, target, abs) { return FP.check.numeric(v, target, { abs: abs || 0.005 }); }

  const REVIEW_POINTER = 'Review the section "Air Density" and its two rules: multiply to predict actual SP, divide to select';
  const runner = new FP.ChallengeRunner({
    items: ENTRIES, attempts: 2, noun: 'Entries', mastery: ENTRIES.length, masteryOn: 'any',
    reviewPointer: REVIEW_POINTER, id: SIM_ID,
    // Spec: Correct "Correct: <value>." (missed and retry keep the kit wording with the spec's text).
    messages: { correct: res => FP.msg.correct(res.item.answerText) },
    onChange: render, onComplete: showSummary, onUnlockExplore: unlockExplore
  });

  // ---------- Chart ----------
  FP.chart.chartjs(Chart);
  const TEMPS = [];
  for (let t = -20; t <= 600; t += 10) TEMPS.push(t);
  const exploring = () => runner.state().explore;

  const curveSets = ALTS.map((h, i) => FP.chart.chartjsDataset(i, {
    label: h === 0 ? 'Sea level (0 ft)' : ft(h),
    alt: h,
    data: TEMPS.map(t => ({ x: t, y: M.densityRatio(t, h) })),
    pointRadius: ctx => (ctx.raw && ctx.raw.x % 100 === 0 ? 3.5 : 0),
    pointHitRadius: 4
  }));
  const markerSet = {
    label: 'Your setting', isMarker: true, data: [{ x: 70, y: 1 }], showLine: false,
    pointStyle: 'crossRot', pointRadius: 9, pointHoverRadius: 9, borderWidth: 3,
    borderColor: FP.tok('text'), backgroundColor: FP.tok('text'), pointBorderColor: FP.tok('text')
  };

  const chart = new Chart($('chart'), {
    type: 'line',
    data: { datasets: curveSets.concat([markerSet]) },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      scales: {
        x: FP.chart.chartjsScale('temperature', { min: -20, max: 600, ticks: { stepSize: 100 } }, 0),
        y: FP.chart.chartjsScale('Density ratio', { min: 0.40, max: 1.25, ticks: { stepSize: 0.1, includeBounds: false } }, 1)
      },
      plugins: {
        legend: { onClick: () => {} },
        tooltip: {
          filter: item => !item.dataset.isMarker,
          callbacks: {
            title: items => items.length ? 'Air temperature: ' + FP.fmt.degF(items[0].parsed.x) : '',
            label: item => {
              const h = item.dataset.alt, y = item.parsed.y;
              if (!exploring()) return ft(h) + ': read the curve (values unlock after challenge 4)';
              return ft(h) + ': DR ' + dr3(y) + ', ' + FP.fmt.num(M.densityLbFt3(item.parsed.x, h), 4) + ' lb/ft³';
            }
          }
        }
      }
    }
  });

  // ---------- Marker and readout ----------
  function setting() { return { t: Number($('temp').value), h: Number($('alt').value) }; }
  function updateMarker() {
    const s = setting();
    const d = M.densityRatio(s.t, s.h);
    $('tempVal').textContent = FP.fmt.degF(s.t);
    $('altVal').textContent = ft(s.h);
    markerSet.data = [{ x: s.t, y: d }];
    chart.update('none');
    if (!exploring()) {
      $('readout').textContent = 'Marker at ' + FP.fmt.degF(s.t) + ' and ' + ft(s.h) +
        '. Read the ratio from the curve against the left axis; exact readouts unlock after challenge 4.';
      return;
    }
    const kt = M.temperatureFactor(s.t), ka = M.altitudeFactor(s.h);
    $('readout').innerHTML = 'At <b>' + FP.fmt.degF(s.t) + '</b> and <b>' + ft(s.h) + '</b>: DR = ' + dr3(kt) + ' × ' + dr3(ka) +
      ' = <b>' + dr3(d) + '</b>, density <b>' + FP.fmt.num(M.densityLbFt3(s.t, s.h), 4) + ' lb/ft³</b>. ' +
      'A fan rated 4.00 in. wg at standard air develops <b>' + FP.fmt.inwg(M.actualFromCatalog(4, d)) +
      '</b> here and draws ' + FP.fmt.num(100 * d, 1) + '% of its catalog BHP, at the same CFM and RPM.';
  }

  // ---------- Reference panel ----------
  (function buildRef() {
    const g = $('refGrid');
    for (let h = 0; h <= 10000; h += 1000) {
      const s = document.createElement('span');
      s.textContent = ft(h) + ' ' + dr3(M.altitudeFactor(h));
      g.appendChild(s);
    }
  })();

  // ---------- Challenge flow (FP.ChallengeRunner) ----------
  function entryInput(e) { return e.kind === 'ratio' ? $('dr') : $('sp'); }
  function entryFb(e) { return e.kind === 'ratio' ? $('fbRatio') : $('fbPressure'); }
  function entryMark(e) { return e.kind === 'ratio' ? $('drMark') : $('spMark'); }
  function hasSp(ch) { return ENTRIES.some(e => e.ch === ch && e.kind === 'sp'); }

  function render(st) {
    $('score').textContent = st.scoreLabel;
    FP.ui.progress($('progress'), st.results, st.phase === 'done' ? -1 : st.index, 'Entry');
    $('attempt').textContent = st.phase === 'question' ? (st.item.kind === 'ratio' ? 'Density ratio: ' : 'Pressure: ') + st.attemptLabel : '';
    $('exploreState').textContent = st.explore
      ? FP.msg.EXPLORE + ' (not scored): move the temperature and altitude, and hover the curves for exact values.'
      : st.exploreLabel;
    const done = st.phase === 'done';
    $('answers').hidden = done;
    $('ref').hidden = done;
    $('check').hidden = done || st.phase === 'resolved';
    $('next').hidden = st.phase !== 'resolved';
    $('next').textContent = st.isLast ? 'Show summary' : 'Next challenge';
    if (!done) {
      $('dr').disabled = !(st.phase === 'question' && st.item.kind === 'ratio');
      // Both boxes of a two-entry challenge take input together; the pressure is checked
      // once the ratio is settled (correct or revealed).
      $('sp').disabled = !(st.phase === 'question' && (st.item.kind === 'sp' || hasSp(st.item.ch)));
    }
  }

  function startChallenge() {
    const st = runner.state();
    const ch = st.item.ch, c = CHALLENGES[ch];
    $('prompt').textContent = 'Challenge ' + (ch + 1) + ' of 4: ' + c.prompt;
    $('situation').textContent = c.situation;
    $('spRow').hidden = !hasSp(ch);
    $('spLabel').textContent = c.spLabel || '';
    ['dr', 'sp'].forEach(id => { $(id).value = ''; });
    ['drMark', 'spMark'].forEach(id => { $(id).textContent = ''; $(id).className = 'dre-mark'; });
    FP.ui.feedback($('fbRatio'), 'info', hasSp(ch)
      ? 'Type the density ratio (3 decimals) and the pressure, then press Check. Set the marker first to see roughly where the answer lies.'
      : 'Type the density ratio (3 decimals), then press Check. Set the marker first to see roughly where the answer lies.',
    { announce: false });
    $('fbPressure').textContent = '';
    $('fbPressure').className = 'fp-feedback';
    render(st);
  }

  function setMark(e, res) {
    const m = entryMark(e);
    if (res.status === 'correct') { m.textContent = FP.msg.OK + ' correct'; m.className = 'dre-mark ok'; }
    else if (res.status === 'missed') { m.textContent = FP.msg.BAD + ' missed'; m.className = 'dre-mark bad'; }
    else { m.textContent = FP.msg.BAD + ' try again'; m.className = 'dre-mark bad'; }
  }

  // Submits the current entry; returns the result (or null when nothing was submitted).
  function submitCurrent() {
    const st = runner.state();
    if (st.phase !== 'question') return null;
    const e = st.item;
    const res = runner.submit(entryInput(e).value);
    if (res.status === 'invalid') {
      FP.ui.feedback(entryFb(e), 'info', FP.msg.ENTER_NUMBER + (e.kind === 'ratio' ? ' for the density ratio, for example 0.850.' :
        ' for the pressure in in. wg.') + ' No attempt was used.');
      entryInput(e).focus();
      return res;
    }
    FP.ui.feedback(entryFb(e), res.kind, res.message);
    setMark(e, res);
    return res;
  }

  function onCheck() {
    const st = runner.state();
    if (st.phase !== 'question') return;
    const e = st.item;
    const res = submitCurrent();
    if (!res || res.status === 'invalid') return;
    if (res.status === 'retry') {
      if (e.kind === 'ratio' && hasSp(e.ch) && $('sp').value.trim() !== '') {
        FP.ui.feedback($('fbPressure'), 'info', 'The pressure is checked once the density ratio is right or revealed.', { announce: false });
      }
      entryInput(e).select();
      return;
    }
    // The entry is resolved. A ratio with a pressure still to come moves on to it.
    if (e.kind === 'ratio' && hasSp(e.ch)) {
      runner.next();
      const spBox = $('sp');
      if (spBox.value.trim() !== '') {
        const r2 = submitCurrent();
        if (r2 && r2.status === 'retry') { spBox.select(); return; }
        if (r2 && r2.status !== 'invalid') { $('next').focus(); }
        return;
      }
      FP.ui.feedback($('fbPressure'), 'info', 'Now the pressure: use the density ratio ' + e.answerText + '.', { announce: false });
      spBox.focus();
      return;
    }
    $('next').focus();
  }

  function onNext() {
    const st = runner.state();
    if (st.phase !== 'resolved') return;
    runner.next();
    if (runner.state().explore) return;
    startChallenge();
    $('dr').focus();
  }

  function showSummary(summary) {
    const box = $('summary');
    box.innerHTML = '';
    summary.lines.forEach(line => {
      const p = document.createElement('div');
      p.textContent = line;
      box.appendChild(p);
    });
    if (summary.misses.length) {
      const ul = document.createElement('ul');
      summary.misses.forEach(m => {
        const li = document.createElement('li');
        li.textContent = 'Missed ' + (m.item.kind === 'ratio' ? 'density ratio' : 'pressure') + ' in challenge ' + (m.item.ch + 1) +
          ': ' + m.answer + '. ' + m.why;
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    FP.announce(summary.lines.join(' '));
  }

  function unlockExplore() {
    $('prompt').textContent = FP.msg.EXPLORE + ': move the temperature and altitude freely. CFM at a given fan speed does not change with density; static pressure and BHP scale with the density ratio.';
    $('situation').textContent = '';
    $('fbRatio').textContent = ''; $('fbRatio').className = 'fp-feedback';
    $('fbPressure').textContent = ''; $('fbPressure').className = 'fp-feedback';
    updateMarker();
    $('temp').focus();
  }

  function startOver() {
    runner.restart();
    $('summary').textContent = '';
    $('temp').value = 70; $('alt').value = 0;
    updateMarker();
    startChallenge();
    $('dr').focus();
    FP.announce('Started over. ' + $('prompt').textContent);
  }

  // ---------- Events ----------
  $('check').addEventListener('click', onCheck);
  $('next').addEventListener('click', onNext);
  $('startOver').addEventListener('click', startOver);
  $('temp').addEventListener('input', updateMarker);
  $('alt').addEventListener('input', updateMarker);
  // Enter in an answer box checks; Enter elsewhere (not on a button) goes to the next challenge.
  document.querySelector('main').addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || ev.target.tagName === 'BUTTON' || ev.target.tagName === 'SUMMARY') return;
    const phase = runner.state().phase;
    if (phase === 'question' && (ev.target.id === 'dr' || ev.target.id === 'sp')) { ev.preventDefault(); onCheck(); }
    else if (phase === 'resolved') { ev.preventDefault(); onNext(); }
  });

  updateMarker();
  startChallenge();
})();
