// Industrial Product Line Matcher - p5.js MicroSim (Chapter 6: Industrial Fans and Application Product Lines)
// CANVAS_HEIGHT: 610
// Thirteen illustrative jobs in shuffled order. For each the learner recommends one of 13 product
// lines (one scored attempt), then picks the deciding feature from three shuffled options (one
// scored attempt, reported separately). Mastery: 10 of 13 lines correct on the first attempt.
// Built on the FanPedia kit: FP.CardDeck (jobs, line score, mastery, wording), FP.Score (feature
// score), FP.rng (feature order), FP.events (feature answers), FP.p5 (layout, text, buttons, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js.

const K = FP.p5;
const SIM_ID = 'ch06-industrial-product-line-matcher';

let canvasWidth = 800;
const drawHeight = 460;
const controlHeight = K.controlHeightFor(4);   // 150: line row, feature options (1-2 rows), navigation
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 10;

const LINES = ['Plug fan', 'Vaneaxial fan', 'Roof mounted panel fan', 'Radial bladed fan', 'Radial tip fan',
  'Pressure blower', 'Utility set', 'Duct fan', 'Filtered supply fan', 'Air kit', 'Paint booth exhaust fan',
  'Dust collection fan', 'Inline lab exhaust fan'];

// Jobs (illustrative), as specified: line, deciding feature, two distractor features, why
const JOBS = [
  ['Recirculate hot air in an industrial oven; the fan mounts through the oven wall and the motor and bearings must stay outside the process air.',
    'Plug fan', 'Mounting panel separates drive from process air', ['Double inlet wheel', 'Vane section'],
    'A plug fan mounts through the plenum wall with motor and drive outside the process air.'],
  ['Convey long paper trim strips from a slitter to a baler; the material passes through the fan.',
    'Radial bladed fan', 'Rugged radial blades for bulky material', ['High efficiency at high airflow', 'Narrow housing for high pressure'],
    'Bulky material through the fan calls for the radial bladed "workhorse," such as the paper handling impeller.'],
  ['Exhaust a high airflow of light, dusty air where power cost matters and material does not build up badly.',
    'Radial tip fan', 'More efficient than radial blade at high airflow', ['Full back plate with gussets', 'Swingout door'],
    'Radial tip handles particulate-laden air and is much more efficient than a radial blade at high airflow.'],
  ['Supply high pressure at a relatively low airflow to a process, with turndown to zero flow through a discharge damper.',
    'Pressure blower', 'High pressure at relatively low volume', ['Large volume at moderate pressure', 'Filter section'],
    'Pressure blowers use narrow housings for high pressure at relatively low volume and turn down with a damper.'],
  ['Move a large volume at moderate to high pressure in a straight duct run with almost no floor space.',
    'Vaneaxial fan', 'Guide vanes straighten the airflow', ['Scroll housing in an enclosure', 'Weather cover'],
    "The vaneaxial's vane section recovers swirl, giving moderate to high pressure in a compact tube."],
  ['Roof exhaust built on a wall-type panel fan, fitted with a stack cap so air leaves straight up.',
    'Roof mounted panel fan', 'Panel fan base with stack cap or hood', ['Tubular housing with nozzle', 'Double inlet wheel'],
    'A roof mounted panel fan is a panel fan base with roof accessories such as a stack cap.'],
  ['General exhaust for a light-industrial building, installed outdoors, compact belt-driven Arrangement 10 package with a weather cover.',
    'Utility set', 'Arrangement 10 ventilating set', ['Bypass air plenum', 'Clamshell construction'],
    'Arrangement 10 units in the ventilating-set size range are utility sets, suitable outdoors with a weather cover.'],
  ['Double-inlet scroll fan supplied already mounted inside an enclosure for a ceiling equipment space.',
    'Duct fan', 'Double inlet scroll housing inside an enclosure', ['Radial tip blades', 'Forward curved kit without housing'],
    'A duct fan is a double-inlet scroll housing mounted inside an enclosure.'],
  ['Roof unit that pulls outside air through filters and supplies it down into a warehouse as make-up air.',
    'Filtered supply fan', 'Filters outside air before it enters the building', ['Plume discharge', 'Swingout door'],
    'Filtered supply fans pull outside air through filters and move it downward into the building.'],
  ['Oven builder wants forward curved double-inlet impellers on a shaft to install in its own insulated enclosure, with bearings out of the airstream.',
    'Air kit', 'Impellers supplied for an enclosure built by others', ['Gusseted mounting panel', 'Narrow housing'],
    'An air kit supplies the forward curved DWDI impellers and shaft; the enclosure and insulation are provided by others.'],
  ['Exhaust overspray from an automotive spray booth; the impeller must be cleaned often.',
    'Paint booth exhaust fan', 'Swingout or clamshell access for cleaning', ['Bypass dampers', 'High pressure at low volume'],
    'Paint booth exhaust needs precise velocity and easy cleaning, provided by swingout and clamshell construction.'],
  ["Fan on the clean side of a cartridge dust collector's filter, side-mounted on the collector.",
    'Dust collection fan', 'Clean-side backward inclined fan', ['Radial paddle impeller', 'Vane section'],
    'On the clean side of the filter the dust is already removed, so a backward inclined dust collection fan fits.'],
  ['Exhaust a bank of fume hoods through a tubular mixed flow fan that dilutes the exhaust and throws a high plume.',
    'Inline lab exhaust fan', 'Tubular lab fan with bypass and entrained dilution', ['Scroll housing in an enclosure', 'Weather cover over drives'],
    'Inline lab exhaust fans are tubular mixed flow or inline centrifugal fans that dilute and discharge the plume high.']
].map((j, i) => ({ id: i + 1, text: j[0], answer: j[1], answerText: j[1], feature: j[2], distractors: j[3], why: j[4] }));

const deck = new FP.CardDeck({
  cards: JOBS, shuffle: true, attempts: 1, retryMissed: false,
  noun: 'Lines', mastery: MASTERY,
  reviewPointer: 'Review the product-line sections of Chapter 6, then press Start over',
  // Spec wording: correct "Correct: <line>. <Why>" (the kit default); incorrect "The better fit is <line>. <Why>"
  messages: { missed: res => FP.msg.BAD + ' The better fit is ' + res.card.answerText + '. ' + res.card.why },
  id: SIM_ID
});
const featureScore = new FP.Score({ total: JOBS.length, noun: 'Features', mastery: JOBS.length });

const PROMPT = 'Which product line would you recommend for this job?';
const FEATURE_PROMPT = 'Which feature decides this job?';

// ---------- State (per job face up) ----------
let step = 'line';        // 'line' | 'feature' | 'done' (both checked) | 'summary'
let lineRes = null;       // {kind, message, chosen}
let featOptions = [];     // three shuffled feature strings
let featChoice = null;    // index into featOptions
let featRes = null;       // {kind, message}
let notice = '';
let featureMisses = 0;

// ---------- Controls ----------
let lineSelect, checkButton, nextButton, startOverButton;
let featButtons = [];

const keys = K.keys.bind({ '1': () => chooseFeature(0), '2': () => chooseFeature(1), '3': () => chooseFeature(2), Enter: onEnter });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  textFont('Arial');

  lineSelect = createSelect();
  lineSelect.parent(document.querySelector('main'));
  lineSelect.option('Choose a product line…', '');
  for (const l of LINES) lineSelect.option(l, l);
  lineSelect.attribute('aria-label', 'Recommended product line');
  lineSelect.changed(() => { notice = ''; });

  checkButton = K.button(FP.msg.CHECK, check);
  nextButton = K.button('Next job', nextJob);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  featButtons = [0, 1, 2].map(i => {
    const b = K.button('Option ' + (i + 1), () => chooseFeature(i));
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    return b;
  });

  setupJob();
  updateControls();

  describe('Industrial product line matcher. Thirteen illustrative job descriptions appear in shuffled ' +
    'order. For each, choose one of 13 product lines from the list and press Check; the sim marks it ' +
    'and gives the reason. Then choose which of three features decides the job and press Check. ' +
    'Scores for lines and features are shown, and a summary lists missed jobs.');
}

// ---------- Flow ----------
function setupJob() {
  const card = deck.state().card;
  step = 'line';
  lineRes = null; featRes = null; featChoice = null; notice = '';
  featOptions = card ? FP.rng.shuffle([card.feature].concat(card.distractors)) : [];
  if (lineSelect) lineSelect.selected('');
}

function check() {
  if (step === 'line') {
    const v = lineSelect.value();
    if (!v) { notice = 'Choose a product line from the list first.'; FP.announce(notice); return; }
    const res = deck.place(v);
    if (res.status === 'ignored') return;
    lineRes = { kind: res.kind, message: res.message, chosen: v };
    step = 'feature';
    notice = '';
    updateControls();
    FP.announce('You recommended ' + v + '. ' + res.message + ' ' + FEATURE_PROMPT + ' ' +
      featOptions.map((f, i) => 'Option ' + (i + 1) + ': ' + f + '.').join(' '));
    checkButton.elt.focus();   // keys 1-3 choose, Enter checks; Tab reaches the option buttons
  } else if (step === 'feature') {
    if (featChoice === null) { notice = 'Choose one of the three features first (keys 1–3).'; FP.announce(notice); return; }
    const st = deck.state();
    const card = st.card;
    const chosen = featOptions[featChoice];
    const ok = chosen === card.feature;
    featureScore.record(JOBS.indexOf(card), ok, 1);
    if (!ok) featureMisses++;
    featRes = { kind: ok ? 'ok' : 'bad',
      message: ok ? FP.msg.OK + ' Right: ' + card.feature + ' decides this job.' : FP.msg.BAD + ' The deciding feature is ' + midSentence(card.feature) + '.' };
    FP.events.emit('answered', { source: SIM_ID, itemId: 'feature-' + card.id, index: st.index, value: chosen,
      correct: ok, attempt: 1, final: true, scored: true });
    step = 'done';
    notice = '';
    updateControls();
    FP.announce(featRes.message);
    nextButton.elt.focus();
  }
}

function chooseFeature(i) {
  if (step !== 'feature') return;
  featChoice = i;
  notice = '';
  updateControls();
  checkButton.elt.focus();   // Enter now checks the chosen feature
  FP.announce('Selected option ' + (i + 1) + ': ' + featOptions[i] + '. Press Check.');
}

function nextJob() {
  if (step !== 'done') return;
  deck.next();
  if (deck.state().phase === 'summary') {
    step = 'summary';
    updateControls();
    const s = deck.summary();
    FP.announce(s.lines.join(' ') + ' ' + featureScore.label() + '.');
    startOverButton.elt.focus();
    return;
  }
  setupJob();
  updateControls();
  const st = deck.state();
  FP.announce('Job ' + (st.index + 1) + ' of ' + JOBS.length + '. ' + st.card.text + ' ' + PROMPT);
  lineSelect.elt.focus();
}

function onEnter() {
  if (step === 'line' || step === 'feature') check();
  else if (step === 'done') nextJob();
}

function startOver() {
  deck.newRound();
  featureScore.reset();
  featureMisses = 0;
  setupJob();
  updateControls();
  lineSelect.elt.focus();
  FP.announce('Started over with a new order. Job 1 of ' + JOBS.length + '. ' + deck.state().card.text + ' ' + PROMPT);
}

// ---------- Controls: state and layout ----------
function narrow() { return canvasWidth < 600; }

function updateControls() {
  const had = document.activeElement;
  K.setEnabled(lineSelect, step === 'line');
  if (step !== 'line' && lineRes) lineSelect.selected(lineRes.chosen);
  K.setEnabled(checkButton, step === 'line' || step === 'feature');
  checkButton.html(step === 'feature' ? (narrow() ? 'Check' : 'Check feature') : (narrow() ? 'Check' : 'Check line'));
  checkButton.attribute('aria-label', step === 'feature' ? 'Check the deciding feature' : 'Check the product line');
  K.setEnabled(nextButton, step === 'done');
  const last = deck.state().isLast;
  nextButton.html(last ? (narrow() ? 'Summary' : 'See summary') : 'Next job');
  featButtons.forEach((b, i) => {
    const text = featOptions[i] || '';
    b.html(narrow() ? 'Option ' + (i + 1) : (i + 1) + '. ' + text);
    b.attribute('aria-label', 'Option ' + (i + 1) + ': ' + text);
    b.attribute('aria-pressed', featChoice === i ? 'true' : 'false');
    K.setEnabled(b, step === 'feature');
    if (step === 'line' || step === 'summary') b.hide(); else b.show();
  });
  if (step === 'summary') { lineSelect.hide(); checkButton.hide(); nextButton.hide(); }
  else { lineSelect.show(); checkButton.show(); nextButton.show(); }
  positionControls();
  K.keepFocus(had, [lineSelect, checkButton, ...featButtons, nextButton, startOverButton]);
}

function positionControls() {
  const nw = narrow();
  const lx = nw ? 10 : 118;
  const sw = nw ? Math.min(230, canvasWidth - 20 - 70) : 250;
  lineSelect.style('width', sw + 'px');
  lineSelect.position(lx, K.controlRow(0));
  if (nw) {
    checkButton.position(lx + sw + 8, K.controlRow(0));
    K.flowButtons(1, featButtons, { x: 10, gap: 8 });
    K.flowButtons(2, [nextButton, null, startOverButton], { x: 10 });
  } else {
    K.flowButtons(0, [checkButton, nextButton, null, startOverButton], { x: lx + sw + 10 });
    K.flowButtons(1, featButtons, { x: 10, gap: 8 });
  }
  if (step === 'summary') startOverButton.position(10, K.controlRow(3));
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Industrial Product Line Matcher');
  const st = deck.state();
  y = K.statusLine(st.scoreLabel + ' · ' + featureScore.label(),
    step === 'summary' ? 'Summary' : 'Job ' + (st.index + 1) + ' of ' + JOBS.length, null, { y: y - 4 });
  if (step !== 'summary') K.note(narrow() ? ['Illustrative jobs', 'Chapter 6', 'Keys 1–3, Enter']
    : ['Illustrative jobs', 'Source: Chapter 6, FanPedia and tcf.com product pages', 'Keys: 1–3 choose a feature, Enter checks or goes on']);
  const top = y + 2, bottom = drawHeight - 22;
  // The summary also uses the control region (only Start over is left there, on the last row)
  if (step === 'summary') drawSummary(10, top, canvasWidth - 20, K.controlRow(3) - 8 - top);
  else drawJob(top, bottom);
  drawControlLabels();
}

function drawControlLabels() {
  if (narrow() || step === 'summary') return;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  text('Product line:', 10, K.controlLabel(0));
  textStyle(NORMAL);
  if (step === 'line') {
    fill(FP.tok('text-muted'));
    textSize(14);
    text('The deciding-feature options appear after the line is checked.', 10, K.controlLabel(1));
  }
}

// Paragraph list {t, bold, color, size, gap}; returns the y below
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = Math.max(12, ts + (p.size || 0));
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok('text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

// Draws text blocks; boxed blocks ({box: 'ok'|'bad'|'info'}) get a feedback panel. Returns the y below.
function blocks(list, x, y, w, ts, dry) {
  const pad = 7;
  for (const b of list) {
    if (!b.box) { y = paras(b.items, x, y, w, ts, dry); continue; }
    const top = y + (b.gap || 8);
    const h = paras(b.items, x + pad, top + pad, w - 2 * pad, ts, true) + pad - top;
    if (!dry) {
      const k = b.box;
      K.panel(x - 2, top, w + 4, h, {
        fill: k === 'ok' ? '--fp-correct-bg' : k === 'bad' ? '--fp-incorrect-bg' : '--fp-info-bg',
        stroke: k === 'ok' ? '--fp-correct' : k === 'bad' ? '--fp-incorrect' : '--fp-border',
        dashed: k === 'bad', weight: k === 'info' ? 1 : 2, radius: 6
      });
      paras(b.items, x + pad, top + pad, w - 2 * pad, ts, false);
    }
    y = top + h;
  }
  return y;
}

function fit(list, x, y, w, h, max) {
  noStroke();
  textAlign(LEFT, TOP);
  const ts = K.fitTextSize(t => blocks(list, x, y, w, t, true) - y, h, max || 16, 12);
  blocks(list, x, y, w, ts, false);
}

function drawJob(top, bottom) {
  const st = deck.state();
  const card = st.card;
  const col = k => FP.tok(k === 'ok' ? 'correct' : k === 'bad' ? 'incorrect' : 'text');
  const left = [{ items: [
    { t: 'Job ' + (st.index + 1) + ' of ' + JOBS.length, bold: true, size: 1 },
    { t: card.text, gap: 6 },
    { t: PROMPT, bold: true, gap: 8 }
  ] }];
  if (step === 'line' && notice) left.push({ box: 'info', items: [{ t: 'ℹ ' + notice }] });
  if (lineRes) {
    left.push({ box: lineRes.kind, items: [
      { t: 'You recommended: ' + lineRes.chosen, color: FP.tok('text-muted') },
      { t: lineRes.message, color: col(lineRes.kind), gap: 2 }] });
  }
  const right = [{ items: [{ t: '2. ' + FEATURE_PROMPT, bold: true, size: 0 }] }];
  if (step === 'line') {
    right[0].items.push({ t: 'Check the product line first; then three features appear here.', color: FP.tok('text-muted'), gap: 6 });
  } else {
    const opts = featOptions.map((f, i) => {
      let mark = '';
      let c = FP.tok('text');
      if (featRes && f === card.feature) { mark = FP.msg.OK + ' '; c = FP.tok('correct'); }
      else if (featRes && i === featChoice) { mark = FP.msg.BAD + ' '; c = FP.tok('incorrect'); }
      else if (!featRes && i === featChoice) { mark = '▸ '; c = FP.tok('primary-dark'); }
      return { t: mark + (i + 1) + '. ' + f + (i === featChoice ? '  (your choice)' : ''), color: c, bold: i === featChoice, gap: 4 };
    });
    right[0].items.push(...opts);
    if (step === 'feature' && notice) right.push({ box: 'info', items: [{ t: 'ℹ ' + notice }] });
    if (featRes) right.push({ box: featRes.kind, items: [{ t: featRes.message, color: col(featRes.kind) }] });
  }
  if (!narrow()) {
    const lw = Math.round((canvasWidth - 30) * 0.55);
    K.panel(10, top, lw, bottom - top);
    K.panel(20 + lw, top, canvasWidth - 30 - lw, bottom - top);
    fit(left, 20, top + 8, lw - 20, bottom - top - 16);
    fit(right, 30 + lw, top + 8, canvasWidth - 50 - lw, bottom - top - 16, 15);
  } else {
    // Narrow: one panel, job then feature step
    K.panel(10, top, canvasWidth - 20, bottom - top);
    const all = step === 'line' ? left.concat([{ items: [{ t: '2. ' + FEATURE_PROMPT + ' (after the line is checked)', color: FP.tok('text-muted'), gap: 8 }] }])
      : left.concat([{ items: [{ t: '', gap: 4 }] }], right);
    fit(all, 18, top + 6, canvasWidth - 36, bottom - top - 12, 15);
  }
}

function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h, { fill: '--fp-ctrl-bg' });   // opaque: it overlaps the control region
  const s = deck.summary();
  const build = form => {
    const items = [
      { t: 'All 13 jobs checked', bold: true, size: 1 },
      { t: s.lines[0].replace('First-attempt score', 'Lines, first-attempt score'), bold: true, gap: 6 },
      { t: s.lines[1], bold: s.mastered, color: s.mastered ? FP.tok('primary-dark') : FP.tok('text') },
      { t: featureScore.label() + ' (reported separately; not part of mastery).', gap: 2 }
    ];
    if (s.misses.length) {
      items.push({ t: 'Missed jobs:', bold: true, gap: 8 });
      if (form === 3) {
        items.push({ t: s.misses.map(m => FP.msg.BAD + ' ' + m.answer + ' (you: ' + m.chosen + ')').join('; ') + '.',
          color: FP.tok('incorrect'), gap: 2 });
      }
      for (const m of (form === 3 ? [] : s.misses)) {
        let t;
        if (form === 0) t = 'Job: ' + jobSnippet(m.card.text) + ' You chose ' + m.chosen + '; the better fit is ' + m.answer + '. ' + m.why;
        else if (form === 1) t = m.answer + ' (you chose ' + m.chosen + '). ' + m.why;
        else t = m.answer + ' (you chose ' + m.chosen + ')';
        items.push({ t: FP.msg.BAD + ' ' + t, color: FP.tok('incorrect'), gap: form === 2 ? 1 : 3 });
      }
      if (form >= 2) items.push({ t: 'Reasons: widen the window, or reread each product line in Chapter 6.', color: FP.tok('text-muted'), gap: 4 });
    } else {
      items.push({ t: FP.msg.OK + ' No missed product lines.', color: FP.tok('correct'), gap: 8 });
    }
    items.push({ t: 'Press Start over for a new scored round in a new order.', color: FP.tok('text-muted'), gap: 8 });
    return [{ items }];
  };
  // Longest form that fits: job + reason, then reason only, then answers only
  let list = build(0);
  for (let form = 0; form <= 3; form++) {
    list = build(form);
    if (blocks(list, x + 10, y + 8, w - 20, 12, true) - (y + 8) <= h - 16) break;
  }
  fit(list, x + 10, y + 8, w - 20, h - 16, 15);
}

// "More efficient ..." -> "more efficient ..." inside a sentence; proper nouns (Arrangement 10) keep their capital
function midSentence(f) {
  return /^Arrangement\b/.test(f) ? f : f.charAt(0).toLowerCase() + f.slice(1);
}

function jobSnippet(t) {
  const words = t.split(' ');
  return words.length <= 9 ? t : words.slice(0, 9).join(' ') + '…';
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
