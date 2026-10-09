// Fan Temperature Limits Ruler - Chart.js on the FanPedia kit (Chapter 20)
// CANVAS_HEIGHT: 1100
// Twelve FanPedia temperature limits drawn as ranges on a 0-1,200°F axis, with a
// temperature marker (exploration, never scored) and five fixed multiple-choice
// questions (FP.CardDeck, one attempt each, mastery 4 of 5). Answering a question
// moves the marker to its temperature and highlights the row that decides it.
// Source: FanPedia pp. 106, 110, 111, 114, 116, 120, 192 (https://tcf.com/fanpedia/).
(function () {
  'use strict';

  const SIM_ID = 'ch20-fan-temperature-limits-ruler';
  const T_MAX = 1200;
  const DEFAULT_T = 70;

  // ---------- Content (chapter specification, rows 1-12) ----------
  // lo/hi in °F; loOpen: "over lo" (T > lo); hi = null: open-ended (no upper bound).
  // group picks the kit series colour: 0 material, 1 bearings and shaft, 2 packages, 3 construction rules.
  const ROWS = [
    { label: 'Aluminum rotating parts, Arr. 4 centrifugal and Arr. 4 plug fans', short: 'Al rotating parts, Arr. 4', lo: 0, hi: 250, src: 'FanPedia pp. 111, 114', group: 0 },
    { label: 'Standard aluminum axial impeller', short: 'Al axial impeller', lo: 0, hi: 275, src: 'FanPedia p. 116', group: 0 },
    { label: 'High temperature grease required, axial fans', short: 'HT grease, axial fans', lo: 275, loOpen: true, hi: null, src: 'FanPedia p. 116', group: 1 },
    { label: 'Shaft cooler recommended', short: 'Shaft cooler', lo: 300, loOpen: true, hi: null, src: 'FanPedia p. 192', group: 1 },
    { label: 'Arr. 4 centrifugal package', short: 'Arr. 4 package', lo: 181, hi: 300, src: 'FanPedia p. 111', group: 2 },
    { label: 'Centrifugal package (Arr. 1, 8, 9, 9F, 10)', short: 'Centrifugal package', lo: 301, hi: 500, src: 'FanPedia p. 110', group: 2 },
    { label: 'Centrifugal package (Arr. 1, 8, 9, 9F, 10)', short: 'Centrifugal package', lo: 501, hi: 600, src: 'FanPedia p. 110', group: 2 },
    { label: 'Centrifugal package (Arr. 1, 8, 9, 9F, 10)', short: 'Centrifugal package', lo: 601, hi: 800, src: 'FanPedia p. 110', group: 2 },
    { label: 'Centrifugal package (Arr. 1, 8, 9, 9F, 10)', short: 'Centrifugal package', lo: 801, hi: 1000, src: 'FanPedia p. 110', group: 2 },
    { label: 'Centrifugal package, engineering review', short: 'Engineering review', lo: 1001, hi: null, src: 'FanPedia p. 110', group: 2 },
    { label: 'Type C centrifugal: steel funnel with rubbing band and rubbing bars', short: 'Type C steel funnel', lo: 501, hi: null, src: 'FanPedia p. 106', group: 3 },
    { label: 'Nominally leak-tight construction recommended', short: 'Leak-tight recommended', lo: 0, hi: 600, src: 'FanPedia p. 120', group: 3 }
  ];
  const n0 = function (v) { return FP.fmt.num(v, 0); };
  ROWS.forEach(function (r, i) {
    r.n = i + 1;
    r.range = r.hi == null
      ? (r.loOpen ? 'over ' + n0(r.lo) + '°F and above' : n0(r.lo) + '°F and above')
      : n0(r.lo) + ' to ' + n0(r.hi) + '°F';
    r.rangeShort = r.hi == null ? r.range : n0(r.lo) + '-' + n0(r.hi) + '°F';
  });
  function isActive(r, t) {
    const aboveLo = r.loOpen ? t > r.lo : t >= r.lo;
    return aboveLo && (r.hi == null || t <= r.hi);
  }

  // Questions in fixed order; rows = the 0-based rows highlighted after answering.
  const QUESTIONS = [
    { id: 'q1-arr4-240F', temp: 240, rows: [0],
      text: 'Arrangement 4 centrifugal fan at 240°F. May the impeller be aluminum?',
      options: ['Yes', 'No'], answer: 0,
      why: '240 ≤ 250, the limit for aluminum rotating parts in Arr. 4 high temperature construction.' },
    { id: 'q2-axial-290F', temp: 290, rows: [1, 2],
      text: 'Arrangement 9 axial fan at 290°F with a standard aluminum impeller. Is the impeller within its limit?',
      options: ['Yes', 'No'], answer: 1,
      why: '290 > 275, the limit for the standard aluminum axial impeller; this temperature also requires high temperature grease.' },
    { id: 'q3-typec-550F', temp: 550, rows: [10],
      text: 'Arrangement 8 centrifugal fan, spark-resistant Type C, at 550°F. Which inlet funnel?',
      options: ['Aluminum funnel', 'Steel funnel with rubbing band and rubbing bars',
        'No funnel change needed because Type C only adds a rub plate'], answer: 1,
      why: '550 ≥ 501, where FanPedia replaces the aluminum funnel with a steel funnel, rubbing band and rubbing bars.' },
    { id: 'q4-leaktight-650F', temp: 650, rows: [11],
      text: 'Arrangement 1 centrifugal fan at 650°F, customer asks for nominally leak-tight construction. Is it recommended?',
      options: ['Yes', 'No'], answer: 1,
      why: '650 > 600; FanPedia does not recommend nominally leak-tight construction over 600°F.' },
    { id: 'q5-arr1-320F', temp: 320, rows: [5, 3],
      text: 'Arrangement 1 centrifugal fan at 320°F. Which package, and is a shaft cooler recommended?',
      options: ['181°F-300°F package, no cooler', '301°F-500°F package, cooler recommended',
        '301°F-500°F package, no cooler', '501°F-600°F package, cooler recommended'], answer: 1,
      why: '320 lies in 301-500, and 320 > 300, where FanPedia recommends a shaft cooler.' }
  ];
  const MASTERY = 4;
  const GOOD = 'You can place a design temperature against the catalog limits.';
  const REVIEW = 'Reread each reason and find its row on the chart.';

  // ---------- Engine ----------
  const cards = QUESTIONS.map(function (q) {
    return Object.assign({}, q, { answerText: q.options[q.answer] });
  });
  const deck = new FP.CardDeck({
    cards: cards, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'Questions', mastery: MASTERY, reviewPointer: REVIEW, id: SIM_ID,
    // Spec wording: "Correct." / "Not quite." followed by the reason; the correct
    // option is revealed at once.
    messages: {
      correct: function (res) { return '✓ Correct. ' + res.card.why; },
      missed: function (res) { return '✗ Not quite. ' + res.card.why + ' The correct option is: ' + res.card.answerText + '.'; }
    }
  });

  // ---------- State ----------
  let temp = DEFAULT_T;
  let highlight = [];        // rows highlighted for the answered question
  let chosen = null;         // option index selected for the face-up question
  let lastRes = null;

  const $ = function (id) { return document.getElementById(id); };
  const slider = $('temp');

  // ---------- Chart ----------
  FP.chart.chartjs(Chart);
  function rgba(hex, a) {
    const h = String(hex).replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map(function (c) { return c + c; }).join('') : h, 16);
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
  }
  const groupColor = function (g) { return FP.chart.series(g).color; };

  const markerPlugin = {
    id: 'ftlrMarker',
    afterDatasetsDraw: function (chart) {
      const a = chart.chartArea, ctx = chart.ctx;
      const x = chart.scales.x.getPixelForValue(temp);
      ctx.save();
      ctx.strokeStyle = FP.tok('text');
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(x, a.top - 4); ctx.lineTo(x, a.bottom); ctx.stroke();
      ctx.setLineDash([]);
      const txt = n0(temp) + '°F';
      ctx.font = 'bold 13px ' + FP.FONT;
      const w = ctx.measureText(txt).width + 10;
      const bx = Math.min(Math.max(x - w / 2, a.left - 4), a.right - w + 4);
      ctx.fillStyle = FP.tok('text');
      ctx.fillRect(bx, a.top - 24, w, 20);
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx + 5, a.top - 14);
      ctx.restore();
    }
  };

  const chart = new Chart($('chart'), {
    type: 'bar',
    data: {
      labels: ROWS.map(function (r) { return [r.short, r.rangeShort]; }),
      datasets: [{
        label: 'Temperature limit',
        data: ROWS.map(function (r) { return [r.lo, r.hi == null ? T_MAX : r.hi]; }),
        backgroundColor: function (c) {
          const r = ROWS[c.dataIndex];
          return r ? rgba(groupColor(r.group), isActive(r, temp) ? 0.85 : 0.18) : 'transparent';
        },
        borderColor: function (c) {
          const r = ROWS[c.dataIndex];
          if (!r) return 'transparent';
          return highlight.indexOf(c.dataIndex) >= 0 ? FP.tok('text') : rgba(groupColor(r.group), isActive(r, temp) ? 1 : 0.5);
        },
        borderWidth: function (c) { return highlight.indexOf(c.dataIndex) >= 0 ? 4 : 1; },
        borderSkipped: false,
        barPercentage: 0.82,
        categoryPercentage: 0.92
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { top: 26, right: 12 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (items) { return items.length ? 'Row ' + ROWS[items[0].dataIndex].n + ': ' + ROWS[items[0].dataIndex].label : ''; },
            label: function (item) { return 'Range: ' + ROWS[item.dataIndex].range; },
            afterLabel: function (item) {
              const r = ROWS[item.dataIndex];
              return ['Source: ' + r.src, (isActive(r, temp) ? 'Active' : 'Not active') + ' at ' + n0(temp) + '°F'];
            }
          }
        }
      },
      scales: {
        x: FP.chart.chartjsScale('Temperature (°F)', {
          min: 0, max: T_MAX,
          ticks: { stepSize: 200, callback: function (v) { return n0(v); } }
        }),
        y: {
          grid: { display: false },
          ticks: {
            autoSkip: false,
            font: function (c) {
              const hl = highlight.indexOf(c.index) >= 0;
              return { size: 12, weight: hl || isActive(ROWS[c.index] || {}, temp) ? 'bold' : 'normal' };
            },
            color: function (c) { return isActive(ROWS[c.index] || {}, temp) ? FP.tok('text') : FP.tok('text-muted'); },
            callback: function (v, i) {
              const r = ROWS[i];
              const mark = highlight.indexOf(i) >= 0 ? '▶ ' : (isActive(r, temp) ? '✓ ' : '');
              return [mark + r.short, r.rangeShort];
            }
          }
        }
      }
    },
    plugins: [markerPlugin]
  });

  // ---------- Marker ----------
  function setTemp(t, announce) {
    temp = Math.max(0, Math.min(T_MAX, t));
    slider.value = String(temp);
    $('tempVal').textContent = n0(temp) + '°F';
    slider.setAttribute('aria-valuetext', n0(temp) + ' degrees Fahrenheit');
    const active = ROWS.filter(function (r) { return isActive(r, temp); });
    $('readout').textContent = 'At ' + n0(temp) + '°F, ' + active.length + ' of 12 limits are active: ' +
      active.map(function (r) { return r.short + ' (' + r.rangeShort + ')'; }).join('; ') + '.';
    chart.update('none');
    if (announce) FP.announce($('readout').textContent);
  }
  slider.addEventListener('input', function () { setTemp(Number(slider.value), false); });

  // ---------- Questions ----------
  function renderQuestion() {
    const st = deck.state();
    const done = st.phase === 'summary';
    $('score').textContent = st.scoreLabel;
    FP.ui.progress($('progress'), deckResults(), done ? -1 : st.index, 'Question');
    $('question').hidden = done;
    $('options').hidden = done;
    $('submit').hidden = done || st.phase !== 'choose';
    $('next').hidden = done || st.phase !== 'feedback';
    $('next').textContent = st.isLast ? 'See summary' : 'Next question';
    if (done) return;
    const q = st.card;
    $('question').innerHTML = '';
    const b = document.createElement('b');
    b.textContent = 'Question ' + (st.index + 1) + ' of ' + QUESTIONS.length + ': ';
    $('question').appendChild(b);
    $('question').appendChild(document.createTextNode(q.text));
    const box = $('options');
    box.innerHTML = '';
    q.options.forEach(function (opt, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.dataset.index = String(i);
      let text = (i + 1) + '. ' + opt;
      if (st.phase === 'feedback') {
        btn.disabled = false;
        btn.setAttribute('aria-disabled', 'true');
        if (i === q.answer) { btn.classList.add('ftlr-right'); text = '✓ ' + text + ' (correct)'; }
        else if (lastRes && lastRes.chosen === i) { btn.classList.add('ftlr-wrong'); text = '✗ ' + text + ' (your answer)'; }
      } else {
        btn.setAttribute('aria-pressed', chosen === i ? 'true' : 'false');
      }
      btn.textContent = text;
      btn.addEventListener('click', function () { choose(i); });
      box.appendChild(btn);
    });
    $('submit').disabled = chosen == null;
  }
  function deckResults() {
    const out = QUESTIONS.map(function () { return null; });
    deck.placements.forEach(function (p) { out[QUESTIONS.findIndex(function (q) { return q.id === p.card.id; })] = p.correct ? 'correct' : 'missed'; });
    return out;
  }
  function choose(i) {
    if (deck.state().phase !== 'choose') return;
    const q = deck.state().card;
    if (i < 0 || i >= q.options.length) return;
    chosen = i;
    renderQuestion();
    const btn = $('options').children[i];
    if (btn) btn.focus();
  }
  function submit() {
    if (deck.state().phase !== 'choose' || chosen == null) return;
    const q = deck.state().card;
    const res = deck.place(chosen);
    if (res.status === 'ignored') return;
    lastRes = res;
    highlight = q.rows.slice();
    setTemp(q.temp, false);
    FP.ui.feedback($('feedback'), res.kind, res.message);
    renderQuestion();
    $('next').focus();
  }
  function next() {
    if (deck.state().phase !== 'feedback') return;
    deck.next();
    chosen = null;
    lastRes = null;
    highlight = [];
    chart.update('none');
    if (deck.state().phase === 'summary') showSummary();
    else {
      FP.ui.feedback($('feedback'), 'info', 'Choose an option, then press Submit.', { announce: false });
      renderQuestion();
      const first = $('options').children[0];
      if (first) first.focus();
    }
  }
  function showSummary() {
    const s = deck.summary();
    $('feedback').textContent = '';
    $('feedback').className = 'fp-feedback';
    renderQuestion();
    const el = $('summary');
    el.innerHTML = '';
    const p = document.createElement('p');
    p.style.margin = '0';
    const head = s.lines[0] + '. ' + (s.mastered ? s.lines[1] + ' ' + GOOD : s.lines[1]);
    p.textContent = head.replace('..', '.');
    el.appendChild(p);
    const ol = document.createElement('ol');
    deck.placements.forEach(function (pl) {
      const li = document.createElement('li');
      li.textContent = (pl.correct ? '✓ ' : '✗ ') + pl.card.temp + '°F: ' + pl.card.answerText + '. ' + pl.card.why;
      ol.appendChild(li);
    });
    el.appendChild(ol);
    FP.announce(p.textContent);
    $('prompt').textContent = 'Summary. Move the marker to try other temperatures, or press Start over.';
    $('startOver').focus();
  }
  function startOver() {
    deck.newRound();
    chosen = null; lastRes = null; highlight = [];
    $('summary').innerHTML = '';
    $('summary').textContent = '';
    $('prompt').textContent = 'Move the marker to your job\'s temperature. Which limits does it cross?';
    FP.ui.feedback($('feedback'), 'info', 'Then answer the five questions in order: choose an option and press Submit.', { announce: false });
    setTemp(DEFAULT_T, false);
    renderQuestion();
  }

  $('submit').addEventListener('click', submit);
  $('next').addEventListener('click', next);
  $('startOver').addEventListener('click', startOver);
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    const onButton = t && t.tagName === 'BUTTON';
    if (/^[1-4]$/.test(e.key)) {
      choose(Number(e.key) - 1);
      e.preventDefault();
    } else if (e.key === 'Enter' && !onButton) {
      const ph = deck.state().phase;
      if (ph === 'choose') submit(); else if (ph === 'feedback') next();
      e.preventDefault();
    }
  });
  // Enter on an option button selects it and submits in one step.
  $('options').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const b = e.target.closest('button');
    if (!b || deck.state().phase !== 'choose') return;
    e.preventDefault();
    choose(Number(b.dataset.index));
    submit();
  });

  startOver();
})();
