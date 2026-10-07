/**
 * Real life: where each idea is used outside the game, and why it matters. Shown as a lesson opens ("Why it
 * matters"), after each right answer ("In real life"), on the lesson's last screen, on the stop page, on Home and
 * in the Library's Real life view. Every line is true, kid-safe and at the game's reading level (grade 7.0 or lower,
 * no sentence over 25 words). See docs/CONTENT_GUIDE.md, "Real life".
 */

/** One place an idea is used. */
export interface RealUse {
  /** Who uses it, in a few words: "Doctors", "Referees", "You, at the store". */
  who: string;
  /** How they use exactly this idea: up to three short sentences (40 words), in the lesson's own words. */
  text: string;
  /** 'life': a kid's everyday life (school, games, home, shops, sports). 'work': a job. */
  kind: 'life' | 'work';
}

export interface LessonWorld {
  /** Why the idea matters, in one sentence: the thing to keep in mind. Shown as the lesson opens. */
  why: string;
  /** Three real uses of exactly this idea: at least one from everyday life and one from a job. */
  uses: [RealUse, RealUse, RealUse];
}

/** One stop's real-life content. */
export interface StopWorld {
  /** One sentence: where the stop's big idea is used. */
  stop: string;
  /** Every lesson of the stop, by lesson id ('s1.l1'). */
  lessons: Record<string, LessonWorld>;
  /**
   * One or two lines per skill ('s1.cant-tell'), shown after a right answer as "In real life: …". Each line is up to
   * three short sentences (35 words): a real situation where this exact move is used.
   */
  skills: Record<string, string[]>;
}
