/**
 * Stop 6 · If… then.
 * An if–then rule only breaks one way: the IF part happens and the THEN part does not.
 *
 *  l1 When is a rule broken?   who broke the rule / did this case break it
 *  l2 Turning it around        going forward works; going backward can’t tell ("Rex could be a cat.")
 *  l3 The four moves           IF happened, THEN didn’t happen (these follow); THEN happened, IF didn’t (traps)
 *  l4 Flip and NOT             flip and NOT means the same; flip only and NOT only do not (truth table)
 *  l5 Rule checker             which cards must you turn over? The IF card and the NOT-THEN card
 *
 * Every answer, explanation and tip comes from ../engine/puzzles/conditionals.ts, which works each one out
 * from the four-row truth table. Skins: everyday, fantasy and abstract (letters and numbers, P and Q).
 */
import {
  CARD_SKINS,
  CONTRA,
  CONVERSE,
  INVERSE,
  L1_SKINS,
  MOVES,
  MOVE_FACT,
  ROWS,
  SKINS,
  SKIN_IDS,
  cardItem,
  checkerItem,
  condText,
  didBreakItem,
  follows,
  meaningGrid,
  moveItem,
  ruleGrid,
  ruleScene,
  ruleText,
  sameYesNoItem,
  samePickItem,
  skinsIn,
  turnItem,
  whoBrokeItem,
  type CondMade,
  type Lit,
  type Move,
  type SkinId,
} from '../engine/puzzles/conditionals';
import type { Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

const STOP = 6;
const L1 = 's6.l1';
const L2 = 's6.l2';
const L3 = 's6.l3';
const L4 = 's6.l4';
const L5 = 's6.l5';

const finish = (m: CondMade, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set share a prompt and scene: a repeat is thrown away
 * and made again from the same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => CondMade) => CondMade {
  const seen = new Set<string>();
  const key = (m: CondMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null]);
  return (make) => {
    let m = make();
    for (let tries = 0; tries < 50 && seen.has(key(m)); tries++) m = make();
    seen.add(key(m));
    return m;
  };
}

/** A skin from `from` not used yet in this set (any from `from` once they are all used). */
function skinDeck(rng: Rng): (from: readonly SkinId[]) => SkinId {
  const used = new Set<SkinId>();
  return (from) => {
    const fresh = from.filter((s) => !used.has(s));
    const s = rng.pick(fresh.length ? fresh : from);
    used.add(s);
    return s;
  };
}

/** Skins for a practice set: one everyday, one fantasy, one abstract (when `from` has them), then others, shuffled. */
function practiceSkins(rng: Rng, count: number, from: readonly SkinId[]): SkinId[] {
  const next = skinDeck(rng);
  const out: SkinId[] = [];
  for (const g of ['everyday', 'fantasy', 'abstract'] as const) {
    const inGroup = skinsIn(g, from);
    if (inGroup.length && out.length < count) out.push(next(inGroup));
  }
  while (out.length < count) out.push(next(from));
  return rng.shuffle(out);
}

const face = (skin: SkinId, l: Lit) => SKINS[skin].cards!.face(l, { vowel: 'E', consonant: 'K', even: '4', odd: '7' });
const part = (skin: SkinId, l: Lit) => SKINS[skin].parts[l].if;

/** The four moves as a summary card, worked out from the truth table. */
function movesScene(): Scene {
  const said: Record<Lit, string> = { P: 'The IF part happened', notP: 'The IF part did not happen', Q: 'The THEN part happened', notQ: 'The THEN part did not happen' };
  const then: Record<Lit, string> = { P: 'so the IF part happened too.', notP: 'so the IF part did not happen.', Q: 'so the THEN part happened too.', notQ: 'so the THEN part did not happen.' };
  const order: Move[] = ['mp', 'mt', 'ac', 'da'];
  return {
    kind: 'text',
    lines: order.map((m) => {
      const f = MOVE_FACT[m];
      const got = follows(f);
      return `${said[f]}, ${got ? then[got] : 'but nothing follows for sure.'}`;
    }),
  };
}

// ---------- lessons ----------

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'When is a rule broken?',
    ideas: [
      {
        title: 'Two parts',
        scene: ruleScene('dessert'),
        body: [
          `Some rules have two parts. Here is one: “${ruleText('dessert')}”`,
          `The IF part comes right after the word “if.” Here it is “${part('dessert', 'P')}.”`,
          `The THEN part comes right after the word “then.” Here it is “${part('dessert', 'Q')}.”`,
        ],
      },
      {
        title: 'Four kinds of kids',
        scene: ruleGrid('dessert'),
        body: [
          'Every kid at lunch fits in one of four boxes.',
          'Some kids got dessert and some did not. Some ate all the veggies and some left a few.',
          'Only one box breaks the rule. Look for the ✗.',
        ],
      },
      {
        title: 'The one way to break it',
        body: [
          'A rule like this is broken only when the IF part happens and the THEN part does not.',
          'Ben got dessert but left some veggies. The IF part happened. The THEN part did not. So Ben broke the rule.',
        ],
      },
      {
        title: 'When the IF part does not happen',
        body: [
          'Cal did not get dessert. The rule only talks about kids who get dessert.',
          'So Cal can’t break it. That is true if Cal ate all the veggies. It is also true if Cal left some.',
        ],
      },
      {
        title: 'THEN without IF is fine',
        body: [
          'Dee ate all the veggies but did not get dessert. Maybe Dee was too full.',
          'Dee did not break the rule. The rule never says that eating your veggies gets you dessert.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, L1_SKINS);
      const plan = rng.shuffle(['who', 'who', 'trap', 'did'] as const);
      const one = distinctItems();
      return plan.map((p, i) => {
        const skin = skins[i];
        const m = one(() =>
          p === 'who' ? whoBrokeItem(rng, { skin }) : didBreakItem(rng, { skin, row: p === 'trap' ? { p: false, q: false } : rng.pick(ROWS) }),
        );
        return finish(m, `s6-l1-${i + 1}`, L1);
      });
    },
  },
  {
    id: L2,
    title: 'Turning it around',
    ideas: [
      {
        title: 'One way only',
        scene: ruleScene('pets'),
        body: [
          `Here is a true rule: “${ruleText('pets')}”`,
          `Now turn it around. Swap the IF part and the THEN part. You get “${condText('pets', CONVERSE)}”`,
          'That one is not true. A cat has four legs, but a cat is not a dog.',
        ],
      },
      {
        title: 'A new sentence',
        body: [
          'When you turn a rule around, you get a new sentence. It does not mean the same thing.',
          'The rule can be true while the turned-around sentence is false.',
        ],
      },
      {
        title: 'Could it happen another way?',
        body: [
          'Rex has four legs. Is Rex a dog? Maybe. But Rex could be a cat.',
          'When you know only the THEN part, ask: could it happen another way?',
          'If it could, then you can’t tell if the IF part happened.',
        ],
      },
      {
        title: 'Wet grass',
        scene: ruleScene('grass'),
        body: [
          'The grass is wet. Did it rain?',
          'It might have. But a sprinkler could have made the grass wet. So could a hose.',
          'So you can’t tell if it rained.',
        ],
      },
      {
        title: 'Going forward works',
        body: [
          'Going forward is safe. When you know the IF part happened, the THEN part must be true.',
          'Max is a dog, so Max has four legs.',
          '“Can’t tell” is a real answer. Use it when the facts do not decide.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS);
      const plan = rng.shuffle([{ fact: 'Q' }, { fact: 'Q' }, { fact: 'P', target: 'Q' }, { fact: 'P' }] as const);
      const one = distinctItems();
      return plan.map((p, i) => finish(one(() => turnItem(rng, { skin: skins[i], ...p })), `s6-l2-${i + 1}`, L2));
    },
  },
  {
    id: L3,
    title: 'The four moves',
    ideas: [
      {
        title: 'Four kinds of facts',
        body: [
          'Say you know a rule and one more fact. What follows for sure?',
          'The fact can be about the IF part or the THEN part. It can say that part happened, or that it did not. That makes four moves.',
        ],
      },
      {
        title: 'The IF part happened',
        scene: ruleScene('pets', true),
        body: [
          'Rex is a dog. The rule says dogs have four legs. So Rex has four legs.',
          'When the IF part happens, the THEN part must happen too.',
        ],
      },
      {
        title: 'The THEN part did not happen',
        body: [
          'Pip does not have four legs. Could Pip be a dog?',
          'If Pip were a dog, Pip would have four legs. But Pip does not. So Pip is not a dog.',
          'When the THEN part did not happen, the IF part did not happen either.',
        ],
      },
      {
        title: 'Two traps',
        body: [
          'Max has four legs. Max could be a dog or a cat. Nothing follows for sure.',
          'Coco is not a dog. Coco could be a cat with four legs or a bird with two. Nothing follows for sure.',
        ],
      },
      {
        title: 'Nothing follows for sure',
        scene: movesScene(),
        body: [
          '“Nothing follows for sure” means the rule and the fact do not prove anything new.',
          'It is a real answer. Pick it when more than one thing could be true.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS);
      const moves = rng.shuffle(MOVES);
      const one = distinctItems();
      return moves.map((move, i) => finish(one(() => moveItem(rng, { skin: skins[i], move })), `s6-l3-${i + 1}`, L3));
    },
  },
  {
    id: L4,
    title: 'Flip and NOT',
    ideas: [
      {
        title: 'Flip and NOT',
        scene: ruleScene('pets'),
        body: [
          `Start with a rule: “${ruleText('pets')}”`,
          'To flip a rule, swap the IF part and the THEN part. That is the same as turning it around.',
          `Now flip it and put NOT in both parts. You get “${condText('pets', CONTRA)}” It means the same as the rule.`,
        ],
      },
      {
        title: 'Why they match',
        scene: meaningGrid('pets'),
        body: [
          'Two sentences mean the same when the same cases break them.',
          'A dog without four legs breaks the rule. It breaks the flip and NOT sentence too. No other case breaks either one.',
        ],
      },
      {
        title: 'Flip alone does not work',
        body: [
          `“${condText('pets', CONVERSE)}” only flips the rule.`,
          'A cat with four legs breaks it. But a cat does not break the rule. So they do not mean the same.',
        ],
      },
      {
        title: 'NOT alone does not work',
        body: [
          `“${condText('pets', INVERSE)}” only puts NOT in both parts.`,
          'A cat with four legs breaks this one too. So it does not mean the same as the rule.',
        ],
      },
      {
        title: 'How to test',
        body: [
          'Try all four cases. IF and THEN both happen. IF happens but THEN does not. THEN happens but IF does not. Neither one happens.',
          'If a case breaks one sentence but not the other, they do not mean the same.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS);
      const plan = rng.shuffle(['pick', 'pick', 'trap', 'same'] as const);
      const one = distinctItems();
      return plan.map((p, i) => {
        const skin = skins[i];
        const m = one(() =>
          p === 'pick'
            ? samePickItem(rng, { skin })
            : sameYesNoItem(rng, { skin, rewrite: p === 'same' ? 'contra' : rng.pick(['converse', 'inverse'] as const) }),
        );
        return finish(m, `s6-l4-${i + 1}`, L4);
      });
    },
  },
  {
    id: L5,
    title: 'Rule checker',
    ideas: [
      {
        title: 'Checking a rule',
        scene: ruleScene('dessert'),
        body: [
          SKINS.dessert.cards!.intro,
          'You can see only one side of each card. Your job is to check that nobody broke the rule.',
          'Turn over only the cards you need. Skip a card if it can’t hide a broken rule.',
        ],
      },
      {
        title: 'The IF card',
        body: [
          `The “${face('dessert', 'P')}” card could have “${face('dessert', 'notQ')}” on the back. That kid broke the rule.`,
          'So you must turn it over.',
        ],
      },
      {
        title: 'The NOT THEN card',
        body: [
          `The “${face('dessert', 'notQ')}” card could have “${face('dessert', 'P')}” on the back. That kid broke the rule too.`,
          'So you must turn it over. This is the card most people miss.',
        ],
      },
      {
        title: 'The trap',
        body: [
          `The “${face('dessert', 'Q')}” card looks important. But its back does not matter. With or without dessert, that kid kept the rule.`,
          `The “${face('dessert', 'notP')}” card can’t break the rule either. ${SKINS.dessert.onlyAbout}`,
        ],
      },
      {
        title: 'Letters and numbers',
        scene: ruleScene('letters'),
        body: [
          'Here are four cards: E, K, 4 and 7. Which must you turn over?',
          'Turn over E and 7. E could have an odd number on the back. 7 could have a vowel.',
          'Many grown-ups pick E and 4. The 4 is the trap.',
        ],
      },
    ],
    // Concrete stories first, then letters and numbers.
    practice: (rng) => {
      const next = skinDeck(rng);
      const concrete = CARD_SKINS.filter((s) => SKINS[s].group !== 'abstract');
      const one = distinctItems();
      const makers: (() => CondMade)[] = [
        () => checkerItem(rng, { skin: next(skinsIn('everyday', CARD_SKINS)) }),
        () => cardItem(rng, { skin: next(concrete), face: rng.pick(['Q', 'notQ', 'Q', 'notQ', 'P', 'notP'] as const) }),
        () => checkerItem(rng, { skin: next(skinsIn('fantasy', CARD_SKINS)) }),
        () => checkerItem(rng, { skin: 'letters' }),
      ];
      return makers.map((make, i) => finish(one(make), `s6-l5-${i + 1}`, L5));
    },
  },
];

// ---------- check and arcade ----------

/**
 * 9-10 items: one on who breaks a rule, one on turning a rule around, all four moves, one on flip and NOT,
 * one rule checker with four cards, plus one or two more from lessons 1, 4 and 5 (the other lesson 1 or
 * lesson 4 question, or a one-card rule check). Skins do not repeat until every skin a slot allows is used.
 */
function check(rng: Rng): Item[] {
  const next = skinDeck(rng);
  const one = distinctItems();
  const whoFirst = rng.chance(0.5);
  const pickFirst = rng.chance(0.5);
  const who = () => whoBrokeItem(rng, { skin: next(L1_SKINS) });
  const did = () => didBreakItem(rng, { skin: next(L1_SKINS) });
  const pick = () => samePickItem(rng, { skin: next(SKIN_IDS) });
  const yesNo = () => sameYesNoItem(rng, { skin: next(SKIN_IDS) });
  const extras = rng.shuffle(['l1', 'l4', 'card'] as const).slice(0, rng.chance(0.5) ? 2 : 1);
  const plan: [string, () => CondMade][] = [[L1, whoFirst ? who : did]];
  if (extras.includes('l1')) plan.push([L1, whoFirst ? did : who]);
  plan.push([L2, () => turnItem(rng, { skin: next(SKIN_IDS), fact: rng.chance(0.65) ? 'Q' : 'P' })]);
  for (const move of rng.shuffle(MOVES)) plan.push([L3, () => moveItem(rng, { skin: next(SKIN_IDS), move })]);
  plan.push([L4, pickFirst ? pick : yesNo]);
  if (extras.includes('l4')) plan.push([L4, pickFirst ? yesNo : pick]);
  plan.push([L5, () => checkerItem(rng, { skin: next(CARD_SKINS) })]);
  if (extras.includes('card')) plan.push([L5, () => cardItem(rng, { skin: next(CARD_SKINS) })]);
  return plan.map(([lesson, make], i) => finish(one(make), `s6-c${i + 1}`, lesson));
}

const ARCADE: Record<string, (rng: Rng) => CondMade> = {
  [L1]: (rng) => (rng.chance(0.5) ? whoBrokeItem(rng, { skin: rng.pick(L1_SKINS) }) : didBreakItem(rng, { skin: rng.pick(L1_SKINS) })),
  [L2]: (rng) => turnItem(rng, { skin: rng.pick(SKIN_IDS), fact: rng.chance(0.5) ? 'Q' : 'P' }),
  [L3]: (rng) => moveItem(rng, { skin: rng.pick(SKIN_IDS), move: rng.pick(MOVES) }),
  [L4]: (rng) => (rng.chance(0.5) ? samePickItem(rng, { skin: rng.pick(SKIN_IDS) }) : sameYesNoItem(rng, { skin: rng.pick(SKIN_IDS) })),
  [L5]: (rng) => (rng.chance(0.6) ? checkerItem(rng, { skin: rng.pick(CARD_SKINS) }) : cardItem(rng, { skin: rng.pick(CARD_SKINS) })),
};

function arcade(rng: Rng): Item {
  const lesson = rng.pick(lessons).id;
  return finish(ARCADE[lesson](rng), 's6-arcade', lesson);
}

export const stop6: StopDef = {
  n: STOP,
  id: 's6',
  title: 'If… then',
  idea: 'An if–then rule only breaks one way.',
  ready: true,
  lessons,
  check,
  practice: arcade,
};

