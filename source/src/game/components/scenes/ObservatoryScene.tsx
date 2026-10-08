/**
 * The Pattern Observatory's pictures, one component per scene kind, in their own files (a ring's builder owns
 * its kinds). Every picture is a still frame; `revealed` tells a stepped scene how many steps are showing. Classes
 * start with "play-ob-" and live in src/styles/observatory*.css.
 */
import type { ObservatoryScene as Scene } from '../../../engine/scenes';
import { ChainView } from './ChainScene';
import { StaircaseView, MachineView, ClockView } from './RuleRiseScenes';
import { MirrorView, MatrixView, BridgeView } from './DeepSkyScenes';
import { LanternView } from './LanternScene';

export interface ObservatorySceneProps {
  scene: Scene;
  revealed?: number;
  labelId?: string;
}

export function ObservatoryScene({ scene, revealed, labelId }: ObservatorySceneProps) {
  const steps = scene.steps ?? [];
  const shown = Math.min(revealed ?? steps.length, steps.length);
  const say = steps.length && shown > 0 ? steps[shown - 1].say : '';
  let picture;
  switch (scene.kind) {
    case 'chain': picture = <ChainView scene={scene} shown={shown} />; break;
    case 'staircase': picture = <StaircaseView scene={scene} shown={shown} />; break;
    case 'machine': picture = <MachineView scene={scene} shown={shown} />; break;
    case 'clock': picture = <ClockView scene={scene} shown={shown} />; break;
    case 'mirror': picture = <MirrorView scene={scene} shown={shown} />; break;
    case 'matrix': picture = <MatrixView scene={scene} shown={shown} />; break;
    case 'bridge': picture = <BridgeView scene={scene} shown={shown} />; break;
    case 'lantern': picture = <LanternView scene={scene} shown={shown} />; break;
  }
  return (
    <div className={`play-scene play-ob play-ob--${scene.kind}`} id={labelId}>
      {picture}
      {steps.length > 0 && (
        <p className="play-case-say play-ob-say" aria-hidden="true">{say}</p>
      )}
      {steps.length > 0 && (
        <p className="play-sr" role="status" aria-live="polite">{say}</p>
      )}
    </div>
  );
}
