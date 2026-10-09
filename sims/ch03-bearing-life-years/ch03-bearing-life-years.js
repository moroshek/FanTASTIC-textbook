// Bearing Life in Years by Operating Schedule - Chart.js on the FanPedia kit
// CANVAS_HEIGHT: 838
// Three challenges: type the L-10 life in years for a rating and a schedule before the
// chart reveals it; then Explore mode: choose any of the five L-10 ratings and read the
// ten bars (L-10 and L-50 years for five schedules).
// Kit: FP.ChallengeRunner (flow, wording, score, mastery), FP.models (annualHours,
// bearingLifeYears, l50FromL10; 52-week year as in Chapter 3), FP.chart (Chart.js theme).
// Rules: hours per year = h/day x days/week x 52; L-10 years = L-10 h / hours per year;
// L-50 = 5 x L-10. Years shown to 0.1 year; answers judged within ±0.1 year of the
// unrounded model value.
(function () {
  'use strict';

  const SIM_ID = 'ch03-bearing-life-years';
  const M = FP.models;

  // ---------- Content (chapter specification) ----------
  const RATINGS = [20000, 40000, 60000, 80000, 100000];
  const DEFAULT_RATING = 40000;
  const SCHEDULES = [
    { label: '24 h/day, 7 days/week', short: ['24 h/day', '7 days/wk'], h: 24, d: 7 },
    { label: '24 h/day, 5 days/week', short: ['24 h/day', '5 days/wk'], h: 24, d: 5 },
    { label: '16 h/day, 5 days/week', short: ['16 h/day', '5 days/wk'], h: 16, d: 5 },
    { label: '8 h/day, 5 days/week', short: ['8 h/day', '5 days/wk'], h: 8, d: 5 },
    { label: '2 h/day, 5 days/week', short: ['2 h/day', '5 days/wk'], h: 2, d: 5 }
  ];
  const TOL = { abs: 0.1 };

  const CHALLENGE_DATA = [
    { rating: 40000, schedule: 2,
      prompt: 'A 40,000-hour L-10 bearing runs 16 hours a day, 5 days a week. How many years is its L-10 life?',
      wrong: '16 × 5 × 52 = 4,160 h per year; 40,000 / 4,160 = 9.6 years.' },
    { rating: 40000, schedule: 0,
      prompt: 'A 40,000-hour L-10 bearing runs 24 hours a day, 7 days a week. How many years is its L-10 life?',
      wrong: 'Around-the-clock service is 8,736 h per year; 40,000 / 8,736 = 4.6 years.' },
    { rating: 20000, schedule: 3,
      prompt: 'A 20,000-hour L-10 bearing runs 8 hours a day, 5 days a week. How many years is its L-10 life?',
      wrong: '8 × 5 × 52 = 2,080 h per year; 20,000 / 2,080 = 9.6 years. Half the rating at a quarter of ' +
        'the hours of around-the-clock service still gives about ten years.' }
  ];

  function hoursPerYear(s) { return M.annualHours(s.h, s.d); }
  function l10Years(rating, s) { return M.bearingLifeYears(rating, s.h, s.d); }
  function l50Years(rating, s) { return M.bearingLifeYears(M.l50FromL10(rating), s.h, s.d); }
  const yr = function (v) { return FP.fmt.num(M.round(v, 1), 1); };
  const hrs = function (v) { return FP.fmt.num(v, 0) + ' h'; };

  // Spec feedback: correct shows "Correct: <model value> years."; a wrong answer shows the
  // challenge's "Feedback when wrong" text, and again with the model value when missed.
  const ITEMS = CHALLENGE_DATA.map(function (c, i) {
    const s = SCHEDULES[c.schedule];
    const model = l10Years(c.rating, s);
    return Object.assign({}, c, {
      id: 'challenge-' + (i + 1),
      model: model, unit: 'years', decimals: 1, tolerance: TOL,
      answerText: yr(model) + ' years',
      hint: function (v) { return lifeHint(v, c.rating, s); },
      why: function (v, item) { return FP.check.numeric(v, item.model, TOL) ? '' : item.wrong; }
    });
  });

  // First wrong attempt: a hint that names the rule or the slip, never the model value or the
  // worked numbers. The final miss shows the spec's "Feedback when wrong" text with the value.
  const RULE = 'Hours per year = hours per day × days per week × 52; then L-10 years = L-10 hours ÷ hours per year.';
  function lifeHint(v, rating, s) {
    const near = function (t) { return FP.check.numeric(v, t, TOL); };
    if (near(rating / (s.h * 365))) return 'You counted every day of the year. This fan runs ' + s.d + ' days a week: multiply by days per week and 52 weeks.';
    if (s.d !== 7 && near(rating / (24 * 7 * 52))) return 'That is around-the-clock service. Use this schedule: ' + s.h + ' hours a day, ' + s.d + ' days a week.';
    if (near(rating / (s.h * s.d))) return 'That is in weeks, not years. Multiply the weekly hours by 52 first.';
    if (near(rating / s.h)) return 'That is in days, not years. Convert to hours per year first: ' + RULE;
    if (s.d === 7 && near(rating / (s.h * 5 * 52))) return 'Around the clock means 7 days a week, not 5.';
    if (RATINGS.some(function (r) { return r !== rating && near(r / M.annualHours(s.h, s.d)); })) return 'Check the L-10 rating in the question.';
    return RULE;
  }

  // ---------- DOM ----------
  const $ = function (id) { return document.getElementById(id); };
  RATINGS.forEach(function (r) { $('rating').add(new Option(FP.fmt.num(r, 0) + ' h', String(r))); });
  $('rating').value = String(DEFAULT_RATING);

  // ---------- Chart ----------
  FP.chart.chartjs(Chart);
  const narrowChart = function () { return $('chart').parentNode.clientWidth < 520; };
  const c1 = FP.chart.series(0).color, c2 = FP.chart.series(1).color;

  // L-10 bars solid; L-50 bars light fill with a heavy outline, so the series differ by more than colour.
  const l10Set = { label: 'L-10 life (years)', data: [null, null, null, null, null],
    backgroundColor: c1, borderColor: [], borderWidth: [], kind: 'L-10' };
  const l50Set = { label: 'L-50 life (years)', data: [null, null, null, null, null],
    backgroundColor: 'rgba(230, 97, 0, 0.18)', borderColor: [], borderWidth: [], kind: 'L-50' };

  let shownRating = null;       // rating the bars show (null = bars hidden)
  let highlight = -1;           // schedule index highlighted after a check

  // Value labels above each bar (dark text: the number, not the colour, carries the meaning),
  // and a centred message while the bars are hidden.
  const valueLabels = {
    id: 'blyValueLabels',
    afterDatasetsDraw: function (chart) {
      const ctx = chart.ctx, area = chart.chartArea;
      ctx.save();
      if (shownRating === null) {
        ctx.fillStyle = FP.tok('text-muted');
        ctx.font = '14px ' + FP.FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Bars appear after you check your answer.', (area.left + area.right) / 2, (area.top + area.bottom) / 2);
        ctx.restore();
        return;
      }
      const small = narrowChart();
      ctx.font = (small ? '12px ' : '12px ') + FP.FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      chart.data.datasets.forEach(function (ds, di) {
        const meta = chart.getDatasetMeta(di);
        meta.data.forEach(function (bar, i) {
          if (ds.data[i] == null) return;
          const v = ds.data[i];
          const txt = small ? FP.fmt.num(M.round(v, v >= 100 ? 0 : 1), v >= 100 ? 0 : 1) : yr(v);
          ctx.fillStyle = FP.tok('text');
          ctx.font = (i === highlight ? 'bold ' : '') + '12px ' + FP.FONT;
          ctx.fillText(txt, bar.x, bar.y - 3);
        });
      });
      if (highlight >= 0) {
        const bar = chart.getDatasetMeta(0).data[highlight];
        const bar2 = chart.getDatasetMeta(1).data[highlight];
        const xMid = (bar.x + bar2.x) / 2;
        ctx.strokeStyle = FP.tok('text');
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        const half = Math.abs(bar2.x - bar.x) / 2 + bar.width / 2 + 5;
        ctx.strokeRect(xMid - half, area.top + 2, half * 2, area.bottom - area.top - 3);
        ctx.setLineDash([]);
        ctx.fillStyle = FP.tok('text');
        ctx.font = 'bold 12px ' + FP.FONT;
        ctx.textBaseline = 'top';
        const tag = ctx.measureText('▼ this schedule').width < half * 2 - 6 ? '▼ this schedule' : '▼';
        ctx.fillText(tag, xMid, area.top + 4);
      }
      ctx.restore();
    }
  };

  const chart = new Chart($('chart'), {
    type: 'bar',
    data: {
      labels: SCHEDULES.map(function (s) { return s.short; }),
      datasets: [l10Set, l50Set]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      layout: { padding: { top: 18 } },
      scales: {
        x: { title: { display: true, text: 'Operating schedule' }, grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: false } },
        y: {
          type: 'logarithmic', min: 1, max: 1000,
          title: { display: true, text: 'Bearing life (years, log scale)' },
          // Gridlines and labels only at 1, 10, 100 and 1,000 years.
          afterBuildTicks: function (axis) { axis.ticks = [1, 10, 100, 1000].map(function (v) { return { value: v }; }); },
          grid: { color: '#d5dee7' },
          ticks: { callback: function (v) { return FP.fmt.num(v, 0); } }
        }
      },
      plugins: {
        // The kit legend draws line samples (boxHeight 0); bars need filled boxes.
        legend: {
          labels: {
            boxWidth: 18, boxHeight: 12,
            generateLabels: function () {
              return [
                { text: 'L-10 life (years)', fillStyle: c1, strokeStyle: c1, lineWidth: 0, datasetIndex: 0 },
                { text: 'L-50 life (years), 5 × L-10', fillStyle: 'rgba(230, 97, 0, 0.18)', strokeStyle: c2,
                  lineWidth: 2, datasetIndex: 1 }
              ];
            }
          },
          onClick: function () { /* both series always stay visible */ }
        },
        tooltip: {
          filter: function (item) { return item.raw != null; },
          callbacks: {
            title: function (items) { return SCHEDULES[items[0].dataIndex].label; },
            label: function () { return ''; },
            afterBody: function (items) {
              const s = SCHEDULES[items[0].dataIndex];
              return [
                'L-10 rating: ' + hrs(shownRating),
                'Hours per year: ' + hrs(hoursPerYear(s)),
                'L-10 life: ' + yr(l10Years(shownRating, s)) + ' years',
                'L-50 life: ' + yr(l50Years(shownRating, s)) + ' years'
              ];
            }
          }
        }
      }
    },
    plugins: [valueLabels]
  });

  function showBars(rating, hi) {
    shownRating = rating;
    highlight = hi == null ? -1 : hi;
    SCHEDULES.forEach(function (s, i) {
      l10Set.data[i] = rating === null ? null : l10Years(rating, s);
      l50Set.data[i] = rating === null ? null : l50Years(rating, s);
      const on = i === highlight;
      l10Set.borderColor[i] = on ? FP.tok('text') : c1;
      l10Set.borderWidth[i] = on ? 3 : 0;
      l50Set.borderColor[i] = on ? FP.tok('text') : c2;
      l50Set.borderWidth[i] = on ? 3 : 2;
    });
    $('ratingLabel').textContent = 'L-10 rating: ' + FP.fmt.num(rating === null ? currentItemRating() : rating, 0) + ' h';
    $('chartState').textContent = rating === null ? 'Bars appear after you check your answer.'
      : (runner.state().explore ? FP.msg.EXPLORE : 'Revealed for this challenge');
    chart.update();
  }
  function currentItemRating() {
    const st = runner.state();
    return st.item ? st.item.rating : DEFAULT_RATING;
  }

  // ---------- Challenge flow (FP.ChallengeRunner) ----------
  const runner = new FP.ChallengeRunner({
    items: ITEMS,
    attempts: 2,
    tolerance: TOL,
    noun: 'Challenges',
    mastery: ITEMS.length,
    reviewPointer: 'Review the worked example "Converting L-10 Hours to Years", then press Start over',
    id: SIM_ID,
    onChange: render,
    onComplete: showSummary,
    onUnlockExplore: unlockExplore
  });

  function render(st) {
    $('score').textContent = st.scoreLabel;
    $('attempt').textContent = st.phase === 'question' ? st.attemptLabel : '';
    FP.ui.progress($('progress'), st.results, st.phase === 'done' ? -1 : st.index, 'Challenge');
    $('exploreState').textContent = st.exploreLabel;
    $('next').hidden = st.phase !== 'resolved';
    $('next').textContent = st.isLast ? 'Start exploring' : 'Next challenge';
    $('check').hidden = st.phase !== 'question';
    document.querySelectorAll('.bly-ask').forEach(function (el) { el.hidden = st.phase === 'done'; });
    $('answer').disabled = st.phase !== 'question';
    $('rating').disabled = !st.explore;
  }

  function startChallenge() {
    const st = runner.state();
    $('prompt').textContent = 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ': ' + st.item.prompt;
    $('answer').value = '';
    $('compare').textContent = '';
    $('compare').hidden = false;
    FP.ui.feedback($('feedback'), 'info', 'Type the L-10 life in years (one decimal is enough), then press Check.',
      { announce: false });
    showBars(null);
    render(st);
  }

  function onCheck() {
    const st = runner.state();
    if (st.phase !== 'question') return;
    const res = runner.submit($('answer').value);
    FP.ui.feedback($('feedback'), res.kind, res.message);
    if (res.status === 'invalid') { $('answer').focus(); return; }
    if (res.status === 'correct' || res.status === 'missed') {
      const item = res.item;
      showBars(item.rating, item.schedule);
      $('compare').textContent = 'Your answer: ' + FP.fmt.numUpTo(res.value, 2) + ' years · Chart: ' +
        yr(item.model) + ' years (' + SCHEDULES[item.schedule].label + ', ' +
        hrs(hoursPerYear(SCHEDULES[item.schedule])) + ' per year)';
      $('next').focus();
    }
  }

  function showSummary(summary) {
    const box = $('summary');
    box.innerHTML = '';
    summary.lines.forEach(function (line) {
      const div = document.createElement('div');
      div.textContent = line;
      box.appendChild(div);
    });
    if (summary.misses.length) {
      // Compact: each challenge's full feedback was shown when it was missed.
      const div = document.createElement('div');
      div.textContent = 'Missed: ' + summary.misses.map(function (m) {
        return 'challenge ' + (m.index + 1) + ' (' + m.answer + ')';
      }).join(', ') + '.';
      box.appendChild(div);
    }
    FP.announce(summary.lines.join(' '));
  }

  function updateReadout() {
    const r = Number($('rating').value);
    const factor = l10Years(r, SCHEDULES[4]) / l10Years(r, SCHEDULES[0]);
    $('readout').textContent = hrs(r) + ' L-10 = ' + hrs(M.l50FromL10(r)) + ' L-50. The 2 h/day bar is ' +
      FP.fmt.num(factor, 1) + ' times the 24/7 bar at every rating. Hover or tap a bar for its hours per year.';
  }

  function unlockExplore() {
    $('prompt').textContent = FP.msg.EXPLORE + ' (not scored): choose any L-10 rating. Every bar scales in ' +
      'proportion to the rating, so all ten bars move up or down together.';
    $('compare').textContent = '';
    $('compare').hidden = true;
    $('feedback').textContent = '';
    $('rating').value = String(DEFAULT_RATING);
    $('rating').disabled = false;
    showBars(DEFAULT_RATING);
    updateReadout();
    $('rating').focus();
  }

  function startOver() {
    runner.restart();
    $('summary').textContent = '';
    $('readout').textContent = '';
    $('rating').value = String(DEFAULT_RATING);
    startChallenge();
    FP.announce('Started over. ' + $('prompt').textContent);
    $('answer').focus();
  }

  // ---------- Events ----------
  $('check').addEventListener('click', onCheck);
  $('next').addEventListener('click', function () {
    const wasLast = runner.state().isLast;
    if (!runner.next()) return;
    if (!wasLast) {
      startChallenge();
      FP.announce($('prompt').textContent);
      $('answer').focus();
    }
  });
  $('startOver').addEventListener('click', startOver);
  $('rating').addEventListener('change', function () {
    if (!runner.state().explore) return;
    showBars(Number($('rating').value));
    updateReadout();
  });
  // Enter in the answer box checks; Enter elsewhere (not on a button) goes to the next challenge.
  document.querySelector('main').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    const phase = runner.state().phase;
    if (phase === 'question' && e.target.id === 'answer') { e.preventDefault(); onCheck(); }
    else if (phase === 'resolved') { e.preventDefault(); $('next').click(); }
  });

  startChallenge();
})();
