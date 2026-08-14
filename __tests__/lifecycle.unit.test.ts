/**
 * classifyLifecycle — the pure fg/bg transition the container's AppState
 * listener dispatches on. Pins the branch table for both
 * platforms so the two suspend paths collapse into one predicate without a
 * behavior change, unit-driven without mounting the container.
 */

import { classifyLifecycle } from '../app/AppState/lifecycle';
import { AppStateStatusEnum } from '../app/AppState/enums/AppStateStatusEnum';

const { active, inactive, background, unknown } = AppStateStatusEnum;

describe('classifyLifecycle', () => {
  it('a status that does not change is ignore, on either platform', () => {
    for (const p of ['ios', 'android']) {
      expect(classifyLifecycle(p, active, active)).toBe('ignore');
      expect(classifyLifecycle(p, background, background)).toBe('ignore');
    }
  });

  describe('iOS: active → inactive → background, resume only from background', () => {
    it('entering background suspends, from active or inactive', () => {
      expect(classifyLifecycle('ios', active, background)).toBe('suspend');
      expect(classifyLifecycle('ios', inactive, background)).toBe('suspend');
    });

    it('background → active resumes; inactive → active only tracks', () => {
      expect(classifyLifecycle('ios', background, active)).toBe('resume');
      expect(classifyLifecycle('ios', inactive, active)).toBe('track');
    });

    it('active ↔ inactive and background → inactive are bare tracks', () => {
      expect(classifyLifecycle('ios', active, inactive)).toBe('track');
      expect(classifyLifecycle('ios', background, inactive)).toBe('track');
    });

    it('an unknown-prior edge to background tracks, it is not a suspend', () => {
      expect(classifyLifecycle('ios', unknown, background)).toBe('track');
    });
  });

  describe('android: no inactive step, any-non-active suspends from active', () => {
    it('active → inactive or background suspends', () => {
      expect(classifyLifecycle('android', active, inactive)).toBe('suspend');
      expect(classifyLifecycle('android', active, background)).toBe('suspend');
    });

    it('inactive or background → active resumes', () => {
      expect(classifyLifecycle('android', inactive, active)).toBe('resume');
      expect(classifyLifecycle('android', background, active)).toBe('resume');
    });

    it('inactive ↔ background moves are bare tracks', () => {
      expect(classifyLifecycle('android', inactive, background)).toBe('track');
      expect(classifyLifecycle('android', background, inactive)).toBe('track');
    });
  });

  it('active → background suspends and background → active resumes on both platforms', () => {
    for (const p of ['ios', 'android']) {
      expect(classifyLifecycle(p, active, background)).toBe('suspend');
      expect(classifyLifecycle(p, background, active)).toBe('resume');
    }
  });
});
