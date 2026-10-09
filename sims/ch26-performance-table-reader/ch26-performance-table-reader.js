// Performance Table Reader - p5.js MicroSim (FanPedia shared kit: FP.ChallengeRunner, FP.p5)
// CANVAS_HEIGHT: 707
// The RBA 913 excerpt from Catalog 902 (November 2017), page 24: 5 airflow rows x 8 static
// pressure columns of RPM / BHP. Six duty points, fixed order: read directly or interpolate
// linearly, type RPM and BHP, pick the class, Check. Two attempts, the first is scored.
// Class: 22 when RPM <= 2,812; 32 when <= 3,337; 45 when <= 4,000 (the page's footer).
// Needs ../shared-libs/fanpedia-core.js and fanpedia-p5.js (see main.html).

const K = FP.p5;
const SIM_ID = 'ch26-performance-table-reader';
let canvasWidth = 800;
let drawHeight = 650;
let controlHeight = K.controlHeightFor(1);   // grows when the buttons wrap onto a second row
const margin = 10;
const WIDE = 640;            // side-by-side work area from this canvas width up
const FIXED_FROM = 684;      // from this width up the drawing region keeps one height,
const WIDE_DRAW_H = 662;     // the tallest layout in 684-1000 px (chapter iframes are 684-753 px wide)

const PROMPT = 'What speed and power does this duty need, and which class must you order?';
const MASTERY = 5;
const REVIEW = 'Review "Reading a Performance Table", "Class Shading in Tables" and "Interpolation" in the chapter, then press Start over.';
const HEADER = 'RBA 913. Impeller diameter 22.625 in. Tip speed (FPM) = 5.92 × RPM. Outlet area 0.93 ft². Fan Efficiency Grade FEG80.';
const FOOTER = 'Maximum RPM: Class 22 = 2,812; Class 32 = 3,337; Class 45 = 4,000. Performance certified for installation type B and D. BHP does not include transmission losses. Ratings do not include the effects of appurtenances.';
const NOTE_FULL = ['Source: TCF Catalog 902 (Nov 2017) p. 24', 'Confirm in Fan Selector before quoting',
  'Keys: Enter check/next, arrows + S pin cells'];
const NOTE_SHORT = ['Source: TCF Catalog 902 p. 24', 'Confirm in Fan Selector'];

// ---------- RBA 913 excerpt (chapter table, Catalog 902 page 24) ----------
const CFM = [3348, 3720, 4092, 4464, 4836];
const OV = [3600, 4000, 4400, 4800, 5200];
const SP = [4, 8, 12, 16, 20, 24, 28, 32];
const RPM = [
  [1384, 1774, 2093, 2374, 2630, 2868, 3088, 3295],
  [1439, 1818, 2128, 2401, 2648, 2879, 3095, 3299],
  [1495, 1865, 2167, 2433, 2674, 2897, 3108, 3307],
  [1552, 1915, 2210, 2470, 2705, 2922, 3126, 3321],
  [1612, 1967, 2256, 2510, 2740, 2953, 3152, 3340]
];
const BHP = [
  [3.59, 6.42, 9.39, 12.52, 15.84, 19.35, 22.95, 26.70],
  [4.20, 7.30, 10.51, 13.87, 17.34, 21.02, 24.83, 28.79],
  [4.86, 8.25, 11.72, 15.30, 19.00, 22.82, 26.82, 30.95],
  [5.58, 9.29, 13.01, 16.85, 20.77, 24.78, 28.92, 33.24],
  [6.38, 10.41, 14.40, 18.48, 22.64, 26.89, 31.23, 35.65]
];
const UNDERLINED = [[4, 6], [4, 7]];   // 4,836 CFM at 28 and 32 in.: maximum static efficiency
const CLASS_LIMITS = [[22, 2812], [32, 3337], [45, 4000]];

function classFor(rpm) {
  for (const [c, lim] of CLASS_LIMITS) if (rpm <= lim) return c;
  return null;
}

// ---------- Six duty points (spec Content table, fixed order) ----------
const ITEMS = [
  { n: 1, cfm: 4092, sp: 12, direct: true, rpm: 2167, bhp: 11.72, cls: 22, method: 'Direct reading',
    wrong: 'Row 4,092, column 12 in.; 2,167 ≤ 2,812 so Class 22.',
    reason: 'row 4,092 CFM, column 12 in. reads 2,167 RPM and 11.72 BHP; 2,167 ≤ 2,812, so Class 22.' },
  { n: 2, cfm: 3720, sp: 24, direct: true, rpm: 2879, bhp: 21.02, cls: 32, method: 'Direct reading',
    wrong: '2,879 is above 2,812 and at or below 3,337, so Class 32.',
    reason: 'row 3,720 CFM, column 24 in. reads 2,879 RPM and 21.02 BHP; 2,879 is above 2,812 and at or below 3,337, so Class 32.' },
  { n: 3, cfm: 4836, sp: 32, direct: true, rpm: 3340, bhp: 35.65, cls: 45, method: 'Direct reading',
    wrong: '3,340 is 3 RPM above the Class 32 limit of 3,337, so Class 45.',
    reason: 'row 4,836 CFM, column 32 in. reads 3,340 RPM and 35.65 BHP; 3,340 is 3 RPM above the Class 32 limit of 3,337, so Class 45.' },
  { n: 4, cfm: 4000, sp: 12, direct: false, rpm: 2157, bhp: 11.42, cls: 22, method: 'Interpolate airflow',
    wrong: 'f = (4,000 − 3,720) / (4,092 − 3,720) = 0.753 between rows 3,720 and 4,092.',
    reason: 'in the 12 in. column, f = (4,000 − 3,720) / (4,092 − 3,720) = 0.753 between rows 3,720 (2,128 / 10.51) and 4,092 (2,167 / 11.72) gives 2,157 RPM and 11.42 BHP; 2,157 ≤ 2,812, so Class 22.' },
  { n: 5, cfm: 4000, sp: 14, direct: false, rpm: 2291, bhp: 13.18, cls: 22, method: 'Interpolate airflow, then pressure',
    wrong: 'Interpolate the 12 in. and 16 in. columns at f = 0.753, then halfway between them.',
    reason: 'at f = 0.753 the 12 in. column gives 2,157 / 11.42 and the 16 in. column 2,425 / 14.95; halfway between them is 2,291 RPM and 13.18 BHP; 2,291 ≤ 2,812, so Class 22.' },
  { n: 6, cfm: 4464, sp: 30, direct: false, rpm: 3224, bhp: 31.08, cls: 32, method: 'Interpolate pressure',
    wrong: 'Halfway between 28 in. (3,126 / 28.92) and 32 in. (3,321 / 33.24).',
    reason: 'row 4,464 CFM, halfway between 28 in. (3,126 / 28.92) and 32 in. (3,321 / 33.24) gives 3,224 RPM and 31.08 BHP; 2,812 < 3,224 ≤ 3,337, so Class 32.' }
].map(it => Object.assign({
  id: 'duty-' + it.n,
  label: 'duty point ' + it.n,
  duty: FP.fmt.num(it.cfm) + ' CFM at ' + it.sp + ' in. SP',
  answerText: FP.fmt.num(it.rpm) + ' RPM, ' + it.bhp.toFixed(2) + ' BHP, Class ' + it.cls
}, it));

// Rules: direct readings exact (±1 RPM, ±0.01 BHP); interpolated within ±1%.
function partsFor(v, it) {
  const tolR = it.direct ? { abs: 1 } : { rel: 0.01 };
  const tolB = it.direct ? { abs: 0.01 } : { rel: 0.01 };
  return {
    rpm: FP.check.numeric(v.rpm, it.rpm, tolR),
    bhp: FP.check.numeric(v.bhp, it.bhp, tolB),
    cls: v.cls === it.cls
  };
}

function wrongList(p) {
  const names = [];
  if (!p.rpm) names.push('RPM');
  if (!p.bhp) names.push('BHP');
  if (!p.cls) names.push('class');
  if (names.length === 1) return names[0] + ' is wrong';
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' are wrong';
}

const MSG = {
  correct: res => FP.msg.OK + ' Correct: ' + res.item.reason.charAt(0).toUpperCase() + res.item.reason.slice(1),
  retry: res => FP.msg.BAD + ' Not quite: ' + wrongList(partsFor(res.value, res.item)) + '. ' + res.item.wrong +
    ' Try again (1 attempt left).',
  missed: res => FP.msg.BAD + ' Not quite: ' + wrongList(partsFor(res.value, res.item)) + '. The answer is ' +
    res.item.answerText + ' (' + res.item.method.toLowerCase() + '): ' + res.item.reason + ' This one counts as missed.'
};

const runner = new FP.ChallengeRunner({
  items: ITEMS, attempts: 2, noun: 'Duty points', mastery: MASTERY, reviewPointer: REVIEW,
  explore: false, id: SIM_ID, messages: MSG,
  check: (v, it) => { const p = partsFor(v, it); return p.rpm && p.bhp && p.cls; }
});

let selClass = null;         // 22 | 32 | 45 | null
let lastRes = null;          // latest submit result for this duty point
let lastParts = null;        // {rpm, bhp, cls} marks from the latest check
let overlay = false;         // class overlay (shown after Check)
let checkedOnce = false;     // the overlay toggle unlocks after the first Check of a point
let scratchOpen = false;
let pinned = [];             // [[r, c], ...] cells pinned in the scratch panel (max 4)
let hot = null;              // [r, c] cell under the mouse or the keyboard cursor
let cursor = [0, 0];         // keyboard cursor
let kbdCursor = false;       // true after an arrow key, until the mouse moves
let invalidMsg = '';

let rpmInput, bhpInput, fInput, classBtns = [];
let checkButton, nextButton, overlayButton, scratchButton, restartButton;
let lay = null;

const keys = K.keys.bind({
  Enter: enterKey,
  ArrowLeft: () => moveCursor(0, -1), ArrowRight: () => moveCursor(0, 1),
  ArrowUp: () => moveCursor(-1, 0), ArrowDown: () => moveCursor(1, 0),
  s: () => togglePin(cursor[0], cursor[1])
});
function keyPressed() { return keys(); }

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight, margin });
  const canvas = createCanvas(canvasWidth, drawHeight + controlHeight);
  canvas.parent(document.querySelector('main'));

  rpmInput = createInput('');
  rpmInput.parent(document.querySelector('main'));
  rpmInput.attribute('aria-label', 'Your RPM');
  rpmInput.attribute('inputmode', 'decimal');
  bhpInput = createInput('');
  bhpInput.parent(document.querySelector('main'));
  bhpInput.attribute('aria-label', 'Your BHP');
  bhpInput.attribute('inputmode', 'decimal');
  for (const c of [22, 32, 45]) {
    const b = K.button('Class ' + c, () => pickClass(c));
    b.attribute('aria-label', 'Class ' + c);
    classBtns.push(b);
  }
  checkButton = K.button('Check', checkAnswer);
  checkButton.attribute('aria-keyshortcuts', 'Enter');
  nextButton = K.button('Next duty point', advance);
  overlayButton = K.button('Class overlay', toggleOverlay, { variant: 'secondary' });
  overlayButton.addClass('secondary');
  scratchButton = K.button('Scratch panel', toggleScratch, { variant: 'secondary' });
  scratchButton.addClass('secondary');
  restartButton = K.button(FP.msg.START_OVER, startOver, { variant: 'secondary' });
  restartButton.addClass('secondary');
  fInput = createInput('');
  fInput.parent(document.querySelector('main'));
  fInput.attribute('aria-label', 'Your fraction f (scratch, not scored)');
  fInput.attribute('inputmode', 'decimal');
  fInput.size(70);
  fInput.input(() => { /* echoed in the scratch panel */ });

  relayout();
  updateControls();
  describe('Performance Table Reader. An excerpt of the Twin City Fan RBA 913 performance table: five airflow ' +
    'rows from 3,348 to 4,836 CFM and eight static pressure columns from 4 to 32 in. wg, each cell RPM and BHP. ' +
    'Six duty points appear in order. For each, type the RPM and BHP, by direct reading or linear interpolation, ' +
    'choose Class 22, 32 or 45, and press Check. Two attempts; the first is scored. The class overlay turns on ' +
    'after Check. The score reads Duty points correct: n of 6; mastery is 5 of 6.');
  FP.announce('Duty point 1 of 6: ' + ITEMS[0].duty + '. ' + PROMPT);
}

// ---------- Layout ----------

function wrapH(str, w, size, lh, style) {
  textSize(size);
  textStyle(style || NORMAL);
  const n = K.countLines(str, w);
  textStyle(NORMAL);
  return n * lh;
}

function computeLayout() {
  const w = canvasWidth - 2 * margin;
  const narrow = canvasWidth < 520;
  textSize(15);
  const promptH = K.countLines(PROMPT, w) * 19;
  const statusTop = 40 + promptH + 2;
  textStyle(BOLD);
  const lw = textWidth('Duty points correct: 6 of 6');
  textStyle(NORMAL);
  const rw = textWidth('Duty point 6 of 6 · Attempt 2 of 2');
  const statusH = lw + 16 + rw <= w ? 21 : 42;
  const headerTop = statusTop + statusH + 4;
  const headerH = wrapH(HEADER, w, 13, 17, BOLD);

  // Grid: one line per cell ("2167 / 11.72") when it fits, else RPM over BHP.
  let single = false, cellSize = 12, leadOne = 0;
  for (const fsz of [13, 12]) {
    textSize(fsz);
    leadOne = textWidth('4,836') + 10;
    if ((w - 2 * leadOne) / 8 >= textWidth('3295 / 26.70') + 6) { single = true; cellSize = fsz; break; }
  }
  const gridTop = headerTop + headerH + 6;
  let lead, cellW, rowH, headH;
  if (single) {
    lead = leadOne; cellW = (w - 2 * lead) / 8; rowH = 24; headH = 36;
  } else {
    lead = Math.max(44, w * 0.12); cellW = (w - lead) / 8; rowH = 34; headH = 36;
  }
  const gridH = headH + 5 * rowH;
  const footTop = gridTop + gridH + 6;
  const legend = legendText(single);
  const footH = wrapH(FOOTER, w, 13, 17) + wrapH(legend, w, 13, 17);

  // Work area: duty panel (inputs and feedback) and scratch panel.
  const workTop = footTop + footH + 8;
  const side = canvasWidth >= WIDE;
  const dutyW = side ? Math.round(w * 0.64) : w;
  const scrW = side ? w - dutyW - 10 : w;
  const fs = narrow ? 13 : 14;
  const inner = dutyW - 24;
  // Inputs: one row when they fit, else RPM/BHP on one row and the class buttons on the next.
  textSize(14);
  const inputsW = textWidth('RPM') + 8 + 86 + 22 + textWidth('BHP') + 8 + 74 + 22;
  const classW = textWidth('Class') + 8 + 3 * (textWidth('✓ Class 45') + 30) + 22;
  const oneRow = inputsW + classW <= inner;
  const inputsH = oneRow ? 38 : 76;
  let fbH = 0;
  const worst = { rpm: NaN, bhp: NaN, cls: null };
  for (const it of ITEMS) {
    for (const st of ['retry', 'missed']) fbH = max(fbH, wrapH(MSG[st]({ item: it, value: worst }), inner, fs, fs + 5));
  }
  fbH += 12;
  let sumH = 24 + wrapH(FP.msg.masteryNeeds(MASTERY, 6, REVIEW), inner, fs, fs + 5, BOLD) + 24;
  for (const it of ITEMS.slice(3)) sumH += wrapH('#' + it.n + ' ' + it.duty + ' → ' + it.answerText, inner, 13, 17) + 2;
  let dutyH = 12 + max(20 + 26 + inputsH + 6 + fbH, sumH) + 8;
  if (side) dutyH = max(dutyH, scratchHeight(scrW));
  let scrH = side ? dutyH : scratchHeight(scrW);
  let drawH = Math.ceil(workTop + (side ? dutyH : dutyH + 10 + scrH) + 24);
  // Chapter iframes are 680-760 px wide: from FIXED_FROM up, keep one canvas height (the tallest
  // layout in that range) and give the spare room to the work area.
  if (canvasWidth >= FIXED_FROM && drawH < WIDE_DRAW_H) {
    dutyH += WIDE_DRAW_H - drawH;
    scrH = dutyH;
    fbH += WIDE_DRAW_H - drawH;
    drawH = WIDE_DRAW_H;
  }
  return { w, narrow, statusTop, headerTop, headerH, single, cellSize, gridTop, lead, cellW, rowH, headH, gridH,
    footTop, legend, workTop, side, dutyW, scrW, dutyH, scrH, fs, inner, oneRow, inputsH, fbH, drawH };
}

function legendText(single) {
  return (single ? 'Each cell: RPM / BHP. ' : 'Rows: CFM over OV (FPM). Each cell: RPM over BHP. ') +
    'Underlined = maximum static efficiency. Class overlay: regular = Class 22; shaded bold = Class 32; shaded italic = Class 45.';
}

function scratchHeight(w) {
  // title + hint (2 lines) + 4 pinned lines + f row + echo line
  return 10 + 20 + wrapH(SCRATCH_HINT, w - 16, 13, 17) + 4 * 17 + 8 + 34 + 17 + 10;
}
const SCRATCH_HINT = 'Not scored. Click cells (or use the arrow keys and S) to pin bracketing values, and type your f. The panel never computes the answer.';

function relayout() {
  lay = computeLayout();
  if (lay.drawH !== drawHeight || width !== canvasWidth) {
    drawHeight = lay.drawH;
    K.config({ drawHeight, controlHeight, margin });
    resizeCanvas(canvasWidth, drawHeight + controlHeight);
  }
  positionControls();
}

function scratchBox() {
  if (lay.side) return { x: margin + lay.dutyW + 10, y: lay.workTop, w: lay.scrW, h: lay.scrH };
  return { x: margin, y: lay.workTop + lay.dutyH + 10, w: lay.scrW, h: lay.scrH };
}

function inputsTop() { return lay.workTop + 12 + 20 + 26; }

function positionControls() {
  const x0 = margin + 12;
  const y0 = inputsTop();
  textSize(14);
  let x = x0 + textWidth('RPM') + 8;
  rpmInput.size(86);
  rpmInput.position(x, y0 + 4);
  x += 86 + 22;
  x += textWidth('BHP') + 8;
  bhpInput.size(74);
  bhpInput.position(x, y0 + 4);
  x += 74 + 22;
  let cy = y0;
  if (!lay.oneRow) { cy = y0 + 38; x = x0; }
  x += textWidth('Class') + 8;
  for (const b of classBtns) { b.position(x, cy + 4); x += b.elt.offsetWidth + 6; }
  lay.classMarkX = x + 2;
  lay.classRowY = cy;
  const sb = scratchBox();
  const fy = sb.y + 10 + 20 + wrapH(SCRATCH_HINT, sb.w - 16, 13, 17) + 4 * 17 + 8;
  textSize(13);
  fInput.position(sb.x + 8 + textWidth('Your f =') + 8, fy);
  lay.fRowY = fy;
  const rows = K.flowButtons(0, [checkButton, nextButton, '|', overlayButton, scratchButton, '|', restartButton]);
  const ch = K.controlHeightFor(Math.max(1, rows));
  if (ch !== controlHeight) {
    controlHeight = ch;
    K.config({ drawHeight, controlHeight, margin });
    resizeCanvas(canvasWidth, drawHeight + controlHeight);
  }
}

// ---------- Grid geometry ----------

function colX(c) {   // left edge of SP column c
  return lay.single ? margin + 2 * lay.lead + c * lay.cellW : margin + lay.lead + c * lay.cellW;
}
function rowY(r) { return lay.gridTop + lay.headH + r * lay.rowH; }

function cellAt(mx, my) {
  if (my < rowY(0) || my >= rowY(5)) return null;
  const r = floor((my - rowY(0)) / lay.rowH);
  const c = floor((mx - colX(0)) / lay.cellW);
  if (c < 0 || c > 7) return null;
  return [r, c];
}

// ---------- Drawing ----------

function draw() {
  K.regions(drawHeight, controlHeight);
  K.title('Performance Table Reader');
  noStroke();
  fill(FP.tok('text-muted'));
  textSize(15);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  K.wrapText(PROMPT, margin, 40, lay.w, 19);

  const st = runner.state();
  const right = st.phase === 'done' ? 'All 6 checked'
    : 'Duty point ' + (st.index + 1) + ' of ' + ITEMS.length + ' · ' + st.attemptLabel;
  K.statusLine(scoreLabel(), right, null, { y: lay.statusTop });

  textSize(13);
  textStyle(BOLD);
  fill(FP.tok('text'));
  textAlign(LEFT, TOP);
  K.wrapText(HEADER, margin, lay.headerTop, lay.w, 17);
  textStyle(NORMAL);

  const mc = cellAt(mouseX, mouseY);
  hot = mc || (kbdCursor ? cursor : null);
  drawGrid();

  fill(FP.tok('text'));
  textSize(13);
  textAlign(LEFT, TOP);
  let y = K.wrapText(FOOTER, margin, lay.footTop, lay.w, 17);
  fill(FP.tok('text-muted'));
  K.wrapText(lay.legend, margin, y, lay.w, 17);

  if (st.phase === 'done') drawSummary(); else drawDuty(st);
  drawScratch();

  textSize(13);
  const full = FP.msg.note(...NOTE_FULL);
  K.note(textWidth(full) <= lay.w ? NOTE_FULL : NOTE_SHORT);
}

function scoreLabel() {
  return FP.msg.score('Duty points', runner.score.firstAttempt(), ITEMS.length);
}

function isPinned(r, c) { return pinned.some(p => p[0] === r && p[1] === c); }

function drawGrid() {
  const gx = margin, gy = lay.gridTop, gw = lay.w;
  const hr = hot ? hot[0] : -1, hc = hot ? hot[1] : -1;
  // Frame and header band
  stroke(FP.tok('border'));
  strokeWeight(1);
  fill(FP.tok('ctrl-bg'));
  rect(gx, gy, gw, lay.gridH);
  noStroke();
  fill(FP.tok('primary-bg'));
  rect(gx + 1, gy + 1, gw - 2, lay.headH - 1);

  // Column heads
  textAlign(CENTER, TOP);
  const headSize = lay.single ? lay.cellSize : 12;
  textSize(headSize);
  // Active column head: filled indigo with white text (the hovered cell's column).
  const headFill = (x, w, active) => {
    if (active) { fill(FP.tok('primary')); rect(x + 1, gy + 1, w - 2, lay.headH - 1); fill('#ffffff'); }
    else fill(FP.tok('text'));
  };
  if (lay.single) {
    fill(FP.tok('text'));
    textStyle(BOLD); text('CFM', gx + lay.lead / 2, gy + 4); text('OV', gx + lay.lead * 1.5, gy + 4); textStyle(NORMAL);
    textSize(12); fill(FP.tok('text-muted'));
    text('(FPM)', gx + lay.lead * 1.5, gy + 20);
  } else {
    fill(FP.tok('text'));
    textStyle(BOLD); text('CFM', gx + lay.lead / 2, gy + 4); textStyle(NORMAL);
    textSize(12); fill(FP.tok('text-muted'));
    text('OV', gx + lay.lead / 2, gy + 20);
  }
  for (let c = 0; c < 8; c++) {
    const x = colX(c);
    textSize(headSize);
    headFill(x, lay.cellW, c === hc);
    textStyle(BOLD);
    text(SP[c] + ' in.' + (lay.single ? ' SP' : ''), x + lay.cellW / 2, gy + 4);
    textStyle(NORMAL);
    textSize(12);
    if (c !== hc) fill(FP.tok('text-muted'));
    text(lay.single ? 'RPM / BHP' : 'SP', x + lay.cellW / 2, gy + 20);
  }

  // Rows
  for (let r = 0; r < 5; r++) {
    const y = rowY(r);
    stroke(FP.tok('border'));
    line(gx, y, gx + gw, y);
    noStroke();
    // Row heads
    const active = r === hr;
    if (active) { fill(FP.tok('primary')); rect(gx + 1, y + 1, (lay.single ? 2 : 1) * lay.lead - 2, lay.rowH - 1); }
    textAlign(CENTER, CENTER);
    if (lay.single) {
      textSize(lay.cellSize); textStyle(BOLD); fill(active ? '#ffffff' : FP.tok('text'));
      text(FP.fmt.num(CFM[r]), gx + lay.lead / 2, y + lay.rowH / 2);
      textStyle(NORMAL); fill(active ? '#ffffff' : FP.tok('text-muted'));
      text(FP.fmt.num(OV[r]), gx + lay.lead * 1.5, y + lay.rowH / 2);
    } else {
      textSize(12); textStyle(BOLD); fill(active ? '#ffffff' : FP.tok('text'));
      text(FP.fmt.num(CFM[r]), gx + lay.lead / 2, y + lay.rowH / 2 - 8);
      textStyle(NORMAL); fill(active ? '#ffffff' : FP.tok('text-muted'));
      text(FP.fmt.num(OV[r]), gx + lay.lead / 2, y + lay.rowH / 2 + 8);
    }
    for (let c = 0; c < 8; c++) drawCell(r, c, y, r === hr && c === hc, r === hr || c === hc);
  }
  // Column separators
  stroke(FP.tok('border'));
  for (let c = 0; c <= 8; c++) line(colX(c), gy, colX(c), gy + lay.gridH);
  if (lay.single) line(gx + lay.lead, gy, gx + lay.lead, gy + lay.gridH);
  noStroke();
}

function drawCell(r, c, y, isHot, inLine) {
  const x = colX(c);
  const cls = classFor(RPM[r][c]);
  const shaded = overlay && cls !== 22;
  if (shaded) { fill(FP.tok(cls === 32 ? 'primary-bg' : 'info-bg')); rect(x + 1, y + 1, lay.cellW - 1, lay.rowH - 1); }
  else if (inLine) { fill(FP.tok('draw-bg')); rect(x + 1, y + 1, lay.cellW - 1, lay.rowH - 1); }
  if (isPinned(r, c)) {
    stroke(FP.tok('primary')); strokeWeight(2); noFill();
    rect(x + 2, y + 2, lay.cellW - 4, lay.rowH - 4, 3);
    noStroke();
  }
  if (isHot) {
    stroke(FP.tok('primary-dark')); strokeWeight(2); noFill();
    drawingContext.setLineDash([3, 2]);
    rect(x + 1, y + 1, lay.cellW - 2, lay.rowH - 2);
    drawingContext.setLineDash([]);
    noStroke(); strokeWeight(1);
  }
  textStyle(shaded ? (cls === 32 ? BOLD : ITALIC) : NORMAL);
  fill(FP.tok('text'));
  textAlign(CENTER, CENTER);
  const under = UNDERLINED.some(u => u[0] === r && u[1] === c);
  const rpm = String(RPM[r][c]), bhp = BHP[r][c].toFixed(2);
  if (lay.single) {
    textSize(lay.cellSize);
    const t = rpm + ' / ' + bhp;
    text(t, x + lay.cellW / 2, y + lay.rowH / 2);
    if (under) underline(x + lay.cellW / 2, y + lay.rowH / 2 + 8, textWidth(t));
  } else {
    textSize(12);
    text(rpm, x + lay.cellW / 2, y + lay.rowH / 2 - 8);
    text(bhp, x + lay.cellW / 2, y + lay.rowH / 2 + 8);
    if (under) underline(x + lay.cellW / 2, y + lay.rowH / 2 + 16, textWidth(bhp));
  }
  textStyle(NORMAL);
}

function underline(cx, y, w) {
  stroke(FP.tok('text'));
  strokeWeight(1);
  line(cx - w / 2, y, cx + w / 2, y);
  noStroke();
}

function drawDuty(st) {
  const x = margin, y = lay.workTop, w = lay.dutyW, h = lay.dutyH;
  K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 2 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  fill(FP.tok('primary-dark'));
  text('Duty point ' + st.item.n + ' of ' + ITEMS.length + ', standard air', x + 12, y + 12);
  textStyle(BOLD);
  textSize(lay.narrow ? 17 : 19);
  fill(FP.tok('text'));
  text(st.item.duty, x + 12, y + 32);
  textStyle(NORMAL);

  // Field labels and ✓/✗ marks after a check
  const y0 = inputsTop();
  textSize(14);
  textAlign(LEFT, CENTER);
  fill(FP.tok('text'));
  const cy = y0 + 18;
  text('RPM', x + 12, cy);
  const bhpLabelX = x + 12 + textWidth('RPM') + 8 + 86 + 22;
  text('BHP', bhpLabelX, cy);
  const classLabelX = lay.oneRow ? bhpLabelX + textWidth('BHP') + 8 + 74 + 22 : x + 12;
  text('Class', classLabelX, lay.classRowY + 18);
  if (lastParts) {
    mark(lastParts.rpm, x + 12 + textWidth('RPM') + 8 + 86 + 4, cy);
    mark(lastParts.bhp, bhpLabelX + textWidth('BHP') + 8 + 74 + 4, cy);
    mark(lastParts.cls, lay.classMarkX, lay.classRowY + 18);
  }

  const fy = y + h - 6 - lay.fbH;
  if (invalidMsg) {
    K.panel(x + 6, fy, w - 12, lay.fbH, { fill: '--fp-info-bg', stroke: '--fp-border', weight: 1, radius: 6 });
    noStroke(); fill(FP.tok('text')); textSize(lay.fs); textAlign(LEFT, TOP);
    K.wrapText('ℹ ' + invalidMsg, x + 12, fy + 6, lay.inner, lay.fs + 5);
    return;
  }
  if (!lastRes) return;
  const ok = lastRes.status === 'correct';
  K.panel(x + 6, fy, w - 12, lay.fbH, {
    fill: ok ? '--fp-correct-bg' : '--fp-incorrect-bg', stroke: ok ? '--fp-correct' : '--fp-incorrect',
    dashed: !ok, weight: 2, radius: 6
  });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(lay.fs);
  fill(FP.tok(ok ? 'correct' : 'incorrect'));
  K.wrapText(lastRes.message, x + 12, fy + 6, lay.inner, lay.fs + 5);
}

function mark(ok, mx, cy) {
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  fill(FP.tok(ok ? 'correct' : 'incorrect'));
  text(ok ? FP.msg.OK : FP.msg.BAD, mx, cy);
  textStyle(NORMAL);
  textSize(14);
}

function drawSummary() {
  const x = margin, y = lay.workTop, w = lay.dutyW, h = lay.dutyH, inner = lay.inner;
  K.panel(x, y, w, h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1 });
  noFill();
  stroke(FP.tok('primary'));
  rect(x + 3, y + 3, w - 6, h - 6, 6);
  noStroke();
  textAlign(LEFT, TOP);
  const s = runner.summary();
  let yy = y + 12;
  textStyle(BOLD);
  textSize(17);
  fill(FP.tok('text'));
  text(scoreLabel(), x + 12, yy);
  yy += 26;
  textSize(lay.fs);
  fill(FP.tok(s.mastered ? 'correct' : 'text'));
  yy = K.wrapText(s.mastered ? FP.msg.OK + ' ' + FP.msg.masteryReached(MASTERY, ITEMS.length)
    : FP.msg.masteryNeeds(MASTERY, ITEMS.length, REVIEW), x + 12, yy, inner, lay.fs + 5);
  textStyle(NORMAL);
  fill(FP.tok('text'));
  const misses = ITEMS.filter((it, i) => !firstTry[i]);
  if (!misses.length) {
    yy = K.wrapText('Every duty point was right on the first attempt.', x + 12, yy + 6, inner, lay.fs + 5);
  } else {
    yy = K.wrapText('Not right on the first attempt:', x + 12, yy + 6, inner, lay.fs + 5);
    const lines = misses.map(it => '#' + it.n + ' ' + it.duty + ' → ' + it.answerText);
    textSize(13);
    for (const l of lines) {
      if (yy + 17 > y + h - 30 + 1) break;
      yy = K.wrapText(l, x + 12, yy, inner, 17, { maxLines: 2 });
    }
  }
  textSize(13);
  fill(FP.tok('text-muted'));
  K.wrapText('Explore: hover cells and toggle the class overlay.', x + 12, y + h - 26, inner, 17, { maxLines: 1 });
}

function drawScratch() {
  const b = scratchBox();
  if (!scratchOpen) {
    K.panel(b.x, b.y, b.w, b.h, { fill: '--fp-draw-bg', stroke: '--fp-border', dashed: true, weight: 1, radius: 6 });
    noStroke();
    fill(FP.tok('text-muted'));
    textSize(13);
    textAlign(LEFT, TOP);
    K.wrapText('Scratch panel (closed). Press Scratch panel to pin bracketing cells and note your fraction f.',
      b.x + 8, b.y + 10, b.w - 16, 17);
    return;
  }
  K.panel(b.x, b.y, b.w, b.h, { fill: '--fp-ctrl-bg', stroke: '--fp-primary', weight: 1, radius: 6 });
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  textStyle(BOLD);
  fill(FP.tok('text'));
  text('Scratch panel', b.x + 8, b.y + 10);
  textStyle(NORMAL);
  textSize(13);
  fill(FP.tok('text-muted'));
  let yy = K.wrapText(SCRATCH_HINT, b.x + 8, b.y + 30, b.w - 16, 17);
  fill(FP.tok('text'));
  for (let i = 0; i < 4; i++) {
    const p = pinned[i];
    const t = p ? FP.fmt.num(CFM[p[0]]) + ' CFM, ' + SP[p[1]] + ' in.: ' + RPM[p[0]][p[1]] + ' / ' + BHP[p[0]][p[1]].toFixed(2)
      : (i === 0 ? 'No cells pinned yet.' : '');
    if (!p) fill(FP.tok('text-muted'));
    text(t, b.x + 8, yy + i * 17);
    fill(FP.tok('text'));
  }
  textAlign(LEFT, CENTER);
  text('Your f =', b.x + 8, lay.fRowY + 14);
  textAlign(LEFT, TOP);
  const f = FP.fmt.parseNumber(fInput.value());
  fill(FP.tok('text-muted'));
  const echo = fInput.value().trim() === '' ? 'Type f = (x − x1) / (x2 − x1) as you worked it.'
    : (isNaN(f) ? 'f is not a number yet.' : 'You entered f = ' + fInput.value().trim() + '.');
  K.wrapText(echo, b.x + 8, lay.fRowY + 34, b.w - 16, 17, { maxLines: 1 });
}

// ---------- Actions ----------

const firstTry = ITEMS.map(() => false);   // first attempt correct, per duty point

function pickClass(c) {
  if (runner.state().phase !== 'question') return;
  selClass = c;
  invalidMsg = '';
  updateControls();
}

function checkAnswer() {
  const st = runner.state();
  if (st.phase !== 'question') return;
  const rpm = FP.fmt.parseNumber(rpmInput.value());
  const bhp = FP.fmt.parseNumber(bhpInput.value());
  const nums = [];
  if (isNaN(rpm)) nums.push('RPM');
  if (isNaN(bhp)) nums.push('BHP');
  if (nums.length || selClass === null) {
    const parts = [];
    if (nums.length) parts.push(FP.msg.ENTER_NUMBER + ' for ' + nums.join(' and '));
    if (selClass === null) parts.push(parts.length ? 'choose a class' : 'Choose a class');
    invalidMsg = parts.join(', and ') + ' before Check (no attempt used).';
    FP.announce(invalidMsg);
    return;
  }
  invalidMsg = '';
  const value = { rpm, bhp, cls: selClass };
  const res = runner.submit(value);
  if (res.status === 'ignored') return;
  lastRes = res;
  lastParts = partsFor(value, st.item);
  if (res.attempt === 1) firstTry[st.index] = res.status === 'correct';
  checkedOnce = true;
  overlay = true;                 // the class overlay turns on after Check
  updateControls();
  FP.announce(res.message + ' ' + scoreLabel() + '. Class overlay on.');
  if (res.status === 'retry') rpmInput.elt.focus();
  else nextButton.elt.focus();
}

function advance() {
  if (!runner.next()) return;
  const st = runner.state();
  resetPoint();
  updateControls();
  if (st.phase === 'done') {
    const s = runner.summary();
    const misses = ITEMS.filter((it, i) => !firstTry[i]);
    FP.announce('All 6 checked. ' + scoreLabel() + '. ' +
      (s.mastered ? FP.msg.masteryReached(MASTERY, ITEMS.length) : FP.msg.masteryNeeds(MASTERY, ITEMS.length, REVIEW)) +
      (misses.length ? ' Not right on the first attempt: ' + misses.map(it => it.duty + ': ' + it.answerText + '.').join(' ') : ''));
    restartButton.elt.focus();
  } else {
    FP.announce('Duty point ' + (st.index + 1) + ' of 6: ' + st.item.duty + '. Class overlay off.');
    rpmInput.elt.focus();
  }
}

function resetPoint() {
  rpmInput.value('');
  bhpInput.value('');
  selClass = null;
  lastRes = null;
  lastParts = null;
  invalidMsg = '';
  overlay = false;                // off again when the next duty point loads
  checkedOnce = false;
}

function startOver() {
  runner.restart();
  firstTry.fill(false);
  resetPoint();
  pinned = [];
  fInput.value('');
  updateControls();
  FP.announce('Start over. Duty point 1 of 6: ' + ITEMS[0].duty + '. ' + PROMPT);
  rpmInput.elt.focus();
}

function toggleOverlay() {
  if (!overlayAllowed()) return;
  overlay = !overlay;
  updateControls();
  FP.announce('Class overlay ' + (overlay ? 'on' : 'off') + '.');
}

function overlayAllowed() {
  return checkedOnce || runner.state().phase === 'done';
}

function toggleScratch() {
  scratchOpen = !scratchOpen;
  updateControls();
  FP.announce('Scratch panel ' + (scratchOpen ? 'open' : 'closed') + '.');
}

function togglePin(r, c) {
  const i = pinned.findIndex(p => p[0] === r && p[1] === c);
  if (i >= 0) pinned.splice(i, 1);
  else { pinned.push([r, c]); if (pinned.length > 4) pinned.shift(); }
  if (!scratchOpen) { scratchOpen = true; updateControls(); }
  FP.announce((i >= 0 ? 'Unpinned ' : 'Pinned ') + cellWords(r, c) + '.');
}

function cellWords(r, c) {
  return FP.fmt.num(CFM[r]) + ' CFM at ' + SP[c] + ' inches: ' + RPM[r][c] + ' RPM, ' + BHP[r][c].toFixed(2) + ' BHP';
}

function moveCursor(dr, dc) {
  cursor = [constrain(cursor[0] + dr, 0, 4), constrain(cursor[1] + dc, 0, 7)];
  kbdCursor = true;
  FP.announce(cellWords(cursor[0], cursor[1]) + (overlay ? ', Class ' + classFor(RPM[cursor[0]][cursor[1]]) : '') + '.');
}

function mouseMoved() { kbdCursor = false; }

function mousePressed() {
  const cell = cellAt(mouseX, mouseY);
  if (cell) { cursor = cell.slice(); togglePin(cell[0], cell[1]); }
}

function enterKey() {
  const st = runner.state();
  if (document.activeElement === fInput.elt) return;
  if (st.phase === 'question') checkAnswer();
  else if (st.phase === 'resolved') advance();
  else if (st.phase === 'done') startOver();
}

function updateControls() {
  if (!restartButton) return;
  const st = runner.state();
  const had = document.activeElement;
  const q = st.phase === 'question';
  const done = st.phase === 'done';
  for (const inp of [rpmInput, bhpInput]) {
    inp.elt.disabled = !q;
    inp.style('display', done ? 'none' : '');
  }
  classBtns.forEach((b, i) => {
    b.attribute('aria-pressed', String(selClass === [22, 32, 45][i]));
    K.setEnabled(b, q);
    if (done) b.hide(); else b.show();
  });
  K.setEnabled(checkButton, q);
  nextButton.html(st.isLast ? 'Show summary' : 'Next duty point');
  K.setEnabled(nextButton, st.phase === 'resolved');
  if (done) { checkButton.hide(); nextButton.hide(); } else { checkButton.show(); nextButton.show(); }
  overlayButton.attribute('aria-pressed', String(overlay));
  K.setEnabled(overlayButton, overlayAllowed());
  scratchButton.attribute('aria-expanded', String(scratchOpen));
  scratchButton.html(scratchOpen ? 'Close scratch panel' : 'Scratch panel');
  fInput.style('display', scratchOpen ? '' : 'none');
  positionControls();
  K.keepFocus(had, [rpmInput, bhpInput, ...classBtns, checkButton, nextButton, overlayButton, scratchButton, restartButton]);
}

function windowResized() {
  updateCanvasSize();
  relayout();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
