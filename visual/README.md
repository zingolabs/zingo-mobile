# Visual review (web)

This tool finds visual changes in the web Storybook build. It compares each
component against a baseline. The `yarn visual` command fails if an image or an
animation timeline is different from the baseline.

In CI, the tool compares the branch against the base branch. It does not use a
stored baseline. On your computer, the tool compares against the `__baseline__`
folder, or against a reference with `visual:compare`.

## Flow

```
yarn visual          # build storybook-static, capture, diff — fails on any change
yarn visual:report   # open both reports: reg-cli (images) + motion (animations)
yarn visual:accept   # promote current → baseline after reviewing a real change
```

The individual steps are:

- `visual:capture` — Playwright makes the screenshots, the video, the
  timelines, and the filmstrips.
- `visual:diff` — `diff.mts` runs the image gate, the timeline gate, and the
  motion report.

## What gets captured

The tool captures each story from `storybook-static/index.json`:

- `<id>__default.png` — the story as written.
- `<id>__hover.png` and `<id>__press.png` — the tool makes these two images
  when the story shows an element with `role="button"`. RNW maps
  `accessibilityRole="button"` to this role. For the press image, the tool
  holds the pointer down. This shows the active opacity.
- One `.webm` file for each story in `__video__/`. Use this file for motion
  review.

You write the state variants (disabled, error, and each theme) as separate
stories with args. Each variant becomes its own baseline.

## Animated stories

A story with the `animated` tag (`tags: ['animated']`) does not get a pixel
diff. A continuous animation has no stable frame. The
`mixnet-timeline.spec.ts` file controls these stories.

- **Numeric timeline** (the gate) — the test steps a fake clock. At each tick,
  it reads the `stroke-dashoffset` value into `<story>.timeline.json`. It
  samples only the clean ramp. It skips the startup frame and the loop-wrap,
  because these frames change with the phase. `diff.mts` compares the values
  with a tolerance of 2 px. This tolerance is more than the run-to-run jitter
  (approximately 1 px). It is less than a real change in duration or easing
  (one step is approximately 6 px). A different curve changes the values.
- **Filmstrip** — a frozen frame at some of the ticks, in the `filmstrip/`
  folder of the bundle. The tool does not gate the filmstrip. It supplies the
  before-and-after images in the report.

To add another animated component:

1. Add its story id to the `animated` list in `mixnet-timeline.spec.ts`.
2. Point the locator at the attribute that the animation controls.

## Report

The `index.html` file (`yarn visual:report`) has two tabs. Each tab shows a
pass label or a CHANGED label. The report opens on a tab that failed, so you
find a change quickly.

- **Animations** — for each animated story, the report shows these items:
  - replays that the report rebuilds from the timeline data (the baseline, the
    current, and the two together, so a faster animation moves ahead visibly),
  - a curve overlay (the offset against time),
  - a before-and-after filmstrip,
  - the CHANGED badge or the pass badge.

  On this tab, you see a motion change. You do not only read about it.
- **Image diffs** — the report embeds the reg-cli `report.html` in the tab. It
  uses one scrollbar, not two. The side-by-side, onion, and slider viewers work
  as usual.

## Determinism

A fake clock makes the animated frames stable. `capture.spec.ts` and the
timeline spec pause the clock and step it. Because of this, a loop stops at the
same tick every run. The `globalSetup` step clears the output bundle before
each run. Therefore a renamed story or a retagged story leaves no old artifact.

## Capture bundles

A capture writes one self-contained bundle to `VISUAL_OUT` (default
`__current__`). The bundle has three folders: `images/` (the reg-cli target),
`timelines/`, and `filmstrip/`.

`diff.mts` compares two bundles. It compares `VISUAL_CURRENT` against
`VISUAL_BASELINE` (defaults `__current__` and `__baseline__`). It writes the
report to `VISUAL_REPORT` (default `index.html`). When you set these
environment variables, CI can point the head and the base at different bundles.

The tool ignores all files in `visual/` in git, except the harness. The
harness is the specs, the config, the `*.mts` files, and this file. The tool
does not commit the baselines. Seed a local baseline with `visual:accept`. Or
compare against a branch with `visual:compare`.

## Compare against any ref, locally

```
yarn visual:compare <ref>     # e.g. origin/dev, a tag, a commit sha
```

This command captures the working tree. It builds and captures `<ref>` on a
temporary worktree, which shares `node_modules`. It diffs the two captures. It
writes the report to `visual/.ci/index.html`. This is the same mechanism as CI,
but with the base that you choose.

The reference must contain this harness. If you compare against an older commit
that has no harness, every story reads as new.

## CI (per-PR, vs base branch)

The `.github/workflows/visual-review.yaml` workflow builds and captures the PR
head and its base branch. It uses the same runner for both, so the pixel
rendering is identical and there is no cross-machine drift. Then it diffs them,
uploads `visual/.ci` as an artifact, and adds the result as a comment on the
PR.

The workflow uses the base branch, not the committed `__baseline__`. Therefore
baseline drift cannot change a PR result. If the base branch has no harness yet
(the PR that adds it), every story reads as new, and the check stays green.

The local `__baseline__` folder is a convenience for `yarn visual`. You can
delete it and use only CI, if you do not want to keep baseline images in git.

## Native

This tool covers the web build only. Native is the shipping target. Native
renders through Yoga and native views, not through RNW and CSS. Therefore a web
pass does not certify the native appearance. Native visual review is a separate
tier. It uses an on-device Storybook with `simctl` or `adb`. It does not use
Detox or Maestro.
