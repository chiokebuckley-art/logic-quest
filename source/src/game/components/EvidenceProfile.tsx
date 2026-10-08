/** The evidence profile of one Observatory place: five chevrons, lit as the learner shows each thing. */
import { PROFILE_LABELS, type Profile } from '../../engine/evidence';

export function EvidenceProfile({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const state = (key: (typeof PROFILE_LABELS)[number]['key']): 'on' | 'due' | 'off' => {
    switch (key) {
      case 'practiced': return profile.practiced ? 'on' : 'off';
      case 'complete': return profile.complete ? 'on' : 'off';
      case 'independent': return profile.independent ? 'on' : profile.independentDue ? 'due' : 'off';
      case 'transferred': return profile.transferred ? 'on' : 'off';
      case 'retained': return profile.retained >= 3 ? 'on' : profile.reviewDue ? 'due' : 'off';
    }
  };
  const words = PROFILE_LABELS.map((l) => `${l.label}: ${state(l.key) === 'on' ? 'yes' : state(l.key) === 'due' ? 'open now' : 'not yet'}${l.key === 'retained' && profile.retained ? ` (${profile.retained} of 3)` : ''}`).join('. ');
  return (
    <div className={`play-profile-wrap${compact ? ' is-compact' : ''}`}>
      <ol className="play-profile" aria-label={`Evidence profile. ${words}.`}>
        {PROFILE_LABELS.map((l) => {
          const st = state(l.key);
          return (
            <li key={l.key} className={st === 'on' ? 'is-on' : st === 'due' ? 'is-due' : ''} title={l.means} aria-hidden="true">
              {l.label}{l.key === 'retained' && profile.retained > 0 && profile.retained < 3 ? ` ${profile.retained}/3` : ''}
            </li>
          );
        })}
      </ol>
      {!compact && <p className="play-profile-note">Lesson complete is a gate, not mastery. Independent, transferred and retained come from fresh items on later days.</p>}
    </div>
  );
}
