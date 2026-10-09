// Anatomy of a Fan Duty Statement - HTML on the FanPedia kit (FP.CalloutQuiz)
// CANVAS_HEIGHT: 720
// Chapter 1 (Air, Pressure and the Fan): explore the six parts of the rating line
// "12,000 CFM at 3.0 in. wg static pressure, 1,173 RPM, 7.9 BHP, at 0.075 lb/ft³
// (70°F, sea level), clean air.", then name each highlighted part in a quiz.
// Quiz: six segments in a shuffled order (seeded once per session), one scored
// attempt each, answer revealed after the attempt. Mastery: 5 of 6 on the first attempt.
(function () {
  'use strict';

  const SIM_ID = 'ch01-fan-duty-statement';

  // Segments, quantity names and callout text (spec Content table).
  const PARTS = [
    { id: 'airflow', segment: '12,000 CFM', label: 'Airflow volume',
      text: 'Cubic feet of air per minute, measured at the fan inlet conditions.' },
    { id: 'sp', segment: '3.0 in. wg static pressure', label: 'Static pressure',
      text: "The system's resistance at this airflow, which the fan must overcome." },
    { id: 'speed', segment: '1,173 RPM', label: 'Fan speed',
      text: 'Impeller revolutions per minute; here set by a 6 in motor sheave and a 9 in fan sheave on a 1,760 RPM motor.' },
    { id: 'bhp', segment: '7.9 BHP', label: 'Brake horsepower',
      text: 'Power required at the fan shaft; a 10 hp motor would run at 79 percent load. It is not the motor size.' },
    { id: 'density', segment: '0.075 lb/ft³ (70°F, sea level)', label: 'Air density',
      text: 'The density the rating assumes; here standard air. Hot air or a high site changes pressure and power.' },
    { id: 'airstream', segment: 'clean air', label: 'Airstream condition',
      text: 'What the air carries; contaminated airstreams change the impeller, arrangement and construction.' }
  ];

  const lower = s => s.charAt(0).toLowerCase() + s.slice(1);

  FP.CalloutQuiz.mount({
    root: '#diagram',
    id: SIM_ID,
    parts: PARTS,
    // Quiz mode presents the six quantity names as choices for each highlighted segment.
    prompts: FP.CalloutQuiz.namePrompts(PARTS).map((q, i) =>
      Object.assign(q, { id: PARTS[i].id, prompt: 'Which quantity is the highlighted part, "' + PARTS[i].segment + '"?' })),
    attempts: 1,
    mastery: 5,
    order: 'shuffle',
    seed: Math.floor(Math.random() * 1e9),          // seeded once per session
    explore: true,
    hideLabels: true,
    infoHeight: window.innerWidth <= 480 ? 270 : 230, // fixed, so the iframe height holds
    tabOrder: PARTS.map(p => p.id),
    explorePrompt: 'Click each part of this rating line to see what it tells you.',
    exploreEmpty: 'No part selected yet. Click a highlighted part of the rating line, or Tab to it and press Enter. When you know all six, choose Quiz.',
    msg: {
      // Spec wording: Correct "Correct: <quantity name>. <callout text>";
      // incorrect "That segment is the <correct name>. <callout text>".
      missed: c => FP.msg.BAD + ' Not quite. That segment is the ' + lower(c.answerLabel) + '. ' + c.why,
      score: (noun, n, total) => 'Correct on first attempt: ' + n + ' of ' + total,
      firstAttempt: (n, total) => 'Correct on first attempt: ' + n + ' of ' + total,
      reviewPointer: 'Review the parts in Explore mode, then start over.',
      quizIntro: () => 'The names are hidden. Choose the name of the highlighted part. One attempt per part; the answer is shown after it.'
    }
  });

})();
