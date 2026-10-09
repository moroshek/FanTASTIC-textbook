// Airflow Path Explorer - p5.js MicroSim (Chapter 4: Centrifugal, Axial and Mixed Flow Fans)
// CANVAS_HEIGHT: 670
// Seven fan configurations in a fixed order. For each one the learner predicts (a) the direction
// air leaves the impeller and (b) the direction air leaves the fan, commits both, and then watches
// an airflow animation of the actual path. One attempt per prediction; 14 predictions; mastery is
// 12 of 14 on the first attempt. Replay is exploration and is never scored.
// Sources: FanPedia pp. 4-7 (fan types), p. 186 (axial vs centrifugal impellers), pp. 15-17
// (exploded views: guide and straightening vanes). Animation speed and particle counts are
// illustrative.
// Built on the FanPedia kit: FP.CardDeck (14 prediction cards, score, mastery), FP.p5 (layout,
// text, controls, keys), FD (palette, arrows, labels).
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js, fan-drawings.js.

const K = FP.p5;
const SIM_ID = 'ch04-airflow-path-explorer';

let canvasWidth = 800;
const drawHeight = 520;
const controlHeight = K.controlHeightFor(4);   // two prediction rows + buttons (two rows at 320 px)
const canvasHeight = drawHeight + controlHeight;
const MASTERY = 12;
const PROMPT = 'Which way will the air leave the impeller, and which way will it leave the fan?';
const SOURCE = 'Paths: FanPedia pp. 4–7, 15–17, 186 · Animation illustrative';
const KEYS_HINT = 'Keys: Enter commits or goes on, R replays';
const ANIM_MS = 5200;

const IMP = [
  { id: 'par', text: 'Parallel to the shaft' },
  { id: 'right', text: 'At a right angle to the shaft' },
  { id: 'diag', text: 'Diagonal (between parallel and right angle)' }
];
const FAN = [
  { id: 'par', text: 'Parallel to the shaft' },
  { id: 'one', text: 'At a right angle to the shaft, through one outlet' },
  { id: 'all', text: 'Outward in all directions around the impeller' }
];
const IMP_T = Object.fromEntries(IMP.map(c => [c.id, c.text]));
const FAN_T = Object.fromEntries(FAN.map(c => [c.id, c.text]));

// The seven configurations (spec Content table), fixed order.
const ITEMS = [
  { geo: 'swsi', short: 'SWSI housed centrifugal', imp: 'right', fan: 'one',
    name: 'Housed centrifugal fan, single width single inlet (SWSI), in a scroll housing',
    why: 'The centrifugal impeller throws air outward; the scroll gathers it and sends it out one outlet at a right angle to the shaft.' },
  { geo: 'dwdi', short: 'DWDI housed centrifugal', imp: 'right', fan: 'one',
    name: 'Housed centrifugal fan, double width double inlet (DWDI), in a scroll housing',
    why: 'Air enters from both sides, but the impeller still throws it outward and the scroll still collects it to one outlet.' },
  { geo: 'plenum', short: 'Plenum fan', imp: 'right', fan: 'all',
    name: 'Plenum fan (unhoused centrifugal) inside an air handler cabinet',
    why: 'With no housing, nothing collects the air; it leaves the impeller all the way around and pressurizes the surrounding plenum.' },
  { geo: 'tic', short: 'Tubular inline centrifugal', imp: 'right', fan: 'par',
    name: 'Tubular inline centrifugal fan with straightening vanes',
    why: 'The impeller is centrifugal, so air leaves it radially; the tube and straightening vanes turn the air back to flow along the duct.' },
  { geo: 'tube', short: 'Tubeaxial', imp: 'par', fan: 'par',
    name: 'Tubeaxial fan (no guide vanes)',
    why: 'An axial impeller pushes air along the shaft; it leaves the fan still swirling because there are no vanes to straighten it.' },
  { geo: 'vane', short: 'Vaneaxial', imp: 'par', fan: 'par',
    name: 'Vaneaxial fan (guide vanes downstream of the impeller)',
    why: 'Same axial path as the tubeaxial; the guide vanes remove the swirl but do not change the main direction.' },
  { geo: 'mixed', short: 'Mixed flow', imp: 'diag', fan: 'par',
    name: 'Mixed flow fan in a tubular housing with straightening vanes',
    why: 'The hybrid impeller sends air out on a diagonal; the tubular housing and vanes return it to the duct direction.' }
];

// Two prediction cards per configuration: [impeller exit, fan exit].
const CARDS = [];
ITEMS.forEach((it, i) => {
  CARDS.push({ id: 'item' + (i + 1) + '-impeller', item: i, kind: 'imp', answer: it.imp, answerText: IMP_T[it.imp], why: it.why });
  CARDS.push({ id: 'item' + (i + 1) + '-fan', item: i, kind: 'fan', answer: it.fan, answerText: FAN_T[it.fan], why: it.why });
});

// Spec wording: "Correct." / "Not quite. The answer is <correct choice>." The Why text is shown
// once under both verdicts.
const deck = new FP.CardDeck({
  cards: CARDS, shuffle: false, attempts: 1, retryMissed: false,
  noun: 'Predictions', mastery: MASTERY, reviewPointer: 'Review the Fan Families section, then try again',
  messages: {
    correct: () => FP.msg.OK + ' Correct.',
    missed: res => FP.msg.BAD + ' Not quite. The answer is "' + res.card.answerText + '".'
  },
  id: SIM_ID
});

let results = [];            // per item: {imp: res, fan: res}
let animStart = -1;          // millis() when the current animation started; -1 = not playing
let particles = [];
const reduceMotion = typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let impSelect, fanSelect, commitButton, replayButton, nextButton, startOverButton;

const keys = K.keys.bind({ Enter: enterKey, r: replay });
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));

  impSelect = makeSelect(IMP, 'Air leaves the impeller');
  fanSelect = makeSelect(FAN, 'Air leaves the fan');
  commitButton = K.button('Commit predictions', commit);
  commitButton.attribute('aria-keyshortcuts', 'Enter');
  replayButton = K.button('Replay animation', replay, { variant: 'secondary' });
  replayButton.attribute('aria-keyshortcuts', 'R');
  nextButton = K.button('Next fan', nextItem);
  startOverButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });

  makeParticles();
  updateControls();
  describe('Airflow path explorer. Seven fan configurations appear one at a time as side-view ' +
    'drawings with the shaft horizontal. For each one, choose the direction air leaves the impeller ' +
    'and the direction air leaves the fan with the two lists below the drawing, then commit. An ' +
    'animation shows the real path, each prediction is marked correct or not quite, and the reason ' +
    'is given. After the seventh fan a summary shows the score out of 14 and the items missed.');
}

function makeSelect(list, label) {
  const s = createSelect();
  s.parent(document.querySelector('main'));
  s.option('Choose a direction…', '');
  list.forEach(c => s.option(c.text, c.id));
  s.selected('');
  s.attribute('aria-label', label);
  s.changed(() => { updateControls(); });
  return s;
}

// ---------- Flow ----------
function itemIndex() {
  const st = deck.state();
  return st.phase === 'summary' ? ITEMS.length - 1 : Math.floor(st.index / 2);
}
function committed() {
  const st = deck.state();
  return st.phase === 'feedback' && st.index % 2 === 1;
}

function commit() {
  if (deck.state().phase !== 'choose' || committed()) return;
  const a = impSelect.value(), b = fanSelect.value();
  if (!a || !b) return;
  const r1 = deck.place(a);
  deck.next();
  const r2 = deck.place(b);
  results[itemIndex()] = { imp: r1, fan: r2 };
  startAnimation();
  updateControls();
  const it = ITEMS[itemIndex()];
  FP.announce('Impeller exit: ' + r1.message + ' Fan exit: ' + r2.message + ' ' + it.why + ' ' +
    deck.state().scoreLabel + '.');
  nextButton.elt.focus();
}

function nextItem() {
  if (!committed()) return;
  deck.next();
  animStart = -1;
  impSelect.selected('');
  fanSelect.selected('');
  updateControls();
  const st = deck.state();
  if (st.phase === 'summary') {
    const s = deck.summary();
    FP.announce('Summary. ' + summaryLines(s).join(' '));
    startOverButton.elt.focus();
  } else {
    const it = ITEMS[itemIndex()];
    FP.announce('Fan ' + (itemIndex() + 1) + ' of ' + ITEMS.length + ': ' + it.name + '. ' + PROMPT);
    impSelect.elt.focus();
  }
}

function startOver() {
  deck.newRound();
  results = [];
  animStart = -1;
  impSelect.selected('');
  fanSelect.selected('');
  updateControls();
  FP.announce('Started over. Fan 1 of ' + ITEMS.length + ': ' + ITEMS[0].name + '. ' + PROMPT);
  impSelect.elt.focus();
}

function replay() { if (committed()) startAnimation(); }

function enterKey() {
  if (deck.state().phase === 'summary') return;
  if (committed()) nextItem(); else commit();
}

function startAnimation() {
  if (reduceMotion) { animStart = -1; return; }
  makeParticles();
  animStart = millis();
}

// ---------- Controls ----------
function narrow() { return canvasWidth < 480; }

function updateControls() {
  const had = document.activeElement;
  const st = deck.state();
  const summary = st.phase === 'summary';
  const done = committed();
  [impSelect, fanSelect].forEach(s => { if (summary) s.hide(); else s.show(); });
  K.setEnabled(impSelect, !summary && !done);
  K.setEnabled(fanSelect, !summary && !done);
  [commitButton, replayButton, nextButton].forEach(b => { if (summary) b.hide(); else b.show(); });
  K.setEnabled(commitButton, !summary && !done && !!impSelect.value() && !!fanSelect.value());
  K.setEnabled(replayButton, done && !reduceMotion);
  K.setEnabled(nextButton, done);
  nextButton.html(itemIndex() === ITEMS.length - 1 ? 'Show summary' : 'Next fan');
  positionControls();
  K.keepFocus(had, [impSelect, fanSelect, commitButton, nextButton, replayButton, startOverButton]);
}

const LABEL_W = 118;
function positionControls() {
  if (deck.state().phase === 'summary') {
    K.flowButtons(0, [startOverButton]);
    return;
  }
  const w = Math.max(150, canvasWidth - LABEL_W - 20);
  [impSelect, fanSelect].forEach((s, i) => {
    s.position(LABEL_W + 10, K.controlRow(i));
    s.style('width', w + 'px');
  });
  K.flowButtons(2, [commitButton, nextButton, '|', replayButton, startOverButton]);
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  let y = K.title('Airflow Path Explorer');
  const st = deck.state();

  noStroke(); textSize(narrow() ? 13 : 15); textStyle(NORMAL); fill(FP.tok('text-muted'));
  y = K.wrapText(PROMPT, canvasWidth / 2, y - 4, canvasWidth - 20, narrow() ? 17 : 19, { align: CENTER }) + 2;
  const progress = st.phase === 'summary' ? 'All ' + ITEMS.length + ' fans done' : 'Fan ' + (itemIndex() + 1) + ' of ' + ITEMS.length;
  y = K.statusLine(st.scoreLabel, progress, null, { y }) + 2;

  textSize(13);
  const both = FP.msg.note(SOURCE, KEYS_HINT);
  K.note(textWidth(both) <= canvasWidth - 20 ? both : SOURCE);

  // control-row labels
  if (st.phase !== 'summary') {
    noStroke(); fill(FP.tok('text')); textStyle(BOLD); textSize(14); textAlign(LEFT, CENTER);
    text('Impeller exit:', 10, K.controlLabel(0));
    text('Fan exit:', 10, K.controlLabel(1));
    textStyle(NORMAL);
  }

  if (st.phase === 'summary') { drawSummary(y + 2, drawHeight - 24); return; }

  const it = ITEMS[itemIndex()];
  textAlign(LEFT, TOP); textStyle(BOLD); fill(FP.tok('primary-dark'));
  const ts = narrow() ? 14 : 16;
  textSize(ts);
  y = K.wrapText((itemIndex() + 1) + '. ' + it.name, 10, y, canvasWidth - 20, Math.round(ts * 1.25)) + 4;
  textStyle(NORMAL);

  const fbBottom = drawHeight - 24;
  const fbH = drawFeedback(0, fbBottom, true);
  const boxBottom = fbBottom - fbH - 6;
  drawFan(it, { x: 10, y: y, w: canvasWidth - 20, h: boxBottom - y });
  drawFeedback(boxBottom + 6, fbBottom, false);
}

// [{t, bold, color, gap, small}] paragraphs; returns the y below.
function paras(list, x, y, w, ts, dry) {
  textAlign(LEFT, TOP); noStroke();
  for (const p of list) {
    const s = p.small ? Math.max(12, ts - 2) : ts;
    textSize(s); textStyle(p.bold ? BOLD : NORMAL);
    y += p.gap || 0;
    if (!dry) fill(p.color || FP.tok('text'));
    y = K.wrapText(p.t, x, y, w, Math.round(s * 1.3), { dryRun: dry });
  }
  textStyle(NORMAL);
  return y;
}

// Feedback panel under the drawing. dry = measure only (returns the height).
function drawFeedback(top, bottom, dry) {
  const x = 10, w = canvasWidth - 20, pad = 8;
  const r = results[itemIndex()];
  let list;
  if (committed() && r) {
    const bothOk = r.imp.status === 'correct' && r.fan.status === 'correct';
    list = [
      { t: 'Impeller exit: ' + r.imp.message, color: FP.tok(r.imp.status === 'correct' ? 'correct' : 'incorrect'), bold: true },
      { t: 'Fan exit: ' + r.fan.message, color: FP.tok(r.fan.status === 'correct' ? 'correct' : 'incorrect'), bold: true },
      { t: ITEMS[itemIndex()].why, gap: 2 }
    ];
    if (bothOk) list[0].color = list[1].color = FP.tok('correct');
  } else {
    list = [{ t: 'Choose where the air leaves the impeller and where it leaves the fan, then press Commit predictions. ' +
      'The airflow is shown after you commit.', color: FP.tok('text-muted') }];
  }
  const maxH = narrow() ? 150 : 110;
  const layout = (t, d) => paras(list, x + pad, top + pad, w - 2 * pad, t, d) - top + pad - 2;
  const ts = K.fitTextSize(t => layout(t, true), maxH, 15, 12);
  const h = layout(ts, true);
  if (dry) return h;
  if (committed() && r) {
    const ok = r.imp.status === 'correct' && r.fan.status === 'correct';
    K.panel(x, top, w, h, { fill: '--fp-ctrl-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect', dashed: !ok, weight: 2 });
  } else {
    K.panel(x, top, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-border' });
  }
  layout(ts, false);
  return h;
}

function summaryLines(s) {
  return [
    FP.msg.firstAttempt(s.firstAttempt, s.total),
    s.mastered ? FP.msg.OK + ' Mastery: ' + MASTERY + ' of ' + s.total + ' or better.'
      : 'Mastery needs ' + MASTERY + ' of ' + s.total + '. Review the Fan Families section, then try again.'
  ];
}

function drawSummary(top, bottom) {
  const s = deck.summary();
  const x = 10, w = canvasWidth - 20;
  K.panel(x, top, w, bottom - top);
  const lines = summaryLines(s);
  const list = [
    { t: lines[0], bold: true },
    { t: lines[1], color: FP.tok(s.mastered ? 'primary-dark' : 'text'), bold: s.mastered }
  ];
  const missed = [];
  results.forEach((r, i) => {
    ['imp', 'fan'].forEach(k => {
      if (r && r[k].status !== 'correct') {
        const chosen = (k === 'imp' ? IMP_T : FAN_T)[r[k].chosen];
        missed.push(FP.msg.BAD + ' Fan ' + (i + 1) + ', ' + ITEMS[i].short + ', ' + (k === 'imp' ? 'impeller exit' : 'fan exit') +
          ': you chose "' + chosen + '"; the answer is "' + r[k].card.answerText + '".');
      }
    });
  });
  if (missed.length) {
    list.push({ t: 'Predictions missed:', bold: true, gap: 8 });
    missed.forEach(m => list.push({ t: m, small: true, gap: 2 }));
  } else {
    list.push({ t: 'No predictions missed.', gap: 8 });
  }
  list.push({ t: 'Notice: fans 4, 6 and 7 all have a tube and stationary vanes, and all three send the air out ' +
    'parallel to the shaft, but only fan 6 is an axial fan. The impeller decides the family; the housing and vanes ' +
    'decide where the air finally leaves.', gap: 8 });
  list.push({ t: 'Start over resets the score and goes back to fan 1.', small: true, gap: 6, color: FP.tok('text-muted') });
  const ts = K.fitTextSize(t => paras(list, x + 12, top + 10, w - 24, t, true) - top, bottom - top - 16, 16, 12);
  paras(list, x + 12, top + 10, w - 24, ts, false);
}

// ---------- Fan drawings (side view, shaft horizontal; local units x -1.2..1.2, y -1..1, y down) ----------
let F = null;   // current frame {X, Y, S}
function fx(x) { return F.X(x); }
function fy(y) { return F.Y(y); }
function lrect(x0, y0, x1, y1, r) { rect(fx(x0), fy(y0), F.S(x1 - x0), F.S(y1 - y0), r || 0); }
function lline(x0, y0, x1, y1) { line(fx(x0), fy(y0), fx(x1), fy(y1)); }
function lpoly(pts, close) {
  beginShape();
  pts.forEach(p => vertex(fx(p[0]), fy(p[1])));
  if (close) endShape(CLOSE); else endShape();
}

function drawFan(it, box) {
  const pal = FD.palette();
  const s = Math.min(box.w / 2.5, box.h / 2.1);
  F = FD.frameAt(box.x + box.w / 2, box.y + box.h / 2, s);
  push();
  // shaft centre line
  stroke(pal.muted); strokeWeight(1); drawingContext.setLineDash([10, 4, 2, 4]);
  lline(-1.2, 0, 1.2, 0);
  drawingContext.setLineDash([]);
  GEO[it.geo].draw(pal);
  pop();

  const done = committed();
  const playing = done && animStart >= 0 && millis() - animStart < ANIM_MS;
  if (playing) drawParticles(it, (millis() - animStart) / 1000, pal);
  if (done && !playing) drawResultArrows(it, pal);
  drawLabels(it, pal);
}

function alpha(c, a) { const k = color(c); k.setAlpha(a); return k; }
function metalStyle(pal, w) { stroke(pal.edge); strokeWeight(w || 1.5); fill(pal.metal); }

function drawImpellerRadial(pal, x0, x1, r, backAt) {
  // side view of a centrifugal wheel: blade lines between the front and back plate
  noFill(); stroke(pal.hub); strokeWeight(1.3);
  lrect(x0, -r, x1, r);
  for (let x = x0 + 0.04; x < x1; x += 0.045) lline(x, -r + 0.03, x, -0.12), lline(x, 0.12, x, r - 0.03);
  strokeWeight(3.5); stroke(pal.hub);
  lline(backAt, -r - 0.02, backAt, r + 0.02);
  noStroke(); fill(pal.hub); lrect(backAt - 0.04, -0.08, backAt + 0.04, 0.08);
}
function drawShaft(pal, x0, x1) {
  stroke(pal.steelSide); strokeWeight(Math.max(3, F.S(0.05))); lline(x0, 0, x1, 0);
}
function drawBearing(pal, x) {
  stroke(pal.edge); strokeWeight(1); fill(pal.bearing); lrect(x - 0.06, -0.09, x + 0.06, 0.09, 2);
}
function drawTube(pal, x0, x1) {
  metalStyle(pal, 1.2);
  lrect(x0, -0.62, x1, -0.55); lrect(x0, 0.55, x1, 0.62);
  fill(pal.metalSide);
  [x0, x1].forEach(x => { lrect(x - 0.025, -0.68, x + 0.025, -0.55); lrect(x - 0.025, 0.55, x + 0.025, 0.68); });
}
function drawFunnel(pal, xa, xb, rIn, rOut) {
  noFill(); stroke(pal.edge); strokeWeight(2.5);
  [-1, 1].forEach(sg => {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      pts.push([xa + (xb - xa) * u, sg * (rOut + (rIn - rOut) * Math.sin(u * HALF_PI))]);
    }
    lpoly(pts, false);
  });
}
function drawVanes(pal, x0, x1, rIn, rOut, label) {
  stroke(pal.edge); strokeWeight(2.5);
  [-1, 1].forEach(sg => {
    for (let k = 0; k < 3; k++) {
      const r0 = rIn + (rOut - rIn) * (k + 0.5) / 3;
      lline(x0, sg * (r0 - 0.05), x1, sg * (r0 + 0.02));
    }
  });
}
function drawFairing(pal, x0, x1, r) {
  stroke(pal.motorEdge || pal.edge); strokeWeight(1.3); fill(pal.motor);
  lrect(x0, -r, x1, r, F.S(0.06));
}

const GEO = {
  swsi: {
    draw(pal) {
      // scroll housing (cut away): side walls, top outlet, inlet on the left wall
      metalStyle(pal, 1.5); fill(alpha(pal.metal, 90));
      lrect(-0.3, -0.62, 0.32, 0.62, F.S(0.08));
      fill(pal.metal); lrect(-0.3, -0.98, 0.32, -0.62);
      noStroke(); fill(pal.drawBg); lrect(-0.26, -0.98, 0.28, -0.66);
      stroke(pal.edge); strokeWeight(1.5); lline(-0.26, -0.98, -0.26, -0.62); lline(0.28, -0.98, 0.28, -0.62);
      noStroke(); fill(pal.drawBg); lrect(-0.33, -0.24, -0.27, 0.24);
      drawFunnel(pal, -0.32, -0.14, 0.17, 0.24);
      drawImpellerRadial(pal, -0.15, 0.2, 0.45, 0.2);
      drawShaft(pal, 0.2, 1.05); drawBearing(pal, 0.62); drawBearing(pal, 0.92);
    },
    labels: [['Inlet', -0.3, -0.24, -0.85, -0.55], ['Impeller', -0.05, 0.4, -0.75, 0.75], ['Scroll housing', 0.32, 0.45, 0.8, 0.72],
      ['Outlet', 0.32, -0.85, 0.8, -0.85], ['Shaft', 0.45, 0, 0.75, 0.3]],
    imp: [[0.02, -0.15, 0.02, -0.52], [0.02, 0.15, 0.02, 0.52]], impTag: [0.08, -0.4],
    fan: [[0.01, -0.72, 0.01, -1.0]], fanTag: [0.08, -0.92]
  },
  dwdi: {
    draw(pal) {
      metalStyle(pal, 1.5); fill(alpha(pal.metal, 90));
      lrect(-0.38, -0.62, 0.38, 0.62, F.S(0.08));
      fill(pal.metal); lrect(-0.38, -0.98, 0.38, -0.62);
      noStroke(); fill(pal.drawBg); lrect(-0.34, -0.98, 0.34, -0.66);
      stroke(pal.edge); strokeWeight(1.5); lline(-0.34, -0.98, -0.34, -0.62); lline(0.34, -0.98, 0.34, -0.62);
      noStroke(); fill(pal.drawBg); lrect(-0.41, -0.24, -0.35, 0.24); lrect(0.35, -0.24, 0.41, 0.24);
      drawFunnel(pal, -0.4, -0.24, 0.17, 0.24); drawFunnel(pal, 0.4, 0.24, 0.17, 0.24);
      drawImpellerRadial(pal, -0.25, 0.25, 0.45, 0);
      drawShaft(pal, -0.95, 1.05); drawBearing(pal, -0.75); drawBearing(pal, 0.75);
    },
    labels: [['Inlet', -0.38, -0.22, -0.9, -0.5], ['Inlet', 0.38, -0.22, 0.9, -0.5], ['Impeller', -0.12, 0.4, -0.75, 0.78],
      ['Scroll housing', 0.38, 0.45, 0.85, 0.75], ['Outlet', 0.34, -0.85, 0.85, -0.85], ['Shaft', 0.6, 0, 0.9, 0.3]],
    imp: [[-0.12, -0.15, -0.12, -0.52], [0.12, 0.15, 0.12, 0.52]], impTag: [-0.06, -0.4],
    fan: [[0, -0.72, 0, -1.0]], fanTag: [0.06, -0.92]
  },
  plenum: {
    draw(pal) {
      // air handler cabinet (the plenum) with the inlet wall on the left
      noFill(); stroke(pal.muted); strokeWeight(1.2); drawingContext.setLineDash([6, 4]);
      lrect(-0.6, -0.95, 1.15, 0.95);
      drawingContext.setLineDash([]);
      metalStyle(pal, 1.3);
      lrect(-0.66, -0.95, -0.58, -0.24); lrect(-0.66, 0.24, -0.58, 0.95);
      drawFunnel(pal, -0.58, -0.38, 0.17, 0.24);
      drawImpellerRadial(pal, -0.4, -0.05, 0.45, -0.05);
      drawShaft(pal, -0.05, 0.75); drawBearing(pal, 0.35);
      drawFairing(pal, 0.6, 0.95, 0.13);
    },
    labels: [['Plenum wall', -0.62, -0.7, -1.0, -0.85], ['Inlet', -0.62, 0.0, -1.0, 0.45], ['Impeller', -0.22, 0.42, -0.6, 0.8],
      ['Shaft', 0.2, 0, 0.45, 0.35], ['Plenum (cabinet)', 0.95, -0.95, 0.75, -0.8]],
    imp: [[-0.22, -0.15, -0.22, -0.52], [-0.22, 0.15, -0.22, 0.52]], impTag: [-0.16, -0.3], fanTag: [0.36, -0.52],
    fan: [[-0.22, -0.5, -0.22, -0.85], [-0.22, 0.5, -0.22, 0.85], [-0.02, -0.45, 0.3, -0.75], [-0.02, 0.45, 0.3, 0.75],
      [-0.42, -0.45, -0.52, -0.78], [-0.42, 0.45, -0.52, 0.78]]
  },
  tic: {
    draw(pal) {
      drawTube(pal, -0.95, 1.0);
      drawFunnel(pal, -0.72, -0.48, 0.2, 0.42);
      drawImpellerRadial(pal, -0.46, -0.16, 0.42, -0.16);
      drawFairing(pal, 0.05, 0.75, 0.18);
      drawShaft(pal, -0.16, 0.05);
      drawVanes(pal, 0.28, 0.5, 0.2, 0.55);
    },
    labels: [['Inlet', -0.95, -0.5, -1.12, -0.85], ['Impeller', -0.3, 0.42, -0.62, 0.86], ['Tubular housing', 0.0, -0.6, 0.25, -0.88],
      ['Straightening vanes', 0.4, 0.42, 0.62, 0.86], ['Outlet', 1.0, -0.5, 1.08, -0.85], ['Shaft', -0.08, 0, -0.02, 0.34]],
    imp: [[-0.3, -0.13, -0.3, -0.5], [-0.3, 0.13, -0.3, 0.5]], impTag: [-0.24, -0.25],
    fan: [[0.9, -0.4, 1.18, -0.4], [0.9, 0.4, 1.18, 0.4]], fanTag: [0.84, -0.27]
  },
  tube: {
    draw(pal) { drawAxial(pal, false); },
    labels: [['Inlet', -0.95, -0.5, -1.12, -0.85], ['Impeller', -0.25, -0.4, -0.5, -0.86], ['Tubular housing', 0.3, 0.6, 0.35, 0.86],
      ['Outlet', 1.0, -0.5, 1.08, -0.85], ['Shaft', 0.0, 0, 0.0, 0.34]],
    imp: [[-0.06, -0.4, 0.3, -0.4], [-0.06, 0.4, 0.3, 0.4]], impTag: [-0.06, -0.27],
    fan: [[0.9, -0.4, 1.18, -0.4], [0.9, 0.4, 1.18, 0.4]], fanTag: [0.84, -0.27], extra: ['still swirling', 0.84, 0.27]
  },
  vane: {
    draw(pal) { drawAxial(pal, true); },
    labels: [['Inlet', -0.95, -0.5, -1.12, -0.85], ['Impeller', -0.25, -0.4, -0.5, -0.86], ['Tubular housing', 0.0, 0.6, -0.1, 0.86],
      ['Guide vanes', 0.66, 0.42, 0.7, 0.86], ['Outlet', 1.0, -0.5, 1.08, -0.85], ['Shaft', 0.0, 0, 0.12, 0.34]],
    imp: [[-0.06, -0.4, 0.3, -0.4], [-0.06, 0.4, 0.3, 0.4]], impTag: [-0.06, -0.27],
    fan: [[0.9, -0.4, 1.18, -0.4], [0.9, 0.4, 1.18, 0.4]], fanTag: [0.84, -0.27], extra: ['swirl removed', 0.84, 0.27]
  },
  mixed: {
    draw(pal) {
      drawTube(pal, -0.95, 1.0);
      drawFunnel(pal, -0.72, -0.5, 0.2, 0.4);
      // conical hub and diagonal blades
      stroke(pal.hub); strokeWeight(1.3); fill(pal.metalSide);
      lpoly([[-0.48, -0.1], [-0.05, -0.3], [-0.05, 0.3], [-0.48, 0.1]], true);
      strokeWeight(2.5); stroke(pal.hub);
      [-1, 1].forEach(sg => {
        for (let k = 0; k < 3; k++) {
          const t = k / 3;
          lline(-0.46 + 0.12 * t, sg * (0.12 + 0.07 * t), -0.16 + 0.12 * t, sg * (0.42 + 0.06 * t));
        }
        lline(-0.48, sg * 0.24, -0.05, sg * 0.5);   // front plate edge (tapered blades: larger tip width)
      });
      drawShaft(pal, -0.06, 0.1);
      drawFairing(pal, 0.1, 0.75, 0.2);
      drawVanes(pal, 0.4, 0.62, 0.2, 0.55);
    },
    labels: [['Inlet', -0.95, -0.5, -1.12, -0.85], ['Impeller', -0.25, 0.4, -0.55, 0.86], ['Tubular housing', 0.0, -0.6, 0.2, -0.88],
      ['Straightening vanes', 0.45, 0.44, 0.62, 0.86], ['Outlet', 1.0, -0.5, 1.08, -0.85], ['Shaft', 0.03, 0, 0.1, 0.34]],
    imp: [[-0.3, -0.24, -0.04, -0.5], [-0.3, 0.24, -0.04, 0.5]], impTag: [0.0, -0.43],
    fan: [[0.9, -0.4, 1.18, -0.4], [0.9, 0.4, 1.18, 0.4]], fanTag: [0.84, -0.27]
  }
};

function drawAxial(pal, vanes) {
  drawTube(pal, -0.95, 1.0);
  // propeller: hub and two visible blades
  stroke(pal.hub); strokeWeight(1.3); fill(pal.metalDark || pal.metalSide);
  ellipse(fx(-0.12), fy(0), F.S(0.16), F.S(0.36));
  fill(pal.metalSide);
  lpoly([[-0.18, -0.16], [-0.06, -0.16], [-0.02, -0.53], [-0.2, -0.53]], true);
  lpoly([[-0.16, 0.16], [-0.04, 0.16], [-0.06, 0.53], [-0.22, 0.53]], true);
  drawShaft(pal, -0.06, 0.08);
  drawFairing(pal, 0.08, 0.55, 0.15);   // direct-drive motor behind the hub
  stroke(pal.edge); strokeWeight(2); lline(0.3, 0.15, 0.3, 0.55);   // motor support
  if (vanes) drawVanes(pal, 0.6, 0.8, 0.15, 0.55);
}

function drawLabels(it, pal) {
  const ts = narrow() ? 12 : 13;
  GEO[it.geo].labels.forEach(L => {
    FD.leaderLabel(null, { text: L[0], ax: L[1], ay: L[2], lx: L[3], ly: L[4], frame: F, textSize: ts,
      bounds: { x0: 12, x1: canvasWidth - 12 } });
  });
}

// Result arrows after the animation: impeller exit (indigo, dashed) and fan exit (air blue, solid),
// each with a text tag so colour is never the only cue.
function drawResultArrows(it, pal) {
  const g = GEO[it.geo];
  const ts = narrow() ? 12 : 13;
  g.imp.forEach(a => FD.airflowArrow(null, { x1: a[0], y1: a[1], x2: a[2], y2: a[3], frame: F, color: FP.tok('primary'), dashed: true, weight: 3, head: 11 }));
  g.fan.forEach(a => FD.airflowArrow(null, { x1: a[0], y1: a[1], x2: a[2], y2: a[3], frame: F, color: pal.air, weight: 3.5, head: 12 }));
  tag('impeller exit', g.impTag, FP.tok('primary-dark'), ts);
  tag('fan exit', g.fanTag, pal.air, ts);
  if (g.extra) tag(g.extra[0], [g.extra[1], g.extra[2]], pal.text, ts);
}
// Text tag with a white backing; a = [x, y] in local units (left edge, vertical centre).
function tag(str, a, col, ts) {
  push();
  textSize(ts); textStyle(BOLD);
  const x = fx(a[0]), y = fy(a[1]);
  const w = textWidth(str) + 8, h = ts + 6;
  const tx = constrain(x, 12, canvasWidth - 12 - w);
  noStroke(); fill(255, 255, 255, 225); rect(tx, y - h / 2, w, h, 3);
  fill(col); textAlign(LEFT, CENTER); text(str, tx + 4, y);
  pop();
}

// ---------- Particles ----------
function makeParticles() {
  const rng = FP.rng.seeded(itemIndexSafe() * 101 + 7);
  particles = [];
  for (let i = 0; i < 70; i++) {
    particles.push({ u: rng() * 2 - 1, k: rng(), sg: rng() < 0.5 ? -1 : 1, d: rng() * 2.6, phi: rng() * TWO_PI, side: rng() < 0.5 ? -1 : 1 });
  }
}
function itemIndexSafe() { try { return itemIndex(); } catch (e) { return 0; } }

// Position along a polyline by arc length: returns [x, y].
function along(pts, p) {
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); seg.push(l); total += l; }
  let d = constrain(p, 0, 1) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, d / seg[i]) : 0;
      return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
}

// Path for one particle: {pts, fade (fraction where it starts fading), swirl}.
function particlePath(geo, q) {
  const y0 = q.u * 0.16, sg = q.sg, k = q.k;
  switch (geo) {
    case 'swsi': {
      const xr = -0.12 + k * 0.28;
      if (sg < 0) return { pts: [[-1.2, y0], [-0.3, y0], [xr, y0 * 0.5], [xr, -0.46], [0.01 + (xr - 0.01) * 0.6, -0.66], [0.01 + (xr - 0.01) * 0.5, -1.02]] };
      return { pts: [[-1.2, y0], [-0.3, y0], [xr, y0 * 0.5], [xr, 0.46], [xr, 0.58]], fade: 0.75 };
    }
    case 'dwdi': {
      const s = q.side, xr = s * (0.05 + k * 0.18);
      if (sg < 0) return { pts: [[s * 1.2, y0], [s * 0.38, y0], [xr, y0 * 0.5], [xr, -0.46], [xr * 0.6, -0.66], [xr * 0.5, -1.02]] };
      return { pts: [[s * 1.2, y0], [s * 0.38, y0], [xr, y0 * 0.5], [xr, 0.46], [xr, 0.58]], fade: 0.75 };
    }
    case 'plenum': {
      const xr = -0.38 + k * 0.3, dx = (q.side < 0 ? -0.35 : 0.9) * (0.3 + k * 0.7);
      return { pts: [[-1.2, y0], [-0.58, y0], [xr, y0 * 0.5], [xr, sg * 0.46], [xr + dx * 0.5, sg * (0.62 + k * 0.1)], [xr + dx, sg * (0.7 + k * 0.2)]], fade: 0.7 };
    }
    case 'tic': {
      const xr = -0.42 + k * 0.22, r = 0.3 + k * 0.2;
      return { pts: [[-1.2, y0], [-0.62, y0], [xr, y0 * 0.5], [xr, sg * 0.48], [-0.05, sg * r], [0.6, sg * r], [1.22, sg * r]] };
    }
    case 'tube': case 'vane': {
      const r = 0.2 + k * 0.32;
      return { pts: [[-1.2, r * Math.cos(q.phi)], [1.22, r * Math.cos(q.phi)]], swirl: { r: r, from: -0.12, to: geo === 'vane' ? 0.66 : 9 } };
    }
    case 'mixed': {
      const r = 0.32 + k * 0.18;
      return { pts: [[-1.2, y0], [-0.62, y0], [-0.42, sg * (0.14 + 0.05 * k)], [-0.06, sg * (0.47 + 0.04 * k)], [0.2, sg * r], [1.22, sg * r]] };
    }
  }
  return { pts: [[-1.2, 0], [1.2, 0]] };
}

function drawParticles(it, tSec, pal) {
  const LIFE = 2.4;
  noStroke();
  const c = color(pal.air);
  for (const q of particles) {
    const p = (tSec - q.d) / LIFE;
    if (p < 0 || p > 1) continue;
    const path = particlePath(it.geo, q);
    let [x, y] = along(path.pts, p);
    let size = 6;
    if (path.swirl) {
      // rotation about the shaft: side-view projection y = r cos(phi), size shows depth
      const sw = path.swirl;
      let turns = 0;
      if (x > sw.from) turns = (Math.min(x, sw.to) - sw.from) * 9;
      const ph = q.phi + turns;
      y = sw.r * Math.cos(ph);
      size = 6 + 2.5 * Math.sin(ph);
    }
    let a = 230;
    if (path.fade && p > path.fade) a = 230 * (1 - (p - path.fade) / (1 - path.fade));
    c.setAlpha(a);
    fill(c);
    circle(fx(x), fy(y), size);
  }
}

function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateControls();
}

function updateCanvasSize() { canvasWidth = K.updateCanvasSize(320); }
