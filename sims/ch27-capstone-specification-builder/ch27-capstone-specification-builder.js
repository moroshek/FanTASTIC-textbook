// Capstone Specification Builder - p5.js MicroSim
// CANVAS_HEIGHT: 840
// Chapter 27: Fan Selection and Writing the Specification (Capstone).
// The learner composes the dryer exhaust fan specification: one option for each of ten
// attributes plus a one-sentence justification for each. Check evaluates all fifteen
// violation rules and four advisories together and lists each message beside its attribute.
// Completion = ten choices, ten non-empty justifications, zero violations; the sim then
// composes the complete fan description (worked-example format) with the justifications.
// Unlimited checks; the number of checks to completion and the justifications are recorded
// (FP.events), not scored.
// Built on the FanPedia kit: FP.events, FP.announce, FP.msg, FP.p5 (layout, text, buttons,
// focus). No numeric model is computed here; the RPM and BHP values are the chapter's.
// Needs ../shared-libs/: fanpedia-sim.css, fanpedia-core.js, fanpedia-p5.js
// (load them before this file, also in the p5.js editor).

const K = FP.p5;
const SIM_ID = 'ch27-capstone-specification-builder';

// ---------- Canvas layout ----------
let canvasWidth = 800;
const drawHeight = 725;
const controlHeight = K.controlHeightFor(3);
const canvasHeight = drawHeight + controlHeight;

// ---------- Content (spec "Content") ----------
const APPLICATION = 'Dryer exhaust: 20,000 ACFM at 12.0 in. wg; 500°F gas; sea level; moderately sticky, abrasive, ' +
  'combustible wood dust; process needs reduced flow during warm-up; fan on spring isolators on a mezzanine; ' +
  'outlet duct leaves the top of the fan horizontally to the right, viewed from the drive side; cold start at ' +
  '70°F; selected speed 1,450 RPM; cold-start load 96.0 BHP; hot load 53.0 BHP.';
const PROMPT = 'Build a specification that a factory could build and a reviewer could approve.';
const DATA_NOTE = FP.msg.note('Illustrative worked example (Chapter 27)',
  'Rules: FanPedia pp. 110, 162-166, 171, 187; TCF Model RTF guide spec 23 34 16');

const ATTRS = [
  { name: 'Impeller / model', options: [['RTF', 'RTF radial tip'], ['RBO', 'RBO open radial paddle'],
    ['HIB', 'HIB backward curved'], ['HAF', 'HAF airfoil']] },
  { name: 'Arrangement', options: [['1', 'Arrangement 1'], ['4', 'Arrangement 4'], ['8', 'Arrangement 8'],
    ['9', 'Arrangement 9'], ['9F', 'Arrangement 9F']] },
  { name: 'Drive', options: [['belt', 'Belt drive'], ['direct', 'Direct coupled at 1,780 RPM without VFD'],
    ['vfd', 'Direct coupled with VFD set to 1,450 RPM']] },
  { name: 'Rotation and discharge', options: [['CW THD', 'CW THD'], ['CCW THD', 'CCW THD'],
    ['CW UBD', 'CW UBD'], ['CCW BHD', 'CCW BHD']] },
  { name: 'Motor', options: [['60', '60 HP'], ['75', '75 HP'], ['100', '100 HP'], ['125', '125 HP']] },
  { name: 'Temperature package', options: [['none', 'None'], ['300', 'To 300°F'],
    ['500', 'To 500°F (grease, bearings, shaft seal, shaft cooler)'], ['600', 'To 600°F']] },
  { name: 'Spark resistance', options: [['none', 'None'], ['A', 'AMCA Type A'], ['B', 'AMCA Type B'],
    ['C', 'AMCA Type C']] },
  { name: 'Abrasion protection', options: [['none', 'None'], ['welded', 'Welded 7-gauge scroll liner'],
    ['bolt', 'Bolt-on scroll liner']] },
  { name: 'Flow control', options: [['none', 'None'], ['damper', 'Parallel blade outlet damper with actuator'],
    ['nested', 'Nested inlet vanes']] },
  { name: 'Base and isolation', options: [['unitary', 'Unitary base, no isolators'],
    ['iso', 'Isolation base with spring isolators and flex connectors'],
    ['springs', 'Spring isolators without flex connectors']] }
];
const IMP = 0, ARR = 1, DRIVE = 2, ROT = 3, MOTOR = 4, TEMP = 5, SPARK = 6, ABR = 7, FLOW = 8, BASE = 9;

// Violations: `attr` is where the message is listed; `when(v)` gets the chosen values (null = unchosen).
// Every check lists the full `msg`: the builder is for revising a design, so each conflict is explained.
const VIOLATIONS = [
  { id: 'V1', attr: IMP, when: v => ['HIB', 'HAF'].includes(v[IMP]),
    msg: 'Backward curved and airfoil wheels need clean air or light dust; moderately sticky, abrasive dust like the dryer dust builds up and erodes them.' },
  { id: 'V2', attr: ARR, when: v => v[ARR] === '4',
    msg: 'Arrangement 4 is limited at high airstream temperature; FanPedia lists 1, 8, 9, 9F and 10 for high temperature.' },
  { id: 'V3', attr: ARR, when: v => v[ARR] === '9F',
    msg: 'Arrangement 9F cannot be used on this job: the fan must sit on isolators, and FanPedia says 9F is not suitable for spring isolators. Choose Arrangement 1, 8 or 9.' },
  { id: 'V4', attr: DRIVE, when: v => ['1', '9', '9F'].includes(v[ARR]) && ['direct', 'vfd'].includes(v[DRIVE]),
    msg: 'Arrangements 1, 9 and 9F are belt-driven here; use Arrangement 8 for a coupled direct drive.' },
  { id: 'V5', attr: DRIVE, when: v => ['4', '8'].includes(v[ARR]) && v[DRIVE] === 'belt',
    msg: 'Arrangements 4 and 8 are direct drive arrangements.' },
  { id: 'V6', attr: DRIVE, when: v => v[DRIVE] === 'direct',
    msg: '1,780/1,450 = 1.23: 23% too much air and about 1.85 times the power.' },
  { id: 'V7', attr: ROT, when: v => v[ROT] != null && v[ROT] !== 'CW THD',
    msg: 'From the drive side, a top outlet blowing right is CW THD (CW 90).' },
  { id: 'V8', attr: MOTOR, when: v => ['60', '75'].includes(v[MOTOR]),
    msg: 'The 70°F start draws 96.0 BHP; size the motor for the cold start.' },
  { id: 'V9', attr: TEMP, when: v => ['none', '300'].includes(v[TEMP]),
    msg: 'The gas is 500°F; the 500°F tier needs high temperature grease and bearings, shaft seal and shaft cooler.' },
  { id: 'V10', attr: SPARK, when: v => v[SPARK] === 'none',
    msg: 'Combustible dust requires spark-resistant construction.' },
  { id: 'V11', attr: SPARK, when: v => ['A', 'B'].includes(v[SPARK]),
    msg: 'Types A and B are limited to 250°F; use Type C.' },
  { id: 'V12', attr: ABR, when: v => ['none', 'bolt'].includes(v[ABR]),
    msg: 'Abrasive dust needs a liner, and the guide specification does not accept bolt-on liners.' },
  { id: 'V13', attr: FLOW, when: v => v[FLOW] === 'none' && v[DRIVE] != null && v[DRIVE] !== 'vfd',
    msg: 'The process needs turndown; add an outlet damper or use the VFD.' },
  { id: 'V14', attr: FLOW, when: v => v[FLOW] === 'nested',
    msg: 'Nested vanes suit clean air; dirty airstreams call for external vanes or an outlet damper.' },
  { id: 'V15', attr: BASE, when: v => ['unitary', 'springs'].includes(v[BASE]),
    msg: 'The fan must be isolated, and FanPedia requires flex connectors on all isolated fans.' }
];
const ADVISORIES = [
  { id: 'A1', attr: IMP, when: v => v[IMP] === 'RBO', msg: 'Acceptable for this dust; expect higher power than RTF.' },
  { id: 'A2', attr: ARR, when: v => ['1', '8'].includes(v[ARR]),
    msg: 'Longer assembly; check the dimension table against the 10 ft by 8 ft pad.' },
  { id: 'A3', attr: MOTOR, when: v => v[MOTOR] === '125',
    msg: 'Covers cold start with more margin than needed; 100 HP is sufficient.' },
  { id: 'A4', attr: TEMP, when: v => v[TEMP] === '600', msg: 'Exceeds the requirement; the 500°F tier is sufficient.' }
];

// ---------- State ----------
let checks = 0;               // Check presses (counted until completion)
let checkedAt = null;         // values + justifications at the last check
let lastCheck = null;         // {violations, advisories, unchosen, emptyJust, complete}
let completedChecks = null;   // checks needed to reach completion (first time)
let view = 'build';           // 'build' | 'description'
let page = 0;
let notice = null;            // {kind, message}
let layoutCache = null;

// ---------- Controls ----------
let selects = [], inputs = [];
let checkButton, descButton, copyButton, prevButton, nextButton, descArea;

function setup() {
  updateCanvasSize();
  K.config({ drawHeight, controlHeight });
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.querySelector('main'));
  const main = document.querySelector('main');

  ATTRS.forEach((a, i) => {
    const s = createSelect();
    s.parent(main);
    s.option('Choose…', '');
    a.options.forEach(o => s.option(o[1], o[0]));
    s.selected('');
    s.attribute('aria-label', (i + 1) + '. ' + a.name + ': option');
    s.changed(onEdit);
    selects.push(s);
    const t = createInput('');
    t.parent(main);
    t.attribute('placeholder', 'One-sentence justification');
    t.attribute('aria-label', (i + 1) + '. ' + a.name + ': justification');
    t.attribute('autocomplete', 'off');
    t.input(onEdit);
    inputs.push(t);
  });

  prevButton = K.button('◀ Previous attributes', () => turnPage(-1), { variant: 'secondary' });
  nextButton = K.button('More attributes ▶', () => turnPage(1), { variant: 'secondary' });
  checkButton = K.button('Check specification', checkSpec);
  descButton = K.button('Show fan description', toggleView, { variant: 'secondary' });
  copyButton = K.button('Copy description', copyDescription, { variant: 'secondary' });

  descArea = createElement('textarea');
  descArea.parent(main);
  descArea.attribute('readonly', '');
  descArea.attribute('aria-label', 'Complete fan description and justifications');
  descArea.addClass('csb-desc');
  descArea.hide();

  syncControls();

  describe('Capstone specification builder. An application card describes a 500°F dryer exhaust fan. ' +
    'Ten attributes, from impeller to base and isolation, each have a drop-down of options and a ' +
    'justification box. Check lists every rule violation and advisory beside its attribute; with all ten ' +
    'chosen, all ten justified and zero violations, the sim composes the complete fan description.');
}

// ---------- Values ----------
function values() { return selects.map(s => (s.value() === '' ? null : s.value())); }
function justs() { return inputs.map(t => String(t.value()).trim()); }
function optionLabel(i, v) { const o = ATTRS[i].options.find(x => x[0] === v); return o ? o[1] : ''; }

function evaluate() {
  const v = values(), j = justs();
  const violations = VIOLATIONS.filter(r => r.when(v));
  const advisories = ADVISORIES.filter(r => r.when(v));
  const unchosen = v.map((x, i) => (x == null ? i : null)).filter(x => x !== null);
  const emptyJust = j.map((x, i) => (x === '' ? i : null)).filter(x => x !== null);
  return { violations, advisories, unchosen, emptyJust,
    complete: !violations.length && !unchosen.length && !emptyJust.length };
}

function snapshot() { return JSON.stringify([values(), justs()]); }
function stale() { return lastCheck && checkedAt !== snapshot(); }

// ---------- Layout (pages of attribute rows) ----------
function wide() { return canvasWidth >= 620; }
const TX = 46;

function headerLayout() {
  const ts = wide() ? 14 : 13, lead = wide() ? 18 : 17;
  textSize(ts);
  const cardLines = K.countLines('Application: ' + APPLICATION, canvasWidth - 40);
  const cardY = 42, cardH = cardLines * lead + 12;
  const promptY = cardY + cardH + 8;
  textStyle(BOLD); textSize(wide() ? 15 : 14);
  const heading = view === 'description' ? 'Complete fan description' : PROMPT;
  const hlines = wide() ? K.wrapLines(heading, canvasWidth - 20 - 140).slice(0, 2)
    : K.wrapLines(heading, canvasWidth - 20).slice(0, 3);
  textStyle(NORMAL);
  return { ts, lead, cardY, cardH, promptY, hlines, listTop: promptY + hlines.length * 19 + (wide() ? 8 : 24) };
}

function rowMessages(i) {
  if (!lastCheck) return [];
  const out = [];
  lastCheck.violations.filter(r => r.attr === i).forEach(r => out.push({ kind: 'bad',
    text: FP.msg.BAD + ' ' + r.msg }));
  lastCheck.advisories.filter(r => r.attr === i).forEach(r => out.push({ kind: 'info', text: 'ℹ Advisory: ' + r.msg }));
  return out;
}

function rowBlock(i) {
  const w = wide();
  const lead = w ? 18 : 17;
  textSize(w ? 14 : 13);
  const msgW = canvasWidth - TX - 16;
  let body = w ? 30 : 18 + 32 + 32;       // wide: one control line; narrow: label, select, input
  let msgs = 0;
  rowMessages(i).forEach(m => { msgs += K.countLines(m.text, msgW) * lead; });
  const msgTop = 6 + body + 2;
  const h = 6 + body + (msgs ? msgs + 6 : 0) + 8;
  return { h, msgTop, msgW, lead };
}

function wideCols() {
  const labelW = min(170, floor(canvasWidth * 0.22));
  const x1 = TX + labelW;
  const selW = floor((canvasWidth - 20 - x1) * 0.42);
  return { labelW, selX: x1, selW, inX: x1 + selW + 8, inW: canvasWidth - 18 - (x1 + selW + 8) };
}

function computeLayout() {
  const hd = headerLayout();
  const listBottom = drawHeight - 86;
  const avail = listBottom - hd.listTop;
  const pages = [[]];
  let used = 0;
  for (let i = 0; i < ATTRS.length; i++) {
    const b = rowBlock(i);
    if (used + b.h > avail && pages[pages.length - 1].length) { pages.push([]); used = 0; }
    pages[pages.length - 1].push({ i, b });
    used += b.h;
  }
  return { hd, pages, listBottom };
}

function layoutKey() { return [canvasWidth, view, page, checks].join('|'); }
function invalidate() { layoutCache = null; }

function refreshLayout() {
  const key = layoutKey();
  if (layoutCache && layoutCache.key === key) return layoutCache;
  const L = computeLayout();
  if (page > L.pages.length - 1) page = L.pages.length - 1;
  L.key = layoutKey();
  const pos = {};
  let y = L.hd.listTop;
  for (const r of L.pages[page]) { pos[r.i] = y; y += r.b.h; }
  L.pos = pos;
  const onPage = new Set(L.pages[page].map(r => r.i));
  const w = wide(), c = wideCols();
  ATTRS.forEach((a, i) => {
    const s = selects[i], t = inputs[i];
    if (view !== 'build' || !onPage.has(i)) { s.hide(); t.hide(); return; }
    s.show(); t.show();
    if (w) {
      s.position(c.selX, pos[i] + 5); s.size(c.selW);
      t.position(c.inX, pos[i] + 5); t.size(c.inW);
    } else {
      s.position(TX, pos[i] + 6 + 18 + 2); s.size(canvasWidth - TX - 16);
      t.position(TX, pos[i] + 6 + 18 + 34); t.size(canvasWidth - TX - 16);
    }
  });
  if (view === 'description') {
    descArea.show();
    descArea.position(10, L.hd.listTop);
    descArea.size(canvasWidth - 20, L.listBottom - L.hd.listTop);
  } else {
    descArea.hide();
  }
  layoutCache = L;
  syncPageButtons(L);
  return L;
}

// ---------- Controls ----------
let hintRow = 1;
function syncControls() {
  const done = completedChecks !== null && lastCheck && lastCheck.complete && !stale();
  if (done) descButton.show(); else descButton.hide();
  if (view === 'description') { copyButton.show(); checkButton.hide(); } else { copyButton.hide(); checkButton.show(); }
  descButton.html(view === 'description' ? 'Back to attributes' : 'Show fan description');
  invalidate();
  refreshLayout();
  positionButtons();
}

function syncPageButtons(L) {
  const many = view === 'build' && L.pages.length > 1;
  if (many) { prevButton.show(); nextButton.show(); } else { prevButton.hide(); nextButton.hide(); }
  K.setEnabled(prevButton, page > 0, { keepFocus: true });
  K.setEnabled(nextButton, page < L.pages.length - 1, { keepFocus: true });
  positionButtons();
}

function positionButtons() {
  const r = K.flowButtons(0, [checkButton, descButton, copyButton]);
  hintRow = K.flowButtons(r, [prevButton, nextButton]);
}

function turnPage(d) {
  const L = refreshLayout();
  const np = constrain(page + d, 0, L.pages.length - 1);
  if (np === page) return;
  page = np;
  invalidate();
  const L2 = refreshLayout();
  const nums = L2.pages[page].map(r => r.i + 1);
  FP.announce('Showing attributes ' + nums[0] + ' to ' + nums[nums.length - 1] + ' of ' + ATTRS.length + '.');
  selects[nums[0] - 1].elt.focus();
}

function onEdit() {
  notice = null;
  if (lastCheck && lastCheck.complete && stale()) syncControls();   // hides "Show fan description"
}

// ---------- Check ----------
function checkSpec() {
  checks++;
  const res = evaluate();
  lastCheck = res;
  checkedAt = snapshot();
  notice = null;
  const v = values();
  FP.events.emit('answered', { source: SIM_ID, itemId: 'check-' + checks, index: checks - 1,
    value: { choices: v, violations: res.violations.map(r => r.id), advisories: res.advisories.map(r => r.id),
      unchosen: res.unchosen.length, emptyJustifications: res.emptyJust.length },
    correct: res.complete, attempt: checks, final: res.complete, scored: true });
  if (res.complete && completedChecks === null) {
    completedChecks = checks;
    FP.events.emit('completed', { source: SIM_ID, firstAttempt: checks === 1 ? 1 : 0, correct: 1, total: 1,
      mastered: true, checks, choices: v, justifications: justs() });
    FP.events.emit('mastery', { source: SIM_ID, total: 1 });
  }
  if (res.complete) {
    descArea.value(composeDescription());
    view = 'description';
    page = 0;
  } else {
    // show the page with the first flagged attribute
    const first = firstFlagged(res);
    invalidate();
    const L = refreshLayout();
    const pi = L.pages.findIndex(p => p.some(r => r.i === first));
    page = pi >= 0 ? pi : 0;
  }
  syncControls();
  FP.announce(statusLines().join(' ') + (res.complete ? ' The complete fan description is shown.' : ''));
  if (res.complete) descArea.elt.focus();
}

function firstFlagged(res) {
  const idx = [].concat(res.violations.map(r => r.attr), res.unchosen, res.emptyJust);
  return idx.length ? min(idx) : 0;
}

function toggleView() {
  view = view === 'description' ? 'build' : 'description';
  page = 0;
  syncControls();
  FP.announce(view === 'description' ? 'Complete fan description.' : 'Attributes.');
  (view === 'description' ? descArea : selects[0]).elt.focus();
}

function copyDescription() {
  const text = descArea.value();
  let ok = false;
  try {
    descArea.elt.focus();
    descArea.elt.select();
    ok = document.execCommand('copy');
  } catch (e) { ok = false; }
  if (ok) { setNotice('ok', 'Copied the description to the clipboard.'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => setNotice('ok', 'Copied the description to the clipboard.'),
      () => setNotice('info', 'The text is selected: press Ctrl+C (Cmd+C on a Mac) to copy it.'));
  } else {
    setNotice('info', 'The text is selected: press Ctrl+C (Cmd+C on a Mac) to copy it.');
  }
}
function setNotice(kind, message) { notice = { kind, message }; FP.announce(message); }

// ---------- Composed description (worked-example format) ----------
function composeDescription() {
  const v = values(), j = justs();
  const model = v[IMP] === 'RTF' ? 'Twin City Fan Model RTF radial tip fan, Class 18, size per selection'
    : 'Twin City Fan Model RBO open radial paddle fan, size and class per selection';
  const drive = v[DRIVE] === 'belt' ? 'belt driven' : 'direct coupled with a VFD set to 1,450 RPM';
  const motorPos = { '9': 'motor on left side of pedestal', '1': 'motor mounted separately on its own base',
    '8': 'motor on the extended pedestal, coupled to the fan shaft' }[v[ARR]] || '';
  const temp = v[TEMP] === '600'
    ? 'high temperature package to 600°F with high temperature grease and bearings, shaft seal and shaft cooler'
    : 'high temperature package to 500°F with high temperature grease and bearings, shaft seal and shaft cooler';
  const acc = [];
  if (v[FLOW] === 'damper') acc.push('parallel blade outlet damper with electric actuator, rated 301°F to 600°F');
  if (v[DRIVE] === 'belt') acc.push('OSHA belt guard');
  acc.push('isolation base with spring isolators');
  acc.push('inlet and outlet flex connectors rated for 500°F');
  const lines = [
    'One (1) ' + model + ', Arrangement ' + v[ARR] + ', ' + drive + ', CW THD (CW 90), ' + motorPos + '. ' +
    'Duty: 20,000 ACFM at 12.0 in. wg static pressure, 500°F, sea level (0.0414 lb/ft³). ' +
    'Motor: ' + v[MOTOR] + ' HP, TEFC, 460 V, 3 phase, 60 Hz, sized for cold start at 70°F' +
    (v[DRIVE] === 'vfd' ? ', premium efficiency, inverter duty' : '') + '. ' +
    'Construction: ' + temp + '; AMCA Type C spark-resistant construction; welded 7-gauge scroll liner. ' +
    'Accessories: ' + acc.join('; ') + '.' +
    (v[FLOW] === 'none' ? ' Flow control: turndown by VFD speed.' : ''),
    '',
    'Justifications:'
  ];
  ATTRS.forEach((a, i) => lines.push((i + 1) + '. ' + a.name + ' (' + optionLabel(i, v[i]) + '): ' + j[i]));
  lines.push('');
  lines.push('Checks to completion: ' + completedChecks + '.');
  return lines.join('\n');
}

// ---------- Status ----------
function statusLines() {
  if (!lastCheck) {
    const n = values().filter(x => x != null).length, m = justs().filter(x => x !== '').length;
    return ['Chosen: ' + n + ' of 10 · Justified: ' + m + ' of 10 · Checks: 0',
      'Choose an option and write a one-sentence justification for each attribute, then press Check specification.'];
  }
  const r = lastCheck;
  const lines = [];
  if (r.complete) {
    lines.push(FP.msg.OK + ' Specification complete: ten attributes, zero conflicts, ' + checks + ' check' +
      (checks === 1 ? '' : 's') + '.');
    if (r.advisories.length) lines.push(r.advisories.length + ' advisor' + (r.advisories.length === 1 ? 'y' : 'ies') +
      ' noted (they do not block completion).');
  } else {
    lines.push('Check ' + checks + ': ' + r.violations.length + ' violation' + (r.violations.length === 1 ? '' : 's') +
      ', ' + r.advisories.length + ' advisor' + (r.advisories.length === 1 ? 'y' : 'ies') + '.');
    const missing = [];
    if (r.unchosen.length) missing.push('choose an option for ' + r.unchosen.map(i => i + 1).join(', '));
    if (r.emptyJust.length) missing.push('write a justification for ' + r.emptyJust.map(i => i + 1).join(', '));
    if (missing.length) lines.push('Still to do: ' + missing.join('; ') + '.');
    else if (r.violations.length) lines.push('Revise the flagged attributes and check again.');
  }
  if (stale()) lines.push('Changed since the last check: press Check specification again.');
  else if (completedChecks !== null && !r.complete) lines.push('Completion recorded earlier at ' + completedChecks + ' checks.');
  return lines;
}

// ---------- Drawing ----------
function draw() {
  K.regions(drawHeight, controlHeight);
  const L = refreshLayout();
  const w = wide(), hd = L.hd;
  K.title('Capstone Specification Builder');

  K.panel(10, hd.cardY, canvasWidth - 20, hd.cardH, { fill: '--fp-primary-bg', stroke: '--fp-border', radius: 6 });
  noStroke(); fill(FP.tok('text')); textSize(hd.ts); textAlign(LEFT, TOP);
  K.wrapText('Application: ' + APPLICATION, 20, hd.cardY + 6, canvasWidth - 40, hd.lead);

  textStyle(BOLD); textSize(w ? 15 : 14); fill(FP.tok('text')); textAlign(LEFT, TOP);
  hd.hlines.forEach((ln, k) => text(ln, 10, hd.promptY + k * 19));
  textStyle(NORMAL);
  if (view === 'build' && L.pages.length > 1) {
    const nums = L.pages[page].map(r => r.i + 1);
    textSize(13); fill(FP.tok('text-muted')); textAlign(RIGHT, TOP);
    text('Attributes ' + nums[0] + '–' + nums[nums.length - 1] + ' of 10', canvasWidth - 10, w ? hd.promptY + 2 : hd.promptY + hd.hlines.length * 19);
  }

  if (view === 'build') {
    let y = hd.listTop;
    for (const r of L.pages[page]) { drawRow(r.i, y, r.b); y += r.b.h; }
  }
  drawStatus(L.listBottom + 4);
  K.note(DATA_NOTE, { y: drawHeight - 8 });
  drawHint();
}

function drawRow(i, y, b) {
  const w = wide();
  const msgs = rowMessages(i);
  const bad = msgs.some(m => m.kind === 'bad');
  const checked = !!lastCheck;
  const v = values()[i];
  const opts = { radius: 6 };
  if (checked && bad) { opts.fill = '--fp-incorrect-bg'; opts.stroke = '--fp-incorrect'; opts.dashed = true; opts.weight = 2; }
  K.panel(10, y, canvasWidth - 20, b.h - 6, opts);
  // status glyph (after a check), number and attribute name
  noStroke(); textSize(w ? 14 : 13); textAlign(RIGHT, TOP);
  if (checked && bad) { fill(FP.tok('incorrect')); text(FP.msg.BAD, 26, y + 11); }
  else if (checked && v != null && !msgs.length) { fill(FP.tok('correct')); text(FP.msg.OK, 26, y + 11); }
  else if (checked && msgs.length) { fill(FP.tok('text')); text('ℹ', 26, y + 11); }
  fill(FP.tok('text')); textStyle(BOLD);
  text((i + 1) + '.', TX - 4, y + 11 - (w ? 0 : 5));
  textAlign(LEFT, TOP);
  const name = ATTRS[i].name;
  if (w) {
    const c = wideCols();
    const lines = K.wrapLines(name, c.labelW - 8);
    if (lines.length > 1) { textSize(13); text(lines.slice(0, 2).join('\n'), TX, y + 4); }
    else text(name, TX, y + 11);
  } else {
    text(name, TX, y + 6);
  }
  textStyle(NORMAL);
  // messages
  let my = y + b.msgTop;
  textSize(w ? 14 : 13);
  for (const m of msgs) {
    fill(m.kind === 'bad' ? FP.tok('incorrect') : FP.tok('text'));
    my = K.wrapText(m.text, TX, my, b.msgW, b.lead);
  }
}

function drawStatus(y) {
  const h = drawHeight - 26 - y;
  const lines = notice ? [notice.message] : statusLines();
  const done = lastCheck && lastCheck.complete && !notice;
  const style = notice ? (notice.kind === 'ok' ? { fill: '--fp-correct-bg', stroke: '--fp-correct', weight: 2, radius: 6 }
    : { fill: '--fp-info-bg', stroke: '--fp-border', radius: 6 })
    : (done ? { stroke: '--fp-primary', weight: 3, radius: 6 } : { radius: 6 });
  K.panel(10, y, canvasWidth - 20, h, style);
  const tw = canvasWidth - 40;
  const ts = K.fitTextSize(t => {
    let hh = 0;
    lines.forEach(m => { hh += K.countLines(m, tw) * round(t * 1.3); });
    return hh;
  }, h - 10, wide() ? 15 : 14, 12);
  let yy = y + 5;
  noStroke(); textAlign(LEFT, TOP);
  lines.forEach((m, k) => {
    textStyle(k === 0 ? BOLD : NORMAL);
    fill(done && k === 0 ? FP.tok('primary') : (notice && notice.kind === 'ok' ? FP.tok('correct') : FP.tok('text')));
    yy = K.wrapText(m, 20, yy, tw, round(ts * 1.3), { maxLines: 2 });
  });
  textStyle(NORMAL);
}

function drawHint() {
  if (hintRow > 2) return;
  noStroke(); fill(FP.tok('text-muted')); textSize(13); textAlign(LEFT, CENTER);
  const hint = 'Keys: Tab moves through each option, justification and button; arrow keys change a drop-down.';
  const short = 'Tab: next control; arrows: change a drop-down.';
  text(textWidth(hint) < canvasWidth - 20 ? hint : short, 10, K.controlLabel(hintRow));
}

// ---------- Responsive sizing ----------
function windowResized() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  invalidate();
  refreshLayout();
  positionButtons();
}

function updateCanvasSize() {
  canvasWidth = K.updateCanvasSize(320);
}
