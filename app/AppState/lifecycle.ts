// The foreground/background transition, made pure. classifyLifecycle maps
// (platform, prior, next) to one of four outcomes, so the container's AppState
// listener dispatches one predicate to one suspend path and one resume path
// across both platforms, and the branch table is unit-pinned without mounting
// the container.
//
// `track` records the new status and does nothing else. `ignore` is a no-op
// (the status did not change). The appStateStatus itself is written on every
// non-ignore transition, so it is not part of the outcome.

import { AppStateStatusEnum } from './enums/AppStateStatusEnum';
import { GlobalConst } from './const/GlobalConst';

export type LifecycleTransition = 'suspend' | 'resume' | 'track' | 'ignore';

const { active, inactive, background } = AppStateStatusEnum;

// iOS reports active → inactive → background, so entering background is the
// suspend and active↔inactive is a bare status track. A resume counts only from
// background. Android has no inactive step: active → any-non-active suspends and
// any-non-active → active resumes.
export function classifyLifecycle(
  platform: string,
  prior: AppStateStatusEnum,
  next: AppStateStatusEnum,
): LifecycleTransition {
  if (prior === next) {
    return 'ignore';
  }
  if (platform === GlobalConst.platformOSios) {
    if ((prior === active || prior === inactive) && next === background) {
      return 'suspend';
    }
    if (prior === background && next === active) {
      return 'resume';
    }
    return 'track';
  }
  if ((prior === inactive || prior === background) && next === active) {
    return 'resume';
  }
  if (prior === active && (next === inactive || next === background)) {
    return 'suspend';
  }
  return 'track';
}
