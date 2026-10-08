// Arrangement Identifier MicroSim
// CANVAS_HEIGHT: 740
// Use this CANVAS_HEIGHT for all the iframe heights that embed this MicroSim. Below 610 px
// wide the controls wrap onto more rows and the canvas grows, so no control leaves the canvas.
// The learner breaks a schematic side view of a centrifugal fan into three features
// (drive, impeller position, what carries the bearings), commits them, and then names
// the AMCA arrangement (1, 2, 3, 3SI, 3DI, 4, 7, 8, 9 or 10).
// Built on the FanPedia kit (../shared-libs/): FP.CardDeck runs the round, FP.Score keeps the
// separate feature score, FP.codes holds the arrangement features and FD draws the schematics.

const K = FP.p5;
const SIM_ID = 'ch11-arrangement-identifier';
const CANVAS_HEIGHT = 740;   // wide layout (610 px and up)
const WIDE_MIN = 610;
const MARGIN = 10;

let canvasWidth = 760;
let L = null;                // layout from computeLayout()

// ---------- content (spec table; features from FP.codes.ARRANGEMENTS) ----------
const DRIVE_OPTS = FP.codes.DRIVE_OPTS;
const IMPELLER_OPTS = FP.codes.IMPELLER_OPTS;
const BEARING_OPTS = FP.codes.BEARING_OPTS;
const ARR_OPTS = FP.codes.ARRANGEMENT_CODES;   // 1, 2, 3, 3SI, 3DI, 4, 7, 8, 9, 10
const FEATURE_NAMES = ['Drive', 'Impeller', 'Bearings'];

const START_PROMPT = 'How is this fan driven, where is the impeller, and what carries the bearings?';
const NOTE_TEXT = 'Schematics are simplified. Twin City Fan arrangement drawings: FanPedia pp. 20–23. ' +
  'Arrangement 2 is from the AMCA standard and is not shown in FanPedia.';
const KEY_NOTE = 'Keys: Tab moves between controls, arrow keys pick an arrangement, Enter checks or goes on';

// "Why (feedback)" column of the specification table, one per drawing.
const WHY = {
  '1': 'Overhung on a pedestal with a separately mounted motor is Arrangement 1 (FanPedia pp. 20, 162).',
  '2': 'Overhung with bearings in a bracket on the housing is AMCA Arrangement 2.',
  '3': 'Center hung with bearings carried by the housing and a separate motor is Arrangement 3 (FanPedia pp. 20, 163).',
  '3SI': 'The attached inlet box puts the bearing outside the air on independent pedestals (FanPedia p. 164).',
  '3DI': 'Double width with integrated inlet boxes and independent bearing pedestals is Arrangement 3DI (FanPedia p. 167).',
  '4': 'Impeller mounted to the motor shaft is Arrangement 4 (FanPedia pp. 20, 164).',
  '7': 'Center hung with a pedestal for motor, coupling and one bearing is Arrangement 7 (FanPedia pp. 21, 168).',
  '8': 'An Arrangement 1 pedestal extended for a coupled motor is Arrangement 8 (FanPedia p. 165).',
  '9': 'Overhung with the motor on the side of the bearing pedestal is Arrangement 9 (FanPedia p. 165).',
  '10': 'Overhung with the motor inside the bearing pedestal is Arrangement 10 (FanPedia p. 167).'
};

const DRAWINGS = ARR_OPTS.map((code, i) => {
  const a = FP.codes.arrangementByCode(code);
  return { id: i + 1, answer: code, drive: a.drive, impeller: a.impeller, bearings: a.bearings, why: WHY[code] };
});

// Spec "added messages for likely confusions".
function confusionMessage(answer, chosen) {
  if (chosen === '4' && ['3SI', '3DI', '7', '8'].includes(answer)) {
    return 'There is a coupling and a separate fan shaft, so this is not Arrangement 4.';
  }
  if (chosen === '7' && answer === '8') {
    return 'The impeller is overhung, not between the bearings; a coupled overhung fan is Arrangement 8.';
  }
  if ((chosen === '1' && (answer === '9' || answer === '10')) || (chosen === '9' && answer === '10')) {
    return 'Look at where the motor is mounted; Arrangements 1, 9 and 10 differ only in motor location.';
  }
  if (chosen === '1' && answer === '2') {
    return 'The bearings are on a bracket carried by the housing, not on a pedestal.';
  }
  return '';
}

// Spec wording: correct "Correct: Arrangement <n>." + Why; incorrect "This is Arrangement <n>. <Why>" + hint.
function arrangementMessage(card, chosen) {
  if (chosen === card.answer) return FP.msg.correct('Arrangement ' + card.answer, card.why);
  const extra = confusionMessage(card.answer, chosen);
  return FP.msg.BAD + ' This is Arrangement ' + card.answer + '. ' + card.why + (extra ? ' ' + extra : '');
}

// ---------- state ----------
const deck = new FP.CardDeck({
  cards: DRAWINGS, shuffle: true, attempts: 1, retryMissed: false,
  noun: 'Arrangements', mastery: 8, id: SIM_ID,
  label: a => 'Arrangement ' + a,
  reviewPointer: 'Review the missed drawings, then press Start over for a new shuffled round'
});
const featureScore = new FP.Score({ total: DRAWINGS.length * 3, noun: 'Features' });
let featureResult = null;     // {answers, keys, correct} for the face-up drawing
let featureLog = [];          // features correct per position in the round
let arrResult = null;         // {chosen, correct, kind, message}

// ---------- controls ----------
let driveSelect, impellerSelect, bearingSelect, arrRadio;
let checkFeaturesButton, checkArrButton, nextButton, startOverButton;
const keys = K.keys.bind({ Enter: primaryAction });

function setup() {
  updateCanvasSize();
  computeLayout();
  K.config({ drawHeight: L.drawHeight, controlHeight: L.controlHeight });
  K.canvas(canvasWidth, L.canvasHeight);

  driveSelect = makeSelect(DRIVE_OPTS, 'Drive');
  impellerSelect = makeSelect(IMPELLER_OPTS, 'Impeller');
  bearingSelect = makeSelect(BEARING_OPTS, 'Bearings carried by');

  arrRadio = createRadio('arrangement');
  arrRadio.parent(document.querySelector('main'));
  for (const a of ARR_OPTS) arrRadio.option(a, a);
  arrRadio.addClass('ai-arr');
  arrRadio.attribute('role', 'radiogroup');
  arrRadio.attribute('aria-label', 'Arrangement');
  arrRadio.changed(updateButtonStates);

  checkFeaturesButton = K.button('Check features', checkFeatures);
  checkArrButton = K.button('Check arrangement', checkArrangement);
  nextButton = K.button('Next drawing', nextPressed);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  startOverButton.addClass('secondary');

  positionControls();
  loadDrawing();

  describe('Arrangement Identifier. A schematic side view of a centrifugal fan is shown. ' +
    'Answer three feature questions (drive, impeller position, what carries the bearings), ' +
    'press Check features, then choose the fan arrangement number and press Check arrangement. ' +
    'Ten drawings per round with separate feature and arrangement scores. Feedback is announced.');
}

function makeSelect(opts, label) {
  const s = createSelect();
  s.parent(document.querySelector('main'));
  s.option('Choose...', '');
  for (const o of opts) s.option(o, o);
  s.selected('');
  s.disable('');
  s.attribute('aria-label', label);
  s.changed(updateButtonStates);
  return s;
}

// ---------- layout ----------
function measureWrap(str, w, ts) {
  textSize(ts);
  return K.countLines(str, w) * Math.round(ts * 1.3);
}

// Worst-case panel text heights (at text size ts) over every drawing and every choice,
// so the panels never change size between drawings.
function worstFeatureHeight(w, ts) {
  let h = 0;
  for (const d of DRAWINGS) {
    const right = featureLines({ answers: [d.drive, d.impeller, d.bearings], keys: [d.drive, d.impeller, d.bearings], correct: [true, true, true] });
    const wrong = featureLines({ answers: ['', '', ''], keys: [d.drive, d.impeller, d.bearings], correct: [false, false, false] });
    for (const lines of [right, wrong]) {
      let t = 0;
      for (const ln of lines) t += measureWrap(ln.text, w, ts);
      h = max(h, t + 2);
    }
  }
  return h;
}
function worstArrangementHeight(w, ts) {
  let h = measureWrap('Choose one arrangement and press Check arrangement. One attempt per drawing.', w, ts);
  for (const d of DRAWINGS) for (const c of ARR_OPTS) h = max(h, measureWrap(arrangementMessage(d, c), w, ts));
  return h;
}

function computeLayout() {
  const w = canvasWidth;
  const narrow = w < WIDE_MIN;
  const controlHeight = K.controlHeightFor(narrow ? 9 : 4);
  push();
  // status line: one line when score and feature count fit side by side
  textSize(15);
  textStyle(BOLD);
  const lw = textWidth(FP.msg.score('Arrangements', 10, 10));
  textStyle(NORMAL);
  const rw = textWidth(FP.msg.score('Features', 30, 30));
  const statusH = (lw + 16 + rw <= w - 2 * MARGIN) ? 21 : 42;
  const promptTs = narrow ? 14 : 15;
  const promptH = measureWrap('Drawing 10 of 10: ' + START_PROMPT, w - 2 * MARGIN, promptTs);
  const noteH = measureWrap(FP.msg.note(NOTE_TEXT, KEY_NOTE), w - 2 * MARGIN, 13);
  pop();

  const top = 40 + statusH;                 // title (22 px) then the status line
  const schemTop = top + promptH + 4;
  const schemH = narrow ? max(round(295 * (w - 40) / 640) + 8, 214) : 258;
  const noteTop = schemTop + schemH + 4;
  const panelTop = noteTop + noteH + 6;
  const lay = { narrow, controlHeight, statusTop: 40, promptTop: top, promptTs, schemTop, schemH, noteTop, panelTop };

  push();
  if (narrow) {
    const pw = w - 2 * MARGIN, ts = 14;
    const fH = 32 + worstFeatureHeight(pw - 20, ts) + 8;
    const aH = 32 + worstArrangementHeight(pw - 20, ts) + 8;
    lay.panelTs = ts;
    lay.panels = [{ x: MARGIN, y: panelTop, w: pw, h: fH }, { x: MARGIN, y: panelTop + fH + 8, w: pw, h: aH }];
    lay.drawHeight = panelTop + fH + 8 + aH + 8;
  } else {
    lay.drawHeight = CANVAS_HEIGHT - controlHeight;
    const gap = 10, pw = (w - 2 * MARGIN - gap) / 2, ph = lay.drawHeight - panelTop - 8;
    lay.panels = [{ x: MARGIN, y: panelTop, w: pw, h: ph }, { x: MARGIN + pw + gap, y: panelTop, w: pw, h: ph }];
    const avail = ph - 32 - 8;
    lay.panelTs = K.fitTextSize(ts => max(worstFeatureHeight(pw - 20, ts), worstArrangementHeight(pw - 20, ts)), avail, 15, 12);
  }
  pop();
  lay.canvasHeight = lay.drawHeight + controlHeight;
  L = lay;
}

function labelWidth(s) {
  push();
  textSize(16);
  const tw = textWidth(s);
  pop();
  return tw;
}

function positionControls() {
  const w = canvasWidth;
  K.config({ drawHeight: L.drawHeight, controlHeight: L.controlHeight });
  const radioRow = L.narrow ? 5 : 2;
  if (L.narrow) {
    const x0 = MARGIN + labelWidth('Bearings carried by:') + 8;
    const sw = max(120, w - MARGIN - x0);
    driveSelect.position(x0, K.controlRow(0)); driveSelect.size(sw);
    impellerSelect.position(x0, K.controlRow(1)); impellerSelect.size(sw);
    bearingSelect.position(x0, K.controlRow(2)); bearingSelect.size(sw);
    checkFeaturesButton.position(MARGIN, K.controlRow(3));
    arrRadio.position(MARGIN, K.controlRow(radioRow) - 4);
    arrRadio.style('width', (w - 2 * MARGIN) + 'px');
    K.flowButtons(7, [checkArrButton, nextButton, '|', startOverButton]);
  } else {
    const dx = MARGIN + labelWidth('Drive:') + 8;
    driveSelect.position(dx, K.controlRow(0)); driveSelect.size(190);
    const ix = dx + 190 + 20 + labelWidth('Impeller:') + 8;
    impellerSelect.position(ix, K.controlRow(0)); impellerSelect.size(140);
    const bx = MARGIN + labelWidth('Bearings carried by:') + 8;
    const bw = checkFeaturesButton.elt.offsetWidth || 120;
    const bsw = constrain(w - MARGIN - bw - 14 - bx, 160, 318);
    bearingSelect.position(bx, K.controlRow(1)); bearingSelect.size(bsw);
    checkFeaturesButton.position(bx + bsw + 14, K.controlRow(1));
    const rx = MARGIN + labelWidth('Arrangement:') + 8;
    arrRadio.position(rx, K.controlRow(radioRow) + 1);
    arrRadio.style('width', (w - MARGIN - rx) + 'px');
    K.flowButtons(3, [checkArrButton, nextButton, '|', startOverButton]);
  }
}

// ---------- round flow ----------
function stage() {
  if (deck.phase === 'summary') return 'results';
  if (deck.phase === 'feedback') return 'checked';
  return featureResult ? 'arrangement' : 'features';
}

function loadDrawing() {
  featureResult = null;
  arrResult = null;
  clearAnswers();
  nextButton.html(deck.state().isLast ? 'See results' : 'Next drawing');
  updateButtonStates();
  positionControls();
}

function clearAnswers() {
  for (const s of [driveSelect, impellerSelect, bearingSelect]) {
    s.selected('');
    s.removeClass('ai-ok');
    s.removeClass('ai-bad');
  }
  for (const inp of arrRadio.elt.querySelectorAll('input')) inp.checked = false;
  setHighlights([]);
}

function checkFeatures() {
  if (stage() !== 'features') return;
  const d = deck.card();
  const answers = [driveSelect.value(), impellerSelect.value(), bearingSelect.value()];
  if (answers.some(a => a === '')) return;
  const keys = [d.drive, d.impeller, d.bearings];
  const correct = answers.map((a, i) => a === keys[i]);
  featureResult = { answers, keys, correct };
  featureLog[deck.index] = correct.filter(c => c).length;
  correct.forEach((ok, i) => {
    featureScore.record(deck.index * 3 + i, ok, 1);
    FP.events.emit('answered', { source: SIM_ID + '-features', itemId: d.id + '-' + FEATURE_NAMES[i].toLowerCase(),
      index: deck.index, value: answers[i], correct: ok, attempt: 1, final: true, scored: true });
  });
  [driveSelect, impellerSelect, bearingSelect].forEach((s, i) => s.addClass(correct[i] ? 'ai-ok' : 'ai-bad'));

  // Highlight consistent arrangements only when every committed feature is right.
  setHighlights(correct.every(c => c) ? consistentArrangements(answers) : []);
  FP.announce(featureLines(featureResult).map(l => l.text).join(' '));
  updateButtonStates();
}

function consistentArrangements(answers) {
  return DRAWINGS.filter(r => r.drive === answers[0] && r.impeller === answers[1] &&
    r.bearings === answers[2]).map(r => r.answer);
}

function featureLines(fr) {
  const lines = FEATURE_NAMES.map((n, i) => ({
    kind: fr.correct[i] ? 'ok' : 'bad',
    text: fr.correct[i] ? FP.msg.OK + ' ' + n + ': correct (' + fr.keys[i] + ')' :
      FP.msg.BAD + ' ' + n + ': incorrect; answer is ' + fr.keys[i]
  }));
  lines.push(fr.correct.every(c => c) ?
    { kind: 'info', text: 'Consistent with these features (highlighted below): ' + consistentArrangements(fr.answers).join(', ') } :
    { kind: 'info', text: 'A feature is wrong, so no arrangements are highlighted.' });
  return lines;
}

function checkArrangement() {
  if (stage() !== 'arrangement') return;
  const chosen = arrRadio.value();
  if (!chosen) return;
  const card = deck.card();
  const res = deck.place(chosen);
  arrResult = { chosen, correct: res.status === 'correct', kind: res.kind, message: arrangementMessage(card, chosen) };
  FP.announce(arrResult.message);
  if (deck.state().isLast) nextButton.html('See results');
  updateButtonStates();
}

function nextPressed() {
  if (stage() !== 'checked') return;
  deck.next();
  if (deck.phase === 'summary') {
    clearAnswers();
    arrResult = null;
    FP.announce(resultSummaryText());
    updateButtonStates();
    positionControls();
  } else {
    loadDrawing();
    FP.announce('Drawing ' + (deck.index + 1) + ' of ' + DRAWINGS.length + '. ' + START_PROMPT);
  }
}

function startOver() {
  deck.newRound();
  featureScore.reset();
  featureLog = [];
  loadDrawing();
  FP.announce('New shuffled round. Drawing 1 of ' + DRAWINGS.length + '. ' + START_PROMPT);
}

function primaryAction() {
  const s = stage();
  if (s === 'features') checkFeatures();
  else if (s === 'arrangement') checkArrangement();
  else if (s === 'checked') nextPressed();
}

function keyPressed() { return keys(); }

function resultSummaryText() {
  const s = deck.summary();
  return ['Round complete', ...s.lines, featureScore.label()].map(t => t.replace(/\.$/, '')).join('. ') + '.';
}

// ---------- control state ----------
function updateButtonStates() {
  const st = stage();
  const featureOpen = st === 'features';
  for (const s of [driveSelect, impellerSelect, bearingSelect]) K.setEnabled(s, featureOpen);
  const allAnswered = driveSelect.value() !== '' && impellerSelect.value() !== '' && bearingSelect.value() !== '';
  K.setEnabled(checkFeaturesButton, featureOpen && allAnswered);

  const arrOpen = st === 'arrangement';
  for (const inp of arrRadio.elt.querySelectorAll('input')) inp.disabled = !arrOpen;
  arrRadio.elt.classList.toggle('ai-locked', st === 'features' || st === 'results');
  K.setEnabled(checkArrButton, arrOpen && !!arrRadio.value());
  K.setEnabled(nextButton, st === 'checked');
  nextButton.elt.hidden = st === 'results';
}

function setHighlights(list) {
  for (const lab of arrRadio.elt.querySelectorAll('label')) {
    const inp = lab.querySelector('input');
    lab.classList.toggle('ai-hl', !!inp && list.includes(inp.value));
  }
}

// ---------- drawing ----------
function draw() {
  K.regions(L.drawHeight, L.controlHeight);
  const st = stage();
  K.title('Arrangement Identifier');
  K.statusLine(deck.score.label(), featureScore.label(), null, { y: L.statusTop });

  // prompt
  noStroke();
  fill(K.tok('--fp-text'));
  textSize(L.promptTs);
  textStyle(NORMAL);
  let prompt;
  if (st === 'results') prompt = 'Round complete: ' + DRAWINGS.length + ' drawings.';
  else {
    prompt = START_PROMPT;
    if (st === 'arrangement') prompt = 'Now choose the arrangement number and press Check arrangement.';
    if (st === 'checked') prompt = deck.state().isLast ? 'Press See results to finish the round.' : 'Press Next drawing to continue.';
    prompt = 'Drawing ' + (deck.index + 1) + ' of ' + DRAWINGS.length + ': ' + prompt;
  }
  K.wrapText(prompt, MARGIN, L.promptTop, canvasWidth - 2 * MARGIN, round(L.promptTs * 1.3));

  // schematic frame
  K.panel(MARGIN, L.schemTop, canvasWidth - 2 * MARGIN, L.schemH, { fill: '#ffffff', stroke: K.tok('--fp-border') });
  if (st === 'results') {
    drawResults();
  } else {
    FD.arrangement(null, deck.card().answer, {
      box: { x: 20, y: L.schemTop + 4, w: canvasWidth - 40, h: L.schemH - 8 },
      labels: st === 'checked',
      bounds: { x0: 14, x1: canvasWidth - 14 },
      textSize: L.narrow ? 12 : 14
    });
  }

  // data / source note and keyboard hint (13 px muted)
  noStroke();
  fill(K.tok('--fp-text-muted'));
  textSize(13);
  K.wrapText(FP.msg.note(NOTE_TEXT, KEY_NOTE), MARGIN, L.noteTop, canvasWidth - 2 * MARGIN, 17);

  drawPanels(st);
  drawControlLabels(st);
}

function drawControlLabels(st) {
  noStroke();
  fill(K.tok('--fp-text'));
  textSize(16);
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  const ly = n => K.controlLabel(n) + 3;   // centre on the 28 px controls
  if (L.narrow) {
    text('Drive:', MARGIN, ly(0));
    text('Impeller:', MARGIN, ly(1));
    text('Bearings carried by:', MARGIN, ly(2));
    text('Arrangement:', MARGIN, ly(4));
    if (st === 'features') {
      fill(K.tok('--fp-text-muted'));
      textSize(14);
      text('(after Check features)', MARGIN + labelWidth('Arrangement:') + 8, ly(4));
    }
  } else {
    text('Drive:', MARGIN, ly(0));
    text('Impeller:', MARGIN + labelWidth('Drive:') + 8 + 190 + 20, ly(0));
    text('Bearings carried by:', MARGIN, ly(1));
    text('Arrangement:', MARGIN, ly(2));
  }
}

function drawResults() {
  const placements = deck.placements;
  const x0 = MARGIN + 20;
  const y0 = L.schemTop + 12;
  noStroke();
  textStyle(NORMAL);
  if (L.narrow) {
    textSize(14);
    textAlign(LEFT, TOP);
    placements.forEach((p, i) => {
      fill(K.tok(p.correct ? '--fp-correct' : '--fp-incorrect'));
      text((p.correct ? FP.msg.OK : FP.msg.BAD) + ' ' + (i + 1) + ': Arr. ' + p.card.answer +
        (p.correct ? '' : ' (chose ' + p.chosen + ')') + '; features ' + featureLog[i] + '/3', x0 - 10, y0 + i * 19);
    });
    return;
  }
  textSize(15);
  const colW = (canvasWidth - 2 * MARGIN - 40 - 10) / 2;
  placements.forEach((p, i) => {
    const col = i < 5 ? 0 : 1, row = i % 5;
    fill(K.tok(p.correct ? '--fp-correct' : '--fp-incorrect'));
    K.wrapText((p.correct ? FP.msg.OK + ' Correct: ' : FP.msg.BAD + ' Missed: ') + 'drawing ' + (i + 1) +
      ', Arr. ' + p.card.answer + (p.correct ? '' : ' (chose ' + p.chosen + ')') + '; features ' + featureLog[i] + '/3',
      x0 + col * (colW + 10), y0 + row * 40, colW, 18);
  });
  fill(K.tok('--fp-text'));
  K.wrapText('Press Start over for a new shuffled set.', x0, y0 + 5 * 40 + 6, canvasWidth - 2 * MARGIN - 40, 18);
}

function drawPanels(st) {
  const [fp, ap] = L.panels;
  const ts = L.panelTs, lh = round(ts * 1.3);

  // Features panel
  K.panel(fp.x, fp.y, fp.w, fp.h, { stroke: K.tok('--fp-border') });
  panelHeading('Features', fp);
  textSize(ts);
  textStyle(NORMAL);
  noStroke();
  let y = fp.y + 32;
  if (st === 'results') {
    fill(K.tok('--fp-text'));
    y = K.wrapText(featureScore.label() + '.', fp.x + 10, y, fp.w - 20, lh);
    K.wrapText('Feature answers are scaffolding and are scored separately from the arrangement names.',
      fp.x + 10, y + 2, fp.w - 20, lh);
  } else if (!featureResult) {
    fill(K.tok('--fp-text'));
    K.wrapText('Answer Drive, Impeller and Bearings carried by below, then press Check features.',
      fp.x + 10, y, fp.w - 20, lh);
  } else {
    for (const ln of featureLines(featureResult)) {
      fill(K.tok(ln.kind === 'ok' ? '--fp-correct' : ln.kind === 'bad' ? '--fp-incorrect' : '--fp-text'));
      if (ln.kind === 'info') y += 2;
      y = K.wrapText(ln.text, fp.x + 10, y, fp.w - 20, lh);
    }
  }

  // Arrangement panel: solid green (✓) or dashed red (✗) after a check
  if (st === 'checked' && arrResult) {
    const ok = arrResult.correct;
    K.panel(ap.x, ap.y, ap.w, ap.h, { fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2 });
  } else if (st === 'results') {
    K.panel(ap.x, ap.y, ap.w, ap.h, { fill: '--fp-primary-bg', stroke: '--fp-primary', weight: 2 });
  } else {
    K.panel(ap.x, ap.y, ap.w, ap.h, { stroke: K.tok('--fp-border') });
  }
  panelHeading('Arrangement', ap);
  textSize(ts);
  textStyle(NORMAL);
  noStroke();
  y = ap.y + 32;
  if (st === 'results') {
    const s = deck.summary();
    fill(K.tok('--fp-text'));
    y = K.wrapText('Round score: ' + s.correct + ' of ' + s.total + ' arrangements and ' +
      featureScore.correct() + ' of ' + featureScore.total + ' features.', ap.x + 10, y, ap.w - 20, lh);
    for (const line of s.lines) y = K.wrapText(line, ap.x + 10, y + 2, ap.w - 20, lh);
  } else if (st === 'checked' && arrResult) {
    fill(K.tok(arrResult.correct ? '--fp-correct' : '--fp-incorrect'));
    K.wrapText(arrResult.message, ap.x + 10, y, ap.w - 20, lh);
  } else {
    fill(K.tok('--fp-text'));
    K.wrapText(st === 'features' ? 'Locked until you check the three features.' :
      'Choose one arrangement and press Check arrangement. One attempt per drawing.', ap.x + 10, y, ap.w - 20, lh);
  }
}

function panelHeading(label, p) {
  noStroke();
  fill(K.tok('--fp-primary-dark'));
  textSize(17);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(label, p.x + 10, p.y + 8);
  textStyle(NORMAL);
}

function windowResized() {
  updateCanvasSize();
  computeLayout();
  resizeCanvas(canvasWidth, L.canvasHeight);
  positionControls();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
