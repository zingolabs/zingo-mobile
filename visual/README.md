# Visual review (web)

This tool finds visual changes in the web Storybook build. It compares each
story against the committed baseline in `visual/__baseline__`. The check fails
if an image or an animation timeline is different from the baseline, if a
story has no baseline, or if a baseline has no story.

A visual change ships with its baseline update in the same PR. The reviewer
sees the new pixels in the PR diff, next to the code that caused them.

## Flow

```
yarn visual          # build storybook-static, capture, diff against the baseline
yarn visual:report   # open both reports: reg-cli (images) + motion (animations)
yarn visual:accept   # promote the CI capture of this branch → baseline, then commit
```

The accept step reads the CI run, not your machine. Pixels differ between
machines (font hinting, anti-aliasing), and CI is the renderer that gates, so
the baseline holds what the CI runner drew. The PR flow is:

1. Push. The `Visual review` check fails and links the report.
2. Review the report. If the change is intended, comment `/visual-accept` on
   the PR. A bot downloads that run's `visual-head` artifact into
   `visual/__baseline__`, commits it to the branch, and turns the check green.
   The command needs write access to the repository and a finished run for the
   current commit.
3. For a same result from a terminal, run `yarn visual:accept` on the branch,
   then commit `visual/__baseline__` and push. It downloads the run's
   `visual-head` artifact (needs the `gh` CLI, logged in).

The `/visual-accept` bot commits with `GITHUB_TOKEN` by default, which does not
retrigger the required checks on the accept commit, so the PR needs a manual
nudge to become mergeable. Set the `VISUAL_ACCEPT_TOKEN` secret to a GitHub App
installation token to retrigger CI and green the checks in one step.

`yarn visual:accept --run <id>` names a run. `yarn visual:accept --local`
promotes your own `visual/__current__` instead; use it to try the harness, and
expect CI to flag drift against it.

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
timeline spec pause the clock before the page loads and step it. Because of
this, a loop stops at the same tick every run, on any machine speed. Fonts and
layout observers run on real time, outside the fake clock, so the specs let
them land before the first step. That is why CI runs one worker: parallel
browsers on a two-core runner starve those callbacks and a sheet captures
mid-present. CSS animations and the text caret run on real time too, so the
screenshot freezes them.

What remains is a frame of jitter on a long linear animation, a few dozen
anti-aliased pixels. The image gate allows `JITTER_PIXELS` per pair (100),
far below any real change. The `globalSetup` step clears the output bundle
before each run. Therefore a renamed story or a retagged story leaves no old
artifact.

## Capture bundles

A capture writes one self-contained bundle to `VISUAL_OUT` (default
`__current__`). The bundle has three folders: `images/` (the reg-cli target),
`timelines/`, and `filmstrip/`.

`diff.mts` compares two bundles. It compares `VISUAL_CURRENT` against
`VISUAL_BASELINE` (defaults `__current__` and `__baseline__`). It writes the
report to `VISUAL_REPORT` (default `index.html`). When you set these
environment variables, CI can point the head and the base at different bundles.

Git ignores the capture outputs in `visual/`. It tracks the harness (the
specs, the config, the `*.mts` files, this file) and `__baseline__`.

## Compare against any ref, locally

```
yarn visual:compare <ref>     # e.g. origin/dev, a tag, a commit sha
```

This command captures the working tree. It builds and captures `<ref>` on a
temporary worktree, which shares `node_modules`. It diffs the two captures. It
writes the report to `visual/ci/index.html`. Both sides render on your machine,
so this is the drift-free way to see what your change did before CI runs.

The reference must contain this harness. If you compare against an older commit
that has no harness, every story reads as new.

## CI (per-PR, vs the committed baseline)

The `.github/workflows/visual-review.yaml` workflow builds and captures the PR
head, then diffs it against `visual/__baseline__` at the PR head. It uploads
two artifacts: `visual-head`, the raw capture that `yarn visual:accept`
promotes, and `visual-review`, the report. It adds the result as a comment on
the PR, with the accept command when something changed.

The runner image is the renderer of record. When GitHub updates it and the
fonts shift, every story changes at once. Accept that in one PR of its own.

## Native

This tool covers the web build only. Native is the shipping target. Native
renders through Yoga and native views, not through RNW and CSS. Therefore a web
pass does not certify the native appearance. Native visual review is a separate
tier. It uses an on-device Storybook with `simctl` or `adb`. It does not use
Detox or Maestro.
