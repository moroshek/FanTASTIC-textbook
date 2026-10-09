// Octave Band A-Weighting Calculator - p5.js MicroSim
// CANVAS_HEIGHT: 795
// Chapter 27: Fan Selection and Writing the Specification (Octave Band Sound Data).
// Three fixed challenges: type the overall A-weighted sound power level of an eight-band
// spectrum and choose "meets" or "exceeds" the limit; then free mode with eight band
// sliders and a limit slider. Built on the FanPedia kit: FP.ChallengeRunner (flow,
// wording, score, mastery), FP.models.aWeighting / logSumDb (the A-weighting model),
// FP.p5 (layout, text, controls, keys).
// Rules (spec): weighted band = band level + correction; LwA = 10 log10(sum 10^(weighted/10)),
// rounded to 0.1 dB; verdict "meets" when LwA <= limit. Correct = within 0.5 dB AND the
// right verdict. Largest contributor = highest weighted band, ties to the lower frequency.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-models.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const M = FP.models;
const SIM_ID = 'ch27-octave-band-a-weighting';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 540;
const controlHeight = K.controlHeightFor(7);   // answer, buttons, 4 band-slider rows, limit
const canvasHeight = drawHeight + controlHeight;

// ---------- Data (illustrative spectra; IEC 61672 octave-band A-weighting) ----------
const BANDS = M.OCTAVE_BANDS_HZ;               // 63 ... 8,000 Hz
const CORR = M.A_WEIGHTING_DB;                 // -26.2 ... -1.1 dB
const BAND_SHORT = ['63', '125', '250', '500', '1k', '2k', '4k', '8k'];
const DATA_NOTE = FP.msg.note('Illustrative spectra', 'A-weighting: IEC 61672 octave-band values');
const TOL_DB = 0.5;

const CHALLENGE_DATA = [
  { id: 'worked-example', bands: [98, 96, 94, 90, 87, 83, 78, 72], limit: 95,
    wrong: 'Weight each band first, then add as 10·log10 of the sum of 10^(L/10); ' +
           'the 500 and 1,000 Hz bands dominate.',
    step: 'Weight each band first, then add as 10·log10 of the sum of 10^(L/10); look at which weighted bands are largest.' },
  { id: 'mid-band-heavy', bands: [90, 92, 95, 97, 96, 93, 88, 82], limit: 95,
    wrong: 'After weighting, the 500 to 2,000 Hz bands sit near 94 to 96 dB each; three or ' +
           'four bands near 95 dB add to well over 95.',
    step: 'Weight each band first, then add logarithmically: several bands of similar weighted level add to more than any one of them.' },
  { id: 'low-band-heavy', bands: [105, 100, 92, 86, 82, 78, 74, 68], limit: 95,
    wrong: 'The 105 dB at 63 Hz drops to 78.8 dB after weighting; a loud low band does not ' +
           'control an A-weighted total.',
    step: 'Apply the A-weighting correction to every band before adding; check how much the 63 Hz correction takes off the loudest band.' }
];

const ITEMS = CHALLENGE_DATA.map((c, i) => {
  const r = M.aWeighting(c.bands);
  const lwa = M.round(r.lwa, 1);                // model value, rounded to 0.1 dB (spec Rules)
  const verdict = lwa <= c.limit ? 'meets' : 'exceeds';
  return Object.assign({}, c, {
    label: 'challenge ' + (i + 1),
    prompt: 'What is the A-weighted overall level, and does it meet ' + c.limit + ' dB?',
    lwa, verdict, result: r,
    answerText: 'LwA = ' + FP.fmt.num(lwa, 1) + ' dB, which ' + verdict + ' the ' + c.limit + ' dB limit',
    check: (v, item) => Math.abs(v.lwa - item.lwa) <= TOL_DB + 1e-9 && v.verdict === item.verdict,
    hint: (v, item) => diagnose(v, item) || item.step,
    why: (v, item) => (item.check(v, item) ? '' : item.wrong)
  });
});

// Hint after a first wrong attempt (misconceptions 1 and 3): the slip the typed level points to,
// else the challenge's step. It never states the weighted bands or the overall level (and gives
// the verdict only in the level-right case below); the spec's "Feedback when wrong" text (item.wrong) comes with the answer when missed.
function diagnose(v, item) {
  const r = item.result;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const near = x => Math.abs(v.lwa - x) <= TOL_DB;
  const levelOk = Math.abs(v.lwa - item.lwa) <= TOL_DB + 1e-9;
  // Level right, verdict wrong: with only two choices any hint would give the verdict away, so the
  // hint openly teaches the comparison instead (the calculation is the skill being scored).
  if (levelOk) {
    return 'Your level is right. Now compare it with the ' + item.limit + ' dB limit: meets means at or below the limit, exceeds means above it.';
  }
  if (near(r.unweighted)) return 'That is the unweighted total: apply each band\'s A-weighting correction before adding.';
  if (near(mean(item.bands)) || near(mean(r.weighted))) {
    return 'That is an arithmetic average: decibels add as 10·log10 of the sum of 10^(L/10).';
  }
  if (near(Math.max(...r.weighted)) || near(Math.max(...item.bands))) {
    return 'That is the loudest band alone: add all eight weighted bands logarithmically.';
  }
  return '';
}

const runner = new FP.ChallengeRunner({
  items: ITEMS,
  attempts: 2,
  noun: 'Challenges',
  mastery: ITEMS.length,
  reviewPointer: 'Press Start over to try the three challenges again.',
  id: SIM_ID
});

// ---------- State ----------
let feedback = null;     // {kind, message}
let answerLine = '';
let lastBandsShown = null;

// ---------- Controls ----------
let answerInput, verdictRadio, checkButton, nextButton, startOverButton, resetButton;
let bandSliders = [], limitSlider;

const keys = K.keys.bind({ Enter: onEnter, m: () => setVerdict('meets'), e: () => setVerdict('exceeds') });
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
  answerInput.attribute('autocomplete', 'off');
  answerInput.attribute('aria-label', 'Your A-weighted overall level, dB');
  verdictRadio = K.radio([['meets', 'Meets'], ['exceeds', 'Exceeds']],
    { name: 'verdict', label: 'Does it meet the limit?' });

  checkButton = K.button(FP.msg.CHECK, checkAnswer);
  nextButton = K.button('Next challenge', nextChallenge);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  resetButton = K.button('Reset bands', resetBands, { variant: 'secondary' });

  for (let i = 0; i < BANDS.length; i++) {
    const s = createSlider(50, 110, ITEMS[0].bands[i], 1);
    s.parent(main);
    s.attribute('aria-label', FP.fmt.num(BANDS[i]) + ' Hz band sound power level, dB');
    bandSliders.push(s);
  }
  limitSlider = createSlider(70, 110, 95, 1);
  limitSlider.parent(main);
  limitSlider.attribute('aria-label', 'A-weighted limit, dB');

  showChallengeBands();
  syncControls();

  describe('Octave band A-weighting calculator. A bar chart shows a fan\'s sound power in eight ' +
    'octave bands from 63 to 8,000 Hz. For three challenges the learner types the overall ' +
    'A-weighted level and chooses whether it meets a 95 dB limit; Check reveals the weighted ' +
    'bands, the A-weighted and unweighted totals and the largest contributing band. Free mode ' +
    'then unlocks eight band sliders and a limit slider.');
}

// ---------- Control state and layout ----------
function exploring() { return runner.state().explore; }
function narrowControls() { return canvasWidth < 560; }

function syncControls() {
  const st = runner.state();
  const asking = st.phase === 'question';
  if (st.explore) {
    answerInput.hide(); verdictRadio.hide(); checkButton.hide(); nextButton.hide(); resetButton.show();
  } else {
    answerInput.show(); verdictRadio.show(); resetButton.hide();
    K.setEnabled(answerInput, asking);
    verdictRadio.elt.querySelectorAll('input').forEach(i => { i.disabled = !asking; });
    if (asking) { checkButton.show(); nextButton.hide(); } else { checkButton.hide(); nextButton.show(); }
    nextButton.html(st.phase === 'resolved' && st.isLast ? 'Start free mode' : 'Next challenge');
  }
  for (const s of bandSliders.concat([limitSlider])) K.setEnabled(s, st.explore);
  positionControls();
}

function labelW() { return narrowControls() ? 80 : 112; }

function positionControls() {
  const narrow = narrowControls();
  // Row 0: answer box and meets/exceeds
  const ax = narrow ? 84 : 92;
  answerInput.size(narrow ? 60 : 80);
  answerInput.position(ax, K.controlRow(0));
  verdictRadio.position(ax + (answerInput.elt.offsetWidth || 70) + 12, K.controlRow(0) + 4);
  // Row 1: Check / Next (same slot), Start over; Reset bands in free mode
  checkButton.position(10, K.controlRow(1));
  nextButton.position(10, K.controlRow(1));
  const st = runner.state();
  const firstW = st.explore ? 0 : ((st.phase === 'question' ? checkButton : nextButton).elt.offsetWidth || 70) + 8;
  if (st.explore) resetButton.position(10, K.controlRow(1));
  const soX = st.explore ? 10 + (resetButton.elt.offsetWidth || 100) + 8 : 10 + firstW;
  startOverButton.position(soX, K.controlRow(1));
  // Rows 2-5: band sliders, two columns
  const colW = (canvasWidth - 20) / 2;
  bandSliders.forEach((s, i) => {
    const col = i < 4 ? 0 : 1, row = 2 + (i % 4);
    const x = 10 + col * colW + labelW();
    s.position(x, K.controlRow(row) + 2);
    s.size(max(60, colW - labelW() - 12));
  });
  // Row 6: limit
  limitSlider.position(10 + labelW(), K.controlRow(6) + 2);
  limitSlider.size(max(80, min(320, canvasWidth - labelW() - 30)));
}

function setVerdict(v) {
  if (runner.state().phase !== 'question') return;
  const i = verdictRadio.elt.querySelector('input[value="' + v + '"]');
  if (i) { i.checked = true; i.focus(); }
}
function verdictValue() {
  const i = verdictRadio.elt.querySelector('input:checked');
  return i ? i.value : '';
}
function clearVerdict() { verdictRadio.elt.querySelectorAll('input').forEach(i => { i.checked = false; }); }

function showChallengeBands() {
  const item = runner.state().item;
  if (!item) return;
  item.bands.forEach((b, i) => bandSliders[i].value(b));
  limitSlider.value(item.limit);
}

// ---------- Challenge flow (FP.ChallengeRunner) ----------
function onEnter() {
  const st = runner.state();
  if (st.phase === 'question') checkAnswer();
  else if (st.phase === 'resolved') nextChallenge();
}

function checkAnswer() {
  const raw = answerInput.value();
  const lwa = FP.fmt.parseNumber(raw);
  const verdict = verdictValue();
  if (isNaN(lwa) || !verdict) {
    const parts = [];
    if (isNaN(lwa)) parts.push('Enter a number for the A-weighted level');
    if (!verdict) parts.push('choose Meets or Exceeds');
    let m = parts.join(' and ') + '.';
    m = m.charAt(0).toUpperCase() + m.slice(1);
    feedback = { kind: 'info', message: m };
    FP.announce(m);
    return;
  }
  const res = runner.submit({ lwa, verdict });
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  if (res.status === 'correct' || res.status === 'missed') {
    const item = res.item;
    const typedDecimals = Math.min(2, (String(raw).replace(/,/g, '').trim().split('.')[1] || '').length);
    answerLine = 'Your answer: ' + FP.fmt.num(lwa, typedDecimals) + ' dB, ' + verdict +
      ' · Model: ' + FP.fmt.num(item.lwa, 1) + ' dB, ' + item.verdict;
    syncControls();
    nextButton.elt.focus();
  }
}

function nextChallenge() {
  if (!runner.next()) return;
  feedback = null;
  answerLine = '';
  answerInput.value('');
  clearVerdict();
  const st = runner.state();
  if (st.explore) {
    ITEMS[0].bands.forEach((b, i) => bandSliders[i].value(b));
    limitSlider.value(95);
    syncControls();
    const s = runner.summary();
    FP.announce(s.lines.join(' ') + ' Free mode: the band and limit sliders are unlocked.');
    bandSliders[0].elt.focus();
  } else {
    showChallengeBands();
    syncControls();
    FP.announce('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length + '. Bands ' +
      st.item.bands.join(', ') + ' dB. ' + st.item.prompt);
    answerInput.elt.focus();
  }
}

function resetBands() {
  ITEMS[0].bands.forEach((b, i) => bandSliders[i].value(b));
  limitSlider.value(95);
  FP.announce('Bands reset to challenge 1 values; limit 95 dB.');
}

function startOver() {
  runner.restart();
  feedback = null;
  answerLine = '';
  answerInput.value('');
  clearVerdict();
  showChallengeBands();
  syncControls();
  FP.announce('Started over. Challenge 1 of ' + ITEMS.length + ': ' + ITEMS[0].prompt);
  answerInput.elt.focus();
}

// ---------- Model for what is on screen ----------
function currentSpectrum() {
  const st = runner.state();
  if (st.explore) {
    return { bands: bandSliders.map(s => s.value()), limit: limitSlider.value() };
  }
  return { bands: st.item.bands, limit: st.item.limit };
}
function revealed() {
  const st = runner.state();
  return st.explore || st.phase === 'resolved';
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const wide = canvasWidth >= 640;
  const spec = currentSpectrum();
  const r = M.aWeighting(spec.bands);
  const show = revealed();
  K.title('Octave Band A-Weighting Calculator');

  const tableH = 4 * (wide ? 21 : 18) + 8;
  let chart, table, panel;
  if (wide) {
    const leftW = floor(canvasWidth * 0.54);
    chart = { x: 10, y: 44, w: leftW - 10, h: drawHeight - 44 - tableH - 34 };
    table = { x: 10, y: chart.y + chart.h + 6, w: leftW - 10, h: tableH };
    panel = { x: leftW + 10, y: 44, w: canvasWidth - leftW - 20, h: drawHeight - 44 - 26 };
  } else {
    chart = { x: 10, y: 40, w: canvasWidth - 20, h: 140 };
    table = { x: 10, y: chart.y + chart.h + 4, w: canvasWidth - 20, h: tableH };
    const py = table.y + table.h + 6;
    panel = { x: 10, y: py, w: canvasWidth - 20, h: drawHeight - py - 24 };
  }
  drawChart(chart, spec, r, show, wide);
  drawTable(table, spec, r, show, wide);
  drawPanel(panel, spec, r, show, wide);
  K.note(DATA_NOTE, { y: drawHeight - 8 });
  drawControlLabels(spec);
}

function drawChart(c, spec, r, show, wide) {
  K.panel(c.x, c.y, c.w, c.h, { radius: 6 });
  const x0 = c.x + 34, x1 = c.x + c.w - 8;
  const y0 = c.y + (wide ? 30 : 24), y1 = c.y + c.h - 20;
  const dbMin = 20, dbMax = 120;
  const sy = (db) => map(constrain(db, dbMin, dbMax), dbMin, dbMax, y1, y0);
  const slots = 8 + 0.6 + 2;
  const slotW = (x1 - x0) / slots;
  const slotX = (i) => x0 + (i < 8 ? i : i + 0.6) * slotW + slotW / 2;
  const ink = FP.tok('text');

  // Grid and y labels
  textSize(12);
  for (let db = dbMin; db <= dbMax; db += 20) {
    stroke(FP.tok('info-bg'));
    strokeWeight(1);
    line(x0, sy(db), x1, sy(db));
    noStroke();
    fill(FP.tok('text-muted'));
    textAlign(RIGHT, CENTER);
    text(db, x0 - 4, sy(db));
  }
  noStroke();
  fill(FP.tok('text-muted'));
  textAlign(LEFT, BOTTOM);
  text('dB', c.x + 6, y0 - 4);

  // Legend (compact wording when the chart is narrow)
  const roomy = c.w >= 520;
  const lx = x0 + 6, ly = c.y + 6;
  textSize(12);
  textAlign(LEFT, TOP);
  stroke(FP.tok('text-muted')); strokeWeight(1.5); fill(FP.tok('draw-bg'));
  rect(lx, ly + 1, 12, 11);
  noStroke(); fill(ink);
  const l1 = roomy ? 'Lw, unweighted (outline)' : 'Lw (outline)';
  text(l1, lx + 17, ly);
  const l2x = lx + 17 + textWidth(l1) + 14;
  if (show) {
    fill(FP.tok('primary')); noStroke();
    rect(l2x, ly + 1, 12, 11);
    fill(ink);
    text(roomy ? 'A-weighted (filled)' : 'A-wtd (filled)', l2x + 17, ly);
  } else {
    fill(FP.tok('text-muted'));
    text(roomy ? 'A-weighted bars appear after Check' : 'Weighted after Check', l2x, ly);
  }

  // Band bars
  const ow = slotW * 0.74, iw = slotW * 0.42;
  for (let i = 0; i < 8; i++) {
    const cx = slotX(i);
    stroke(FP.tok('text-muted')); strokeWeight(1.5); fill(FP.tok('draw-bg'));
    rect(cx - ow / 2, sy(spec.bands[i]), ow, y1 - sy(spec.bands[i]));
    if (show) {
      const top = sy(r.weighted[i]);
      noStroke();
      fill(FP.tok('primary'));
      rect(cx - iw / 2, top, iw, y1 - top);
      if (i === r.maxIndex) {
        stroke(FP.tok('accent')); strokeWeight(3); noFill();
        rect(cx - iw / 2 - 2, top - 2, iw + 4, y1 - top + 2);
        noStroke(); fill(FP.tok('accent-text'));
        textSize(12); textAlign(CENTER, BOTTOM);
        text(wide ? 'largest' : '▲', cx, min(top, sy(spec.bands[i])) - 3);
      }
    }
    noStroke(); fill(ink); textSize(12); textAlign(CENTER, TOP);
    text(BAND_SHORT[i], cx, y1 + 4);
  }

  // Totals: unweighted overall (outline) and LwA (filled), limit line across them
  const tu = slotX(8), ta = slotX(9);
  noStroke(); fill(ink); textSize(12); textAlign(CENTER, TOP);
  text(wide ? 'Total' : 'All', tu, y1 + 4);
  text('LwA', ta, y1 + 4);
  if (show) {
    stroke(FP.tok('text-muted')); strokeWeight(1.5); fill(FP.tok('draw-bg'));
    rect(tu - ow / 2, sy(r.unweighted), ow, y1 - sy(r.unweighted));
    noStroke(); fill(FP.tok('primary'));
    rect(ta - ow / 2, sy(r.lwa), ow, y1 - sy(r.lwa));
  } else {
    noStroke(); fill(FP.tok('text-muted')); textSize(16); textAlign(CENTER, BOTTOM);
    text('?', tu, y1 - 4); text('?', ta, y1 - 4);
  }
  // Limit line (only across the totals: the limit applies to the overall level, not to a band)
  const ly2 = sy(spec.limit);
  stroke(FP.tok('incorrect')); strokeWeight(2);
  drawingContext.setLineDash([6, 4]);
  line(tu - slotW * 0.55, ly2, x1, ly2);
  drawingContext.setLineDash([]);
  // Limit label in the legend row, right-aligned, with a dashed sample
  textSize(12);
  const lbl = 'Limit ' + spec.limit + (c.w >= 520 ? ' dB' : '');
  const lx3 = x1 - textWidth(lbl);
  stroke(FP.tok('incorrect')); strokeWeight(2);
  drawingContext.setLineDash([4, 3]);
  line(lx3 - 22, c.y + 12, lx3 - 4, c.y + 12);
  drawingContext.setLineDash([]);
  noStroke(); fill(FP.tok('incorrect')); textAlign(LEFT, TOP);
  text(lbl, lx3, c.y + 6);
  strokeWeight(1);
}

function drawTable(t, spec, r, show, wide) {
  K.panel(t.x, t.y, t.w, t.h, { radius: 6 });
  const labW = wide ? 84 : (canvasWidth < 380 ? 50 : 62);
  const colW = (t.w - labW - 6) / 8;
  const rowH = (t.h - 8) / 4;
  const ts = colW < 34 ? 12 : 13;
  const labels = wide ? ['Band (Hz)', 'Lw (dB)', 'A corr. (dB)', 'A-wtd (dB)'] :
    (labW < 60 ? ['Hz', 'Lw', 'A', 'A-wtd'] : ['Hz', 'Lw', 'A corr.', 'A-wtd']);
  noStroke();
  textSize(ts);
  for (let row = 0; row < 4; row++) {
    const y = t.y + 4 + rowH * row + rowH / 2;
    fill(FP.tok('text'));
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(labels[row], t.x + 6, y);
    textStyle(NORMAL);
    for (let i = 0; i < 8; i++) {
      const x = t.x + labW + colW * (i + 0.5);
      let s;
      if (row === 0) s = wide ? FP.fmt.num(BANDS[i]) : BAND_SHORT[i];
      else if (row === 1) s = String(spec.bands[i]);
      else if (row === 2) s = signed(CORR[i]);
      else s = show ? FP.fmt.num(r.weighted[i], 1) : '?';
      textStyle(row === 0 || (row === 3 && show && i === r.maxIndex) ? BOLD : NORMAL);
      fill(row === 3 ? (show ? FP.tok('primary') : FP.tok('text-muted')) : FP.tok('text'));
      textAlign(CENTER, CENTER);
      text(s, x, y);
    }
  }
  textStyle(NORMAL);
}

function signed(v) {
  if (v === 0) return '0';
  return (v > 0 ? '+' : '−') + FP.fmt.num(Math.abs(v), 1);
}

function drawPanel(p, spec, r, show, wide) {
  K.panel(p.x, p.y, p.w, p.h);
  const fs = wide ? 15 : 14;
  const tx = p.x + 10, tw = p.w - 20;
  const scoreY = p.y + p.h - 8;
  const avail = scoreY - fs - 8 - (p.y + 8);
  const ts = K.fitTextSize(t => panelContent(tx, p.y + 8, tw, t, spec, r, show, true) - (p.y + 8), avail, fs, 12);
  panelContent(tx, p.y + 8, tw, ts, spec, r, show, false, avail);
  noStroke(); fill(FP.tok('text')); textStyle(BOLD); textSize(fs); textAlign(LEFT, BOTTOM);
  text(runner.state().scoreLabel, tx, scoreY);
  textStyle(NORMAL);
}

// Draws (or measures, with dry) the challenge / free-mode text; returns the y below it.
function panelContent(x, y, w, ts, spec, r, show, dry, maxH) {
  const st = runner.state();
  const lead = round(ts * 1.3);
  const gap = 5;
  const yMax = maxH != null ? y + maxH : Infinity;
  textSize(ts);
  noStroke();
  textAlign(LEFT, TOP);
  const para = (str, col, bold) => {
    const left = floor((yMax - y) / lead);
    if (left < 1) return;
    if (bold) textStyle(BOLD);
    if (!dry) fill(col);
    y = K.wrapText(str, x, y, w, lead, { dryRun: dry, maxLines: isFinite(left) ? left : undefined }) + gap;
    textStyle(NORMAL);
  };
  const results = () => {
    const lwa = M.round(r.lwa, 1);
    const meets = lwa <= spec.limit;
    para('LwA = ' + FP.fmt.num(lwa, 1) + ' dB: ' + (meets ? '✓ meets' : '✗ exceeds') + ' the ' +
      spec.limit + ' dB limit', meets ? FP.tok('correct') : FP.tok('incorrect'), true);
    para('Unweighted overall: ' + FP.fmt.num(r.unweighted, 1) + ' dB' +
      (canvasWidth >= 640 ? ' (not comparable with an A-weighted limit)' : ', not comparable with the limit'),
      FP.tok('text'));
    para('Largest contributor: ' + FP.fmt.num(r.maxBandHz) + ' Hz, ' + FP.fmt.num(r.weighted[r.maxIndex], 1) +
      ' dB after weighting', FP.tok('text'));
  };

  if (!st.explore) {
    para('Challenge ' + (st.index + 1) + ' of ' + ITEMS.length +
      (st.phase === 'question' ? '  ·  ' + st.attemptLabel : ''), FP.tok('text'), true);
    if (canvasWidth >= 640) {   // narrow: the band table above already lists the levels
      para('Bands 63 to 8,000 Hz: ' + st.item.bands.join(', ') + ' dB. Limit: ' + st.item.limit +
        ' dB, A-weighted.', FP.tok('text'));
    }
    para(st.item.prompt, FP.tok('text'), true);
    if (feedback && feedback.message) {
      const message = (feedback.kind === 'info' ? 'ℹ ' : '') + feedback.message;
      const h = K.countLines(message, w - 12) * lead + 10;
      if (!dry) {
        const ok = feedback.kind === 'ok', bad = feedback.kind === 'bad';
        K.panel(x - 4, y - 2, w + 8, h, {
          fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-info-bg'),
          stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-border'),
          dashed: bad, weight: ok || bad ? 2 : 1, radius: 6
        });
        fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
        K.wrapText(message, x + 2, y + 3, w - 12, lead);
      }
      y += h + gap;
    }
    if (answerLine) para(answerLine, FP.tok('text'));
    if (show) results();
  } else {
    para('Free mode (not scored)', FP.tok('text'), true);
    const s = runner.summary();
    para(s.lines[0], FP.tok('text'), true);
    para(s.lines[1], s.mastered ? FP.tok('primary') : FP.tok('text'), s.mastered);
    results();
    const base = M.aWeighting(ITEMS[0].bands).lwa;
    const d = r.lwa - base;
    para('Change from the starting spectrum: ' + (d >= 0 ? '+' : '−') + FP.fmt.num(Math.abs(d), 1) + ' dB.',
      FP.tok('text'));
    para('Try raising 63 Hz by 10 dB, then reset and raise 1,000 Hz by 10 dB. Which band moves LwA more?',
      FP.tok('text-muted'));
  }
  return y - gap;
}

function drawControlLabels(spec) {
  const st = runner.state();
  const narrow = narrowControls();
  noStroke();
  textSize(narrow ? 13 : 15);
  textAlign(LEFT, CENTER);
  fill(FP.tok('text'));
  if (!st.explore) text('LwA (dB):', 10, K.controlRow(0) + 14);
  else text('Free mode: band and limit sliders unlocked.', 10, K.controlRow(0) + 14);

  // Status beside Start over
  const sx = startOverButton.elt.offsetLeft + (startOverButton.elt.offsetWidth || 90) + 12;
  const options = st.explore ? ['Keys: Tab to a slider, arrows to move it', ''] :
    [st.exploreLabel.replace('Explore mode', 'Free mode') + ' Keys: Enter checks; M or E picks.',
      'Enter checks; M or E picks.', ''];
  fill(FP.tok('text-muted'));
  textSize(13);
  const maxW = canvasWidth - sx - 10;
  text(options.find(t => textWidth(t) <= maxW) || '', sx, K.controlRow(1) + 14);

  // Slider labels
  textSize(narrow ? 13 : 14);
  fill(st.explore ? FP.tok('text') : FP.tok('text-muted'));
  const colW = (canvasWidth - 20) / 2;
  for (let i = 0; i < 8; i++) {
    const col = i < 4 ? 0 : 1, row = 2 + (i % 4);
    const name = narrow ? BAND_SHORT[i] : FP.fmt.num(BANDS[i]) + ' Hz';
    text(name + ': ' + bandSliders[i].value() + ' dB', 10 + col * colW, K.controlLabel(row));
  }
  text('Limit: ' + limitSlider.value() + ' dB', 10, K.controlLabel(6));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
