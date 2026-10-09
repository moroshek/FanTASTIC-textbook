// Fixed or Floating Bearing Assignment - p5.js MicroSim (Chapter 17: Bearing Details, Lubrication and Pedestals)
// CANVAS_HEIGHT: 660
// Ten scenario cards (orientation, bearing type, temperature, arrangement). The learner picks one of
// four bearing configurations and commits it; the sim then labels the shaft's drive-end and
// non-drive-end bearings as fixed or floating and shows the rule step that decided the card.
// Rules (FanPedia pp. 97-99): >= 301 F every type is 1 fixed + 1 floating; <= 300 F ball is 2 fixed
// (3SI, 7SI, 3DI, 7DI: engineering review), roller and split roller 1 fixed + 1 floating; with a
// floating bearing, horizontal = fixed at the drive end, vertical = floating at the drive end.
// Built on the FanPedia kit: FP.CardDeck (cards, wording, score, mastery), FD (shaft, sheave,
// coupling, impeller drawings and palette), FP.p5 (layout, text, controls, keys).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-drawings.js.

const K = FP.p5;
const SIM_ID = 'ch17-fixed-floating-bearing-assignment';

let canvasWidth = 800;
const drawHeight = 580;
const controlHeight = K.controlHeightFor(2);
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 8;

// ---------- The four configurations ----------
const CONFIGS = {
  A: { text: 'Two fixed bearings', short: 'two fixed', narrow: 'Two fixed', de: 'fixed', nde: 'fixed' },
  B: { text: 'Fixed bearing at the drive end, floating bearing at the non-drive end',
       short: 'fixed at the drive end, floating at the non-drive end',
       narrow: 'Fixed at drive end, floating at non-drive end', de: 'fixed', nde: 'floating' },
  C: { text: 'Floating bearing at the drive end, fixed bearing at the non-drive end',
       short: 'floating at the drive end, fixed at the non-drive end',
       narrow: 'Floating at drive end, fixed at non-drive end', de: 'floating', nde: 'fixed' },
  D: { text: 'Flag for engineering review: may need one fixed and one floating',
       short: 'engineering review', narrow: 'Engineering review: may need fixed + floating',
       de: 'fixed', nde: 'review' }
};
const LETTERS = ['A', 'B', 'C', 'D'];
const STRADDLE = ['3SI', '7SI', '3DI', '7DI'];
const TYPE_TEXT = { ball: 'ball', roller: 'roller', split: 'split roller' };

// ---------- The rule (spec Rules, steps 1-3) ----------
function decide(c) {
  if (c.tempF >= 301) {
    return { answer: c.mount === 'horizontal' ? 'B' : 'C',
      steps: 'Steps 1 and 3: ' + c.tempF + '°F is 301°F or above, so one fixed and one floating; ' +
        c.mount + ' mount puts the ' + (c.mount === 'horizontal' ? 'fixed' : 'floating') + ' bearing at the drive end.' };
  }
  if (c.type === 'ball') {
    if (STRADDLE.indexOf(c.arr) >= 0) {
      return { answer: 'D', steps: 'Step 2: ball bearings at ' + c.tempF + '°F would be two fixed, but Arrangement ' +
        c.arr + ' is on the footnote list (3SI, 7SI, 3DI, 7DI), so flag it for review.' };
    }
    return { answer: 'A', steps: 'Step 2: ball bearings at ' + c.tempF + '°F (300°F or below) use two fixed; ' +
      'orientation never comes into it.' };
  }
  return { answer: c.mount === 'horizontal' ? 'B' : 'C',
    steps: 'Steps 2 and 3: ' + TYPE_TEXT[c.type] + ' bearings at 300°F or below use one fixed and one floating; ' +
      c.mount + ' mount puts the ' + (c.mount === 'horizontal' ? 'fixed' : 'floating') + ' bearing at the drive end.' };
}

// ---------- Scenario cards (fixed order; spec Content table) ----------
const CARD_DATA = [
  { fan: 'SWSI centrifugal', arr: '1', mount: 'horizontal', mountText: 'horizontal mount', type: 'ball',
    typeText: 'ball bearings', tempF: 150, spec: 'A',
    why: 'Ball bearings at 300°F and below use two fixed bearings.' },
  { fan: 'SWSI centrifugal', arr: '1', mount: 'horizontal', mountText: 'horizontal mount', type: 'roller',
    typeText: 'spherical roller solid pillow blocks', tempF: 200, spec: 'B',
    why: 'Roller bearings always use one fixed and one floating; on a horizontal fan the fixed bearing is on the drive side.' },
  { fan: 'SWSI centrifugal', arr: '8', mount: 'horizontal', mountText: 'horizontal mount', type: 'split',
    typeText: 'split roller bearings', tempF: 650, spec: 'B',
    why: 'Above 301°F every type uses one fixed and one floating; horizontal puts the fixed bearing at the drive end.' },
  { fan: 'Axial fan', arr: '9', mount: 'vertical', mountText: 'vertical floor mount', type: 'roller',
    typeText: 'roller bearings', tempF: 120, spec: 'C',
    why: 'On vertical mounted fans the floating bearing is on the drive side.' },
  { fan: 'Plug fan', arr: '9', mount: 'vertical', mountText: 'vertical up mount', type: 'ball',
    typeText: 'ball bearings', tempF: 100, spec: 'A',
    why: 'Ball bearings at 300°F and below use two fixed bearings, whatever the orientation.' },
  { fan: 'SWSI centrifugal', arr: '9', mount: 'horizontal', mountText: 'horizontal mount', type: 'ball',
    typeText: 'ball bearings', tempF: 300, tempText: 'exactly 300°F', spec: 'A',
    why: 'The two-fixed rule covers 300°F and below, and 300°F is included.' },
  { fan: 'DWDI centrifugal', arr: '3', mount: 'horizontal', mountText: 'horizontal mount', type: 'roller',
    typeText: 'roller bearings', tempF: 180, spec: 'B',
    why: 'Roller bearings use one fixed and one floating; horizontal puts the fixed bearing at the drive end.' },
  { fan: 'SWSI centrifugal', arr: '3SI', mount: 'horizontal', mountText: 'horizontal mount', type: 'ball',
    typeText: 'ball bearings', tempF: 250, spec: 'D',
    why: "FanPedia's footnote: on 3SI, 7SI, 3DI and 7DI, ball bearings at 300°F and below may require one fixed and one floating." },
  { fan: 'Plenum fan', arr: '3VA', mount: 'vertical', mountText: 'vertical down mount', type: 'split',
    typeText: 'split roller bearings', tempF: 200, spec: 'C',
    why: 'Split roller bearings use one fixed and one floating, and a vertical fan puts the floating bearing on the drive side.' },
  { fan: 'SWSI centrifugal', arr: '1', mount: 'horizontal', mountText: 'horizontal mount', type: 'ball',
    typeText: 'ball bearings', tempF: 301, spec: 'B',
    why: 'At 301°F and above every bearing type uses one fixed and one floating; horizontal puts the fixed bearing at the drive end.' }
];
const CARDS = CARD_DATA.map((c, i) => {
  const d = decide(c);
  if (d.answer !== c.spec) { console.error(SIM_ID + ': rule gives ' + d.answer + ' for card ' + (i + 1) + ', spec says ' + c.spec); }
  return Object.assign({}, c, { id: i + 1, answer: c.spec, steps: d.steps,
    answerText: c.spec + ' (' + CONFIGS[c.spec].short + ')' });
});

const deck = new FP.CardDeck({
  cards: CARDS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Cards', mastery: MASTERY,
  reviewPointer: 'Review the missed cards below, then press Start over',
  // Spec wording: Correct + Why; Not quite + Why + the correct configuration letter
  messages: {
    correct: res => FP.msg.OK + ' Correct. ' + res.card.why,
    missed: res => FP.msg.BAD + ' Not quite. ' + res.card.why + ' Correct configuration: ' + res.card.answerText + '.'
  },
  id: SIM_ID
});

// ---------- State ----------
let selected = null;     // 'A'..'D' before commit
let feedback = null;     // {kind, message, chosen}
let notice = '';

// ---------- Controls ----------
let choiceButtons = [], commitButton, nextButton, startOverButton;

const keys = K.keys.bind({
  '1': () => choose('A'), '2': () => choose('B'), '3': () => choose('C'), '4': () => choose('D'),
  a: () => choose('A'), b: () => choose('B'), c: () => choose('C'), d: () => choose('D'),
  Enter: onEnter
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  choiceButtons = LETTERS.map(L => {
    const b = K.button(L, () => choose(L), { variant: 'choice' });
    b.addClass('choice');
    b.attribute('aria-pressed', 'false');
    b.attribute('aria-label', 'Configuration ' + L + ': ' + CONFIGS[L].text);
    return b;
  });
  commitButton = K.button('Commit', commit);
  nextButton = K.button('Next card', nextCard);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  updateControls();

  describe('Fixed or floating bearing assignment. Ten scenario cards describe a fan by type, arrangement, ' +
    'mounting orientation, bearing type and operating temperature. The learner picks configuration A, B, C ' +
    'or D and commits it. The sim then draws the shaft with its drive-end and non-drive-end bearings marked ' +
    'fixed or floating, gives feedback and names the rule step that decided the card. After card 10 a ' +
    'summary gives the score, the mastery result and the missed cards.');
}

// ---------- Flow ----------
function choose(L) {
  const st = deck.state();
  if (st.phase !== 'choose') { return; }
  selected = L;
  notice = '';
  updateControls();
  FP.announce('Selected ' + L + ': ' + CONFIGS[L].text + '.');
}

function commit() {
  const st = deck.state();
  if (st.phase !== 'choose') { return; }
  if (!selected) {
    notice = 'Choose A, B, C or D first.';
    FP.announce(notice);
    return;
  }
  const res = deck.place(selected);
  feedback = { kind: res.kind, message: res.message, chosen: selected };
  selected = null;
  updateControls();
  const card = res.card;
  FP.announce('You chose ' + feedback.chosen + '. ' + res.message + ' Drive end bearing: ' +
    bearingWord(CONFIGS[card.answer].de) + '; non-drive end bearing: ' + bearingWord(CONFIGS[card.answer].nde) + '.');
  focusAfter(nextButton);
}

function bearingWord(k) { return k === 'review' ? 'review, may need to float' : k; }

function nextCard() {
  const st = deck.state();
  if (st.phase !== 'feedback') { return; }
  deck.next();
  feedback = null;
  notice = '';
  selected = null;
  updateControls();
  const s = deck.state();
  if (s.phase === 'summary') {
    const sum = deck.summary();
    FP.announce(sum.lines.join(' ') + (sum.misses.length ? ' Missed cards: ' +
      sum.misses.map(m => m.card.id).join(', ') + '.' : ' No cards missed.'));
    focusAfter(startOverButton);
  } else {
    FP.announce('Card ' + (s.index + 1) + ' of ' + CARDS.length + '. ' + cardSentence(s.card) +
      ' Which bearings on this fan should be fixed, and which should float?');
    focusAfter(commitButton);   // keys 1-4 or A-D choose; Enter on Commit commits
  }
}

function startOver() {
  deck.newRound();
  feedback = null;
  notice = '';
  selected = null;
  updateControls();
  FP.announce('Started over. Card 1 of ' + CARDS.length + '. ' + cardSentence(CARDS[0]));
  focusAfter(commitButton);
}

function onEnter() {
  const st = deck.state();
  if (st.phase === 'choose') { commit(); } else if (st.phase === 'feedback') { nextCard(); }
}

function focusAfter(btn) { if (btn && btn.elt && !btn.elt.disabled) { btn.elt.focus(); } }

function cardSentence(c) {
  return c.fan + ', Arrangement ' + c.arr + ', ' + c.mountText + ', ' + c.typeText + ', ' + tempText(c) + '.';
}
function tempText(c) { return c.tempText || (c.tempF + '°F'); }

// ---------- Controls ----------
function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const choosing = st.phase === 'choose';
  choiceButtons.forEach((b, i) => {
    const on = selected === LETTERS[i];
    b.attribute('aria-pressed', on ? 'true' : 'false');
    if (on) { b.addClass('selected'); } else { b.removeClass('selected'); }
    K.setEnabled(b, choosing);
  });
  K.setEnabled(commitButton, choosing);
  K.setEnabled(nextButton, st.phase === 'feedback');
  const label = st.isLast ? 'See results' : 'Next card';
  nextButton.html(label);
  for (const b of choiceButtons.concat([nextButton, commitButton])) { if (st.phase === 'summary') { b.hide(); } else { b.show(); } }
  positionControls();
  K.keepFocus(had, choiceButtons.concat([commitButton, nextButton, startOverButton]));
}

function positionControls() {
  const narrow = canvasWidth < 480;
  const x = narrow || deck.state().phase === 'summary' ? 10 : 150;
  const next = K.flowButtons(0, choiceButtons.concat([null, commitButton]), { x, groupGap: narrow ? 10 : 16 });
  K.flowButtons(next, [nextButton, null, startOverButton], { x, groupGap: narrow ? 10 : 16 });
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Fixed or Floating Bearing Assignment');
  const st = deck.state();
  const right = st.phase === 'summary' ? 'Results' : 'Card ' + (st.index + 1) + ' of ' + CARDS.length + ' · one attempt';
  y = K.statusLine(st.scoreLabel, right, null, { y: y - 4 });
  K.note(canvasWidth >= 560
    ? ['Illustrative scenarios', 'Source: FanPedia pp. 91, 97–99', 'Keys: 1–4 or A–D choose, Enter commits or goes on']
    : ['Illustrative scenarios', 'Source: FanPedia pp. 96–98']);

  const top = y + 2;
  const bottom = drawHeight - 24;
  let A, B;
  if (canvasWidth >= 640) {
    const leftW = Math.round(canvasWidth * 0.54);
    A = { x: 10, y: top, w: leftW - 15, h: bottom - top };
    B = { x: leftW + 5, y: top, w: canvasWidth - leftW - 15, h: bottom - top };
  } else {
    const dh = 170;
    A = { x: 8, y: top, w: canvasWidth - 16, h: bottom - top - dh - 6 };
    B = { x: 8, y: bottom - dh, w: canvasWidth - 16, h: dh };
  }
  if (st.phase === 'summary' && canvasWidth < 640) { K.panel(A.x, A.y, A.w, B.y + B.h - A.y); }
  else { K.panel(A.x, A.y, A.w, A.h); K.panel(B.x, B.y, B.w, B.h); }
  if (st.phase === 'summary') {
    if (canvasWidth >= 640) { drawSummary(A); drawRulesPanel(B); }
    else { drawSummary({ x: A.x, y: A.y, w: A.w, h: B.y + B.h - A.y }); }
  } else {
    drawCard(A, st);
    drawShaftPanel(B, st);
  }
  drawControlLabels();
}

// Paragraphs {t, bold, color, gap, box, size} laid out in w; returns the y below
function paras(list, x, y, w, ts, dry) {
  for (const p of list) {
    const s = p.size ? Math.max(12, ts + p.size) : ts;
    const lead = Math.round(s * 1.3);
    y += p.gap || 0;
    textSize(s);
    textStyle(p.bold ? BOLD : NORMAL);
    if (p.box) {
      const pad = 6;
      const h = K.countLines(p.t, w - 2 * pad) * lead + 2 * pad;
      if (!dry) {
        const ok = p.box === 'ok', bad = p.box === 'bad';
        K.panel(x - 2, y, w + 4, h, {
          fill: ok ? '--fp-correct-bg' : (bad ? '--fp-incorrect-bg' : '--fp-primary-bg'),
          stroke: ok ? '--fp-correct' : (bad ? '--fp-incorrect' : '--fp-primary'),
          dashed: bad, weight: 2, radius: 6
        });
        noStroke();
        fill(ok ? FP.tok('correct') : (bad ? FP.tok('incorrect') : FP.tok('text')));
        textStyle(p.bold ? BOLD : NORMAL);
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

function drawCard(box, st) {
  const c = st.card;
  const list = [
    { t: c.fan + ', Arrangement ' + c.arr, bold: true },
    { t: 'Mounting: ' + c.mountText },
    { t: 'Bearings: ' + c.typeText },
    { t: 'Operating temperature: ' + tempText(c) }
  ];
  list.push({ t: 'Which bearings on this fan should be fixed, and which should float?', bold: true, gap: 6 });
  const locked = st.phase === 'feedback';
  LETTERS.forEach(L => {
    const isSel = selected === L || (locked && feedback && feedback.chosen === L);
    const isAns = locked && c.answer === L;
    let mark = '   ';
    if (isAns) { mark = FP.msg.OK + ' '; } else if (locked && isSel) { mark = FP.msg.BAD + ' '; } else if (isSel) { mark = '▸ '; }
    const label = canvasWidth >= 480 ? CONFIGS[L].text : CONFIGS[L].narrow;
    list.push({ t: mark + L + '. ' + label, bold: isSel || isAns, gap: 3,
      color: isAns ? FP.tok('correct') : (locked && isSel ? FP.tok('incorrect') : (isSel ? FP.tok('primary') : FP.tok('text'))) });
  });
  if (notice) { list.push({ t: 'ℹ ' + notice, color: FP.tok('primary-dark'), gap: 6 }); }
  if (feedback) {
    list.push({ t: feedback.message, box: feedback.kind, gap: 8 });
    const steps = canvasWidth < 360 ? 'Decided by ' + c.steps.split(':')[0].toLowerCase() + '.' : c.steps;
    list.push({ t: steps, color: FP.tok('text-muted'), gap: 4, size: -1 });
  }
  fitParas(list, box, 16);
}

function drawSummary(box) {
  const s = deck.summary();
  const list = [
    { t: s.lines[0], bold: true },
    { t: s.mastered ? FP.msg.masteryReached(MASTERY, CARDS.length) : s.lines[1],
      bold: true, color: s.mastered ? FP.tok('primary') : FP.tok('text') }
  ];
  if (s.misses.length) {
    list.push({ t: 'Missed cards and the rule step that decided them:', bold: true, gap: 8 });
    s.misses.forEach(m => {
      const head = 'Card ' + m.card.id + ' (' + m.card.fan + ', Arr. ' + m.card.arr + ', ' + TYPE_TEXT[m.card.type] +
        ', ' + m.card.tempF + '°F): you chose ' + m.chosen + '; correct ' + m.card.answer + '. ';
      list.push({ t: head + (s.misses.length > 4 ? m.card.steps.split(':')[0] + '.' : m.card.steps), gap: 4 });
    });
  } else {
    list.push({ t: 'No cards missed.', gap: 8 });
  }
  list.push({ t: 'Notice: orientation only matters once a floating bearing is needed.', color: FP.tok('text-muted'), gap: 8 });
  fitParas(list, box, 16);
}

function drawRulesPanel(box) {
  const list = [
    { t: 'The rule, in order', bold: true },
    { t: 'Step 1. 301°F or above: one fixed and one floating, any bearing type. Go to step 3.' },
    { t: 'Step 2. 300°F or below: ball bearings are two fixed (A), except Arrangements 3SI, 7SI, 3DI and ' +
      '7DI, which are flagged for review (D). Roller and split roller: one fixed and one floating.', gap: 4 },
    { t: 'Step 3. With a floating bearing: horizontal mount, fixed at the drive end (B); vertical mount, ' +
      'floating at the drive end (C).', gap: 4 }
  ];
  fitParas(list, box, 15);
}

// ---------- Shaft diagram ----------
// Local units along the shaft (u, 0..640) and across it (v, shaft centre at 110), as FD side views.
function layoutFor(card) {
  const straddle = /^[37]/.test(card.arr);       // Arr. 3, 3SI, 3DI, 3VA, 7...: bearings either side of the impeller
  const drive = card.arr === '8' ? 'coupling' : 'sheave';
  return straddle
    ? { drive, de: 150, nde: 500, imp: [290, 360], double: card.fan.indexOf('DWDI') === 0 }
    : { drive, de: 200, nde: 380, imp: [470, 540], double: false };
}

function drawShaftPanel(box, st) {
  const c = st.card;
  const revealed = st.phase === 'feedback';
  const lay = layoutFor(c);
  const vertical = c.mount === 'vertical';
  const wide = canvasWidth >= 640;
  noStroke();
  fill(FP.tok('text'));
  textAlign(CENTER, TOP);
  textSize(wide ? 15 : 13);
  textStyle(BOLD);
  text((vertical ? 'Vertical' : 'Horizontal') + ' shaft, side view' + (wide ? ' (schematic)' : ''), box.x + box.w / 2, box.y + 6);
  textStyle(NORMAL);

  // fit the local drawing (u 0..640, v 30..190) in the box, leaving room for labels
  const area = { x: box.x + 8, y: box.y + 28, w: box.w - 16, h: box.h - (wide ? 70 : 34) };
  const lenU = 600, lenV = 170;
  const sc = vertical ? Math.min(area.h / lenU, area.w / (lenV + 160)) : Math.min(area.w / lenU, area.h / (lenV + 110));
  const cx = area.x + area.w / 2, cy = area.y + area.h / 2 + (vertical ? 0 : 6);
  const toScreen = (u, v) => {
    const dx = (u - 320) * sc, dy = (v - 110) * sc;
    return vertical ? [cx - dy, cy + dx] : [cx + dx, cy + dy];
  };

  push();
  translate(cx, cy);
  if (vertical) { rotate(HALF_PI); }
  const f = FD.frameAt(-320 * sc, -110 * sc, sc);
  FD.shaft(null, { frame: f, xa: 30, xb: 610 });
  if (lay.drive === 'coupling') { FD.coupling(null, { frame: f, x: 30 }); } else { FD.sheave(null, { frame: f, x: 60, y: 110, r: 42 }); }
  FD.impellerSide(null, { frame: f, i0: lay.imp[0], i1: lay.imp[1], doubleWidth: lay.double });
  const cfg = revealed ? CONFIGS[c.answer] : null;
  bearingSection(f, lay.de, cfg ? cfg.de : null);
  bearingSection(f, lay.nde, cfg ? cfg.nde : null);
  pop();

  // labels in screen space
  const ink = FP.tok('text');
  textSize(wide ? 13 : 12);
  const drv = toScreen(lay.drive === 'coupling' ? 40 : 60, vertical ? 110 : 30);
  noStroke();
  fill(FP.tok('text-muted'));
  textAlign(vertical ? LEFT : CENTER, vertical ? CENTER : BOTTOM);
  if (vertical) { text(lay.drive === 'coupling' ? 'coupling' : 'sheave', drv[0] + 34 * sc + 26, drv[1]); }
  else { text(lay.drive === 'coupling' ? 'coupling' : 'sheave', drv[0], drv[1] - 2); }
  const imp = toScreen((lay.imp[0] + lay.imp[1]) / 2, vertical ? 110 : 185);
  if (vertical) { textAlign(LEFT, CENTER); text('impeller', imp[0] + 70 * sc + 6, imp[1]); }
  else { textAlign(CENTER, TOP); text('impeller', imp[0], imp[1] + 2); }

  for (const which of ['de', 'nde']) {
    const u = lay[which];
    const kind = cfg ? cfg[which] : null;
    const p = vertical ? toScreen(u, 110) : toScreen(u, 30);
    const name = which === 'de' ? (wide ? 'Drive end' : 'DE') : (wide ? 'Non-drive end' : 'NDE');
    const lines = [];
    if (revealed) { lines.push(name); }
    lines.push(kind === null ? 'bearing' : (kind === 'review' ? 'FLOATING?' : kind.toUpperCase()));
    textAlign(vertical ? RIGHT : CENTER, vertical ? CENTER : BOTTOM);
    lines.forEach((t, i) => {
      const bold = i === lines.length - 1 && kind !== null;
      textStyle(bold ? BOLD : NORMAL);
      fill(kind === 'review' && bold ? FP.tok('accent-text') : ink);
      if (vertical) {
        text(t, p[0] - 64 * sc - 6, p[1] + (i - (lines.length - 1) / 2) * 16);
      } else {
        text(t, p[0], p[1] - 4 - (lines.length - 1 - i) * 16);
      }
    });
    textStyle(NORMAL);
  }

  // legend / caption
  fill(FP.tok('text-muted'));
  textAlign(CENTER, BOTTOM);
  textSize(12);
  const cap = !revealed ? 'Commit an answer to see which bearing is fixed and which floats.'
    : (c.answer === 'D' ? 'Review: one fixed and one floating may be needed on this straddle arrangement.'
      : 'Fixed: clamped between locating rings. Floating: free to slide along the shaft (double arrow).');
  if (wide) { K.wrapText(cap, box.x + box.w / 2, box.y + box.h - 36, box.w - 20, 15, { align: CENTER, maxLines: 2 }); }
  textAlign(LEFT, TOP);
}

// Pillow block cross-section on the shaft at u (local units). kind: null, 'fixed', 'floating', 'review'.
function bearingSection(f, u, kind) {
  const pal = FD.palette();
  const sy = 110;
  push();
  strokeWeight(Math.max(1, f.S(2)));
  stroke(pal.bearingEdge || pal.edge);
  fill(pal.bearing);
  // housing (cap and base) with a foot
  rect(f.X(u - 32), f.Y(sy - 52), f.S(64), f.S(104), f.S(8));
  rect(f.X(u - 46), f.Y(sy + 46), f.S(92), f.S(14), f.S(3));
  // bore cavity, outer ring and rolling elements
  fill(255);
  rect(f.X(u - 22), f.Y(sy - 36), f.S(44), f.S(72));
  fill(pal.steel || pal.metal);
  rect(f.X(u - 14), f.Y(sy - 34), f.S(28), f.S(10));
  rect(f.X(u - 14), f.Y(sy + 24), f.S(28), f.S(10));
  fill(pal.hub);
  noStroke();
  circle(f.X(u), f.Y(sy - 18), f.S(14));
  circle(f.X(u), f.Y(sy + 18), f.S(14));
  if (kind === 'fixed') {
    // locating rings tight against both faces of the outer ring
    fill(pal.text);
    rect(f.X(u - 22), f.Y(sy - 36), f.S(8), f.S(14));
    rect(f.X(u + 14), f.Y(sy - 36), f.S(8), f.S(14));
    rect(f.X(u - 22), f.Y(sy + 22), f.S(8), f.S(14));
    rect(f.X(u + 14), f.Y(sy + 22), f.S(8), f.S(14));
  } else if (kind === 'floating' || kind === 'review') {
    // free axial room on both sides, double arrow along the shaft
    const col = kind === 'review' ? pal.accentText || pal.accent : pal.text;
    stroke(col);
    strokeWeight(Math.max(1.5, f.S(3)));
    if (kind === 'review') { drawingContext.setLineDash([f.S(6), f.S(5)]); }
    const ay = f.Y(sy - 64);
    line(f.X(u - 26), ay, f.X(u + 26), ay);
    drawingContext.setLineDash([]);
    noStroke();
    fill(col);
    const h = Math.max(5, f.S(10));
    triangle(f.X(u - 30), ay, f.X(u - 30) + h, ay - h * 0.6, f.X(u - 30) + h, ay + h * 0.6);
    triangle(f.X(u + 30), ay, f.X(u + 30) - h, ay - h * 0.6, f.X(u + 30) - h, ay + h * 0.6);
  }
  pop();
}

function drawControlLabels() {
  if (canvasWidth < 480 || deck.state().phase === 'summary') { return; }
  noStroke();
  fill(FP.tok('text'));
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(16);
  text('Configuration:', 10, K.controlRow(0) + 15);
  textStyle(NORMAL);
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  positionControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
