/**
 * Read-aloud for the play screens, using only the browser's own voices (window.speechSynthesis).
 * Also the plain-English words for cards, scenes and items, shared by speech and screen-reader labels.
 * Everything here is safe to import in tests and on a server: nothing touches `window` until called.
 */
import type { Item, Scene, Thing } from '../engine/types';

export const SPEECH_RATE = 0.95;

function synth(): SpeechSynthesis | null {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    if (typeof SpeechSynthesisUtterance === 'undefined') return null;
    return window.speechSynthesis;
  } catch {
    return null;
  }
}

/** True when this browser has a reading voice. */
export function canSpeak(): boolean {
  return synth() !== null;
}

/** English voices, best first. Many devices ship robotic "compact" voices; those go last. */
function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  try {
    const score = (v: SpeechSynthesisVoice) => {
      let n = 0;
      if (/en[-_]US/i.test(v.lang)) n += 2;
      if (/samantha|ava|allison|karen|moira|daniel|serena|google (us|uk) english|aria|jenny|michelle|libby|sonia/i.test(v.name)) n += 5;
      if (/enhanced|premium|natural|neural|online/i.test(v.name)) n += 4;
      if (/compact|eloquence|fred|zarvox|albert|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|whisper|wobble/i.test(v.name)) n -= 8;
      return n;
    };
    const en = s.getVoices().filter((v) => /^en/i.test(v.lang));
    en.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    return en[0] ?? null;
  } catch {
    return null;
  }
}

/** Give a line an end mark so the voice pauses after it. */
export function asSentence(text: string): string {
  const t = text.trim();
  if (!t) return '';
  return /[.!?:;…"”']$/.test(t) ? t : `${t}.`;
}

/**
 * Words as a voice should say them. Rule brackets are spoken ("not, open bracket, red and big, close bracket"),
 * because silent brackets make NOT (red AND big) sound like NOT red AND big. Capital AND / OR / NOT are
 * lowercased so no voice spells them out, and the "·" separator becomes a pause.
 */
export function spoken(text: string): string {
  let t = text;
  // Grid marks and dashes as words: "A check mark (✓) means yes" loses the symbol; a lone ✓ becomes "check mark".
  t = t.replace(/\s*\((✓|✗)\)/g, '').replace(/✗s\b/g, 'crosses').replace(/✓/g, 'check mark').replace(/✗/g, 'cross').replace(/\s–\s/g, ', ');
  // Only brackets around logic words are read out; "(tallest first)" in plain prose stays as it is.
  for (let i = 0; i < 3; i++) t = t.replace(/\(([^()]*\b(?:AND|OR|NOT)\b[^()]*)\)/g, ', open bracket, $1, close bracket,');
  t = t.replace(/\bNOT\s*,\s*open bracket/g, 'not, open bracket');
  t = t.replace(/\b(AND|OR|NOT)\b/g, (w) => w.toLowerCase());
  t = t.replace(/\s*·\s*/g, ', ');
  return t.replace(/,\s*,/g, ',').replace(/,\s*([.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim().replace(/,$/, '');
}

/**
 * Split text into short pieces. Some browsers stop a single long utterance after about 15 seconds,
 * so each piece is at most about 180 characters and ends on a sentence break when it can.
 */
export function speechChunks(text: string | readonly string[], max = 180): string[] {
  const all = (typeof text === 'string' ? [text] : [...text]).map((t) => asSentence(spoken(t))).filter(Boolean).join(' ');
  // No regex lookbehind here: older Safari (iOS 15 and below) cannot parse it, and the whole app would not load.
  const parts = all.replace(/([.!?…])\s+/g, '$1\u0000').split('\u0000').map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    if (cur && cur.length + 1 + p.length > max) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur} ${p}` : p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

let token = 0;

/**
 * Read text aloud at a calm rate. Stops anything already being read.
 * `onEnd` runs once when the reading finishes, fails, or is replaced by another call.
 * Returns false when this browser cannot read aloud.
 */
export function speak(text: string | readonly string[], opts: { onEnd?: () => void } = {}): boolean {
  const s = synth();
  const chunks = speechChunks(text);
  if (!s || !chunks.length) return false;
  const mine = ++token;
  let ended = false;
  let started = false;
  let check = 0;
  const end = () => {
    if (ended) return;
    ended = true;
    window.clearInterval(check);
    opts.onEnd?.();
  };
  try {
    s.cancel();
    s.resume();
    const voice = pickVoice(s);
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = SPEECH_RATE;
      u.pitch = 1;
      u.lang = voice?.lang ?? 'en-US';
      if (voice) u.voice = voice;
      u.onstart = () => { started = true; };
      u.onerror = end;
      if (i === chunks.length - 1) u.onend = end;
      s.speak(u);
    });
    // A later speak() or stopSpeaking() ends this one, and so does a voice that went quiet without an end event.
    check = window.setInterval(() => {
      if (token !== mine || (started && !s.speaking && !s.pending)) end();
    }, 500);
    return true;
  } catch {
    end();
    return false;
  }
}

/** Stop reading right away. Safe to call at any time. */
export function stopSpeaking(): void {
  token++;
  const s = synth();
  try {
    s?.cancel();
  } catch {
    /* nothing to stop */
  }
}

// ---------- words for cards, scenes and items ----------

/** "big red circle", or "face-down card". Marks add ", marked yes" / ", marked no". */
export function thingName(t: Thing): string {
  const base = t.hidden ? 'face-down card' : `${t.size} ${t.color} ${t.shape}`;
  if (t.mark === 'yes') return `${base}, marked yes`;
  if (t.mark === 'no') return `${base}, marked no`;
  return base;
}

/**
 * What a scene says, as lines to read aloud. revealed: for a case board shown one step at a time, how many steps
 * are showing (default: all of them).
 */
export function sceneSpeech(scene: Scene, revealed?: number): string[] {
  switch (scene.kind) {
    case 'things':
      // Numbered, because explanations say "Card 2" and "face-down card 3".
      return scene.things.map((t, i) => `Card ${i + 1}: ${thingName(t)}.`);
    case 'boxes':
      return [
        asSentence(scene.rule),
        ...scene.boxes.map((b) => `${b.name} sign: ${asSentence(b.sign)}`),
      ];
    case 'clues':
      return [
        ...scene.clues.map((c, i) => `Clue ${i + 1}: ${asSentence(c)}${scene.marks?.[i] ? ` ${scene.marks[i] === 'ok' ? 'It holds.' : 'It is broken.'}` : ''}`),
        ...(scene.line ? [`The line, ${scene.line.first.toLowerCase()} to ${scene.line.last.toLowerCase()}: ${scene.line.names.join(', ')}.`] : []),
      ];
    case 'text':
      return scene.lines.map(asSentence);
    case 'speakers':
      return [
        ...(scene.rule ? [asSentence(scene.rule)] : []),
        ...(scene.fact ? [`What is true: ${asSentence(scene.fact)}`] : []),
        ...scene.speakers.map((sp) => (sp.says.trim() ? `${sp.name} says: ${asSentence(sp.says)}` : `${sp.name} says nothing.`)),
      ];
    case 'grid': {
      // Row by row, every box: "Mia: cat yes, dog no, fish blank."
      const word = (m: 'yes' | 'no' | undefined) => m ?? 'blank';
      return [
        ...(scene.caption ? [asSentence(scene.caption)] : []),
        ...scene.rows.map((r) => `${r.label}: ${scene.cols.map((c) => `${c.label}: ${word(scene.marks[r.id]?.[c.id])}${scene.labels?.[r.id]?.[c.id] ? `, ${scene.labels[r.id][c.id]}` : ''}`).join('; ')}.`),
      ];
    }
    case 'cases': {
      // The rule and the signs, every verdict on the board, then the worked steps shown so far.
      const steps = scene.steps ?? [];
      const shown = Math.min(revealed ?? steps.length, steps.length);
      const own = steps.length > 0 && shown < steps.length ? scene.pretend : undefined;
      const lines = [asSentence(scene.rule), ...scene.boxes.map((b) => `${b.name} sign: ${asSentence(b.sign)}`)];
      scene.boxes.forEach((b, k) => {
        const v = scene.verdicts?.[k];
        const n = scene.counts?.[k];
        if (!v || k === own) return;
        lines.push(`${b.name}: ${n !== null && n !== undefined ? `${n} true sign${n === 1 ? '' : 's'}, ` : ''}${v === 'keep' ? 'kept' : 'crossed out'}.`);
      });
      if (steps.length) lines.push(...steps.slice(0, shown).map((st) => st.say));
      else if (scene.pretend !== undefined && scene.stamps) {
        lines.push(`Picked: ${scene.boxes[scene.pretend].name}.`, ...scene.boxes.map((b, i) => `${b.name} sign: ${scene.stamps![i] ? 'True' : 'False'}.`));
      }
      return lines;
    }
  }
}

/** The whole item as lines to read aloud: the question, the scene, then the choices. */
export function itemSpeech(item: Item): string[] {
  const lines = [asSentence(item.prompt)];
  if (item.scene) lines.push(...sceneSpeech(item.scene));
  switch (item.kind) {
    case 'choose':
      lines.push('Your choices are:', ...item.choices.map((c) => asSentence(c.label)));
      break;
    case 'tapall':
      lines.push(`The cards to choose from: ${item.things.map(thingName).join(', ')}.`);
      break;
    case 'order':
      lines.push(`Put these in order, from ${item.firstLabel.toLowerCase()} to ${item.lastLabel.toLowerCase()}: ${item.names.map((n) => n.label).join(', ')}.`);
      break;
    case 'assign':
      if (item.layout === 'toggles') {
        // The speakers scene has already read each islander and their words.
        if (item.scene?.kind !== 'speakers') lines.push(`The people: ${item.people.map((p) => p.label).join(', ')}.`);
        const vals = item.categories[0]?.values.map((v) => v.label.toLowerCase()) ?? [];
        lines.push(`Choose ${vals.join(' or ')} for each one.`);
      } else {
        lines.push(`The rows: ${item.people.map((p) => p.label).join(', ')}.`);
        for (const c of item.categories) lines.push(`${c.label}: ${c.values.map((v) => v.label).join(', ')}.`);
        lines.push(item.categories.length > 1 ? 'Give each row one yes in each grid.' : 'Give each row one yes in the grid.');
      }
      break;
    case 'multi':
      lines.push('Your choices are:', ...item.choices.map((c) => asSentence(c.label)));
      break;
  }
  return lines;
}
