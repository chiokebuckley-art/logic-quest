# Skill-drill audit: Stop 5 (Knights & Knaves)

The handoff is “Logic Quest: teach before the quiz” (2 Oct 2026). Its core rule: every new method is See one marked
case, then Do one with taps, then Quiz a twin. A lesson is not passed until the learner has done the marks. A new
rule family never shows up inside the quiz.

The Stop 5 section of the handoff speaks to lesson 1, Truth-tellers and liars. A knight's sentence is true and a
knave's sentence is false. The learner takes one given case, follows the sentence, and sees if the case breaks the
rule. See: a board with a given knight, already marked Holds or Crashes, with a one-line reason. Do: the same board,
one given knight and one given knave, each tapped Holds or Crashes. Quiz: “suppose both” and any unknown speaker come
only after both checks. Its sample: the well is full; Ada (a knight) says “The well is full.” (Holds); Ben (a knave)
says it too (Crashes). Lessons 2 to 5 get no lines of their own. So their boards are built only from each lesson's
own worked example, and their quizzes keep only what their cards and boards teach.

How the engine keeps every value honest:

- Every board row comes from a helper in `engine/puzzles/knights.ts`. `factRow` checks words about a fact (lesson 1).
  `sayRow` checks one kind of speaker (lesson 2). `caseRow` checks one full case of who is what (lessons 1, 3, 4
  and 5). They use the same `claimTrue`, `speakerFits` and `factCase` that grade the questions. Nothing on a board is
  typed in by hand.
- Each wrong tap gets its own message, built the same way. A words mark quotes the words and says who is what in
  that case (“In this case, Ben is a knight. So “Ben is a knave” is false.”). For “and” and “or” it names the part
  that decides it. A Holds or Crashes mark names who has true or false words, and what that does to the rule.
- Each worked example's board is one object in `content/stop5.ts`. The same object draws the key-idea card and the
  guided board, so See and Do show one board. A twin board says what changed in its `twin` note.
- The tests read each board back from its words (`readWords`, the bubble reader written in the test file). They work
  out every mark again, then check the board's last words against the rows.

The marks on every board are Holds and Crashes. Lesson 1 defines them on its new See card: a case holds when the
speaker fits the rule, and crashes when a knight says something false or a knave says something true. Lesson 3's
“Crash!” card already uses crash for a guess: a guess crashes when every case with it crashes.

## Lesson 1 · Truth-tellers and liars

**See.** A new card, “Check a case,” is the handoff's board. The well is full. Ada says “The well is full.” Ben says
it too. Fay says “The well is not full.” The card marks one given knight: “Fay is given as a knight. Fay says, “The
well is not full.” The well is full, so Fay’s words are false.” Its one-line reason: “A knight said something false.
That breaks the rule, so this case crashes.” It also defines a case, holds and crashes. The card's knight is Fay, so
the handoff's Ada and Ben are new cases for the learner. Card 2's knight is now Ada (it was Ava, which looks like
Ada).

“When you can’t tell” (Cal: “I can swim.”) and “Words about others” (Dee: “Eli is a knave.”) were prose. Each now has
its own board and one marked case. Lesson 1 has six cards, the most allowed.

**Do.** Three boards, 16 taps in all.

1. “Check two given cases,” on the See card's board. The fact is the board's first words (“The well is full.”) and
   is in every row. The board names its card: “This is the board from the card “Check a case.””

   | Row | Marks | Right taps |
   |---|---|---|
   | Shown: Fay is a knight, and the well is full. | Fay’s words, This case | False, Crashes |
   | Your turn: Ada is a knight, and the well is full. | Ada’s words, This case | True, Holds (the handoff's sample) |
   | Your turn: Ben is a knave, and the well is full. | Ben’s words, This case | True, Crashes (the handoff's sample) |

   Example why, for Holds on Ben: “Ben is a knave, and Ben’s words came out true. A knave never says true words, so
   this case crashes.”

2. “Check every case,” on the “When you can’t tell” card's board. Cal is a knight and can swim is shown (True, Holds).
   The learner marks the other three: knight and cannot swim (False, Crashes), knave and can swim (True, Crashes),
   knave and cannot swim (False, Holds). Two cases hold and give different answers, so you can't tell if Cal can
   swim, or what kind Cal is.

3. “Words about others,” on that card's board. All four cases of Dee and Eli. Dee and Eli both knaves is shown (Dee’s
   words True, Crashes). The learner marks Dee a knave and Eli a knight (False, Holds), both knights (False,
   Crashes), and Dee a knight and Eli a knave (True, Holds). Two cases hold: if Dee is a knave, Eli is a knight; if
   Dee is a knight, Eli is a knave. So when no one knows Dee's kind, you can't tell what Eli is.

**Quiz.** Nothing moved out. Every lesson 1 question is a twin of a board:

- Try 1: a given knight or knave and words about a fact, in a new skin (board 1).
- Try 2: a knave's “not” sentence (board 1; Fay's “not” is on the See card).
- Try 3: an unknown speaker or an unknown fact, so Can't tell (board 2, or board 3, whose two cases that hold
  disagree about Eli).
- Try 4: words about others, or the speaker's kind from a known fact (boards 3 and 1).

The cards' and boards' own questions never come back as a quiz (`CARD_QUESTIONS`): Cal and “I can swim” with no
known kind, and Dee and Eli every way (Dee a knight, a knave or unknown; Eli a knight or a knave). The handoff asks that unknown speakers wait until both given checks are done. They do: the
quiz opens only after every board is right.

**Pass.** All three boards right, then the default: 3 right on the first try with no hint. The handoff's pass is the
two given checks on board 1.

**Hint.** One case, already checked, as a board row. It is always a case that crashes, so never the answer's case.
For “Uma is a knight. Uma says, “I can swim.” Can Uma swim?” it shows “Uma is a knight, and Uma cannot swim.” Uma’s
words: false. “A knight said something false. That breaks the rule, so this case crashes.” The hint says: “Here is
one case, checked for you. Check the other case the same way.”

## Lesson 2 · What nobody can say

**See.** “It can depend on others” stays word for word (a test pins it). Ben is a knave; who could say “Ben and I are
the same kind”? “Four answers” now has a picture too (“Two plus two is four.”).

**Do.** Two boards, 6 taps.

1. “Test each kind,” on the card's board. The knight is shown: the words would be False; could a knight say it? No.
   The learner pretends a knave says it: the words would be True; could a knave say it? No. So no one could say it.
2. “Now Ben is a knight,” a twin. The twin note: “Ben is a knight now. The words are the same.” The learner marks
   both kinds: a knight (True, Yes) and a knave (False, Yes). So either kind could say it.

Example why, for True on the knave row of board 2: “Ben is a knight. A knave is not the same kind as Ben. So “Ben and
I are the same kind” would be false.”

**Quiz.** What moved out: “and” sentences about a partner (“Elm and I are both knaves”). They were in 214 of 1,200
practice items and 60 of 450 check items. “And” is lesson 5's idea, and no lesson 2 card or board shows one. They are
gone from `whoCanSayItem` (`SAY_PARTNER_MENU`: the same kind, different kinds, a knight, a knave), so lesson 2's
practice, its check items, its Arcade items and its new examples all lose them. Every answer is still reachable.

- Try 1 is a twin of the boards: a partner whose kind is given, and the answer Either kind or No one.
- Then “I am a knight / knave,” a sentence that is always true or false, and one more partner.
- Card 4's own sentence (“Two plus two is four.”) is never a quiz; its twin “Two plus two is five.” can be. “I am a
  knight” and “I am a knave” have no other words, so their quizzes are the cards' sentences in a new skin.

**Pass.** Both boards right, then 3 right on the first try with no hint.

**Hint.** One kind of speaker, already checked: a kind that can't say it when there is one. For “Who could say, “A
triangle has three sides”?” it shows “The speaker is a knave.” The words: true. “A knave never says true words. So a
knave can’t say it.”

## Lesson 3 · Suppose it, then crash-test it

**See.** “A worked example” stays word for word (tests pin it): Ava says “Ben is a knave.” Ben says “Ava and I are
the same kind.” Suppose Ava is a knave: that guess crashes. “Who is who?” no longer defines “us” (lesson 4 does).

**Do.** Two boards, 12 taps.

1. “Check each case,” on the card's board. Every case of Ava and Ben. The card's guess is shown.

   | Row | Ava’s words | Ben’s words | This case |
   |---|---|---|---|
   | Shown: Ava is a knave and Ben is a knight. | False | False | Crashes |
   | Ava and Ben are both knaves. | True | True | Crashes |
   | Ava and Ben are both knights. | False | True | Crashes |
   | Ava is a knight and Ben is a knave. | True | False | Holds |

   With Ava as a knave, the two cases crash, so that guess crashes. Example why, for True on Ben's words in the last
   row: “In this case, Ava is a knight and Ben is a knave. They are different kinds, so “Ava and I are the same kind”
   is false.”

2. “When two cases hold,” a twin: “Ava’s words changed. Now Ava says, “I am a knight.”” Suppose Ava is a knight. Ben
   as a knight is shown (True, True, Holds). The learner marks Ben as a knave (True, False, Holds). The two cases both
   hold, so you can't tell what Ben is. This is the quiz's Can't tell outcome, now marked by hand.

**Quiz.** What moved out: the “us” counting words (“At least one of us is a knave,” “We are both knaves”) and
islanders who say nothing. They were in 687 of 1,200 practice items (silent: 15) and 446 of 750 check items (silent:
10). Only lesson 4 teaches them. Lesson 3 now uses the `'plain'` words: “Ben is a knave,” “I am a knight,” “the same
kind” and “different kinds.” This holds in its practice, its check items (the guess and the two-islander puzzle), its
Arcade items and its new examples (`PUZZLE_POOL`). The four tries are unchanged in kind: two guesses to crash-test
(one always crashes) and two puzzles.

**Pass.** Both boards right, then 3 right on the first try with no hint.

**Hint.** One case for the other islander, already checked: one that crashes when there is one. For “Suppose Kofi is
a knave. What must Lena be?” it shows “Kofi is a knave and Lena is a knight,” each one's words, and “Lena is a knight
with false words. That breaks the rule, so this case crashes.” The hint says: “Keep Kofi as a knave, and check Lena
as a knave the same way.” Puzzles show the first case (knights first) that is not the answer.

## Lesson 4 · Three islanders

**See.** “Start with a strong clue” was prose. It now has its board: Ava says “At least one of us is a knave.” Ben and
Cal say nothing. The card marks one case: “Try Ava as a knave. Ava counts too, so the words are true. A knave never
says true words, so that case crashes.” “A worked example” stays word for word (tests pin it).

**Do.** Two boards, 14 taps.

1. “A strong clue,” on card 2's board. Ava a knave with Ben and Cal knights is shown (True, Crashes). The learner
   marks all knaves (True, Crashes), all knights (False, Crashes), and Ava a knight with Ben a knave (True, Holds).
   Every case with Ava as a knave crashes. Example why, for False on Ava's words when all are knaves: “In this case,
   Ava, Ben and Cal are all knaves. Ava counts too, so that makes three knaves. So “At least one of us is a knave” is
   true.”
2. “Check your answer,” on the worked example's board. The card's guess (Ava a knight, Ben a knave, Cal a knight) is
   shown: True, False, False, Crashes. The learner checks the card's answer (False, True, False, Holds), then the
   answer with Cal changed (False, False, False, Crashes).

**Quiz.** Nothing moved out. Three three-islander puzzles, with the counting words and silent islanders that board 1
now marks.

**Pass.** Both boards right, then 3 right on the first try with no hint. Only 3 puzzles are planned, so more come
from the lesson's own practice until the rule is met.

**Hint.** The first case (knights first) that is not the answer, each speaker's words marked, and who breaks the rule.

## Lesson 5 · When a knave says “and” or “or”

**See.** The cards stay word for word (tests pin the first three by place). Each card's board is now built from its
words' data, so the card and the board are one object. “A knight’s or” now has a picture too (Dee's bubble).

**Do.** Three boards, 18 taps. The first two keep or cross out each of the four cases for Ava and Ben.

1. “List the cases for “and”,” on card 1's board. Cal is a knave and says “Ava and Ben are both knights.” Both
   knaves is shown (False, Keep). The learner marks both knights (True, Cross out), Ava a knight and Ben a knave
   (False, Keep) and Ava a knave and Ben a knight (False, Keep). Three cases are left: at least one is a knave.
2. “List the cases for “or”,” on card 2's board. Both knights is shown (True, Cross out). The learner marks Ava a
   knight and Ben a knave (True, Cross out), Ava a knave and Ben a knight (True, Cross out), and both knaves (False,
   Keep). One case is left.
3. “When “I” is one part,” on card 5's board (Raj: “I am a knave and Vic is a knight.” Vic says nothing). Both knaves
   is shown (False, Holds). The learner marks both knights (False, Crashes), Raj a knight and Vic a knave (False,
   Crashes), and Raj a knave and Vic a knight (True, Crashes).

Example why, for True on Cal's words when Ava is a knight and Ben is a knave: “In this case, Ben is a knave. So “Ben is
a knight” is false, and one false part makes “Ava and Ben are both knights” false.”

**Quiz.** What moved out:

- “And” / “or” questions from a knight (“Cal is a knight. Cal says …”). They were in 140 of 900 practice questions
  and 68 of 448 check questions. Every lesson 5 board, like the lesson's title, has a knave speak. They are gone from
  practice (try 3), the check (item 8) and the Arcade. The knight's “or” card stays as a key idea. A knight's “and” or
  “or” in a puzzle is still checked as a case, as board 3 does.
- The “us” counting words in lesson 5's puzzles. They were in 58 of 300 practice puzzles and 28 of 152 check puzzles.
  Lesson 5 does not teach them, so its puzzles now use the plain words plus “and” and “or” (`'andor'`).

Tries 1 and 2 are a knave's “and” and a knave's “or” about two knights, in a shuffled order: twins of boards 1 and 2
with new names. Try 3 changes one piece: the sentence names knaves (“Tia is a knave or Ben is a knave”). Try 4 is a
two-islander “and” / “or” puzzle (board 3).

**Pass.** All three boards right, then 3 right on the first try with no hint.

**Hint.** One of the four cases, already checked: one that is crossed out. For a knave's “Sol is a knight or Mo is a
knight,” it shows “Sol and Mo are both knights,” Kofi’s words true, and “A knave never says true words, so cross this
case out.”

## Changes outside the boards

- Every hint is a board row already checked (`rowCase`), in the boards' words: Holds or Crashes, Keep or Cross out.
  The old hints only named the method (“Pretend a knight says it…”, “List the four cases…”).
- `wordsMeaning` for “and” / “or” is now two short sentences. Two speakers' “and” words side by side read at grade
  7.3 before; now they read well under 7.
- `docs/audit/stop5.md` gets a note that points here.

## Tests

`src/engine/__tests__/knights.test.ts`, “See -> Do -> Quiz (skill-drill handoff)” (11 tests):

- Every lesson has boards. No marks never pass a board. At most 12 taps a board. No final-answer marks.
- Each first board is a key-idea card's own board, with that card's case shown. Each twin says what changed.
- Lesson 1: the handoff's board, the See card's words, Fay shown, and Ada and Ben with the handoff's sample taps. A
  wrong tap names the mismatch.
- Lesson 1 boards 2 and 3, lesson 2's boards, and lessons 3 to 5: every mark re-solved from the bubbles, and each
  board's last words checked against its rows.
- Every wrong option of every mark to tap has its own words, in short sentences. `checkDrill` shows them.
- The first tries are twins of the boards. No card's own question comes back as a quiz.
- Practice, check, Arcade and new examples (60 seeds) use only what each lesson teaches.
- Every hint is one case already checked, re-computed from the bubbles, and never the answer's case.
- Each lesson keeps the default pass rule.

A mutation run (Holds read as “at most one breaker”) fails three of them.

Run: `npx tsc --noEmit -p .` clean. `DRILL_ALL=1 STOP=5 npx vitest run src/engine/__tests__/stops.test.ts`: 8 of
8. `npx vitest run src/engine/__tests__/knights.test.ts`: 41 of 41. Full `npx vitest run`: 493 of 493. A sweep of
2,000 seeds (67,818 items, with new examples) found no failure and no item without a hint case.

## Shared changes requested (not made)

1. `src/engine/__tests__/stops.test.ts`: add `s5.l1` to `s5.l5` to `DRILLED`, so the See -> Do -> Quiz contract runs
   for Stop 5 without `DRILL_ALL=1`.
2. A fact on a speakers board (`types.ts` Scene `speakers`, `SceneView.tsx`): an optional line drawn above the
   bubbles, such as “The well is full.” Today lesson 1's fact can only be written in the board's words and in every
   row's label. The handoff asks for the picture that makes the sentence true or false to stay visible.
3. The runner (`LessonRunner`): an option to open a board right after its own card. Lesson 1 has three boards, and
   all six cards come first. So the well card is three cards back when its board opens. The board shows the same
   scene and says so, but See and Do would sit closer together.

## Review

An independent review of the build above (branch `drill-stop5-v`). Each problem found, the fix, and the evidence.

### Problems found and fixed

1. **Lesson 1, board 3 left out a case that holds (medium).** The board showed three cases of Dee and Eli. It left
   out “Dee is a knight and Eli is a knave,” which holds. So no board showed that, with Dee's kind unknown, two
   cases hold and disagree about Eli. But the quiz asks just that: “No one knows if Vic is a knight or a knave. Vic
   says, “Jin is a knave.” Is Jin a knight or a knave?” (Can't tell). Over 1,000 seeds it was in 310 practice
   items, 128 check items and 11 Arcade items. It was also in 154 new examples over 150 seeds. The audit above said
   board 3 taught it. **Fix:** board 3 now has all four cases. The learner marks the new one (Dee's words True,
   Holds). Its last words: “Two cases hold. If Dee is a knave, Eli is a knight. If Dee is a knight, Eli is a knave.
   So when no one knows Dee’s kind, you can’t tell what Eli is.” Lesson 1 is now 16 taps (board 3 has 6). The
   board's own questions (Dee a knight, Dee unknown, Eli a knave) joined `CARD_QUESTIONS`, so a quiz never repeats
   them. **Evidence:** knights.test checks four different cases, the two that hold, and that they disagree about
   Eli. Dropping the row fails it (“four different cases: expected 3 to be 4”).
2. **Lesson 1, board 2's last words named only the fact (low).** The quiz also asks the speaker's kind when the fact
   is unknown (“Nell the elf says, “The dragon is not asleep.” Is Nell a knight or a knave?”). **Fix:** “So you can’t
   tell if Cal can swim, or what kind Cal is.” Each case that holds now names Cal's kind too.
3. **“This is the board from the card.” did not say which card (low).** Lesson 1 has four cards with pictures,
   lesson 2 has four and lesson 4 has two. Every card comes before the boards. **Fix:** the board names its card
   (“Check a case,” “It can depend on others,” “Start with a strong clue”). **Evidence:** a new test checks that the
   card named has the board's own picture. Naming “Four answers” on lesson 2's board fails it.
4. **Lesson 1, board 1: the fact came second (low).** The speakers picture cannot draw the well. **Fix:** the
   board's first words are now “The well is full.” The fact banner is still a shared request.
5. **Lesson 2: card 4's own sentence came back as a quiz (low).** The build gave card 4 the picture “Two plus two is
   four.” That sentence is also one of the quiz's sentences, and it was not in `CARD_QUESTIONS`. It was a quiz in
   349 of 3,000 lesson 2 packs. **Fix:** it is in `CARD_QUESTIONS` now (0 of 3,000). Its twin “Two plus two is
   five.” can still come. “I am a knight” and “I am a knave” have no other words, so those quizzes stay the cards'
   sentences in a new skin.

### Checked, and no change

- **Every Do mark, worked out again apart from the engine.** A scratch script read each bubble and each row label
  with its own parser and truth rules (no `claimTrue`, no board helper). All 92 marks on the 12 boards match.
- **Every wrong option's words** were read against their board. Each names the words and who is what in that case,
  and is true there. In each row the words come first, then Holds or Crashes (or Keep or Cross out). So the first
  mismatch named is the earliest step.
- **Boards:** each is a card's own picture (the same object) or a twin with a note. No board has answer buttons. The
  most taps on one board is 9 (lesson 3, board 1).
- **Families:** we checked 1,000 seeds of practice, check and Arcade, and new examples over 150 seeds. There is no
  “and” in lesson 2. Lesson 3 has no “us” words and no silent islander. Lesson 5 has no “us” words and no “and” or
  “or” question from a knight. Lesson 4 keeps its “us” words, which its strong-clue board teaches. All 19,000
  practice items with a hint have a hint case.
- **Pass:** the default (3 right on the first try with no hint), after every board. The handoff's pass for Stop 5 is
  the two given checks, and they are on board 1. There are no include groups, so no tags are needed.
- **Considered, left as is.** Try 2 in lesson 1 is a knave's “not” sentence. The learner never taps a “not”
  sentence, but the See card and board 1 show Fay's “not” sentence marked. Try 2 changes one piece of that case
  (the kind). Lesson 4's puzzles use other counting words too (“Exactly one of us is a knight”). Its board teaches
  that “us” counts the speaker, and “exactly” and “at least” are Stop 1 words. Lesson 5's “or” board shows a
  crossed-out case, not the card's kept one. So the learner taps both answers, and tapping one answer every time
  fails.

### Browser (built app, 320 px wide)

All five lessons were opened from Journey, Stop 5. Tapping Next through the cards and then leaving did not pass any
lesson. On every board there was no sideways scroll and no answer buttons. A wrong last mark (Holds, Crashes, Keep or
Cross out) was flagged, and the status said its own words. Then every mark was set right, and the lesson went on to
the puzzles. Each lesson's first quiz showed its hint with the marked case. Every quiz item was answered right, and
each lesson ended done with its boards recorded. There were no console errors.

### Checks

`npx tsc --noEmit -p .` clean. `DRILL_ALL=1 STOP=5 npx vitest run src/engine/__tests__/stops.test.ts`: 8 of 8.
`npx vitest run src/engine/__tests__/knights.test.ts`: 41 of 41. Full `npx vitest run`: 493 of 493.

There are no new shared changes. The three requests above still stand.
