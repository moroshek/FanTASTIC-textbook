// Bearing Life to Calendar Years - p5.js MicroSim (Chapter 17: Bearing Details, Lubrication and Pedestals)
// CANVAS_HEIGHT: 685
// Five challenges convert an L-10 or L-50 bearing rating to calendar years for a duty schedule,
// then Explore mode unlocks the rating, hours per day, days per week and L-10/L-50 inputs.
// Rules (spec): annual hours = h/day x days/week x 365/7; years = rated hours / annual hours,
// rounded to 0.1 year; L-50 = 5 x L-10; correct when |answer - model| <= 0.02 x model.
// Built on the FanPedia kit: FP.ChallengeRunner (flow, wording, score, mastery), FP.models
// (annualHours, l50FromL10, bearingLifeYears), FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const M = FP.models;
const SIM_ID = 'ch17-bearing-life-calendar-years';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 500;
const controlHeight = K.controlHeightFor(5);   // answer, Start over + rating, 3 slider rows
const canvasHeight = drawHeight + controlHeight;

// ---------- Model (FP.models, 365/7-week year as chapter 17 uses) ----------
const WEEKS = { weeksPerYear: M.WEEKS_CALENDAR };
const annualHours = (h, d) => M.annualHours(h, d, WEEKS);
const ratedHours = (l10, rating) => (rating === 'L-50' ? M.l50FromL10(l10) : l10);
const lifeYears = (l10, rating, h, d) => M.bearingLifeYears(ratedHours(l10, rating), h, d, WEEKS);
const R1 = x => M.round(x, 1);
const fmtH = x => FP.fmt.num(x, 0);
const fmtY = x => FP.fmt.num(R1(x), 1);

// ---------- Challenges (fixed order, two attempts each; spec feedback text) ----------
const CHALLENGE_DATA = [
  { id: 'l10-40k-24-7', l10: 40000, rating: 'L-10', h: 24, d: 7,
    prompt: 'A process fan runs 24 hours a day, 7 days a week on bearings rated L-10 40,000 hours. ' +
            'How many years until 10% of such bearings are expected to fail?',
    wrong: '24 × 7 × 52.14 = 8,760 h per year; 40,000 ÷ 8,760 = 4.6 years.' },
  { id: 'l10-40k-8-5', l10: 40000, rating: 'L-10', h: 8, d: 5,
    prompt: 'The same L-10 40,000-hour bearings are on a fan that runs 8 hours a day, 5 days a week. ' +
            'How many years until 10% of them are expected to fail?',
    wrong: 'Only 2,086 operating hours a year: 40,000 ÷ 2,086 = 19.2 years. Calendar life depends on the schedule.' },
  { id: 'l50-from-l10-20k-24-7', l10: 20000, rating: 'L-50', h: 24, d: 7,
    prompt: 'A bearing is rated L-10 20,000 hours, and its fan runs 24 hours a day, 7 days a week. ' +
            'What is its L-50 (average) life in years?',
    wrong: 'First convert: L-50 = 5 × 20,000 = 100,000 h. Then 100,000 ÷ 8,760 = 11.4 years.' },
  { id: 'l10-60k-16-5', l10: 60000, rating: 'L-10', h: 16, d: 5,
    prompt: 'A fan with bearings rated L-10 60,000 hours runs 16 hours a day, 5 days a week. ' +
            'How many years of L-10 life is that?',
    wrong: '16 × 5 × 52.14 = 4,171 h per year; 60,000 ÷ 4,171 = 14.4 years.' },
  { id: 'l10-100k-12-6', l10: 100000, rating: 'L-10', h: 12, d: 6, illustrative: true,
    prompt: 'Illustrative schedule: a fan with bearings rated L-10 100,000 hours runs 12 hours a day, ' +
            '6 days a week. How many years of L-10 life is that?',
    wrong: '12 × 6 × 52.14 = 3,754 h per year; 100,000 ÷ 3,754 = 26.6 years.' }
];
// First wrong attempt: a hint that names the slip or the step, never the model value or the
// worked numbers (the spec's "Feedback when wrong" text, which has both, is the final-miss "why").
const near = (x, target) => Number.isFinite(x) && target > 0 && Math.abs(x - target) <= 0.03 * target;
function lifeHint(value, it) {
  const rated = ratedHours(it.l10, it.rating);
  const yearly = annualHours(it.h, it.d);
  const years = rated / yearly;
  const steps = 'Annual hours = hours per day × days per week × 365/7; years = rated hours ÷ annual hours.';
  if (it.rating === 'L-50' && near(value, it.l10 / yearly)) {
    return 'That is the L-10 life. Convert the rating to L-50 first (L-50 = 5 × L-10), then divide by the annual hours.';
  }
  if (near(value, years * 365 / 7)) {
    return 'You divided by the hours in one week. Multiply the weekly hours by 365/7 weeks to get annual hours first.';
  }
  if (it.h !== 1 && near(value, years * it.h)) {
    return 'You divided by operating days, not hours. ' + steps;
  }
  if (it.d !== 7 && near(value, years * it.d / 7)) {
    return 'The fan does not run every day. Count only ' + it.d + ' days a week in the annual hours.';
  }
  if (it.h !== 24 && near(value, years * it.h / 24)) {
    return 'The fan does not run around the clock. Use ' + it.h + ' hours a day in the annual hours.';
  }
  if (value > 0 && near(1 / value, years)) {
    return 'Divide the rated hours by the annual hours, not the other way round.';
  }
  return (it.rating === 'L-50' ? 'Convert the L-10 rating to L-50 hours first (L-50 = 5 × L-10). ' : '') + steps;
}

const ITEMS = CHALLENGE_DATA.map(c => {
  const model = R1(lifeYears(c.l10, c.rating, c.h, c.d));   // spec Rules: rounded to 0.1 year
  return Object.assign({}, c, {
    model, unit: 'years', decimals: 1,
    answerText: FP.fmt.num(model, 1) + ' years',
    hint: lifeHint, why: c.wrong
  });
});

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  tolerance: { rel: 0.02 },
  noun: 'Challenges',
  mastery: 4,
  reviewPointer: 'Press Start over to try the five challenges again',
  // Spec: correct reads "Correct: <model answer> years." with no extra text
  messages: { correct: res => FP.msg.correct(res.item.answerText) },
  id: SIM_ID
});

// FanPedia p. 89 published table (the chapter's four rows), for the comparison after challenge 5
const SCHEDULES = [[24, 7], [24, 5], [16, 5], [8, 5], [2, 5]];
const FANPEDIA_TABLE = [
  { rating: 'L-10', hours: 40000, l10: 40000, kind: 'L-10', years: ['4.6', '6.4', '9.6', '19', '77'] },
  { rating: 'L-50', hours: 200000, l10: 40000, kind: 'L-50', years: ['22.8', '32', '48', '96', '385'] },
  { rating: 'L-10', hours: 20000, l10: 20000, kind: 'L-10', years: ['2.3', '3.2', '4.8', '9.6', '39'] },
  { rating: 'L-50', hours: 100000, l10: 20000, kind: 'L-50', years: ['11.5', '16', '24', '48', '193'] }
];

const DEFAULTS = { l10: 40000, h: 24, d: 7, rating: 'L-10' };

// ---------- State ----------
let feedback = null;      // {kind, message}
let typed = null;         // the learner's resolved answer (number)

// ---------- Controls ----------
let answerInput, checkButton, nextButton, startOverButton, ratingSelect;
let l10Slider, hoursSlider, daysSlider;

const keys = K.keys.bind({ Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  answerInput = createInput('');
  answerInput.parent(main);
  answerInput.attribute('inputmode', 'decimal');
  answerInput.attribute('aria-label', 'Your answer in years');

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  ratingSelect = createSelect();
  ratingSelect.option('L-10', 'L-10');
  ratingSelect.option('L-50', 'L-50');
  ratingSelect.parent(main);
  ratingSelect.attribute('aria-label', 'Rating shown');
  ratingSelect.changed(onInputChanged);

  l10Slider = createSlider(20000, 100000, DEFAULTS.l10, 20000);
  l10Slider.parent(main);
  l10Slider.attribute('aria-label', 'L-10 rating, hours');
  hoursSlider = createSlider(1, 24, DEFAULTS.h, 1);
  hoursSlider.parent(main);
  hoursSlider.attribute('aria-label', 'Hours per day');
  daysSlider = createSlider(1, 7, DEFAULTS.d, 1);
  daysSlider.parent(main);
  daysSlider.attribute('aria-label', 'Days per week');
  for (const s of [l10Slider, hoursSlider, daysSlider]) { s.input(onInputChanged); }

  setInputs(ITEMS[0]);
  syncControls();

  describe('Bearing life to calendar years. Five challenges give an L-10 or L-50 bearing rating and a ' +
    'duty schedule; the learner types the expected life in years and presses Check. A week grid shows ' +
    'the operating hours, and after each answer the sim shows the annual operating hours, the model ' +
    'answer and the learner answer side by side, with bars comparing L-10 and L-50 years. After ' +
    'challenge 5, Explore mode unlocks sliders for the L-10 rating, hours per day and days per week, ' +
    'a rating selector, and a table comparing FanPedia published values with the model.');
}

// ---------- Inputs ----------
function inputs() {
  return { l10: Number(l10Slider.value()), h: Number(hoursSlider.value()), d: Number(daysSlider.value()),
    rating: ratingSelect.value() };
}

function setInputs(v) {
  l10Slider.value(v.l10);
  hoursSlider.value(v.h);
  daysSlider.value(v.d);
  ratingSelect.selected(v.rating);
}

let lastAnnounced = '';
function onInputChanged() {
  if (!runner.state().explore) { return; }
  const v = inputs();
  const yrs = lifeYears(v.l10, v.rating, v.h, v.d);
  const text = v.rating + ' ' + fmtH(ratedHours(v.l10, v.rating)) + ' hours at ' + v.h + ' h/day, ' + v.d +
    ' days/week: ' + fmtH(annualHours(v.h, v.d)) + ' hours a year, ' + fmtY(yrs) + ' years.';
  if (text !== lastAnnounced) { lastAnnounced = text; FP.announce(text); }
}

// ---------- Control state and layout ----------
function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    answerInput.hide(); checkButton.hide(); nextButton.hide();
  } else {
    answerInput.show();
    K.setEnabled(answerInput, asking);
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    const label = st.phase === 'resolved' && st.isLast ? 'Start exploring' : 'Next challenge';
    nextButton.html(canvasWidth < 360 ? (st.isLast ? 'Explore' : 'Next') : label);
    nextButton.attribute('aria-label', label);
  }
  for (const c of [l10Slider, hoursSlider, daysSlider, ratingSelect]) { K.setEnabled(c, st.explore); }
  positionControls();
}

function narrow() { return canvasWidth < 480; }
function sliderLeft() { return narrow() ? 172 : 230; }

function positionControls() {
  const n = narrow();
  const inputX = n ? 104 : 118;
  answerInput.size(n ? 70 : 100);
  answerInput.position(inputX, K.controlRow(0));
  const bx = inputX + (answerInput.elt.offsetWidth || 100) + (n ? 50 : 58);
  checkButton.position(bx, K.controlRow(0));
  nextButton.position(bx, K.controlRow(0));
  startOverButton.position(10, K.controlRow(1));
  const sw = startOverButton.elt.offsetWidth || 90;
  const rx = 10 + sw + (n ? 12 : 24) + (n ? 64 : 104);
  ratingSelect.position(rx, K.controlRow(1));
  const w = K.sliderWidth(canvasWidth, sliderLeft(), 15);
  [l10Slider, hoursSlider, daysSlider].forEach((s, i) => {
    s.position(sliderLeft(), K.controlRow(2 + i) + 4);
    s.size(w);
  });
}

// ---------- Challenge flow ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') { checkAnswer(); } else if (st.phase === 'resolved') { nextChallenge(); }
}

function checkAnswer() {
  const res = runner.submit(answerInput.value());
  if (res.status === 'ignored') { return; }
  feedback = { kind: res.kind, message: res.message };
  if (res.status === 'correct' || res.status === 'missed') {
    typed = res.value;
    syncControls();
    const it = res.item;
    FP.announce(res.message + ' Annual operating hours: ' + fmtH(annualHours(it.h, it.d)) +
      '. Model answer ' + it.answerText + '. Your answer ' + FP.fmt.numUpTo(res.value, 2) + ' years.');
    nextButton.elt.focus();
  } else {
    FP.announce(res.message);
  }
}

function nextChallenge() {
  if (!runner.next()) { return; }
  feedback = null;
  typed = null;
  const st = runner.state();
  if (st.explore) {
    setInputs(DEFAULTS);
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' ' + FP.msg.EXPLORE + ': the rating and schedule inputs are unlocked, ' +
      'and the FanPedia comparison table is shown.');
    l10Slider.elt.focus();
  } else {
    setInputs(st.item);
    answerInput.value('');
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + ': ' + st.item.prompt);
    answerInput.elt.focus();
  }
}

function startOver() {
  runner.restart();
  feedback = null;
  typed = null;
  lastAnnounced = '';
  setInputs(ITEMS[0]);
  answerInput.value('');
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = runner.state();
  let y = K.title('Bearing Life to Calendar Years');
  const right = st.explore ? FP.msg.EXPLORE + ' (not scored)'
    : 'Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? ' · ' + st.attemptLabel : '');
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  const item = st.item;
  const notes = (!st.explore && item.illustrative) ? ['Illustrative schedule', 'Source: FanPedia p. 89']
    : ['Source: FanPedia p. 89', '365/7 weeks per year'];
  if (canvasWidth >= 560 && !st.explore) { notes.push('Enter: check or next'); }
  K.note(notes);

  const top = y + 2;
  const bottom = drawHeight - 24;
  const wide = canvasWidth >= 640;
  const v = st.explore ? inputs() : { l10: item.l10, h: item.h, d: item.d, rating: item.rating };
  const reveal = st.explore || st.phase === 'resolved';

  if (wide) {
    const bandH = st.explore ? 182 : 150;
    const topH = bottom - top - bandH - 8;
    const leftW = Math.round(canvasWidth * 0.55);
    const A = { x: 10, y: top, w: leftW - 15, h: topH };
    const B = { x: leftW + 5, y: top, w: canvasWidth - leftW - 15, h: topH };
    const C = { x: 10, y: top + topH + 8, w: canvasWidth - 20, h: bandH };
    K.panel(A.x, A.y, A.w, A.h);
    K.panel(B.x, B.y, B.w, B.h);
    K.panel(C.x, C.y, C.w, C.h);
    drawTextPanel(A, st);
    drawSchedulePanel(B, v, reveal);
    if (st.explore) { drawFanPediaTable(C); } else { drawCalcPanel(C, st, v, reveal); }
  } else {
    // narrow: text panel, then a strip with the week grid and bars, then the calc or table
    const bandH = st.explore ? 150 : 108;
    const stripH = 110;
    const topH = bottom - top - bandH - stripH - 12;
    const A = { x: 8, y: top, w: canvasWidth - 16, h: topH };
    const B = { x: 8, y: top + topH + 6, w: canvasWidth - 16, h: stripH };
    const C = { x: 8, y: B.y + stripH + 6, w: canvasWidth - 16, h: bandH };
    K.panel(A.x, A.y, A.w, A.h);
    K.panel(B.x, B.y, B.w, B.h);
    K.panel(C.x, C.y, C.w, C.h);
    drawTextPanel(A, st);
    drawSchedulePanel(B, v, reveal);
    if (st.explore) { drawFanPediaTable(C); } else { drawCalcPanel(C, st, v, reveal); }
  }
  drawControlLabels(st);
}

// Paragraph list {t, bold, color, gap, box} laid out in w; returns the y below (dry = measure only)
function paras(list, x, y, w, ts, dry) {
  const lead = Math.round(ts * 1.3);
  for (const p of list) {
    y += p.gap || 0;
    textSize(ts);
    textStyle(p.bold ? BOLD : NORMAL);
    if (p.box) {
      const pad = 6;
      const h = K.countLines(p.t, w - 2 * pad) * lead + 2 * pad;
      if (!dry) {
        const ok = p.box === 'ok';
        K.panel(x - 2, y, w + 4, h, {
          fill: ok ? '--fp-correct-bg' : (p.box === 'bad' ? '--fp-incorrect-bg' : '--fp-info-bg'),
          stroke: ok ? '--fp-correct' : (p.box === 'bad' ? '--fp-incorrect' : '--fp-border'),
          dashed: p.box === 'bad', weight: p.box === 'info' ? 1 : 2, radius: 6
        });
        noStroke();
        fill(ok ? FP.tok('correct') : (p.box === 'bad' ? FP.tok('incorrect') : FP.tok('text')));
        K.wrapText(p.t, x + pad, y + pad, w - 2 * pad, lead);
      }
      y += h;
    } else {
      if (!dry) { noStroke(); fill(p.color || FP.tok('text')); }
      y = K.wrapText(p.t, x, y, w, lead, { dryRun: dry });
    }
  }
  textStyle(NORMAL);
  return y;
}

function fitParas(list, box, max) {
  const x = box.x + 10, y = box.y + 8, w = box.w - 20, h = box.h - 14;
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => paras(list, x, y, w, t, true) - y, h, max || 16, 12);
  paras(list, x, y, w, ts, false);
}

function drawTextPanel(box, st) {
  const list = [];
  if (!st.explore) {
    list.push({ t: st.item.prompt });
    if (feedback && feedback.message) {
      list.push({ t: (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message, box: feedback.kind, gap: 8 });
    }
    list.push({ t: st.exploreLabel, color: FP.tok('text-muted'), gap: 8 });
  } else {
    const s = runner.summary();
    list.push({ t: s.lines[0], bold: true });
    list.push({ t: s.lines[1], bold: s.mastered, color: s.mastered ? FP.tok('primary') : FP.tok('text') });
    if (s.misses.length) {
      list.push({ t: 'Missed: challenge ' + s.misses.map(m => m.index + 1).join(', ') + '.',
        color: FP.tok('text-muted') });
    }
    const v = inputs();
    const ah = annualHours(v.h, v.d);
    const rh = ratedHours(v.l10, v.rating);
    list.push({ t: 'Annual hours = ' + v.h + ' × ' + v.d + ' × 365/7 = ' + fmtH(ah) + ' h', gap: 8 });
    if (v.rating === 'L-50') { list.push({ t: 'L-50 = 5 × ' + fmtH(v.l10) + ' = ' + fmtH(rh) + ' h' }); }
    list.push({ t: v.rating + ' life = ' + fmtH(rh) + ' ÷ ' + fmtH(ah) + ' = ' + fmtY(rh / ah) + ' years',
      bold: true });
    if (canvasWidth >= 640) {
      list.push({ t: 'Switch Rating shown between L-10 and L-50: the years change by exactly five times, ' +
        'but the bearing is the same.', color: FP.tok('text-muted'), gap: 6 });
    }
  }
  fitParas(list, box, 16);
}

// Week grid (7 days x 24 hours, operating hours filled) and L-10 / L-50 bars
function drawSchedulePanel(box, v, reveal) {
  const wide = canvasWidth >= 640;
  const ink = FP.tok('text');
  noStroke();
  fill(ink);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(wide ? 15 : 13);
  text(wide ? 'One week of operation' : 'One week', box.x + 10, box.y + 8);
  textStyle(NORMAL);

  // grid geometry
  let gx, gy, gw, gh;
  if (wide) {
    gx = box.x + 38; gy = box.y + 32; gw = Math.min(box.w * 0.4, 150); gh = 96;
  } else {
    gx = box.x + 30; gy = box.y + 26; gw = Math.min(150, box.w * 0.42); gh = box.h - 42;
  }
  const cw = gw / 7, ch = gh / 24;
  noStroke();
  fill(255);
  rect(gx, gy, gw, gh);
  fill(FP.tok('primary'));
  for (let day = 0; day < v.d; day++) { rect(gx + day * cw, gy, cw, v.h * ch); }
  stroke(FP.tok('border'));
  strokeWeight(1);
  for (let day = 1; day < 7; day++) { line(gx + day * cw, gy, gx + day * cw, gy + gh); }
  for (let hr = 6; hr < 24; hr += 6) { line(gx, gy + hr * ch, gx + gw, gy + hr * ch); }
  noFill();
  stroke(FP.tok('text-muted'));
  strokeWeight(1);
  rect(gx, gy, gw, gh);
  noStroke();
  fill(ink);
  textSize(12);
  textAlign(CENTER, TOP);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  for (let i = 0; i < 7; i++) { text(days[i], gx + (i + 0.5) * cw, gy + gh + 2); }
  textAlign(RIGHT, CENTER);
  text('0 h', gx - 4, gy + 5);
  text('24 h', gx - 4, gy + gh - 5);

  // weekly and annual hours
  const weekly = v.h * v.d;
  const ah = annualHours(v.h, v.d);
  const tx = wide ? gx + gw + 14 : gx + gw + 12;
  const tw = box.x + box.w - 8 - tx;
  textAlign(LEFT, TOP);
  textSize(wide ? 13 : 12);
  fill(ink);
  let ty = wide ? gy : box.y + 8;
  const lines = wide ? [
    v.h + ' h/day × ' + v.d + ' d',
    '= ' + weekly + ' h/week',
    'Per year: ' + (reveal ? fmtH(ah) + ' h' : '?')
  ] : [
    v.h + ' × ' + v.d + ' = ' + weekly + ' h/week',
    'Per year: ' + (reveal ? fmtH(ah) + ' h' : '?')
  ];
  for (const l of lines) { ty = K.wrapText(l, tx, ty, tw, wide ? 18 : 15, { maxLines: 1 }); }

  // bars: L-10 and L-50 years for the same bearing
  const l10y = lifeYears(v.l10, 'L-10', v.h, v.d);
  const l50y = lifeYears(v.l10, 'L-50', v.h, v.d);
  let bx, by, bw, bh, pitch;
  if (wide) {
    bx = box.x + 10; by = gy + gh + 20; bw = box.w - 20; bh = 15; pitch = 36;
  } else {
    bx = tx; by = ty + 6; bw = tw; bh = 11; pitch = 31;
  }
  const rows = [['L-10', l10y], ['L-50', l50y]];
  const maxY = l50y;
  textSize(wide ? 13 : 12);
  rows.forEach((r, i) => {
    const yy = by + i * pitch;
    const shown = reveal;
    const isRating = r[0] === v.rating;
    fill(ink);
    textStyle(isRating ? BOLD : NORMAL);
    textAlign(LEFT, TOP);
    const label = r[0] + (isRating && canvasWidth >= 400 ? ' (shown)' : '') + ': ' +
      (reveal ? fmtY(r[1]) + ' years' : '? years');
    text(label, bx, yy);
    textStyle(NORMAL);
    const barY = yy + (wide ? 17 : 14);
    stroke(FP.tok('border'));
    strokeWeight(1);
    fill(255);
    rect(bx, barY, bw, bh, 3);
    if (shown) {
      noStroke();
      fill(isRating ? FP.tok('primary') : FP.tok('series-2'));
      rect(bx, barY, Math.max(2, bw * r[1] / maxY), bh, 3);
      if (!isRating) {   // pattern so the two bars differ by more than colour
        stroke(255);
        strokeWeight(1);
        for (let k = bx + 6; k < bx + bw * r[1] / maxY - 2; k += 6) { line(k, barY + bh - 2, k + 4, barY + 2); }
      }
    }
  });
  noStroke();
}

function drawCalcPanel(box, st, v, reveal) {
  const ink = FP.tok('text');
  const x = box.x + 10, w = box.w - 20;
  noStroke();
  textAlign(LEFT, TOP);
  if (!reveal) {
    const list = [
      { t: 'The conversion', bold: true },
      { t: 'Annual hours = hours per day × days per week × 365/7' },
      { t: 'Years = rated hours ÷ annual hours' },
      { t: 'L-50 hours = 5 × L-10 hours' },
      { t: 'Type your answer in years below and press Check. The annual hours, the model answer and ' +
           'your answer appear here side by side.', color: FP.tok('text-muted'), gap: 4 }
    ];
    fitParas(list, box, 15);
    return;
  }
  const it = st.item;
  const ah = annualHours(it.h, it.d);
  const rh = ratedHours(it.l10, it.rating);
  // three readout cells side by side
  const ok = st.results[st.index] === 'correct';
  const cells = [
    ['Annual operating hours', fmtH(ah) + ' h', null],
    ['Model answer', it.answerText, null],
    ['Your answer', FP.fmt.numUpTo(typed, 2) + ' years', ok ? 'ok' : 'bad']
  ];
  const gap = 8;
  const cw = (w - 2 * gap) / 3;
  const cellH = canvasWidth >= 640 ? 54 : 46;
  cells.forEach((c, i) => {
    const cx = x + i * (cw + gap);
    const kind = c[2];
    K.panel(cx, box.y + 8, cw, cellH, {
      fill: kind === 'ok' ? '--fp-correct-bg' : (kind === 'bad' ? '--fp-incorrect-bg' : '--fp-primary-bg'),
      stroke: kind === 'ok' ? '--fp-correct' : (kind === 'bad' ? '--fp-incorrect' : '--fp-border'),
      dashed: kind === 'bad', weight: kind ? 2 : 1, radius: 6
    });
    noStroke();
    fill(FP.tok('text-muted'));
    textSize(12);
    textAlign(CENTER, TOP);
    text(fitLabel(c[0], cw - 8, 12), cx + cw / 2, box.y + 13);
    textStyle(BOLD);
    let ts = canvasWidth >= 640 ? 18 : 15;
    const val = (kind === 'ok' ? FP.msg.OK + ' ' : kind === 'bad' ? FP.msg.BAD + ' ' : '') + c[1];
    textSize(ts);
    while (ts > 12 && textWidth(val) > cw - 8) { textSize(--ts); }
    fill(kind === 'ok' ? FP.tok('correct') : (kind === 'bad' ? FP.tok('incorrect') : ink));
    text(val, cx + cw / 2, box.y + (canvasWidth >= 640 ? 32 : 28));
    textStyle(NORMAL);
  });
  const calc = [];
  const full = canvasWidth >= 400;
  if (it.rating === 'L-50') { calc.push('L-50 = 5 × ' + fmtH(it.l10) + ' = ' + fmtH(rh) + ' h.'); }
  calc.push((full ? 'Annual hours = ' : '') + it.h + ' × ' + it.d + ' × 365/7 = ' + fmtH(ah) + ' h.');
  calc.push((full ? 'Years = ' : '') + fmtH(rh) + ' ÷ ' + fmtH(ah) + ' = ' + it.answerText + '.');
  const sub = { x: box.x, y: box.y + cellH + 10, w: box.w, h: box.h - cellH - 12 };
  fitParas([{ t: calc.join(' '), color: ink }], sub, 15);
}

function fitLabel(s, w, ts) {
  textSize(ts);
  if (textWidth(s) <= w) { return s; }
  const short = { 'Annual operating hours': 'Annual hours', 'Model answer': 'Model', 'Your answer': 'You' };
  return short[s] || s;
}

// FanPedia p. 89 values beside the model (shown after challenge 5)
function drawFanPediaTable(box) {
  const wide = canvasWidth >= 640;
  const ink = FP.tok('text');
  noStroke();
  fill(ink);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(wide ? 14 : 13);
  const head = wide ? 'FanPedia p. 89 published years vs. the model (365/7 weeks a year)' : 'FanPedia p. 89 vs. model';
  text(head, box.x + 10, box.y + 7);
  textStyle(NORMAL);
  const x0 = box.x + 8, x1 = box.x + box.w - 8;
  const firstW = wide ? 130 : 62;
  const colW = (x1 - x0 - firstW) / SCHEDULES.length;
  const y0 = box.y + (wide ? 28 : 26);
  const rowH = wide ? 29 : 25;
  textSize(12);
  fill(FP.tok('text-muted'));
  textAlign(LEFT, TOP);
  text(wide ? 'Rating, hours' : 'Rating', x0 + 2, y0);
  textAlign(CENTER, TOP);
  SCHEDULES.forEach((s, i) => text(s[0] + ' h × ' + s[1] + (wide ? ' days' : 'd'), x0 + firstW + (i + 0.5) * colW, y0));
  stroke(FP.tok('border'));
  line(x0, y0 + 16, x1, y0 + 16);
  noStroke();
  const v = runner.state().explore ? inputs() : null;
  FANPEDIA_TABLE.forEach((row, r) => {
    const yy = y0 + 20 + r * rowH;
    const current = v && v.l10 === row.l10 && v.rating === row.kind;
    if (current) {
      fill(FP.tok('primary-bg'));
      rect(x0, yy - 2, x1 - x0, rowH - 2, 4);
    }
    fill(ink);
    textAlign(LEFT, TOP);
    textStyle(current ? BOLD : NORMAL);
    textSize(wide ? 13 : 12);
    text(wide ? row.rating + ' ' + fmtH(row.hours) + ' h' : row.rating + ' ' + (row.hours / 1000) + 'k', x0 + 2, yy + 1);
    textStyle(NORMAL);
    SCHEDULES.forEach((s, i) => {
      const cx = x0 + firstW + (i + 0.5) * colW;
      const model = row.hours / annualHours(s[0], s[1]);
      textAlign(CENTER, TOP);
      textSize(13);
      fill(ink);
      text(row.years[i], cx, yy);
      textSize(12);
      fill(FP.tok('text-muted'));
      text((wide ? 'model ' : '') + fmtY(model), cx, yy + 13);
    });
  });
}

function drawControlLabels(st) {
  const n = narrow();
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(n ? 14 : 16);
  fill(FP.tok('text'));
  const rowMid = r => K.controlRow(r) + 14;
  if (!st.explore) {
    text('Your answer:', 10, rowMid(0));
    fill(FP.tok('text'));
    const unitX = (answerInput.elt.offsetLeft || 118) + (answerInput.elt.offsetWidth || 100) + 6;
    text('years', unitX, rowMid(0));
  } else {
    text(FP.msg.EXPLORE + ': change any input below.', 10, rowMid(0));
  }
  const sw = startOverButton.elt.offsetWidth || 90;
  fill(FP.tok(st.explore ? 'text' : 'text-muted'));
  text(n ? 'Rating:' : 'Rating shown:', 10 + sw + (n ? 12 : 24), rowMid(1));
  const v = inputs();
  fill(FP.tok(st.explore ? 'text' : 'text-muted'));
  textSize(n ? 14 : 16);
  text('L-10 rating: ' + fmtH(v.l10) + ' h', 10, K.controlLabel(2));
  text('Hours per day: ' + v.h, 10, K.controlLabel(3));
  text('Days per week: ' + v.d, 10, K.controlLabel(4));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  syncControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
