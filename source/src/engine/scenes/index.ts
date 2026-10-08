/** The Pattern Observatory's scene kinds. Each lives in its own file so a ring's builder can extend it. */
export type { ChainToken, MatrixCell, SceneStep } from './common';
export type { ChainScene } from './chain';
export type { StaircaseScene } from './staircase';
export type { MachineScene } from './machine';
export type { ClockScene } from './clock';
export type { MirrorScene } from './mirror';
export type { MatrixScene } from './matrix';
export type { BridgeScene } from './bridge';
export type { LanternScene } from './lantern';
import type { ChainScene } from './chain';
import type { StaircaseScene } from './staircase';
import type { MachineScene } from './machine';
import type { ClockScene } from './clock';
import type { MirrorScene } from './mirror';
import type { MatrixScene } from './matrix';
import type { BridgeScene } from './bridge';
import type { LanternScene } from './lantern';

export type ObservatoryScene = ChainScene | StaircaseScene | MachineScene | ClockScene | MirrorScene | MatrixScene | BridgeScene | LanternScene;
export const OBSERVATORY_SCENE_KINDS = ['chain', 'staircase', 'machine', 'clock', 'mirror', 'matrix', 'bridge', 'lantern'] as const;
export const isObservatoryScene = (s: { kind: string }): s is ObservatoryScene => (OBSERVATORY_SCENE_KINDS as readonly string[]).includes(s.kind);
