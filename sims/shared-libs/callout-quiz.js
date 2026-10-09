/* FanPedia MicroSim kit: callout-quiz.js  (FP.CalloutQuiz)  version 3
 *
 * Explore-then-quiz engine for labeled diagrams (review pattern D), extracted from
 * ch03-exploded-centrifugal-fan (build/choose/answer/showSummary).
 *
 *   Explore mode  one infobox at a time, visited count, never scored.
 *   Quiz mode     labels hidden, prompts in fixed, seeded-shuffle or learner-chosen order,
 *                 1..n attempts, the answer is highlighted after a miss, first-attempt score,
 *                 mastery threshold.
 *   Summary       first-attempt score, mastery line, missed and later-attempt lists with Why,
 *                 Start over, optional Retry missed (practice, not scored), Back to explore.
 *
 * Two layers:
 *   FP.CalloutQuiz.State  pure state machine, no DOM (runs under Node; p5 sims can drive it
 *                         with their own hit testing).
 *   FP.CalloutQuiz.mount  binds a State to any container whose part elements carry
 *                         data-part="<id>" (SVG groups, hotspot polygons over an <image>,
 *                         or HTML spans). Optional label elements carry data-label-for="<id>".
 *
 * Plain browser script: no modules, no build step, safe to load twice and in any order.
 * Reads FP.tok / FP.announce / FP.events only when they exist.
 */
(function (G) {
  'use strict';
  var FP = G.FP = G.FP || {};
  var VERSION = 3;
  if (FP.CalloutQuiz && FP.CalloutQuiz.version >= VERSION) {
    if (typeof module !== 'undefined' && module.exports) module.exports = FP.CalloutQuiz;
    return;
  }

  // ---------- Tokens (review §4.1) ----------
  var TOKENS = {
    '--fp-primary': '#3f51b5', '--fp-primary-dark': '#303f9f', '--fp-primary-bg': '#e8eaf6',
    '--fp-accent': '#f57c00', '--fp-accent-text': '#a84300',
    '--fp-correct': '#2e7d32', '--fp-correct-bg': '#e8f5e9',
    '--fp-incorrect': '#c62828', '--fp-incorrect-bg': '#ffebee',
    '--fp-info-bg': '#eef2f7', '--fp-text': '#263238', '--fp-text-muted': '#546e7a',
    '--fp-border': '#c0c0c0'
  };
  function tok(name) {
    if (typeof FP.tok === 'function') return FP.tok(name);
    return TOKENS[name];
  }

  // ---------- Messages (review §4.2); every entry can be overridden via opts.msg ----------
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  // " <text>" with closing punctuation added when missing (matches FP.msg in fanpedia-core.js).
  function sentence(s) {
    s = s == null ? '' : String(s).trim();
    if (!s) return '';
    return ' ' + (/[.!?:)]$/.test(s) ? s : s + '.');
  }
  var MSG = {
    exploreLabel: 'Explore mode',
    quizLabel: 'Quiz',
    explorePrompt: 'Select any part to see what it does. When you are ready, choose Quiz.',
    exploreEmpty: 'No part selected. Select a part on the drawing to open its infobox.',
    quizIntro: function (c) {
      return c.kind === 'choose'
        ? 'Labels are hidden. Choose the name of the highlighted part. You have ' + plural(c.attempts, 'attempt') + ' per prompt.'
        : 'Labels are hidden. Select the part on the drawing that matches each prompt. You have ' + plural(c.attempts, 'attempt') + ' per prompt.';
    },
    freeIntro: 'Select any part that is not answered yet, then choose its answer.',
    visited: function (n, N) { return 'Visited ' + n + ' of ' + N; },
    progress: function (k, N) { return 'Prompt ' + k + ' of ' + N; },
    answered: function (k, N) { return 'Answered ' + k + ' of ' + N; },
    // score(noun, n, N, counts): n follows opts.scoreLabel; counts = {correct,
    // firstAttempt, total} (v3) so an override can show either count. noun is
    // '' with opts.bareLabel.
    score: function (noun, n, N) { return (noun ? noun + ' correct' : 'Correct') + ': ' + n + ' of ' + N; },
    // v3, opts.scoreLabel 'first' with the default score message.
    scoreFirst: function (noun, n, N) { return (noun ? noun + ' correct' : 'Correct') + ' on the first attempt: ' + n + ' of ' + N; },
    attempt: function (a, A) { return 'Attempt ' + a + ' of ' + A; },
    correct: function (c) { return '✓ Correct: ' + c.answerLabel + '.' + sentence(c.why); },
    retry: function (c) {
      return '✗ Not quite.' + sentence(c.clickedLabel ? 'That is the ' + c.clickedLabel + '.' : '') +
        sentence(c.hint) + ' Try again (' + plural(c.attemptsLeft, 'attempt') + ' left).';
    },
    missed: function (c) {
      return '✗ Not quite.' + sentence(c.clickedLabel ? 'That is the ' + c.clickedLabel + '.' : '') +
        ' The answer is ' + c.answerLabel + '.' + sentence(c.wrongNote) + sentence(c.why) +
        ' This one counts as missed.';
    },
    practicePrefix: 'Practice (not scored): ',
    complete: 'Quiz complete. Review the summary below.',
    firstAttempt: function (n, N) { return 'First-attempt score: ' + n + ' of ' + N; },
    masteryReached: function (M, N) { return 'Mastery reached (' + M + ' of ' + N + ' needed).'; },
    masteryNeeds: function (M, N, pointer) { return 'Mastery needs ' + M + ' of ' + N + ' on the first attempt.' + sentence(pointer); },
    reviewPointer: 'Review the parts below in Explore mode, then start over.',
    missedHeading: 'Missed:',
    laterHeading: 'Correct after a second attempt:',
    noneMissed: 'No prompts missed.',
    practiceDone: 'Practice round finished. Your first-attempt score does not change.',
    next: 'Next prompt',
    seeSummary: 'See summary',
    startOver: 'Start over',
    retryMissed: 'Retry missed',
    backToExplore: 'Back to explore',
    quizAria: function (k) { return 'Part ' + k; },
    badgeAnswer: 'Answer'
  };

  function emit(name, data) {
    if (FP.events && typeof FP.events.emit === 'function') FP.events.emit(name, data);
  }

  // ---------- Seeded shuffle (mulberry32; same algorithm the review names for FP.rng) ----------
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seed) {
    var a = arr.slice(), r = mulberry32(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- Pure helpers for building prompt tables ----------
  // Locate prompts from the parts table: "Click the <label>." (or any template / function).
  function promptsFromParts(parts, o) {
    o = o || {};
    var tpl = o.template || 'Select the {label}.';
    return parts.map(function (p) {
      var text = typeof tpl === 'function' ? tpl(p) : tpl.replace('{label}', p.label).replace('{text}', p.text || '');
      return { prompt: text, answer: p.id, why: o.why === false ? '' : (p.why || p.text || '') };
    });
  }
  // Name prompts (inverse quiz): the part is highlighted and the learner picks its name.
  function namePrompts(parts, o) {
    o = o || {};
    var choices = parts.map(function (p) { return { id: p.id, label: p.label }; });
    return parts.map(function (p) {
      return { prompt: o.prompt || 'Which part is highlighted?', target: p.id, choices: choices, answer: p.id, why: p.text || '' };
    });
  }

  // ---------- State machine ----------
  function State(opts) {
    if (!(this instanceof State)) return new State(opts);
    opts = opts || {};
    var self = this;
    var parts = opts.parts || [];
    if (!parts.length) throw new Error('CalloutQuiz: parts table is empty');
    this.parts = parts;
    this.byId = {};
    parts.forEach(function (p, i) {
      if (!p.id || !p.label) throw new Error('CalloutQuiz: part ' + i + ' needs id and label');
      if (self.byId[p.id]) throw new Error('CalloutQuiz: duplicate part id "' + p.id + '"');
      self.byId[p.id] = p;
    });

    this.quizEnabled = opts.quiz !== false;
    this.exploreSetting = opts.explore === undefined ? true : opts.explore; // true | false | 'after'
    var raw = this.quizEnabled ? (opts.prompts || promptsFromParts(parts)) : [];
    this.prompts = raw.map(function (q, i) { return self._normalize(q, i); });
    var N = this.prompts.length;
    this.attempts = opts.attempts || 2;
    this.mastery = opts.mastery != null ? opts.mastery : Math.ceil(0.8 * N);
    if (this.quizEnabled && (this.mastery < 1 || this.mastery > N)) {
      throw new Error('CalloutQuiz: mastery ' + this.mastery + ' is outside 1..' + N);
    }
    this.order = opts.order || 'fixed'; // 'fixed' | 'shuffle' | 'free'
    if (['fixed', 'shuffle', 'free'].indexOf(this.order) < 0) throw new Error('CalloutQuiz: unknown order "' + this.order + '"');
    if (this.order === 'free') {
      this.prompts.forEach(function (q) {
        if (q.kind !== 'choose') throw new Error('CalloutQuiz: order "free" needs choose prompts (target + choices)');
      });
    }
    this.seed = opts.seed != null ? (opts.seed >>> 0) : Math.floor(Math.random() * 4294967296);
    this.reshuffle = opts.reshuffle !== false;
    this.id = opts.id || 'callout-quiz';
    this.round = 0;
    this.everCompleted = false;
    this.visited = {};
    this.selected = null;
    this._resetQuiz();
    this.mode = 'explore';
    if (!this.quizEnabled && this.exploreSetting === false) throw new Error('CalloutQuiz: explore and quiz are both off');
    if (this.quizEnabled && this.exploreSetting !== true) this.startQuiz();
  }

  State.prototype._normalize = function (q, i) {
    var kind = q.choices ? 'choose' : 'locate';
    var out = {
      index: i, id: q.id, kind: kind, prompt: q.prompt || '', answer: q.answer, why: q.why || '',
      hint: q.hint || '', wrong: q.wrong || {}, target: q.target || null, choices: null
    };
    if (kind === 'locate') {
      if (!this.byId[q.answer]) throw new Error('CalloutQuiz: prompt ' + i + ' answer "' + q.answer + '" is not a part id');
    } else {
      if (!this.byId[q.target]) throw new Error('CalloutQuiz: prompt ' + i + ' target "' + q.target + '" is not a part id');
      out.choices = q.choices.map(function (c) { return typeof c === 'string' ? { id: c, label: c } : c; });
      var ok = out.choices.some(function (c) { return c.id === q.answer; });
      if (!ok) throw new Error('CalloutQuiz: prompt ' + i + ' answer "' + q.answer + '" is not one of its choices');
    }
    return out;
  };

  State.prototype._resetQuiz = function () {
    this.sequence = this.prompts.map(function (q) { return q.index; });
    this.pos = 0;
    this.cur = this.sequence.length ? this.sequence[0] : -1;
    this.attempt = 0;
    this.locked = false;
    this.picks = [];        // [{id, correct}] for the current prompt
    this.results = {};      // promptIndex -> 'first' | 'later' | 'missed'
    this.revealed = {};     // partId -> true (label shown during the quiz)
    this.practiceResults = {};
    this.practiceQueue = null;
  };

  State.prototype.exploreAvailable = function () {
    return this.exploreSetting === true || (this.exploreSetting === 'after' && this.everCompleted) || !this.quizEnabled;
  };

  State.prototype.setMode = function (m) {
    if (m === 'quiz') { this.startQuiz(); return this.mode; }
    if (m === 'explore') {
      if (!this.exploreAvailable()) return this.mode;
      this.mode = 'explore';
      this.selected = null;
      return this.mode;
    }
    throw new Error('CalloutQuiz: setMode accepts "explore" or "quiz"');
  };

  // Explore: open one infobox at a time. Allowed in explore and summary modes; never scored.
  State.prototype.visit = function (id) {
    if (!this.byId[id]) return null;
    if (this.mode !== 'explore' && this.mode !== 'summary') return null;
    this.selected = id;
    this.visited[id] = true;
    return this.byId[id];
  };
  State.prototype.visitedCount = function () { return Object.keys(this.visited).length; };
  // Clear the explore visits (and the open infobox). Never touches quiz results.
  State.prototype.resetVisited = function () {
    this.visited = {};
    if (this.mode === 'explore' || this.mode === 'summary') this.selected = null;
    return this;
  };

  State.prototype.startQuiz = function () {
    if (!this.quizEnabled) return null;
    this._resetQuiz();
    this.round += 1;
    if (this.order === 'shuffle') {
      var s = this.reshuffle ? (this.seed + this.round - 1) >>> 0 : this.seed;
      this.sequence = seededShuffle(this.sequence, s);
      this.cur = this.sequence[0];
    }
    this.mode = 'quiz';
    this.selected = null;
    return this.current();
  };

  State.prototype.current = function () {
    if (this.mode !== 'quiz' && this.mode !== 'practice') return null;
    return this.cur >= 0 ? this.prompts[this.cur] : null;
  };

  // Free order: pick which unanswered prompt to work on (e.g. by its target part).
  State.prototype.select = function (promptIndex) {
    if (this.order !== 'free' || this.mode !== 'quiz') return null;
    if (this.attempt > 0 && !this.locked) return null; // finish the open item first
    if (this.results[promptIndex] !== undefined || !this.prompts[promptIndex]) return null;
    this.cur = promptIndex; this.attempt = 0; this.locked = false; this.picks = [];
    return this.prompts[promptIndex];
  };
  State.prototype.promptForTarget = function (partId) {
    for (var i = 0; i < this.prompts.length; i++) if (this.prompts[i].target === partId) return this.prompts[i];
    return null;
  };

  // Answer the current prompt with a part id (locate) or a choice id (choose).
  State.prototype.answer = function (id) {
    var q = this.current();
    if (!q) return { status: 'ignored', reason: 'no-prompt' };
    var practice = this.mode === 'practice';
    if (this.order === 'free' && !practice && this.results[q.index] !== undefined) return { status: 'ignored', reason: 'answered' };
    if (this.locked) return { status: 'ignored', reason: 'locked' };
    var valid = q.kind === 'locate' ? !!this.byId[id] : q.choices.some(function (c) { return c.id === id; });
    if (!valid) return { status: 'ignored', reason: 'not-a-target' }; // empty space uses no attempt
    this.attempt += 1;
    var correct = id === q.answer;
    this.picks.push({ id: id, correct: correct });
    var status;
    if (correct) status = 'correct';
    else if (this.attempt < this.attempts) status = 'retry';
    else status = 'missed';
    var store = practice ? this.practiceResults : this.results;
    if (status !== 'retry') {
      this.locked = true;
      store[q.index] = status === 'missed' ? 'missed' : (this.attempt === 1 ? 'first' : 'later');
      this.revealed[q.kind === 'locate' ? q.answer : q.target] = true;
    }
    emit('answered', {
      source: this.id, itemId: q.id != null ? q.id : q.index, index: q.index, value: id, correct: correct,
      attempt: this.attempt, final: status !== 'retry', scored: !practice
    });
    return {
      status: status, correct: correct, chosen: id, answer: q.answer, prompt: q, promptIndex: q.index,
      attempt: this.attempt, attempts: this.attempts, attemptsLeft: this.attempts - this.attempt,
      firstAttempt: this.attempt === 1, scored: !practice, practice: practice,
      score: this.score(), last: status !== 'retry' && this._remaining() === 0
    };
  };

  State.prototype._remaining = function () {
    var self = this;
    if (this.mode === 'practice') return this.practiceQueue.length - 1 - this.pos;
    if (this.order === 'free') return this.prompts.filter(function (q) { return self.results[q.index] === undefined; }).length;
    return this.sequence.length - 1 - this.pos;
  };

  // Move on after a resolved prompt. Returns the next prompt, or null when the round is done.
  State.prototype.next = function () {
    if (this.mode !== 'quiz' && this.mode !== 'practice') return null;
    if (!this.locked) return this.current();
    this.attempt = 0; this.locked = false; this.picks = [];
    if (this.mode === 'practice') {
      this.pos += 1;
      if (this.pos >= this.practiceQueue.length) { this.mode = 'summary'; this.cur = -1; return null; }
      this.cur = this.practiceQueue[this.pos];
      return this.current();
    }
    if (this.order === 'free') {
      var n = this.prompts.length;
      for (var k = 1; k <= n; k++) {
        var i = (this.cur + k) % n;
        if (this.results[i] === undefined) { this.cur = i; return this.current(); }
      }
      return this._finish();
    }
    this.pos += 1;
    if (this.pos >= this.sequence.length) return this._finish();
    this.cur = this.sequence[this.pos];
    return this.current();
  };
  State.prototype._finish = function () {
    this.mode = 'summary'; this.cur = -1; this.everCompleted = true; this.selected = null;
    var sm = this.summary();
    emit('completed', { source: this.id, firstAttempt: sm.firstCorrect, correct: sm.correct, total: sm.total, mastered: sm.masteryReached });
    if (sm.masteryReached) emit('mastery', { source: this.id, total: sm.total });
    return null;
  };

  State.prototype.score = function () {
    var r = this.results, n = 0;
    Object.keys(r).forEach(function (k) { if (r[k] === 'first') n += 1; });
    return n;
  };
  // Correct on any attempt (the running status line, like FP.Score.label).
  State.prototype.correctCount = function () {
    var r = this.results, n = 0;
    Object.keys(r).forEach(function (k) { if (r[k] !== 'missed') n += 1; });
    return n;
  };
  State.prototype.answeredCount = function () { return Object.keys(this.results).length; };

  State.prototype.summary = function () {
    var self = this, missed = [], later = [];
    this.sequence.forEach(function (i) {
      if (self.results[i] === 'missed') missed.push(self.prompts[i]);
      else if (self.results[i] === 'later') later.push(self.prompts[i]);
    });
    var n = this.score(), N = this.prompts.length;
    return {
      firstCorrect: n, correct: this.correctCount(), total: N, mastery: this.mastery, masteryReached: n >= this.mastery,
      missed: missed, later: later, results: Object.assign({}, this.results), round: this.round
    };
  };

  // Retry missed: a practice pass over the missed prompts; it never changes the score.
  State.prototype.startPractice = function () {
    if (this.mode !== 'summary') return null;
    var self = this;
    var q = this.sequence.filter(function (i) { return self.results[i] === 'missed'; });
    if (!q.length) return null;
    this.practiceQueue = q; this.pos = 0; this.cur = q[0];
    this.attempt = 0; this.locked = false; this.picks = []; this.practiceResults = {};
    this.mode = 'practice';
    return this.current();
  };

  // Start over: a fresh scored round (reshuffled when order is "shuffle").
  State.prototype.restart = function () { return this.startQuiz(); };

  // Whether a part's label is visible. Callers pass hideLabels (default true).
  State.prototype.labelVisible = function (id, hideLabels) {
    if (this.mode === 'explore' || this.mode === 'summary') return true;
    if (hideLabels === false) return true;
    return !!this.revealed[id];
  };

  // ---------- Keyboard Tab order (pure) ----------
  // Elements in Tab order: the ids in tabOrder first (each id's elements in DOM
  // order), then every other part element in DOM order. domEls: [{id, el}].
  function tabSequence(domEls, tabOrder) {
    var out = [], used = [];
    (tabOrder || []).forEach(function (id) {
      domEls.forEach(function (d) { if (d.id === id && used.indexOf(d.el) < 0) { out.push(d.el); used.push(d.el); } });
    });
    domEls.forEach(function (d) { if (used.indexOf(d.el) < 0) { out.push(d.el); used.push(d.el); } });
    return out;
  }

  // ---------- Message builder (pure) ----------
  function messageFor(res, state, msg) {
    msg = msg || MSG;
    var q = res.prompt, isLocate = q.kind === 'locate';
    var labelOf = function (id) {
      if (isLocate) return state.byId[id].label;
      for (var i = 0; i < q.choices.length; i++) if (q.choices[i].id === id) return q.choices[i].label;
      return id;
    };
    var c = {
      answerLabel: labelOf(q.answer), why: q.why, hint: q.wrong[res.chosen] || q.hint,
      wrongNote: q.wrong[res.chosen] || '', clickedLabel: isLocate && !res.correct ? labelOf(res.chosen) : '',
      chosenLabel: labelOf(res.chosen),
      clickedText: isLocate && !res.correct ? (state.byId[res.chosen].text || '') : '',
      answerText: isLocate ? (state.byId[q.answer].text || '') : (state.byId[q.target].text || ''),
      attemptsLeft: res.attemptsLeft, attempt: res.attempt, attempts: res.attempts,
      prompt: q
    };
    var text = msg[res.status](c);
    if (res.practice) text = msg.practicePrefix + text;
    return text;
  }

  // ---------- DOM layer ----------
  var STYLE_ID = 'fp-callout-quiz-style';
  function css() {
    var v = function (n) { return 'var(' + n + ',' + tok(n) + ')'; };
    return [
      '.fp-cq-ui{font-family:Arial,Helvetica,sans-serif;color:' + v('--fp-text') + ';}',
      '.fp-cq-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 6px;}',
      '.fp-cq-toolbar .fp-cq-title{font-weight:bold;font-size:15px;margin-right:auto;}',
      '.fp-cq-status{font-size:14px;color:' + v('--fp-text-muted') + ';}',
      '.fp-cq-btn{font:14px Arial,Helvetica,sans-serif;padding:5px 12px;border:1px solid ' + v('--fp-primary') + ';background:#fff;color:' + v('--fp-primary') + ';border-radius:6px;cursor:pointer;}',
      '.fp-cq-btn[aria-pressed="true"],.fp-cq-btn.fp-cq-primary{background:' + v('--fp-primary') + ';color:#fff;}',
      '.fp-cq-btn:hover{border-color:' + v('--fp-primary-dark') + ';}',
      '.fp-cq-btn:disabled{opacity:.5;cursor:not-allowed;}',
      '.fp-cq-btn:focus-visible,.fp-cq-prompt:focus-visible{outline:2px solid ' + v('--fp-primary') + ';outline-offset:2px;}',
      '.fp-cq-prompt{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;font-size:15px;background:' + v('--fp-primary-bg') + ';border-left:4px solid ' + v('--fp-primary') + ';padding:7px 10px;margin:0 0 6px;border-radius:0 8px 8px 0;}',
      '.fp-cq-prompt .fp-cq-q{flex:1 1 260px;}',
      '.fp-cq-prompt .fp-cq-mode{font-weight:bold;}',
      '.fp-cq-prompt .fp-cq-attempt{font-size:14px;color:' + v('--fp-text-muted') + ';white-space:nowrap;}',
      '.fp-cq-info{font-size:15px;line-height:1.4;border:1px solid ' + v('--fp-border') + ';border-radius:8px;padding:8px 10px;margin-top:6px;overflow-y:auto;box-sizing:border-box;background:#fff;}',
      '.fp-cq-info h3{margin:0 0 4px;font-size:17px;}',
      '.fp-cq-info p{margin:0 0 6px;}',
      '.fp-cq-info ul{margin:2px 0 6px;padding-left:20px;}',
      '.fp-cq-info .fp-cq-btn{margin:2px 6px 2px 0;}',
      '.fp-cq-actions{margin:0 0 6px;}',
      '.fp-cq-fb{padding:6px 8px;border-radius:6px;border:2px solid;}',
      '.fp-cq-fb.ok{color:' + v('--fp-correct') + ';background:' + v('--fp-correct-bg') + ';border-style:solid;}',
      '.fp-cq-fb.bad{color:' + v('--fp-incorrect') + ';background:' + v('--fp-incorrect-bg') + ';border-style:dashed;}',
      '.fp-cq-fb.info{color:' + v('--fp-text') + ';background:' + v('--fp-info-bg') + ';border-color:transparent;}',
      '.fp-cq-choices{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px;}',
      '.fp-cq-choices .fp-cq-btn:disabled{opacity:1;}',
      '.fp-cq-choices .fp-cq-btn.fp-cq-picked-ok{background:' + v('--fp-correct-bg') + ';color:' + v('--fp-correct') + ';border:2px solid ' + v('--fp-correct') + ';}',
      '.fp-cq-choices .fp-cq-btn.fp-cq-picked-bad{background:' + v('--fp-incorrect-bg') + ';color:' + v('--fp-incorrect') + ';border:2px dashed ' + v('--fp-incorrect') + ';}',
      '!.fp-cq-root{position:relative;}',
      '.fp-cq-part{cursor:pointer;}',
      '.fp-cq-part:hover,.fp-cq-part:focus{filter:brightness(1.06) drop-shadow(0 0 3px ' + v('--fp-primary') + ');}',
      '.fp-cq-part:focus{outline:none;}',
      '.fp-cq-part:focus-visible{outline:2px solid ' + v('--fp-primary') + ';outline-offset:2px;filter:drop-shadow(0 0 2px ' + v('--fp-primary') + ') drop-shadow(0 0 2px ' + v('--fp-primary') + ');}',
      '.fp-cq-part.fp-cq-selected{filter:drop-shadow(0 0 3px ' + v('--fp-primary') + ') drop-shadow(0 0 3px ' + v('--fp-primary') + ');}',
      '.fp-cq-part.fp-cq-target{filter:drop-shadow(0 0 4px ' + v('--fp-accent') + ') drop-shadow(0 0 3px ' + v('--fp-accent') + ');}',
      '.fp-cq-part.fp-cq-correct{filter:drop-shadow(0 0 4px ' + v('--fp-correct') + ') drop-shadow(0 0 2px ' + v('--fp-correct') + ');}',
      '.fp-cq-part.fp-cq-wrong{filter:drop-shadow(0 0 4px ' + v('--fp-incorrect') + ') drop-shadow(0 0 2px ' + v('--fp-incorrect') + ');}',
      '.fp-cq-part.fp-cq-answer{filter:drop-shadow(0 0 5px ' + v('--fp-accent') + ') drop-shadow(0 0 3px ' + v('--fp-accent') + ');}',
      '.fp-cq-label{transition:opacity .3s;}',
      '!.fp-cq-label.fp-cq-label-hidden{opacity:0 !important;visibility:hidden !important;}',
      '!.fp-cq-marks{position:absolute;inset:0;pointer-events:none;}',
      '!.fp-cq-badge{position:absolute;transform:translate(-50%,-50%);min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:10px;font:bold 13px/16px Arial,Helvetica,sans-serif;text-align:center;border:2px solid;background:#fff;white-space:nowrap;}',
      '!.fp-cq-badge.correct{color:' + v('--fp-correct') + ';border-color:' + v('--fp-correct') + ';border-style:solid;}',
      '!.fp-cq-badge.wrong{color:' + v('--fp-incorrect') + ';border-color:' + v('--fp-incorrect') + ';border-style:dashed;}',
      '!.fp-cq-badge.answer{color:' + v('--fp-accent-text') + ';border-color:' + v('--fp-accent') + ';border-style:solid;}',
      '!.fp-cq-badge.target{color:' + v('--fp-primary') + ';border-color:' + v('--fp-primary') + ';}',
      '!.fp-cq-badge.visited{min-width:18px;height:18px;font-size:12px;line-height:14px;color:' + v('--fp-text-muted') + ';border-color:' + v('--fp-border') + ';}',
      '!.fp-cq-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}'
    ].map(function (rule) {
      // Zero specificity, so fanpedia-sim.css and the sim's own rules win. Rules marked
      // with a leading "!" are functional (hidden labels, badges) and keep their weight.
      if (rule.charAt(0) === '!') return rule.slice(1);
      var i = rule.indexOf('{');
      return ':where(' + rule.slice(0, i) + ')' + rule.slice(i);
    }).join('\n');
  }
  function injectStyle(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    var s = doc.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css();
    // Prepend so fanpedia-sim.css and the sim's own styles win the cascade.
    doc.head.insertBefore(s, doc.head.firstChild);
  }

  function el(doc, tag, attrs, kids) {
    var e = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }

  // The running score line (pure; used by mount). Default: "<Noun> correct: n of N",
  // correct on any attempt. o = {msg, noun='Parts', scoreLabel: 'correct' | 'first',
  // bareLabel}. 'first' counts first-attempt correct; bareLabel drops the noun.
  // msg.score receives (noun, n, N, {correct, firstAttempt, total}).
  function scoreLine(state, o) {
    o = o || {};
    var msg = o.msg || MSG;
    var N = state.prompts.length;
    var counts = { correct: state.correctCount(), firstAttempt: state.score(), total: N };
    var first = o.scoreLabel === 'first';
    var nn = o.bareLabel ? '' : (o.noun || 'Parts');
    var n = first ? counts.firstAttempt : counts.correct;
    if (first && msg.score === MSG.score) return (msg.scoreFirst || MSG.scoreFirst)(nn, n, N, counts);
    return msg.score(nn, n, N, counts);
  }

  function mount(opts) {
    var doc = opts.document || G.document;
    var root = typeof opts.root === 'string' ? doc.querySelector(opts.root) : opts.root;
    if (!root) throw new Error('CalloutQuiz.mount: root element not found');
    if (root.namespaceURI === 'http://www.w3.org/2000/svg') throw new Error('CalloutQuiz.mount: root must be an HTML element that contains the <svg>, not the <svg> itself');
    var state = opts.state || new State(opts);
    var msg = Object.assign({}, MSG, opts.msg || {});
    var hideLabels = opts.hideLabels !== false;
    var exploreLabels = opts.exploreLabels || 'always'; // 'always' | 'hover'
    var noun = opts.scoreNoun || 'Parts';
    var hooks = { onModeChange: opts.onModeChange, onVisit: opts.onVisit, onAnswer: opts.onAnswer, onComplete: opts.onComplete };
    injectStyle(doc);

    // Part and label elements
    var partEls = {}, labelEls = {}, hover = null, domEls = [];
    Array.prototype.forEach.call(root.querySelectorAll('[data-part]'), function (e) {
      var id = e.getAttribute('data-part');
      if (!state.byId[id]) { console.warn('CalloutQuiz: element data-part="' + id + '" is not in the parts table; it is not clickable.'); return; }
      (partEls[id] = partEls[id] || []).push(e);
      domEls.push({ id: id, el: e });
    });
    if (opts.tabOrder) opts.tabOrder.forEach(function (id) {
      if (!state.byId[id]) console.warn('CalloutQuiz: tabOrder id "' + id + '" is not in the parts table; it is ignored.');
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-label-for]'), function (e) {
      var id = e.getAttribute('data-label-for');
      if (!state.byId[id]) { console.warn('CalloutQuiz: label data-label-for="' + id + '" is not in the parts table.'); return; }
      (labelEls[id] = labelEls[id] || []).push(e);
      e.classList.add('fp-cq-label');
    });
    state.parts.forEach(function (p) {
      if (!partEls[p.id]) console.warn('CalloutQuiz: part "' + p.id + '" has no element with data-part; it cannot be selected.');
    });

    // UI shell (callers may pass their own toolbar/prompt/info elements)
    root.classList.add('fp-cq-root');
    var ui = {};
    ui.toolbar = opts.toolbarEl || el(doc, 'div', { class: 'fp-cq-ui fp-cq-toolbar' });
    if (opts.title && !opts.toolbarEl) ui.toolbar.appendChild(el(doc, 'span', { class: 'fp-cq-title', text: opts.title }));
    ui.btnExplore = el(doc, 'button', { type: 'button', class: 'fp-btn fp-cq-btn', text: msg.exploreLabel.replace(/ mode$/, '') });
    ui.btnQuiz = el(doc, 'button', { type: 'button', class: 'fp-btn fp-cq-btn', text: msg.quizLabel });
    ui.status = el(doc, 'span', { class: 'fp-score fp-cq-status' });
    if (state.exploreSetting !== false && state.quizEnabled) ui.toolbar.appendChild(ui.btnExplore);
    if (state.quizEnabled) ui.toolbar.appendChild(ui.btnQuiz);
    ui.toolbar.appendChild(ui.status);
    ui.prompt = opts.promptEl || el(doc, 'div', { class: 'fp-cq-ui fp-cq-prompt', tabindex: '-1' });
    ui.info = opts.infoEl || el(doc, 'div', { class: 'fp-cq-ui fp-panel fp-cq-info' });
    if (!opts.infoEl) ui.info.style.height = (opts.infoHeight || 150) + 'px';
    ui.live = el(doc, 'div', { class: 'fp-cq-sr', 'aria-live': 'polite', role: 'status' });
    ui.marks = el(doc, 'div', { class: 'fp-cq-marks', 'aria-hidden': 'true' });
    root.appendChild(ui.marks);
    if (!opts.toolbarEl) root.parentNode.insertBefore(ui.toolbar, root);
    if (!opts.promptEl) root.parentNode.insertBefore(ui.prompt, root);
    if (!opts.infoEl) root.parentNode.insertBefore(ui.info, root.nextSibling);
    ui.info.parentNode.insertBefore(ui.live, ui.info.nextSibling);

    function announce(text) {
      if (typeof FP.announce === 'function') { FP.announce(text); return; }
      ui.live.textContent = '';
      setTimeout(function () { ui.live.textContent = text; }, 30);
    }

    var feedback = null; // {text, kind} for the current prompt

    // Wire parts
    state.parts.forEach(function (p, i) {
      (partEls[p.id] || []).forEach(function (e) {
        e.classList.add('fp-cq-part');
        e.setAttribute('tabindex', '0');
        e.setAttribute('role', 'button');
        e.addEventListener('click', function (ev) { ev.stopPropagation(); choose(p.id); });
        e.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(p.id); }
        });
        e.addEventListener('mouseenter', function () { hover = p.id; renderLabels(); });
        e.addEventListener('mouseleave', function () { hover = null; renderLabels(); });
        e.addEventListener('focus', function () { hover = p.id; renderLabels(); });
        e.addEventListener('blur', function () { hover = null; renderLabels(); });
        e._fpIndex = i + 1;
      });
    });
    if (opts.tabOrder) wireTabOrder(tabSequence(domEls, opts.tabOrder));
    ui.btnExplore.addEventListener('click', function () { setMode('explore'); });

    // opts.tabOrder: Tab / Shift+Tab walk the parts in this order instead of the
    // SVG paint (DOM) order, without positive tabindex values. Entering the
    // diagram from before it lands on the first part, from after it on the last.
    function wireTabOrder(seq) {
      var pointer = false;
      var shown = function (e) { return !e.getClientRects || e.getClientRects().length > 0; };
      var step = function (from, dir) {
        for (var i = seq.indexOf(from) + dir; i >= 0 && i < seq.length; i += dir) if (shown(seq[i])) return seq[i];
        return null;
      };
      seq.forEach(function (e) {
        e.addEventListener('keydown', function (ev) {
          if (ev.key !== 'Tab' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
          var t = step(e, ev.shiftKey ? -1 : 1);
          if (t) { ev.preventDefault(); t.focus(); return; }
          // Leaving the diagram: let the browser move on, skipping the other parts.
          seq.forEach(function (o) { if (o !== e) o.setAttribute('tabindex', '-1'); });
          setTimeout(function () { seq.forEach(function (o) { o.setAttribute('tabindex', '0'); }); }, 0);
        });
        e.addEventListener('mousedown', function () { pointer = true; setTimeout(function () { pointer = false; }, 0); });
      });
      root.addEventListener('focusin', function (ev) {
        var t = ev.target, from = ev.relatedTarget;
        if (pointer || seq.indexOf(t) < 0 || (from && root.contains(from))) return;
        // Forward entry when the previous focus was before the root (or nowhere).
        var forward = !from || !!(from.compareDocumentPosition(root) & 4);
        var want = null, i;
        if (forward) { for (i = 0; i < seq.length && !want; i++) if (shown(seq[i])) want = seq[i]; }
        else { for (i = seq.length - 1; i >= 0 && !want; i--) if (shown(seq[i])) want = seq[i]; }
        if (want && want !== t) want.focus();
      });
    }
    ui.btnQuiz.addEventListener('click', function () { setMode('quiz'); });

    function onKey(ev) {
      var q = state.current();
      if (!q || q.kind !== 'choose' || state.locked) return;
      var t = ev.target;
      if (t && t !== doc.body && !root.contains(t) && !ui.info.contains(t) && !ui.prompt.contains(t) && !ui.toolbar.contains(t)) return;
      var n = parseInt(ev.key, 10);
      if (n >= 1 && n <= q.choices.length && n <= 9) { ev.preventDefault(); choose(q.choices[n - 1].id, true); }
    }
    doc.addEventListener('keydown', onKey);
    var onResize = function () { renderMarks(); };
    if (G.addEventListener) G.addEventListener('resize', onResize);
    root.addEventListener('transitionend', onResize);

    function choose(id, isChoice) {
      var q = state.current();
      if (state.mode === 'explore' || state.mode === 'summary') {
        if (isChoice) return;
        var part = state.visit(id);
        feedback = null;
        render();
        announce(part.label + '. ' + (part.text || ''));
        if (hooks.onVisit) hooks.onVisit(part, api);
        return;
      }
      if (!q) return;
      if (q.kind === 'choose' && !isChoice) {
        // Clicking a part in a choose quiz: free order selects that part's prompt.
        if (state.order === 'free') {
          var fq = state.promptForTarget(id);
          if (fq && state.select(fq.index)) { feedback = null; render(); announce(fq.prompt); focusFirstChoice(); }
        }
        return;
      }
      var res = state.answer(id);
      if (res.status === 'ignored') return;
      var text = messageFor(res, state, msg);
      feedback = { text: text, kind: res.correct ? 'ok' : 'bad', res: res };
      render();
      announce(text);
      if (hooks.onAnswer) hooks.onAnswer(res, api);
      var nb = ui.info.querySelector('.fp-cq-next');
      if (nb) nb.focus({ preventScroll: true });
    }

    function focusFirstChoice() {
      var b = ui.info.querySelector('.fp-cq-choices button');
      if (b) b.focus({ preventScroll: true });
    }

    function next() {
      var wasPractice = state.mode === 'practice';
      var q = state.next();
      feedback = null;
      render();
      if (q) {
        announce(q.prompt);
        if (q.kind === 'choose') focusFirstChoice(); else ui.prompt.focus({ preventScroll: true });
      } else {
        var sm = state.summary();
        announce(wasPractice ? msg.practiceDone : msg.firstAttempt(sm.firstCorrect, sm.total) + '. ' +
          (sm.masteryReached ? msg.masteryReached(sm.mastery, sm.total) : msg.masteryNeeds(sm.mastery, sm.total, msg.reviewPointer)));
        if (!wasPractice) {
          if (hooks.onComplete) hooks.onComplete(sm, api);
        }
        var b = ui.info.querySelector('button');
        if (b) b.focus({ preventScroll: true });
      }
    }

    function setMode(m) {
      if (m === 'quiz') state.startQuiz(); else state.setMode('explore');
      feedback = null;
      render();
      var q = state.current();
      announce(state.mode === 'explore' ? msg.exploreLabel : (q ? q.prompt : ''));
      if (hooks.onModeChange) hooks.onModeChange(state.mode, api);
    }

    // ---------- Rendering ----------
    function labelShown(id) {
      if (state.mode === 'explore') {
        if (exploreLabels === 'hover') return hover === id || state.selected === id || !!state.visited[id];
        return true;
      }
      return state.labelVisible(id, hideLabels);
    }
    function renderLabels() {
      state.parts.forEach(function (p) {
        (labelEls[p.id] || []).forEach(function (e) {
          e.classList.toggle('fp-cq-label-hidden', !labelShown(p.id));
          e.classList.toggle('fp-cq-label-visited', state.mode === 'explore' && !!state.visited[p.id]);
          e.classList.toggle('fp-cq-label-selected', state.selected === p.id);
        });
      });
    }

    function partMarks() {
      // id -> {cls, badge}
      var m = {}, q = state.current();
      if (state.mode === 'explore' || state.mode === 'summary') {
        Object.keys(state.visited).forEach(function (id) { if (state.mode === 'explore') m[id] = { cls: '', badge: 'visited' }; });
        if (state.selected) m[state.selected] = { cls: 'fp-cq-selected', badge: state.mode === 'explore' ? 'visited' : null };
        return m;
      }
      if (!q) return m;
      if (q.kind === 'choose') {
        var lastC = state.picks[state.picks.length - 1];
        var tc = state.locked ? (lastC && lastC.correct ? 'fp-cq-correct' : 'fp-cq-answer') : 'fp-cq-target';
        var tb = state.locked ? (lastC && lastC.correct ? 'correct' : 'answer') : 'target';
        m[q.target] = { cls: tc, badge: tb };
        return m;
      }
      state.picks.forEach(function (pk) { m[pk.id] = { cls: pk.correct ? 'fp-cq-correct' : 'fp-cq-wrong', badge: pk.correct ? 'correct' : 'wrong' }; });
      var last = state.picks[state.picks.length - 1];
      if (state.locked && last && !last.correct) m[q.answer] = { cls: 'fp-cq-answer', badge: 'answer' };
      return m;
    }

    function renderParts() {
      var marks = partMarks(), q = state.current();
      var hiddenNames = (state.mode === 'quiz' || state.mode === 'practice') && hideLabels;
      state.parts.forEach(function (p) {
        var mk = marks[p.id];
        (partEls[p.id] || []).forEach(function (e) {
          e.classList.remove('fp-cq-selected', 'fp-cq-target', 'fp-cq-correct', 'fp-cq-wrong', 'fp-cq-answer');
          if (mk && mk.cls) e.classList.add(mk.cls);
          var name = hiddenNames && !state.revealed[p.id] ? msg.quizAria(e._fpIndex) : p.label;
          if (q && q.kind === 'choose' && q.target === p.id && !state.locked) name = msg.quizAria(e._fpIndex) + ', highlighted';
          if (mk && mk.badge === 'correct') name += ', correct';
          if (mk && mk.badge === 'wrong') name += ', not this one';
          if (mk && mk.badge === 'answer') name = p.label + ', the answer';
          e.setAttribute('aria-label', name);
          if (state.mode === 'explore') e.setAttribute('aria-pressed', state.selected === p.id ? 'true' : 'false');
          else e.removeAttribute('aria-pressed');
        });
      });
    }

    function renderMarks() {
      var marks = partMarks();
      ui.marks.textContent = '';
      var rr = root.getBoundingClientRect();
      Object.keys(marks).forEach(function (id) {
        var mk = marks[id];
        if (!mk.badge || !partEls[id]) return;
        var b = null;
        partEls[id].forEach(function (e) {
          var r = e.getBoundingClientRect();
          if (!r.width && !r.height) return;
          b = b ? { l: Math.min(b.l, r.left), t: Math.min(b.t, r.top), r: Math.max(b.r, r.right), b: Math.max(b.b, r.bottom) }
                : { l: r.left, t: r.top, r: r.right, b: r.bottom };
        });
        if (!b) return;
        var x = Math.max(12, Math.min(b.r - rr.left, rr.width - 12));
        var y = Math.max(12, Math.min(b.t - rr.top, rr.height - 12));
        var text = { correct: '✓', wrong: '✗', answer: msg.badgeAnswer, target: '?', visited: '✓' }[mk.badge];
        var d = el(doc, 'span', { class: 'fp-cq-badge ' + mk.badge, text: text });
        if (mk.badge === 'answer' || mk.badge === 'target') {
          // Sit above the part's top edge so the badge does not cover it.
          x = Math.max(70, x);
          if (b.t - rr.top >= 22) { d.style.transform = 'translate(-100%,-100%)'; y = b.t - rr.top - 1; }
          else { d.style.transform = 'translate(-100%,0)'; y = b.b - rr.top + 1; } // no room above: go below
        }
        d.style.left = x + 'px';
        d.style.top = y + 'px';
        ui.marks.appendChild(d);
      });
    }

    function renderToolbar() {
      var m = state.mode;
      ui.btnExplore.setAttribute('aria-pressed', m === 'explore' ? 'true' : 'false');
      ui.btnQuiz.setAttribute('aria-pressed', m === 'quiz' || m === 'practice' ? 'true' : 'false');
      ui.btnExplore.disabled = !state.exploreAvailable();
      var N = state.prompts.length;
      if (m === 'explore') ui.status.textContent = msg.visited(state.visitedCount(), state.parts.length);
      else if (m === 'summary') ui.status.textContent = scoreText();
      else if (m === 'practice') ui.status.textContent = msg.practicePrefix + msg.progress(state.pos + 1, state.practiceQueue.length);
      else {
        var prog = state.order === 'free' ? msg.answered(state.answeredCount(), N) : msg.progress(state.pos + 1, N);
        ui.status.textContent = prog + ' · ' + scoreText();
      }
    }
    function scoreText() { return scoreLine(state, { msg: msg, noun: noun, scoreLabel: opts.scoreLabel, bareLabel: opts.bareLabel }); }

    function renderPrompt() {
      var p = ui.prompt;
      p.textContent = '';
      var q = state.current();
      if (state.mode === 'explore') {
        p.appendChild(el(doc, 'span', { class: 'fp-cq-q' }, [el(doc, 'span', { class: 'fp-cq-mode', text: msg.exploreLabel + ': ' }), opts.explorePrompt || msg.explorePrompt]));
      } else if (state.mode === 'summary') {
        p.appendChild(el(doc, 'span', { class: 'fp-cq-q', text: msg.complete }));
      } else if (q) {
        var lead = state.mode === 'practice' ? msg.practicePrefix : '';
        p.appendChild(el(doc, 'span', { class: 'fp-cq-q', text: lead + q.prompt }));
        p.appendChild(el(doc, 'span', { class: 'fp-attempt fp-cq-attempt', text: msg.attempt(Math.min(state.attempt + (state.locked ? 0 : 1), state.attempts), state.attempts) }));
      }
    }

    function btn(text, cls, fn) {
      var b = el(doc, 'button', { type: 'button', class: 'fp-btn fp-cq-btn ' + (cls || ''), text: text });
      b.addEventListener('click', fn);
      return b;
    }

    function renderInfo() {
      var box = ui.info, q = state.current();
      box.textContent = '';
      if (state.mode === 'explore') {
        if (!state.selected) { box.appendChild(el(doc, 'p', { text: opts.exploreEmpty || msg.exploreEmpty })); return; }
        var p = state.byId[state.selected];
        box.appendChild(el(doc, 'h3', { text: p.label }));
        if (p.text) box.appendChild(el(doc, 'p', { text: p.text }));
        return;
      }
      if (state.mode === 'summary') { renderSummary(box); return; }
      if (!q) return;
      if (q.kind === 'choose') {
        if (state.order === 'free' && state.results[q.index] !== undefined && !feedback) {
          box.appendChild(el(doc, 'p', { text: opts.freeIntro || msg.freeIntro })); return;
        }
        var row = el(doc, 'div', { class: 'fp-cq-choices', role: 'group', 'aria-label': 'Choices' });
        q.choices.forEach(function (c, i) {
          // Glyph prefixes keep the verdict visible even under the kit's disabled-button style.
          var picked = state.picks.filter(function (pk) { return pk.id === c.id; })[0];
          var isAnswer = state.locked && c.id === q.answer;
          var glyph = picked ? (picked.correct ? '✓ ' : '✗ ') : (isAnswer ? '→ ' : '');
          var b = btn(glyph + (i < 9 ? (i + 1) + '. ' : '') + c.label, 'choice', function () { choose(c.id, true); });
          b.disabled = state.locked || !!picked;
          if (picked) b.classList.add(picked.correct ? 'fp-cq-picked-ok' : 'fp-cq-picked-bad');
          else if (isAnswer) b.classList.add('fp-cq-picked-ok');
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      if (feedback) {
        box.appendChild(el(doc, 'p', { class: 'fp-feedback fp-cq-fb ' + feedback.kind, text: feedback.text }));
      } else if (q.kind === 'locate') {
        var intro = typeof msg.quizIntro === 'function' ? msg.quizIntro({ kind: q.kind, attempts: state.attempts }) : msg.quizIntro;
        box.appendChild(el(doc, 'p', { class: 'fp-cq-fb info', text: intro }));
      }
      if (state.locked) {
        var lastOne = state.mode === 'practice' ? state.pos >= state.practiceQueue.length - 1 : (feedback && feedback.res.last);
        box.appendChild(btn(lastOne ? msg.seeSummary : msg.next, 'fp-cq-primary fp-cq-next', next));
      }
    }

    function renderSummary(box) {
      var sm = state.summary();
      box.appendChild(el(doc, 'p', {}, [el(doc, 'b', { text: msg.firstAttempt(sm.firstCorrect, sm.total) })]));
      box.appendChild(el(doc, 'p', {
        class: 'fp-feedback fp-cq-fb ' + (sm.masteryReached ? 'ok final' : 'info final'),
        text: sm.masteryReached ? '✓ ' + msg.masteryReached(sm.mastery, sm.total) : msg.masteryNeeds(sm.mastery, sm.total, msg.reviewPointer)
      }));
      function list(items) {
        return el(doc, 'ul', {}, items.map(function (q) {
          var ansLabel = q.kind === 'locate' ? state.byId[q.answer].label
            : q.choices.filter(function (c) { return c.id === q.answer; })[0].label;
          return el(doc, 'li', {}, [q.prompt + ' ', el(doc, 'b', { text: ansLabel }), q.why ? ': ' + q.why : '']);
        }));
      }
      var row = el(doc, 'div', { class: 'fp-cq-actions' });
      if (opts.retryMissed && sm.missed.length) row.appendChild(btn(msg.retryMissed, 'secondary', function () { state.startPractice(); feedback = null; render(); var q = state.current(); announce(msg.practicePrefix + q.prompt); }));
      row.appendChild(btn(msg.startOver, 'fp-cq-primary', function () { setMode('quiz'); }));
      if (state.exploreAvailable() && state.exploreSetting !== false) row.appendChild(btn(msg.backToExplore, 'secondary', function () { setMode('explore'); }));
      box.appendChild(row);
      if (state.selected) {
        // A part opened from the summary (review, never scored) shows above the lists.
        var sp = state.byId[state.selected];
        box.appendChild(el(doc, 'h3', { text: sp.label }));
        if (sp.text) box.appendChild(el(doc, 'p', { text: sp.text }));
      }
      if (sm.missed.length) { box.appendChild(el(doc, 'p', { text: '✗ ' + msg.missedHeading })); box.appendChild(list(sm.missed)); }
      if (sm.later.length) { box.appendChild(el(doc, 'p', { text: msg.laterHeading })); box.appendChild(list(sm.later)); }
      if (!sm.missed.length && !sm.later.length) box.appendChild(el(doc, 'p', { text: msg.noneMissed }));
    }

    function render() {
      renderToolbar(); renderPrompt(); renderLabels(); renderParts(); renderInfo(); renderMarks();
    }

    function destroy() {
      doc.removeEventListener('keydown', onKey);
      if (G.removeEventListener) G.removeEventListener('resize', onResize);
      root.removeEventListener('transitionend', onResize);
    }

    // Clear the explore visits ("Visited 0 of N", no ✓ badges) and re-render.
    function resetVisited() {
      state.resetVisited();
      render();
    }

    var api = { state: state, ui: ui, setMode: setMode, choose: choose, next: next, render: render, destroy: destroy,
      resetVisited: resetVisited, version: VERSION };
    render();
    return api;
  }

  var CalloutQuiz = {
    version: VERSION,
    scoreLine: scoreLine,
    State: State,
    mount: mount,
    messages: MSG,
    message: messageFor,
    promptsFromParts: promptsFromParts,
    namePrompts: namePrompts,
    tabSequence: tabSequence,
    seededShuffle: seededShuffle,
    css: css
  };
  FP.CalloutQuiz = CalloutQuiz;
  if (typeof module !== 'undefined' && module.exports) module.exports = CalloutQuiz;
})(typeof window !== 'undefined' ? window : globalThis);
