/** Pieces shared by the box pictures: the rule banner and the tint of a box's marker. */

/** The rule over a scene ("Rule: Exactly one sign is true."). */
export function RuleBanner({ rule }: { rule: string }) {
  return (
    <div className="play-rule">
      <span className="play-rule-tag">Rule</span>
      <strong>{rule}</strong>
    </div>
  );
}

/** Tint the little box marker by metal or color words in the name; brass otherwise. */
export function boxTint(name: string): string {
  const n = name.toLowerCase();
  if (/gold/.test(n)) return '#ffc93c';
  if (/silver/.test(n)) return '#c9cff0';
  if (/lead|iron|stone|gray|grey/.test(n)) return '#6b74a8';
  if (/copper|bronze|wood/.test(n)) return '#c2703d';
  if (/red/.test(n)) return '#ff4d6d';
  if (/blue/.test(n)) return '#3b82f6';
  if (/green|moss/.test(n)) return '#3cff9d';
  if (/ice/.test(n)) return '#9be7ff';
  if (/fire/.test(n)) return '#ff7a1a';
  return '#ffc93c';
}
