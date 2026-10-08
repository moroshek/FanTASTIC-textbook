// Fan Selection Workflow - Mermaid flowchart with a card-sorting check
// CANVAS_HEIGHT: 1096
// Every one of the 12 steps carries a Mermaid `click` directive that opens its explanation.
// Learners then assign 8 information cards (fixed order, one attempt each) to the step that uses them.
// Built on the FanPedia kit: FP.CardDeck (card flow, score, mastery), FP.msg, FP.ui, FP.tok, FP.announce.
// Job values on the cards (1,450 RPM; 1,180/1,780 RPM; 500°F / 70°F; 95 dB; 10 ft by 8 ft pad)
// are the chapter's illustrative worked example, not catalog data.
(function () {
  'use strict';

  const SIM_ID = 'ch27-fan-selection-workflow';
  const CHAPTER_URL = '../../chapters/27-fan-selection-and-writing-the-specification/';

  // Phases: name for the key, kit series token for the node outline (tinted for the fill).
  const PHASES = {
    duty:   { name: 'Define the duty', series: 1 },
    fan:    { name: 'Choose the fan', series: 4 },
    config: { name: 'Configure it', series: 2 },
    prove:  { name: 'Prove and compare', series: 3 },
    doc:    { name: 'Document', series: 5 }
  };

  const STEPS = [
    null,
    { label: 'Application requirements', phase: 'duty',
      info: 'Collect airflow, pressure, airstream conditions, space, noise and efficiency limits before choosing anything.' },
    { label: 'Correct duty point to standard air', phase: 'duty',
      info: 'Divide the required static pressure by the density ratio so it can be read from a standard-air catalog table.' },
    { label: 'Fan family and impeller', phase: 'fan',
      info: 'Choose the impeller the airstream allows: clean air permits airfoil or backward curved, dusty air pushes toward radial tip or radial bladed.' },
    { label: 'Size and speed from catalog', phase: 'fan',
      info: 'Read the size, RPM and standard-air brake horsepower from the current catalog performance table.' },
    { label: 'Arrangement', phase: 'config',
      info: 'Decide where impeller, bearings and motor sit; hot or dirty air favors bearings out of the airstream.' },
    { label: 'Drive', phase: 'config',
      info: 'Choose belt drive or direct drive so the fan turns at the speed the table requires.' },
    { label: 'Construction', phase: 'config',
      info: 'Choose pressure class, materials, temperature package and spark resistance.' },
    { label: 'Motor and cold start', phase: 'config',
      info: 'Size the motor for the densest air the fan will ever start in.' },
    { label: 'Accessories', phase: 'config',
      info: 'Add the parts the application needs: dampers, liners, doors, drains, bases, isolators, flex connectors.' },
    { label: 'Sound and dimension check', phase: 'prove',
      info: 'Compare octave band sound data with the noise limit and the dimension table with the space.' },
    { label: 'Compare candidates', phase: 'prove',
      info: 'Weigh two or three candidate fans on performance, construction and accessories.' },
    { label: 'Description and specification', phase: 'doc',
      info: 'Write the complete fan description and the specification, then review both.' }
  ];
  const NSTEPS = STEPS.length - 1;

  // Edge labels from the spec: i -> i+1
  const EDGE_LABELS = [null, 'duty point', 'airstream', 'standard-air duty', 'size', 'motor location',
    'speed', 'temperature range', 'motor', 'complete fan', 'passes limits', 'chosen fan'];

  // Cards in fixed order (answer = step number); section = chapter section to reread when missed.
  const CARDS = [
    { id: 'elevation', text: 'The plant sits at 5,000 ft elevation.', answer: 2,
      why: 'Elevation changes air density, which changes the standard-air pressure you read from the table.',
      section: 'Fan Selection: From Duty Point to Catalog Size', anchor: 'fan-selection-from-duty-point-to-catalog-size' },
    { id: 'table-speed', text: 'The table speed of 1,450 RPM falls between the 1,180 and 1,780 RPM motor speeds.', answer: 6,
      why: 'Matching fan speed to motor speed is the drive decision.',
      section: 'Drive Selection', anchor: 'drive-selection' },
    { id: 'cold-start', text: 'On a winter startup the duct air is 70°F, not 500°F.', answer: 8,
      why: 'Cold air is denser and takes more power, so it sizes the motor.',
      section: 'Cold Start Motor Sizing', anchor: 'cold-start-motor-sizing' },
    { id: 'hot-bearings', text: 'The bearings must stay out of the 500°F gas.', answer: 5,
      why: 'The arrangement decides whether bearings sit in or out of the airstream.',
      section: 'Arrangement Selection', anchor: 'arrangement-selection' },
    { id: 'sticky-dust', text: 'The dust is sticky and abrasive.', answer: 3,
      why: 'Dust that builds up or erodes rules out airfoil and backward curved wheels.',
      section: 'Impeller Selection', anchor: 'impeller-selection' },
    { id: 'isolators', text: 'The fan sits on spring isolators on a mezzanine.', answer: 9,
      why: 'Isolators, an isolation base and flex connectors are accessories.',
      section: 'Accessory Selection', anchor: 'accessory-selection' },
    { id: 'noise-limit', text: 'The owner limits outlet sound to 95 dB A-weighted sound power.', answer: 10,
      why: 'A noise limit is checked against the octave band sound data.',
      section: 'Octave Band Sound Data', anchor: 'octave-band-sound-data' },
    { id: 'pad-size', text: 'The fan must fit a 10 ft by 8 ft pad.', answer: 10,
      why: 'A space limit is checked against the dimension table.',
      section: 'Dimensional Data Table', anchor: 'dimensional-data-table' }
  ];

  const MASTERY = 7;   // spec: mastery is a score >= 7 of 8 on the first attempt
  const PROMPT = 'Which step uses this information?';

  function stepName(n) { return 'step ' + n + ', ' + STEPS[n].label; }
  const $ = id => document.getElementById(id);

  // Light fill derived from a kit token (mix with white), so no ad-hoc hex values.
  // Returned as #rrggbb: Mermaid classDef splits on commas, so rgb() cannot be used.
  function tint(color, f) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(color).trim());
    if (!m) return color;
    const v = parseInt(m[1], 16);
    const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(c => Math.round(c + (255 - c) * f));
    return '#' + ch.map(c => c.toString(16).padStart(2, '0')).join('');
  }
  function phaseColors(key) {
    const stroke = FP.tok('series-' + PHASES[key].series);
    return { stroke: stroke, fill: tint(stroke, 0.86) };
  }

  // Card flow, scoring and mastery come from the kit engine. The spec fixes the order
  // (no shuffle), one attempt per card, and Start over with the cards in the same order.
  const deck = new FP.CardDeck({
    cards: CARDS, shuffle: false, attempts: 1, retryMissed: false,
    noun: 'Cards', mastery: MASTERY, id: SIM_ID,
    label: answer => stepName(answer)
  });

  // The spec's own feedback wording wins over the §4.2 defaults:
  // Correct "Right: <Why>."  Incorrect "Not quite. This belongs to <correct step>: <Why>."
  function specMessage(res) {
    const c = res.card;
    if (res.status === 'correct') return FP.msg.OK + ' Right: ' + c.why;
    return FP.msg.BAD + ' Not quite. This belongs to ' + stepName(c.answer) + ': ' + c.why;
  }

  // ------------------------------------------------------------------ diagram
  function buildMermaid() {
    const lines = ['flowchart TD'];
    for (let i = 1; i <= NSTEPS; i++) {
      lines.push(`    S${i}["${i} · ${STEPS[i].label}"]:::${STEPS[i].phase}`);
    }
    for (let i = 1; i < NSTEPS; i++) {
      lines.push(`    S${i} -->|"${EDGE_LABELS[i]}"| S${i + 1}`);
    }
    lines.push('    S10 -. "fails space or noise: revise" .-> S5');
    // One click directive per node: each opens that step's explanation.
    for (let i = 1; i <= NSTEPS; i++) {
      lines.push(`    click S${i} fswShowStep`);
    }
    const text = FP.tok('text');
    for (const key of Object.keys(PHASES)) {
      const c = phaseColors(key);
      lines.push(`    classDef ${key} fill:${c.fill},stroke:${c.stroke},stroke-width:2px,color:${text},font-size:16px`);
    }
    lines.push(`    linkStyle default stroke:${FP.tok('edge')},stroke-width:2px`);
    // The revise loop: book orange (non-text accent), dashed, so it is not read as "incorrect".
    lines.push(`    linkStyle ${NSTEPS - 1} stroke:${FP.tok('accent')},stroke-width:2px`);
    return lines.join('\n');
  }

  function buildLegend() {
    const ul = $('legend');
    const ranges = {};
    for (let i = 1; i <= NSTEPS; i++) {
      const p = STEPS[i].phase;
      ranges[p] = ranges[p] || [i, i];
      ranges[p][1] = i;
    }
    for (const key of Object.keys(PHASES)) {
      const c = phaseColors(key);
      const li = document.createElement('li');
      const sw = document.createElement('i');
      sw.style.background = c.fill;
      sw.style.borderColor = c.stroke;
      sw.setAttribute('aria-hidden', 'true');
      const r = ranges[key];
      li.appendChild(sw);
      li.appendChild(document.createTextNode(PHASES[key].name + ' (' +
        (r[0] === r[1] ? r[0] : r[0] + '–' + r[1]) + ')'));
      li.setAttribute('aria-label', PHASES[key].name + ': ' +
        (r[0] === r[1] ? 'step ' + r[0] : 'steps ' + r[0] + ' to ' + r[1]));
      ul.appendChild(li);
    }
  }

  function nodeEl(n) {
    for (const el of document.querySelectorAll('#diagram .node')) {
      const m = el.id.match(/flowchart-(S\d+)-\d+$/);
      if (m && m[1] === 'S' + n) return el;
    }
    return null;
  }

  // Mermaid writes classDef styles inline with !important, so highlights are applied
  // to the node shape the same way and restored from the saved original style.
  // Correct is solid with a ✓ marker, wrong is dashed with a ✗ marker: never colour alone.
  function hlStyle(cls) {
    switch (cls) {
      case 'hl-focus': return { stroke: FP.tok('primary'), 'stroke-width': '3px', 'stroke-dasharray': '6 3' };
      case 'hl-info': return { stroke: FP.tok('primary'), 'stroke-width': '4px' };
      case 'hl-correct': return { stroke: FP.tok('correct'), 'stroke-width': '5px', fill: FP.tok('correct-bg'), 'stroke-dasharray': 'none' };
      case 'hl-wrong': return { stroke: FP.tok('incorrect'), 'stroke-width': '5px', fill: FP.tok('incorrect-bg'), 'stroke-dasharray': '9 4' };
    }
    return {};
  }
  const HL_ORDER = ['hl-focus', 'hl-info', 'hl-wrong', 'hl-correct'];  // later wins
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function shapeOf(el) { return el.querySelector('rect, polygon, path'); }

  // ✓ / ✗ marker left of the node, drawn as a stroked SVG path so it never falls
  // back to a colour-emoji font. Shape and colour both differ: never colour alone.
  const MARK_PATH = { ok: 'M-16,0 L-10,6 L0,-7', bad: 'M-14,-6 L-2,6 M-2,-6 L-14,6' };
  function setMarker(el) {
    let mk = el.querySelector('.fsw-marker');
    const kind = el.classList.contains('hl-correct') ? 'ok'
      : el.classList.contains('hl-wrong') ? 'bad' : '';
    if (!kind) { if (mk) mk.remove(); return; }
    const shape = shapeOf(el);
    if (!mk) {
      mk = document.createElementNS(SVG_NS, 'path');
      mk.setAttribute('class', 'fsw-marker');
      mk.setAttribute('aria-hidden', 'true');
      el.appendChild(mk);
    }
    const bb = shape.getBBox();
    mk.setAttribute('d', MARK_PATH[kind]);
    mk.setAttribute('transform', 'translate(' + (bb.x - 6) + ',' + (bb.y + bb.height / 2) + ')');
    // Mermaid's own stylesheet styles node children, so set the stroke the same way.
    const c = kind === 'ok' ? FP.tok('correct') : FP.tok('incorrect');
    for (const [k, v] of [['fill', 'none'], ['stroke', c], ['stroke-width', '3.5px'],
      ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']]) mk.style.setProperty(k, v, 'important');
  }

  function paintNode(el) {
    const shape = shapeOf(el);
    if (!shape) return;
    if (shape.dataset.origStyle === undefined) shape.dataset.origStyle = shape.getAttribute('style') || '';
    shape.setAttribute('style', shape.dataset.origStyle);
    for (const cls of HL_ORDER) {
      if (!el.classList.contains(cls)) continue;
      for (const [prop, val] of Object.entries(hlStyle(cls))) shape.style.setProperty(prop, val, 'important');
    }
    setMarker(el);
  }

  function addHighlight(el, cls) { if (el) { el.classList.add(cls); paintNode(el); } }

  function clearHighlights(cls) {
    document.querySelectorAll('#diagram .node.' + cls).forEach(el => { el.classList.remove(cls); paintNode(el); });
  }

  // Called by the Mermaid click directives (securityLevel: 'loose'); sim-prefixed global.
  // Exploration only: it never touches the score.
  window.fswShowStep = function (nodeId) {
    const n = parseInt(String(nodeId).replace(/^S/, ''), 10);
    if (!STEPS[n]) return;
    clearHighlights('hl-info');
    const el = nodeEl(n);
    addHighlight(el, 'hl-info');
    const box = $('stepInfo');
    box.classList.add('info');
    box.innerHTML = '';
    const t = document.createElement('div');
    t.className = 'fsw-si-title';
    t.textContent = 'Step ' + n + ': ' + STEPS[n].label;
    const p = document.createElement('div');
    p.textContent = STEPS[n].info;
    box.appendChild(t);
    box.appendChild(p);
    FP.announce(t.textContent + '. ' + STEPS[n].info);
    positionInfo(el);
  };

  // Y-follow: place the explanation card level with the clicked node, kept below the
  // sorting controls and inside the panel. Re-run whenever the controls change size.
  // In the stacked narrow layout the card is in normal flow instead.
  let infoNode = null;
  function positionInfo(el) {
    if (el !== undefined) infoNode = el;
    const box = $('stepInfo');
    if (getComputedStyle(box).position !== 'absolute') { box.style.top = ''; return; }
    const panel = document.querySelector('.fsw-ctrl').getBoundingClientRect();
    const above = $('keyNote').getBoundingClientRect();
    const minTop = above.bottom - panel.top + 8;
    const maxTop = Math.max(minTop, panel.height - box.offsetHeight - 10);
    let desired = minTop;
    if (infoNode) {
      const r = infoNode.getBoundingClientRect();
      desired = r.top + r.height / 2 - panel.top - box.offsetHeight / 2;
    }
    box.style.top = Math.max(minTop, Math.min(maxTop, desired)) + 'px';
  }

  // ------------------------------------------------------------------ activity
  function render() {
    const st = deck.state();
    const sel = $('stepSelect');
    $('score').textContent = st.scoreLabel;
    FP.ui.progress($('progress'), st.results, st.phase === 'summary' ? -1 : st.index, 'Card');
    $('cardNum').textContent = 'Card ' + (st.index + 1) + ' of ' + CARDS.length;
    $('cardText').textContent = st.card.text;
    sel.disabled = st.phase !== 'choose';
    $('submitBtn').hidden = st.phase === 'summary';
    $('submitBtn').disabled = st.phase !== 'choose' || !sel.value;
    $('nextBtn').hidden = st.phase !== 'feedback' || st.isLast;
    $('prompt').textContent = st.phase === 'summary' ? 'All ' + CARDS.length + ' cards sorted.' : PROMPT;
    positionInfo();
  }

  function showCard() {
    $('stepSelect').value = '';
    $('feedback').className = 'fp-feedback';
    $('feedback').textContent = '';
    clearHighlights('hl-correct');
    clearHighlights('hl-wrong');
    render();
  }

  function submitAnswer() {
    const chosen = parseInt($('stepSelect').value, 10);
    if (!chosen) return;
    const res = deck.place(chosen);
    if (res.status === 'ignored') return;
    const msg = specMessage(res);
    if (res.status !== 'correct') addHighlight(nodeEl(chosen), 'hl-wrong');
    addHighlight(nodeEl(res.card.answer), 'hl-correct');
    FP.ui.feedback($('feedback'), res.kind, msg, { announce: false });
    if (deck.state().isLast) {
      deck.next();   // last card: go straight to the summary
      showFinal(msg);
    } else {
      FP.announce(msg);
      render();
      $('nextBtn').focus();
    }
  }

  function showFinal(lastMsg) {
    const s = deck.summary();
    const fb = $('feedback');
    fb.className = 'fp-feedback final';
    fb.innerHTML = '';
    const line = (text, cls) => {
      const d = document.createElement('div');
      d.className = 'fsw-final-line' + (cls ? ' ' + cls : '');
      if (text) d.textContent = text;
      fb.appendChild(d);
      return d;
    };
    line('Card ' + CARDS.length + ': ' + lastMsg);
    // Spec: final message shows "n of 8 correct"; the mastery line is the kit's §4.2 wording.
    const scoreText = s.firstAttempt + ' of ' + s.total + ' correct.';
    line(scoreText, 'fsw-final-score');
    const spoken = [lastMsg, scoreText];
    if (s.mastered) {
      const m = FP.msg.masteryReached(s.mastery, s.total);
      line(m);
      spoken.push(m);
    } else {
      const missed = [];
      s.misses.forEach(m => { if (!missed.some(x => x.anchor === m.card.anchor)) missed.push(m.card); });
      const p = line('');
      p.appendChild(document.createTextNode(FP.msg.masteryNeeds(s.mastery, s.total) +
        ' Reread these sections, then try again: '));
      missed.forEach((m, i) => {
        const a = document.createElement('a');
        a.href = CHAPTER_URL + '#' + m.anchor;
        a.target = '_top';
        a.textContent = m.section;
        p.appendChild(a);
        if (i < missed.length - 1) p.appendChild(document.createTextNode('; '));
      });
      p.appendChild(document.createTextNode('.'));
      spoken.push(p.textContent);
    }
    FP.announce(spoken.join(' '));
    render();
    $('startOver').focus();
  }

  function startOver() {
    deck.newRound();   // same fixed order: shuffle is off and no seed
    showCard();
  }

  function setupControls() {
    const sel = $('stepSelect');
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Choose a step…';
    sel.appendChild(ph);
    for (let i = 1; i <= NSTEPS; i++) {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = i + ' · ' + STEPS[i].label;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      $('submitBtn').disabled = deck.state().phase !== 'choose' || !sel.value;
    });
    $('submitBtn').addEventListener('click', submitAnswer);
    $('nextBtn').addEventListener('click', () => { if (deck.next()) showCard(); });
    $('startOver').addEventListener('click', startOver);
    // Enter submits the chosen step, then goes to the next card. Buttons and
    // flowchart nodes handle their own Enter.
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.defaultPrevented) return;
      const t = e.target;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'A' || (t.closest && t.closest('#diagram')))) return;
      const st = deck.state();
      if (st.phase === 'choose' && sel.value) { e.preventDefault(); submitAnswer(); }
      else if (st.phase === 'feedback') { e.preventDefault(); if (deck.next()) { showCard(); sel.focus(); } }
    });
    window.addEventListener('resize', () => positionInfo());
  }

  // Keyboard access: Tab to a step, Enter or Space opens its explanation.
  function setupNodeKeyboard() {
    for (let i = 1; i <= NSTEPS; i++) {
      const el = nodeEl(i);
      if (!el) continue;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Step ' + i + ': ' + STEPS[i].label);
      el.addEventListener('focus', () => addHighlight(el, 'hl-focus'));
      el.addEventListener('blur', () => { el.classList.remove('hl-focus'); paintNode(el); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.fswShowStep('S' + i); }
      });
    }
  }

  async function init() {
    buildLegend();
    setupControls();
    showCard();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',   // required for click callbacks
      theme: 'default',
      themeVariables: { fontSize: '16px', fontFamily: FP.FONT },
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis',
                   nodeSpacing: 30, rankSpacing: 18, padding: 6, wrappingWidth: 330 }
    });
    const host = $('diagram');
    const pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = buildMermaid();
    host.appendChild(pre);
    await mermaid.run({ nodes: [pre] });
    setupNodeKeyboard();
    positionInfo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
