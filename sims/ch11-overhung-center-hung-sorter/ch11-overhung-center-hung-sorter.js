// Overhung or Center Hung Sorter - p5.js MicroSim (Chapter 11: Drives and Standard Fan Arrangements)
// CANVAS_HEIGHT: 640
// Twelve arrangement cards, shuffled, one attempt each. For each card the learner commits two
// choices: impeller position (Overhung / Center hung) and bearing location (All out of
// airstream / At least one in airstream / No fan bearings). A card is correct only when both
// match. After Check a side-view schematic shows the impeller, shaft, bearings and the edge of
// the airstream. After card 12: score, mastery (10 of 12), missed cards, new shuffled round.
// Built on the FanPedia kit: FP.CardDeck (round, score, mastery, retry missed), FD (side-view
// arrangement schematics and parts), FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-drawings.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch11-overhung-center-hung-sorter';

// ---------- Canvas layout: fixed height; the drawing region gives way to wrapped controls ----------
let canvasWidth = 800;
const canvasHeight = 640;
let controlHeight = K.controlHeightFor(3);
let drawHeight = canvasHeight - controlHeight;
const WIDE_MIN = 560;
const MASTERY = 10;
const QUESTION = 'Where is the impeller, and where are the bearings?';

const POS = { OH: 'Overhung', CH: 'Center hung' };
const BEAR = { OUT: 'All out of airstream', IN: 'At least one in airstream', NONE: 'No fan bearings' };
const DIRECT_DRIVE_NOTE = 'Direct drive does not decide impeller position; Arrangements 4 and 8 are direct drive and overhung.';

// ---------- Schematics for arrangements the kit does not draw (FD parts, ch11 local units) ----------
// FD.arrangement covers 1, 3 (SWSI), 3SI, 3DI, 4, 7 (DWDI), 8, 9 and 10. Arrangement 3 DWDI,
// 7SI and 7DI are composed here from the same FD parts.
const CUSTOM = {
  '3DWDI': [
    ['air', { x1: 55, y1: 82, x2: 134, y2: 92 }], ['air', { x1: 55, y1: 138, x2: 134, y2: 128 }],
    ['air', { x1: 290, y1: 70, x2: 264, y2: 88 }], ['air', { x1: 290, y1: 150, x2: 264, y2: 132 }],
    ['housingSide', { x0: 150, x1: 250, inletLeft: true, inletRight: true, part: 'housing' }],
    ['impellerSide', { i0: 160, i1: 240, doubleWidth: true, part: 'impeller' }],
    ['inletBracket', { xWall: 150, xBar: 122, part: 'bracket' }], ['inletBracket', { xWall: 250, xBar: 278, part: 'bracket' }],
    ['shaft', { xa: 112, xb: 330, part: 'shaft' }],
    ['bearing', { x: 122, part: 'bearing' }], ['bearing', { x: 278, part: 'bearing' }],
    ['base', { x0: 340, y0: 214, x1: 430, y1: 230, part: 'base' }], ['motor', { x0: 347, x1: 423, y0: 168, y1: 214, part: 'motor' }],
    ['motorShaft', { xa: 320, xb: 347, y: 191 }], ['belts', { x: 320, y1: 110, y2: 191, part: 'belts' }],
    ['sheave', { x: 320, y: 110, r: 22, part: 'sheave' }], ['sheave', { x: 320, y: 191, r: 13, part: 'sheave' }]
  ],
  '7SI': [
    ['inletBox', { x0: 90, x1: 170, part: 'inletBox' }], ['housingSide', { x0: 170, x1: 250, part: 'housing' }],
    ['impellerSide', { i0: 182, i1: 238, part: 'impeller' }],
    ['pedestal', { x0: 44, x1: 76, top: 140, part: 'pedestal' }], ['pedestal', { x0: 270, x1: 480, top: 140, part: 'pedestal' }],
    ['shaft', { xa: 50, xb: 335, part: 'shaft' }],
    ['bearing', { x: 60, foot: true, part: 'bearing' }], ['bearing', { x: 286, foot: true, part: 'bearing' }],
    ['coupling', { x: 335, part: 'coupling' }], ['motorShaft', { xa: 352, xb: 372, y: 110 }],
    ['motor', { x0: 372, x1: 470, y0: 78, y1: 140, part: 'motor' }]
  ],
  '7DI': [
    ['inletBox', { x0: 150, x1: 220, part: 'inletBox' }], ['inletBox', { x0: 340, x1: 410, part: 'inletBox' }],
    ['housingSide', { x0: 220, x1: 340, part: 'housing' }],
    ['impellerSide', { i0: 232, i1: 328, doubleWidth: true, part: 'impeller' }],
    ['pedestal', { x0: 104, x1: 136, top: 140, part: 'pedestal' }], ['pedestal', { x0: 424, x1: 616, top: 140, part: 'pedestal' }],
    ['shaft', { xa: 110, xb: 480, part: 'shaft' }],
    ['bearing', { x: 120, foot: true, part: 'bearing' }], ['bearing', { x: 440, foot: true, part: 'bearing' }],
    ['coupling', { x: 475, part: 'coupling' }], ['motorShaft', { xa: 492, xb: 512, y: 110 }],
    ['motor', { x0: 512, x1: 606, y0: 78, y1: 140, part: 'motor' }]
  ]
};

// ---------- Cards (spec Content table) ----------
// draw: FD.arrangement code or a CUSTOM key; imp: impeller centre x; bearings: [x, inAirstream];
// air: airstream span [x0, x1] in local units.
const CARDS = [
  { id: 1, title: 'Arrangement 1 SWSI', text: 'Belt driven; two bearings on a pedestal beside the housing',
    pos: 'OH', bear: 'OUT', draw: '1', imp: 159, bearings: [[255, false], [335, false]], air: [25, 200],
    why: 'The impeller is at the shaft end; both bearings sit on the pedestal, out of the airstream (FanPedia p. 162).' },
  { id: 2, title: 'Arrangement 3 SWSI', text: 'Usually belt driven; one bearing on each side of the impeller',
    pos: 'CH', bear: 'IN', draw: '3', imp: 240, bearings: [[172, true], [305, false]], air: [70, 280],
    why: 'Arrangement 3 has one bearing in the airstream, on the inlet side (FanPedia p. 163).' },
  { id: 3, title: 'Arrangement 3 DWDI', text: 'V-belt drive; double width impeller with inlets on both sides',
    pos: 'CH', bear: 'IN', draw: '3DWDI', imp: 200, bearings: [[122, true], [278, true]], air: [55, 295],
    why: 'Both bearings are in the airstream, which limits standard DWDI fans to clean air at 130°F (FanPedia p. 167).' },
  { id: 4, title: 'Arrangement 3SI', text: 'Single width fan with an attached inlet box; bearings on independent pedestals',
    pos: 'CH', bear: 'OUT', draw: '3SI', imp: 210, bearings: [[60, false], [286, false]], air: [90, 250],
    why: 'The inlet box lets the inlet-side bearing stand outside the airstream (FanPedia p. 164).' },
  { id: 5, title: 'Arrangement 3DI', text: 'Double width fan with integrated inlet boxes; bearings on independent pedestals',
    pos: 'CH', bear: 'OUT', draw: '3DI', imp: 280, bearings: [[120, false], [440, false]], air: [150, 410],
    why: 'Integrated inlet boxes put both bearings outside the airstream (FanPedia p. 167).' },
  { id: 6, title: 'Arrangement 4 SWSI', text: 'Impeller mounted directly to the motor shaft; motor on a pedestal',
    pos: 'OH', bear: 'NONE', draw: '4', imp: 179, bearings: [], motorAt: [300, 110], air: [45, 220],
    why: 'The impeller hangs on the motor shaft; the only bearings are inside the motor (FanPedia pp. 79, 164).' },
  { id: 7, title: 'Arrangement 7 DWDI', text: 'Direct drive; flexible coupling; pedestal carries the motor, the coupling and one bearing',
    pos: 'CH', bear: 'IN', draw: '7', imp: 200, bearings: [[122, true], [292, true]], air: [55, 305],
    why: 'Like Arrangement 3 DWDI, the impeller sits between the bearings with an inlet on each side, so both bearings ' +
      'sit in the airstream; only the 7DI\'s inlet boxes move the bearings out (FanPedia pp. 167–168).' },
  { id: 8, title: 'Arrangement 7SI', text: 'Direct drive; single width fan with an integrated inlet box; flexible coupling',
    pos: 'CH', bear: 'OUT', draw: '7SI', imp: 210, bearings: [[60, false], [286, false]], air: [90, 250],
    why: 'The inlet box locates the bearing outside the airstream (FanPedia p. 165).' },
  { id: 9, title: 'Arrangement 7DI', text: 'Direct drive; double width fan with integrated inlet boxes; flexible coupling',
    pos: 'CH', bear: 'OUT', draw: '7DI', imp: 280, bearings: [[120, false], [440, false]], air: [150, 410],
    why: 'Integrated inlet boxes locate both bearings outside the airstream (FanPedia p. 168).' },
  { id: 10, title: 'Arrangement 8 SWSI', text: 'Direct drive; the Arrangement 1 pedestal extended to carry the motor; flexible coupling',
    pos: 'OH', bear: 'OUT', draw: '8', imp: 159, bearings: [[250, false], [330, false]], air: [25, 200],
    why: 'Arrangement 8 is a modified Arrangement 1, so the impeller stays at the shaft end with both bearings on the pedestal (FanPedia pp. 79, 165).' },
  { id: 11, title: 'Arrangement 9 SWSI', text: 'Belt driven; motor on a slide base on the side of the bearing pedestal',
    pos: 'OH', bear: 'OUT', draw: '9', imp: 159, bearings: [[255, false], [335, false]], air: [25, 200],
    why: 'Arrangement 9 is in the overhung group with Arrangements 1, 8 and 10 (FanPedia p. 30).' },
  { id: 12, title: 'Arrangement 10 SWSI', text: 'Belt driven; motor on an adjustable base inside the bearing pedestal',
    pos: 'OH', bear: 'OUT', draw: '10', imp: 159, bearings: [[255, false], [335, false]], air: [25, 200],
    why: 'Arrangement 10 is in the overhung group, with its bearings on the pedestal (FanPedia pp. 30, 167).' }
].map(c => Object.assign(c, { answerText: POS[c.pos] + ', ' + BEAR[c.bear] }));

const isCorrect = (card, choice) => choice.pos === card.pos && choice.bear === card.bear;

// Spec feedback: names the wrong field, then the Why; the direct-drive note for cards 6 and 10.
function missWhy(card, choice) {
  const parts = [];
  const posWrong = choice.pos !== card.pos, bearWrong = choice.bear !== card.bear;
  if (posWrong && bearWrong) parts.push('Both choices are wrong: impeller position and bearings.');
  else if (posWrong) parts.push('The impeller position is wrong (you chose ' + POS[choice.pos] + '); your bearing choice is right.');
  else parts.push('The bearing location is wrong (you chose ' + BEAR[choice.bear] + '); your impeller position is right.');
  parts.push(card.why);
  if ((card.id === 6 || card.id === 10) && choice.pos === 'CH') parts.push(DIRECT_DRIVE_NOTE);
  return parts.join(' ');
}

const deck = new FP.CardDeck({
  cards: CARDS, shuffle: true, attempts: 1, retryMissed: true,
  noun: 'Cards', mastery: MASTERY, check: isCorrect,
  reviewPointer: 'Review "Overhung Impeller" and "Center Hung Impeller", then press Start over for a new shuffled round',
  messages: {
    correct: res => FP.msg.correct(res.card.answerText),                       // "Correct: <position>, <bearings>."
    // In a Retry-missed round the kit adds "Practice (not scored): "; nothing more is counted then
    missed: res => (res.practice
      ? '✗ Not quite. The answer is ' + res.card.answerText + '. ' + missWhy(res.card, res.chosen)
      : FP.msg.missed(res.card.answerText, missWhy(res.card, res.chosen)))
  },
  id: SIM_ID
});

// ---------- State ----------
let choice = { pos: null, bear: null };
let feedback = null;     // {kind, message}
let notice = '';

// ---------- Controls ----------
let posButtons = {}, bearButtons = {};
let checkButton, nextButton, retryButton, startOverButton;
let labelCol = 100;
let rowBear = 1, rowActions = 2;

const keys = K.keys.bind({
  '1': () => choose('pos', 'OH'), '2': () => choose('pos', 'CH'),
  '3': () => choose('bear', 'OUT'), '4': () => choose('bear', 'IN'), '5': () => choose('bear', 'NONE'),
  Enter: onEnter
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  for (const k of Object.keys(POS)) posButtons[k] = makeChoice(POS[k], 'pos', k, 'Impeller position: ' + POS[k]);
  for (const k of Object.keys(BEAR)) bearButtons[k] = makeChoice(BEAR[k], 'bear', k, 'Bearings: ' + BEAR[k]);
  checkButton = K.button(FP.msg.CHECK, checkCard);
  nextButton = K.button('Next card', nextCard);
  retryButton = K.button(FP.msg.RETRY_MISSED, retryMissed, { variant: 'secondary' });
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  startOverButton.attribute('aria-label', 'Start over with a new shuffled round');

  syncControls();
  describe('Overhung or center hung sorter. A card describes one fan arrangement in a line of text. ' +
    'The learner chooses the impeller position (overhung or center hung) and the bearing location ' +
    '(all out of the airstream, at least one in the airstream, or no fan bearings) and presses Check. ' +
    'A side-view schematic then shows the impeller, the shaft, the bearings and the shaded airstream, ' +
    'with the correct answer and the reason. Twelve cards per shuffled round; mastery is 10 of 12.');
}

function makeChoice(label, field, value, aria) {
  const b = K.button(label, () => choose(field, value));
  b.addClass('choice');
  b.attribute('aria-pressed', 'false');
  b.attribute('aria-label', aria);
  // Space (or a click) picks the option; Enter checks the card, as everywhere else in the sim
  b.elt.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onEnter(); }
  });
  return b;
}

// ---------- Choices and flow ----------
function choose(field, value) {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  choice[field] = value;
  notice = '';
  syncControls();
}

function onEnter() {
  const st = deck.state();
  if (st.phase === 'choose') checkCard();
  else if (st.phase === 'feedback') nextCard();
}

function checkCard() {
  const st = deck.state();
  if (st.phase !== 'choose') return;
  if (!choice.pos || !choice.bear) {
    notice = 'Choose both an impeller position and a bearing location, then press Check.';
    FP.announce(notice);
    return;
  }
  const res = deck.place({ pos: choice.pos, bear: choice.bear });
  if (res.status === 'ignored') return;
  feedback = { kind: res.kind, message: res.message };
  FP.announce(res.message);
  syncControls();
  nextButton.elt.focus();
}

function nextCard() {
  const st = deck.state();
  if (st.phase !== 'feedback') return;
  deck.next();
  feedback = null;
  notice = '';
  choice = { pos: null, bear: null };
  const s2 = deck.state();
  syncControls();
  if (s2.phase === 'summary') {
    const s = deck.summary();
    FP.announce((s2.practice ? 'Practice round done. ' : 'Round done. ') + s.lines.join(' ') +
      (deck.roundMisses().length ? ' Missed: ' + deck.roundMisses().map(m => m.card.title).join('; ') + '.' : ''));
    (retryButton.elt.hidden ? startOverButton : retryButton).elt.focus();
  } else {
    FP.announce('Card ' + (s2.index + 1) + ' of ' + s2.count + '. ' + s2.card.title + ': ' + s2.card.text + '.');
    posButtons.OH.elt.focus();
  }
}

function retryMissed() {
  if (!deck.retryMissed()) return;
  feedback = null; notice = ''; choice = { pos: null, bear: null };
  syncControls();
  const st = deck.state();
  FP.announce('Retry missed (not scored). Card 1 of ' + st.count + '. ' + st.card.title + ': ' + st.card.text + '.');
  posButtons.OH.elt.focus();
}

function startOver() {
  deck.newRound();
  feedback = null; notice = ''; choice = { pos: null, bear: null };
  syncControls();
  const st = deck.state();
  FP.announce('New shuffled round. Card 1 of ' + st.count + '. ' + st.card.title + ': ' + st.card.text + '.');
  posButtons.OH.elt.focus();
}

// ---------- Control state and layout ----------
function syncControls() {
  const had = document.activeElement;
  const st = deck.state();
  const choosing = st.phase === 'choose';
  const inCards = st.phase !== 'summary';
  const all = Object.values(posButtons).concat(Object.values(bearButtons));
  for (const [k, b] of Object.entries(posButtons)) b.attribute('aria-pressed', String(choice.pos === k));
  for (const [k, b] of Object.entries(bearButtons)) b.attribute('aria-pressed', String(choice.bear === k));
  // after Check, show the learner's own choices as pressed (locked)
  if (st.phase === 'feedback' && st.last) {
    for (const [k, b] of Object.entries(posButtons)) b.attribute('aria-pressed', String(st.last.chosen.pos === k));
    for (const [k, b] of Object.entries(bearButtons)) b.attribute('aria-pressed', String(st.last.chosen.bear === k));
  }
  for (const b of all) { if (inCards) b.show(); else b.hide(); K.setEnabled(b, choosing); }
  if (inCards) { checkButton.show(); nextButton.show(); } else { checkButton.hide(); nextButton.hide(); }
  K.setEnabled(checkButton, choosing && !!choice.pos && !!choice.bear);
  K.setEnabled(nextButton, st.phase === 'feedback');
  const nextLabel = st.isLast ? 'See results' : 'Next card';
  nextButton.html(nextLabel);
  const s = deck.summary();
  if (!inCards && s.canRetryMissed && !st.practice) retryButton.show(); else retryButton.hide();
  positionControls();
  FP.p5.keepFocus(had, all.concat([checkButton, nextButton, retryButton, startOverButton]));
}

// Width a choice button takes when pressed (the CSS adds a "✓ " prefix)
function choiceWidth(b) {
  return (b.elt.offsetWidth || 0) + (b.elt.getAttribute('aria-pressed') === 'true' ? 0 : 16);
}

function positionControls() {
  const narrow = canvasWidth < WIDE_MIN;
  labelCol = narrow ? 84 : 100;
  // Fixed canvas height: the control region takes the rows this width needs, the drawing the rest
  controlHeight = K.controlHeightFor(Math.max(3, rowsNeeded()));
  drawHeight = canvasHeight - controlHeight;
  K.config({ drawHeight, controlHeight });
  const summary = deck.state().phase === 'summary';
  const opt = { x: labelCol, measure: choiceWidth };
  rowBear = K.flowButtons(0, [posButtons.OH, posButtons.CH], opt);
  rowActions = summary ? 0 : K.flowButtons(rowBear, [bearButtons.OUT, bearButtons.IN, bearButtons.NONE], opt);
  K.flowButtons(rowActions, [checkButton, nextButton, null, retryButton, startOverButton],
    { x: summary || narrow ? 10 : labelCol, groupGap: narrow ? 8 : 16 });
}

// Rows the card controls need at this width (stable across phases, so the drawing does not jump)
function rowsNeeded() {
  const narrow = canvasWidth < WIDE_MIN;
  const avail = canvasWidth - 10 - labelCol;
  // widths without the pressed "✓ " prefix, plus that prefix once (one option is pressed at a time)
  const raw = b => (b.elt.offsetWidth || 0) - (b.elt.getAttribute('aria-pressed') === 'true' ? 16 : 0);
  const fits = (list) => {
    let rows = 1, x = 0;
    const widest = list.reduce((m, b) => (raw(b) > raw(m) ? b : m), list[0]);
    for (const b of list) {
      const w = raw(b) + (b === widest ? 16 : 0);
      if (x > 0 && x + w > avail) { rows++; x = 0; }
      x += w + 8;
    }
    return rows;
  };
  const a = fits([posButtons.OH, posButtons.CH]);
  const b = fits([bearButtons.OUT, bearButtons.IN, bearButtons.NONE]);
  const actW = [checkButton, nextButton, startOverButton].reduce((s, x) => s + (x.elt.offsetWidth || 90) + 8, 16);
  const c = actW > canvasWidth - (narrow ? 20 : labelCol + 10) ? 2 : 1;
  return a + b + c;
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const st = deck.state();
  let y = K.title('Overhung or Center Hung Sorter');
  const left = st.practice ? 'Retry missed (not scored)' : 'Correct: ' + deck.score.correct() + ' of ' + CARDS.length;
  const right = st.phase === 'summary' ? (st.practice ? 'Practice done' : 'Round done')
    : 'Card ' + (st.index + 1) + ' of ' + st.count;
  y = K.statusLine(left, right, null, { y: y - 4 });
  const wide = canvasWidth >= WIDE_MIN;
  const noteText = wide
    ? ['Source: FanPedia pp. 30, 79, 162–168', 'Schematics simplified', 'Keys: 1–2 impeller, 3–5 bearings, Enter checks or goes on']
    : ['FanPedia pp. 30, 79, 162–168', 'Keys 1–5, Enter'];
  K.note(noteText);
  const top = y + 2, bottom = drawHeight - 26;

  if (st.phase === 'summary') {
    drawSummary(10, top, canvasWidth - 20, bottom - top);
  } else {
    const avail = bottom - top;
    // The card panel takes what its text needs at 16 px (the feedback included); the schematic the rest
    const minSchem = wide ? 200 : 104;
    const cardH = Math.round(Math.max(80, Math.min(cardNeed(canvasWidth - 20, 16) + 16, avail - minSchem - 6)));
    drawCardPanel(10, top, canvasWidth - 20, cardH);
    drawSchematicPanel(10, top + cardH + 6, canvasWidth - 20, avail - cardH - 6);
  }
  drawControlLabels();
}

// Lays out [{t, bold, muted, color, size, gap}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry, yMax) {
  for (const p of list) {
    const s = p.size ? Math.max(12, ts + p.size) : ts, ld = Math.round(s * 1.3);
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    const left = yMax == null ? Infinity : Math.floor((yMax - y) / ld);
    if (left < 1) break;
    if (!dry) fill(p.color || FP.tok(p.muted ? 'text-muted' : 'text'));
    y = K.wrapText(p.t, x, y, w, ld, { dryRun: dry, maxLines: isFinite(left) ? left : undefined });
  }
  textStyle(NORMAL);
  return y;
}

function cardParts() {
  const card = deck.state().card;
  const head = [
    { t: card.title + ': ' + card.text + '.', bold: true, size: 1 },
    { t: QUESTION, gap: 4 }
  ];
  if (notice) head.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 4 });
  const fb = feedback ? [{ t: feedback.message, color: FP.tok(feedback.kind === 'ok' ? 'correct' : 'incorrect') }] : [];
  return { head, fb };
}
// Height of the card text at size ts in a panel w wide (dry run)
function cardNeed(w, ts) {
  const { head, fb } = cardParts();
  const pad = 6;
  let yy = paras(head, 0, 0, w - 20, ts, true);
  if (fb.length) yy = paras(fb, pad, yy + 8 + pad, w - 20 - 2 * pad, ts, true) + pad;
  return yy;
}

function drawCardPanel(x, y, w, h) {
  K.panel(x, y, w, h);
  noStroke();
  textAlign(LEFT, TOP);
  const { head, fb } = cardParts();
  const tx = x + 10, tw = w - 20, ty = y + 8, avail = h - 16, pad = 6;
  const layout = (ts, dry) => {
    let yy = paras(head, tx, ty, tw, ts, dry);
    if (fb.length) yy = paras(fb, tx + pad, yy + 8 + pad, tw - 2 * pad, ts, dry) + pad;
    return yy - ty;
  };
  const ts = K.fitTextSize(t => layout(t, true), avail, 16, 12);
  let yy = paras(head, tx, ty, tw, ts, false, y + h - 6);
  if (fb.length) {
    const fbTop = yy + 8;
    const fbH = Math.min(paras(fb, tx + pad, fbTop + pad, tw - 2 * pad, ts, true) + pad - fbTop, y + h - 4 - fbTop);
    K.panel(tx - 4, fbTop, tw + 8, fbH, {
      fill: feedback.kind === 'ok' ? '--fp-correct-bg' : '--fp-incorrect-bg',
      stroke: feedback.kind === 'ok' ? '--fp-correct' : '--fp-incorrect',
      dashed: feedback.kind !== 'ok', weight: 2, radius: 6
    });
    noStroke();
    paras(fb, tx + pad, fbTop + pad, tw - 2 * pad, ts, false, fbTop + fbH);
  }
}

function drawSchematicPanel(x, y, w, h) {
  K.panel(x, y, w, h);
  const st = deck.state();
  const card = st.card;
  if (st.phase !== 'feedback') {
    noStroke();
    fill(FP.tok('text-muted'));
    textAlign(CENTER, CENTER);
    textSize(14);
    K.wrapText('Check your answer to see the side view of this arrangement.', x + w / 2, y + h / 2 - 9, w - 40, 18,
      { align: CENTER });
    textAlign(LEFT, TOP);
    return;
  }
  // Caption with the correct answer
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(14);
  const cap = card.title + ': ' + card.answerText;
  // Legend for the shaded airstream at the right of the caption row
  const legW = 98, legInline = w >= 480;
  const capW = legInline ? w - 30 - legW : w - 20;
  K.wrapText(cap, x + 10, y + 6, capW, 18, { maxLines: 2 });
  textStyle(NORMAL);
  const capH = K.countLines(cap, capW) > 1 ? 42 : 24;
  drawAirLegend(x + w - 10 - legW, legInline ? y + 6 : y + capH);
  const labels = w >= 440;
  const box = { x: x + 4, y: y + capH, w: w - 8, h: h - capH - 4 };
  const f = FD.frame(box, FD.SIDE.localW, labels ? -46 : -24, FD.SIDE.localBottom + (labels ? 4 : -14));
  drawAirstream(f, card);
  if (CUSTOM[card.draw]) {
    FD.floor(null, { frame: f });
    for (const [part, so] of CUSTOM[card.draw]) {
      if (part === 'air') { FD.airflowArrow(null, Object.assign({ frame: f }, so)); continue; }
      FD[part](null, Object.assign({ frame: f }, so, { highlight: so.part === 'impeller' || so.part === 'bearing' }));
    }
  } else {
    FD.arrangement(null, card.draw, { frame: f, highlight: ['impeller', 'bearing'], labels: false });
  }
  if (labels) drawPartLabels(f, card, box);
}

// Shaded airstream with dashed edges: the edge of the airstream the spec asks to show
function drawAirstream(f, card) {
  const [a, b] = card.air;
  const x0 = f.X(a), x1 = f.X(b), y0 = f.Y(-22), y1 = f.Y(215);
  push();
  noStroke();
  fill(airFill());
  rect(x0, y0, x1 - x0, y1 - y0);
  stroke(FP.tok('air'));
  strokeWeight(1.5);
  drawingContext.setLineDash([6, 5]);
  line(x0, y0, x0, y1);
  line(x1, y0, x1, y1);
  drawingContext.setLineDash([]);
  pop();
}

function airFill() { const c = color(FP.tok('air')); c.setAlpha(34); return c; }

function drawAirLegend(x, y) {
  push();
  fill(airFill());
  stroke(FP.tok('air'));
  strokeWeight(1.5);
  drawingContext.setLineDash([4, 3]);
  rect(x, y + 1, 22, 15);
  drawingContext.setLineDash([]);
  noStroke();
  fill(FP.tok('text'));
  textSize(13);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  text('Airstream', x + 28, y + 2);
  pop();
}

function drawPartLabels(f, card, box) {
  const bounds = { x0: box.x + 4, x1: box.x + box.w - 4 };
  FD.leaderLabel(null, { text: 'Impeller (' + POS[card.pos].toLowerCase() + ')', ax: card.imp, ay: 175, lx: card.imp, ly: 246,
    frame: f, bounds, textSize: 13, highlight: true });
  if (card.motorAt) {
    FD.leaderLabel(null, { text: 'Only bearings: inside the motor', ax: card.motorAt[0], ay: card.motorAt[1], lx: card.motorAt[0] + 60, ly: -34,
      frame: f, bounds, textSize: 13 });
    return;
  }
  // One label per group (in / out), with a leader to each bearing in the group
  const mixed = card.bearings.some(bb => bb[1]) && card.bearings.some(bb => !bb[1]);
  for (const inAir of [true, false]) {
    const xs = card.bearings.filter(bb => bb[1] === inAir).map(bb => bb[0]);
    if (!xs.length) continue;
    // with one bearing in and one out, push the two labels apart so they never overlap
    const lx = xs.reduce((s, v) => s + v, 0) / xs.length + (mixed ? (inAir ? -60 : 70) : 0);
    const txt = (xs.length > 1 ? 'Bearings ' : 'Bearing ') + (inAir ? 'in airstream' : 'out of airstream');
    for (let i = 1; i < xs.length; i++) {
      push();
      stroke(FP.tok('text'));
      strokeWeight(1);
      line(f.X(lx), f.Y(-34), f.X(xs[i]), f.Y(96));
      noStroke();
      fill(FP.tok('text'));
      circle(f.X(xs[i]), f.Y(96), 5);
      pop();
    }
    FD.leaderLabel(null, { text: txt, ax: xs[0], ay: 96, lx, ly: -34, frame: f, bounds, textSize: 13 });
  }
}

function drawSummary(x, y, w, h) {
  K.panel(x, y, w, h);
  const st = deck.state();
  const s = deck.summary();
  const list = [];
  if (st.practice) {
    list.push({ t: 'Retry missed done (not scored). Your round score is unchanged.', bold: true, size: 1 });
  } else {
    list.push({ t: 'Round complete', bold: true, size: 2 });
  }
  list.push({ t: s.lines[0], bold: true, gap: 6 });
  list.push({ t: s.lines[1], color: s.mastered ? FP.tok('primary') : FP.tok('text'), bold: s.mastered });
  const misses = st.practice ? s.practiceMisses : s.misses;   // practice: this round's
  if (misses.length) {
    list.push({ t: (st.practice ? 'Still missed in this practice round:' : 'Missed cards:'), bold: true, gap: 10 });
    for (const m of misses) {
      list.push({ t: '✗ ' + m.card.title + ' is ' + m.answer + '. ' + m.card.why, gap: 3 });
    }
  } else {
    list.push({ t: '✓ No missed cards' + (st.practice ? ' in this practice round.' : '.'), gap: 10 });
  }
  list.push({ t: (s.canRetryMissed && !st.practice ? 'Press Retry missed to practise the missed cards (not scored), or ' : 'Press ') +
    'Start over for a new shuffled round.', muted: true, gap: 10 });
  const tx = x + 12, tw = w - 24, ty = y + 10, avail = h - 20;
  const ts = K.fitTextSize(t => paras(list, tx, ty, tw, t, true) - ty, avail, 16, 12);
  noStroke();
  textAlign(LEFT, TOP);
  paras(list, tx, ty, tw, ts, false, y + h - 6);
}

function drawControlLabels() {
  const st = deck.state();
  if (st.phase === 'summary') return;
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(canvasWidth < WIDE_MIN ? 14 : 16);
  fill(FP.tok('text'));
  const mid = r => K.controlRow(r) + (checkButton.elt.offsetHeight || 30) / 2;
  text('Impeller:', 10, mid(0));
  text('Bearings:', 10, mid(rowBear));
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
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
