// Rotation and Discharge Code Builder
// CANVAS_HEIGHT: 630
// Learners write the rotation + discharge code (letter form and angle form) for
// eight illustrative job cards, then explore any rotation/angle in free practice.
// Rule (chapter 13): seen from the drive side, the outlet direction is "straight up"
// turned through the discharge angle in the direction of rotation (CW or CCW).
// Built on the FanPedia kit: FP.CardDeck (cards, score, mastery), FP.codes
// (discharge table, DWDI limits, designations), FD (drive-side housing), FP.p5 (layout).

const K = FP.p5;
const C = FP.codes;
let canvasWidth = 800;
const drawHeight = 480;
const controlHeight = K.controlHeightFor(4);   // 150: code row, buttons, practice row, angle row
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 7;

const FAN_NAMES = {
  SWSI: 'SWSI (single width, single inlet)',
  DWDI: 'DWDI (double width, double inlet)'
};

// Job cards (illustrative scenarios), fixed order. code === null means "Not offered";
// requested is the discharge the description matches (drawn crossed out).
const CARDS = [
  { id: 1, fan: 'SWSI', rot: 'CW', desc: 'Outlet blows straight up', code: 'UBD',
    why: 'Straight up is Upblast, 360°, for either rotation.' },
  { id: 2, fan: 'SWSI', rot: 'CCW', desc: 'Outlet at the top blows horizontally to the left', code: 'THD',
    why: 'For CCW, a quarter turn counterclockwise from straight up points left: 90°, Top Horizontal.' },
  { id: 3, fan: 'SWSI', rot: 'CW', desc: 'Outlet blows straight down', code: 'DBD',
    why: 'A half turn from straight up is 180°, Downblast, for either rotation.' },
  { id: 4, fan: 'SWSI', rot: 'CCW', desc: 'Outlet at the bottom blows horizontally to the right', code: 'BHD',
    why: 'For CCW, three quarter turns counterclockwise from up points right: 270°, Bottom Horizontal.' },
  { id: 5, fan: 'SWSI', rot: 'CW', desc: 'Outlet at the bottom points down and to the left at 45°', code: 'BAD',
    why: '225° clockwise from up is down-left, Bottom Angular Down, which SWSI fans offer.' },
  { id: 6, fan: 'DWDI', rot: 'CW', desc: 'Outlet at the bottom points down and to the left at 45°', code: null,
    requested: 'BAD',
    why: 'DWDI fans are offered in seven discharges; Bottom Angular Down is not one of them.' },
  { id: 7, fan: 'SWSI', rot: 'CCW', desc: 'Outlet at the top points up and to the left at 45°', code: 'TAU',
    why: '45° counterclockwise from up is up-left, Top Angular Up.' },
  { id: 8, fan: 'DWDI', rot: 'CCW', desc: 'Outlet at the bottom points up and to the right at 45°', code: 'BAU',
    why: '315° counterclockwise from up is up-right, Bottom Angular Up, which DWDI fans offer.' }
].map(c => Object.assign(c, { answerText: c.code ? C.designation(c.rot, c.code) : 'Not offered' }));

// A submission is {rot, disch}; disch 'NONE' is "Not offered".
function isCorrect(card, choice) {
  return card.code === null ? choice.disch === 'NONE'
    : choice.disch === card.code && choice.rot === card.rot;
}

// One scored attempt per card (CardDeck attempts: 1); the spec's unscored second
// attempt is handled below and never touches the score.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Codes', mastery: MASTERY, check: isCorrect,
  reviewPointer: 'Review the reading rule in "Rotation and Discharge Code", then press Start over',
  id: 'ch13-rotation-discharge-code-builder'
});

let mode = 'cards';     // 'cards' | 'practice'
let feedback = null;    // {kind: 'ok'|'bad', message, chose} for the latest graded submission
let notice = '';        // reminder when a submission is incomplete (not graded)
let retryUsed = false;  // the one unscored retry on the current card
let lastPracticeKey = '';

let rotSelect, dischargeSelect, submitButton, nextButton, startOverButton;
let fanTypeSelect, practiceRotSelect, angleSlider;
let labelCol = 120;

const keys = K.keys.bind({ Enter: enterKey });

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  K.canvas(canvasWidth, canvasHeight);
  const mainEl = document.querySelector('main');

  // Row 0: the learner's code
  rotSelect = createSelect();
  rotSelect.option('Rotation…', '');
  rotSelect.option('CW', 'CW');
  rotSelect.option('CCW', 'CCW');
  rotSelect.parent(mainEl);
  rotSelect.attribute('aria-label', 'Rotation for your code');

  dischargeSelect = createSelect();
  dischargeSelect.option('Discharge…', '');
  for (const d of C.DISCHARGES) dischargeSelect.option(d.code + ' ' + d.name, d.code);
  dischargeSelect.option('Not offered', 'NONE');
  dischargeSelect.parent(mainEl);
  dischargeSelect.attribute('aria-label', 'Discharge for your code');

  // Row 1: submit / next / start over
  submitButton = K.button('Submit code', submitAnswer);
  nextButton = K.button('Next card', nextCard);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  // Rows 2-3: free practice (explore mode)
  fanTypeSelect = createSelect();
  fanTypeSelect.option('SWSI', 'SWSI');
  fanTypeSelect.option('DWDI', 'DWDI');
  fanTypeSelect.parent(mainEl);
  fanTypeSelect.attribute('aria-label', 'Free practice fan type');

  practiceRotSelect = createSelect();
  practiceRotSelect.option('CW', 'CW');
  practiceRotSelect.option('CCW', 'CCW');
  practiceRotSelect.parent(mainEl);
  practiceRotSelect.attribute('aria-label', 'Free practice rotation');

  angleSlider = createSlider(45, 360, 360, 45);
  angleSlider.parent(mainEl);
  angleSlider.attribute('aria-label', 'Free practice discharge angle, degrees');

  for (const c of [fanTypeSelect, practiceRotSelect, angleSlider]) {
    c.changed(enterPractice);
    c.input(enterPractice);
  }

  positionControls();
  resetCardControls();
  updateControlStates();

  describe('Rotation and discharge code builder. Eight illustrative job cards describe a centrifugal fan ' +
    'and its outlet direction as seen from the drive side. Choose a rotation and a discharge code and submit; ' +
    'the sim shows feedback and draws the housing with the correct outlet and rotation arrow. ' +
    'After card 8, free practice lets you pick fan type, rotation and discharge angle.');
}

function positionControls() {
  const narrow = canvasWidth < 480;
  labelCol = narrow ? 92 : 120;
  const pad = K.layout.margin;
  // Row 0: rotation + discharge (the discharge select shrinks to fit narrow canvases)
  rotSelect.position(labelCol, K.controlRow(0));
  const dx = labelCol + rotSelect.elt.offsetWidth + 8;
  dischargeSelect.style('max-width', Math.max(90, canvasWidth - dx - pad) + 'px');
  dischargeSelect.position(dx, K.controlRow(0));
  // Row 1: buttons (wrap only if they cannot fit)
  K.flowButtons(1, [submitButton, nextButton, null, startOverButton],
    { x: narrow ? pad : labelCol, groupGap: narrow ? 8 : 16 });
  // Row 2: fan type + rotation; row 3: angle slider
  fanTypeSelect.position(labelCol + 10, K.controlRow(2));
  practiceRotSelect.position(labelCol + 10 + fanTypeSelect.elt.offsetWidth + 8, K.controlRow(2));
  angleSlider.position(labelCol + 10, K.controlRow(3) + 4);
  angleSlider.size(K.sliderWidth(canvasWidth, labelCol + 10));
}

function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Rotation and Discharge Code Builder');
  const st = deck.state();
  const right = mode === 'practice' ? 'Free practice (not scored)'
    : 'Card ' + (st.index + 1) + ' of ' + CARDS.length + ' · ' +
      (st.phase === 'choose' ? 'first submission is scored' : retryUsed ? 'retry used' : 'one unscored retry');
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 480
    ? ['Job cards are illustrative', 'Source: FanPedia PDF pp. 46–49', 'Enter: submit or next card']
    : ['Illustrative job cards', 'Source: FanPedia pp. 46–49']);

  const panelTop = y + 2;
  const panelH = drawHeight - 22 - panelTop;
  let text1, diag;   // left (or top) text panel and the diagram panel, as [x, y, w, h]
  if (canvasWidth >= 560) {
    // side by side
    const leftW = Math.round(canvasWidth * 0.54);
    text1 = [10, panelTop, leftW - 15, panelH];
    diag = [leftW + 5, panelTop, canvasWidth - leftW - 15, panelH];
  } else {
    // narrow: text panel on top, a compact diagram strip below
    const dh = Math.min(150, Math.round(panelH * 0.32));
    text1 = [10, panelTop, canvasWidth - 20, panelH - dh - 6];
    diag = [10, panelTop + panelH - dh, canvasWidth - 20, dh];
  }
  K.panel(...text1);
  K.panel(...diag);
  const [tx, ty, tw, th] = text1;
  if (mode === 'practice') drawPracticePanel(tx + 10, ty + 8, tw - 20, th - 16);
  else drawCardPanel(tx + 10, ty + 8, tw - 20, th - 16);
  if (canvasWidth >= 560) drawDiagramPanel(...diag);
  else drawCompactDiagram(...diag);

  drawControlLabels();
}

// ---------- Left panel: job card + feedback ----------

function cardLines(card) {
  return [
    { t: 'Fan: ' + FAN_NAMES[card.fan] },
    { t: 'Rotation: ' + card.rot + ' (as seen from the drive side)' },
    { t: 'Outlet: ' + card.desc + '.' },
    canvasWidth >= 560 ? { t: 'Directions are as seen by an observer on the drive side.', muted: true, small: true, gap: 2 } : null,
    { t: 'What code goes on the order?', bold: true, gap: 6 }
  ].filter(Boolean);
}

// Lays out a list of {t, bold, muted, small, color, gap} paragraphs; returns the y below.
function drawParas(paras, x, y, w, ts, dry) {
  for (const p of paras) {
    const s = p.small ? Math.max(12, ts - 2) : ts;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y += p.gap || 0;
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

function drawCardPanel(x, y, w, h) {
  const st = deck.state();
  const card = st.card;
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(17);
  textAlign(LEFT, TOP);
  text('Job card ' + (st.index + 1) + ' of ' + CARDS.length, x, y);
  textStyle(NORMAL);
  const top = y + 26;

  const paras = cardLines(card);
  if (notice) paras.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 8 });
  const fb = [];
  if (feedback) {
    if (feedback.chose) fb.push({ t: 'You chose: ' + feedback.chose, muted: true });
    fb.push({ t: feedback.message, bold: false, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') });
  }
  const fbPad = 8;
  const avail = y + h - top;
  const layout = ts => {
    let yy = drawParas(paras, x, top, w, ts, true);
    if (fb.length) yy = drawParas(fb, x + fbPad, yy + 10 + fbPad, w - 2 * fbPad, ts, true) + fbPad;
    return yy - top;
  };
  const ts = K.fitTextSize(layout, avail, 16, 12);
  let yy = drawParas(paras, x, top, w, ts, false);
  if (fb.length) {
    const fbTop = yy + 10;
    const fbH = drawParas(fb, x + fbPad, fbTop + fbPad, w - 2 * fbPad, ts, true) + fbPad - fbTop;
    // ✓ solid border for correct, ✗ dashed border for incorrect: never colour alone
    K.panel(x - 2, fbTop, w + 4, fbH, {
      fill: feedback.kind === 'ok' ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: feedback.kind === 'ok' ? '--fp-correct' : '--fp-incorrect',
      dashed: feedback.kind !== 'ok', weight: 2
    });
    drawParas(fb, x + fbPad, fbTop + fbPad, w - 2 * fbPad, ts, false);
  }
}

function drawPracticePanel(x, y, w, h) {
  const fan = fanTypeSelect.value();
  const rot = practiceRotSelect.value();
  const angle = Number(angleSlider.value());
  const d = C.dischargeByAngle(angle);
  const offered = C.isDischargeOffered(fan, d.code);
  noStroke();
  fill(FP.tok('text'));
  textStyle(BOLD);
  textSize(17);
  textAlign(LEFT, TOP);
  text('Free practice', x, y);
  const ptw = textWidth('Free practice ');
  textStyle(NORMAL);
  textSize(14);
  fill(FP.tok('text-muted'));
  text(ptw + textWidth('(Explore mode, not scored)') < w ? '(Explore mode, not scored)' : '(not scored)', x + ptw, y + 2);
  const top = y + 28;

  const paras = [
    { t: 'Fan: ' + FAN_NAMES[fan] },
    { t: 'Rotation: ' + rot + ', discharge angle ' + angle + '°' },
    { t: 'Outlet points ' + C.directionWords(C.airDirection(rot, angle)) + ' (drive side).' }
  ];
  if (!offered) {
    paras.push({ t: FP.msg.BAD + ' Not offered on DWDI', bold: true, color: FP.tok('incorrect'), gap: 8, big: true });
    paras.push({ t: 'DWDI fans come in seven discharges; ' + rot + ' BAD (' + rot + ' 225) is the missing one.' });
  } else {
    paras.push({ t: rot + ' ' + d.code + '  (' + rot + ' ' + angle + ')', bold: true, color: FP.tok('primary-dark'), gap: 8, big: true });
    paras.push({ t: d.name + ' discharge.' });
  }
  paras.push({ t: canvasWidth >= 560
    ? 'Try it: keep the angle fixed and switch CW to CCW. The outlet mirrors left to right; only 360 and 180 stay put.'
    : 'Try it: switch CW and CCW at a fixed angle; only 360 and 180 stay put.', muted: true, gap: canvasWidth >= 560 ? 10 : 6 });
  const s = deck.summary();
  const missed = s.misses.map(m => CARDS.indexOf(m.card) + 1);
  const sum = [{ t: s.lines[0], bold: true, gap: canvasWidth >= 560 ? 12 : 6 }, { t: s.lines[1] }];
  if (missed.length) sum.push({ t: 'Missed cards: ' + missed.join(', ') + '.', muted: true });

  const all = paras.concat(sum);
  const ts = K.fitTextSize(t => drawPara2(all, x, top, w, t, true) - top, y + h - top, 16, 12);
  drawPara2(all, x, top, w, ts, false);
}

// drawParas with a larger size for {big} lines (the practice code)
function drawPara2(paras, x, y, w, ts, dry) {
  for (const p of paras) {
    y = drawParas([p], x, y, w, p.big ? ts + 4 : ts, dry);
  }
  return y;
}

// ---------- Right panel: drive-side housing ----------

function currentView() {
  if (mode === 'practice') {
    const fan = fanTypeSelect.value();
    const angle = Number(angleSlider.value());
    return { fan, rot: practiceRotSelect.value(), angle,
      notOffered: !C.isDischargeOffered(fan, C.dischargeByAngle(angle).code) };
  }
  if (feedback) {
    const card = deck.state().card;
    return { fan: card.fan, rot: card.rot, angle: C.dischargeByCode(card.code || card.requested).angle,
      notOffered: card.code === null };
  }
  return null;
}

function drawDiagramPanel(px, py, pw, ph) {
  noStroke();
  fill(FP.tok('text'));
  textAlign(CENTER, TOP);
  textSize(15);
  text('Drive-side view', px + pw / 2, py + 8);

  const cx = px + pw / 2;
  const cy = py + 30 + (ph - 100) / 2;
  const s = Math.min(pw / 1.3, (ph - 110) / 1.25);
  const view = currentView();

  if (!view) {
    // Before submission: no answer revealed
    push();
    stroke(FP.tok('text-muted'));
    strokeWeight(2);
    drawingContext.setLineDash([6, 6]);
    noFill();
    circle(cx, cy, s * 0.6);
    pop();
    noStroke();
    fill(FP.tok('text-muted'));
    textAlign(CENTER, CENTER);
    textSize(48);
    text('?', cx, cy);
    textSize(14);
    textAlign(CENTER, TOP);
    K.wrapText('Submit to see the housing with the correct outlet.', cx, py + ph - 48, pw - 20, 18, { align: CENTER });
    textAlign(LEFT, TOP);
    return;
  }

  FD.scrollHousing(null, { x: cx, y: cy, size: s, rotation: view.rot, angle: view.angle, notOffered: view.notOffered });
  if (pw >= 200) FD.angleDial(null, { x: px + pw - 40, y: py + 52, rotation: view.rot, angle: view.angle });

  // Both code forms under the diagram
  const d = C.dischargeByAngle(view.angle);
  noStroke();
  textAlign(CENTER, TOP);
  const line1 = view.notOffered ? FP.msg.BAD + ' Not offered on DWDI'
    : view.rot + ' ' + d.code + '  ·  ' + view.rot + ' ' + view.angle;
  const line2 = view.notOffered ? 'requested: ' + C.designation(view.rot, d.code) : view.fan + ', ' + d.name;
  textStyle(BOLD);
  let ts = 18;
  textSize(ts);
  while (ts > 13 && textWidth(line1) > pw - 16) textSize(--ts);
  fill(view.notOffered ? FP.tok('incorrect') : FP.tok('text'));
  text(line1, cx, py + ph - 54);
  textStyle(NORMAL);
  textSize(14);
  fill(FP.tok('text-muted'));
  K.wrapText(line2, cx, py + ph - 30, pw - 12, 16, { align: CENTER, maxLines: 2 });
  textAlign(LEFT, TOP);
}

// Narrow canvases: housing at the left of a short strip, both code forms beside it
function drawCompactDiagram(px, py, pw, ph) {
  const view = currentView();
  const s = Math.min((ph - 16) / 1.3, pw * 0.42);
  const cx = px + 12 + s * 0.65;
  const cy = py + ph / 2;
  const tx = cx + s * 0.65 + 10;
  const tw = px + pw - 8 - tx;
  noStroke();
  textAlign(LEFT, TOP);
  textSize(13);
  fill(FP.tok('text'));
  text('Drive-side view', tx, py + 8);
  if (!view) {
    push();
    stroke(FP.tok('text-muted'));
    strokeWeight(2);
    drawingContext.setLineDash([6, 6]);
    noFill();
    circle(cx, cy, s * 0.6);
    pop();
    noStroke();
    fill(FP.tok('text-muted'));
    textAlign(CENTER, CENTER);
    textSize(36);
    text('?', cx, cy);
    textAlign(LEFT, TOP);
    textSize(13);
    K.wrapText('Submit to see the housing with the correct outlet.', tx, py + 30, tw, 17);
    return;
  }
  FD.scrollHousing(null, { x: cx, y: cy, size: s, rotation: view.rot, angle: view.angle, notOffered: view.notOffered });
  const d = C.dischargeByAngle(view.angle);
  textStyle(BOLD);
  textSize(15);
  fill(view.notOffered ? FP.tok('incorrect') : FP.tok('text'));
  let yy = K.wrapText(view.notOffered ? FP.msg.BAD + ' Not offered on DWDI'
    : view.rot + ' ' + d.code + ' · ' + view.rot + ' ' + view.angle, tx, py + 30, tw, 19);
  textStyle(NORMAL);
  textSize(13);
  fill(FP.tok('text-muted'));
  K.wrapText(view.notOffered ? 'requested: ' + C.designation(view.rot, d.code) : view.fan + ', ' + d.name,
    tx, yy + 4, tw, 17, { maxLines: 3 });
}

// ---------- Control-area labels ----------

function drawControlLabels() {
  const narrow = canvasWidth < 480;
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(narrow ? 14 : 16);
  fill(FP.tok('text'));
  text('Your code:', 10, K.controlLabel(0));
  const locked = !practiceUnlocked();
  fill(FP.tok(locked ? 'text-muted' : 'text'));
  text(narrow ? 'Practice:' : 'Free practice:', 10, K.controlLabel(2));
  textStyle(NORMAL);
  textSize(14);
  if (locked) {
    fill(FP.tok('text-muted'));
    text(narrow ? 'Free practice unlocks after card 8.' : 'Free practice (Explore mode) unlocks after card 8.',
      10, K.controlLabel(3));
  } else {
    fill(FP.tok('text'));
    textSize(narrow ? 14 : 16);
    text('Angle: ' + angleSlider.value() + '°', 10, K.controlLabel(3));
  }
  textAlign(LEFT, TOP);
}

// ---------- Card logic ----------

function choiceText(choice) {
  return choice.disch === 'NONE' ? 'Not offered' : C.designation(choice.rot, choice.disch);
}

// Spec feedback: Correct: "Correct: <answer>."; Incorrect: the card's Why, then the answer.
function verdictText(ok, card, scored) {
  if (ok) return FP.msg.correct(card.answerText + '.');   // spec: "Correct: <answer>."
  return FP.msg.BAD + ' Not quite. ' + card.why + ' Correct answer: ' + card.answerText + '.' +
    (scored ? ' This one counts as missed.' : '');
}

function submitAnswer() {
  const st = deck.state();
  if (mode !== 'cards' || retryUsed || st.phase === 'summary') return;
  const choice = { rot: rotSelect.value(), disch: dischargeSelect.value() };
  if (choice.disch === '') return setNotice('Choose a discharge (or Not offered) first.');
  if (choice.disch !== 'NONE' && choice.rot === '') return setNotice('Choose a rotation (CW or CCW) first.');
  notice = '';
  const card = st.card;
  let ok;
  if (st.phase === 'choose') {
    ok = deck.place(choice).status === 'correct';   // the scored first submission
    feedback = { kind: ok ? 'ok' : 'bad', message: verdictText(ok, card, true), chose: choiceText(choice) };
  } else {
    // the one unscored retry: checked the same way, never counted
    ok = isCorrect(card, choice);
    retryUsed = true;
    feedback = { kind: ok ? 'ok' : 'bad', message: FP.msg.practice(verdictText(ok, card, false)), chose: choiceText(choice) };
    FP.events.emit('answered', { source: 'ch13-rotation-discharge-code-builder', itemId: card.id,
      index: st.index, value: choice, correct: ok, attempt: 2, final: true, scored: false });
  }
  FP.announce('You chose ' + feedback.chose + '. ' + feedback.message);
  updateControlStates();
}

function setNotice(text) {
  notice = text;
  FP.announce(text);
}

function nextCard() {
  const st = deck.state();
  if (mode !== 'cards' || st.phase !== 'feedback') return;
  if (st.isLast) return enterPractice();
  deck.next();
  feedback = null;
  notice = '';
  retryUsed = false;
  resetCardControls();
  updateControlStates();
  FP.announce('Job card ' + (deck.state().index + 1) + ' of ' + CARDS.length + '. ' + deck.state().card.desc + '.');
}

function practiceUnlocked() {
  const st = deck.state();
  return mode === 'practice' || st.phase === 'summary' || (st.isLast && st.phase === 'feedback');
}

// Free practice starts at the rule's defaults: SWSI, CW, 360
function enterPractice() {
  if (!practiceUnlocked()) return;
  if (mode !== 'practice') {
    if (deck.state().phase === 'feedback') deck.next();   // closes the round (summary, events)
    mode = 'practice';
    const s = deck.summary();
    FP.announce('Free practice. ' + s.lines.join(' '));
    updateControlStates();
  }
  announcePractice();
}

function announcePractice() {
  const fan = fanTypeSelect.value(), rot = practiceRotSelect.value(), angle = Number(angleSlider.value());
  const key = fan + rot + angle;
  if (key === lastPracticeKey) return;
  lastPracticeKey = key;
  const d = C.dischargeByAngle(angle);
  FP.announce(C.isDischargeOffered(fan, d.code)
    ? rot + ' ' + d.code + ', ' + rot + ' ' + angle + ', ' + d.name + ' discharge.'
    : 'Not offered on DWDI: ' + rot + ' BAD, ' + rot + ' 225.');
}

function startOver() {
  deck.newRound();
  mode = 'cards';
  feedback = null;
  notice = '';
  retryUsed = false;
  lastPracticeKey = '';
  fanTypeSelect.selected('SWSI');
  practiceRotSelect.selected('CW');
  angleSlider.value(360);
  resetCardControls();
  updateControlStates();
  FP.announce('Started over. Job card 1 of ' + CARDS.length + '. ' + CARDS[0].desc + '.');
}

function enterKey() {
  if (mode !== 'cards') return;
  const st = deck.state();
  if (st.phase === 'choose') submitAnswer();
  else if (st.phase === 'feedback') nextCard();
}

function keyPressed() { return keys(); }

function resetCardControls() {
  rotSelect.selected('');
  dischargeSelect.selected('');
}

function updateControlStates() {
  const st = deck.state();
  const inCards = mode === 'cards';
  const canSubmit = inCards && !retryUsed && st.phase !== 'summary';
  K.setEnabled(rotSelect, canSubmit);
  K.setEnabled(dischargeSelect, canSubmit);
  K.setEnabled(submitButton, canSubmit);
  // Shorter labels on narrow canvases keep row 1 on one line; aria-labels keep the full text
  const narrow = canvasWidth < 480;
  const subLabel = st.phase === 'choose' ? 'Submit code' : 'Retry (unscored)';
  submitButton.html(narrow ? (st.phase === 'choose' ? 'Submit' : 'Retry') : subLabel);
  submitButton.attribute('aria-label', subLabel);
  K.setEnabled(nextButton, inCards && st.phase === 'feedback');
  // In free practice only Start over applies to the cards
  for (const b of [submitButton, nextButton]) { if (inCards) b.show(); else b.hide(); }
  const nextLabel = st.isLast ? 'Start free practice' : 'Next card';
  nextButton.html(narrow && st.isLast ? 'Free practice' : nextLabel);
  nextButton.attribute('aria-label', nextLabel);
  const practiceOn = practiceUnlocked();
  K.setEnabled(fanTypeSelect, practiceOn);
  K.setEnabled(practiceRotSelect, practiceOn);
  K.setEnabled(angleSlider, practiceOn);
  // The angle slider stays hidden until free practice unlocks (its row says so)
  if (practiceOn) angleSlider.show(); else angleSlider.hide();
  positionControls();
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControlStates();   // relabels for the width, then positions the controls
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
