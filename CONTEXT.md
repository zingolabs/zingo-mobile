# Context

A glossary of the ubiquitous language of this repository. Terms are added
as they are resolved in design discussions; each entry states what the
term means here, and, where useful, what it does not mean.

## CI

**Blocking check** — a PR CI job whose failure fails the pull request.
Jest, rust-shear, js-depcheck, android-dependency-analysis, the Android
build chain, and the Android integration buckets are blocking checks.

**Advisory stage** — a PR CI job that records its result without
affecting the pull request verdict. The per-PR iOS pipeline is an
advisory stage; ci-nightly remains the enforced iOS gate.

**Verdict path** — the longest chain of blocking checks; its wall-clock
length is the time from push to PR verdict. Advisory stages are never on
the verdict path.

**Bucket** — a group of Android integration tests that share one CI job,
so runner setup and emulator boot amortize across the group instead of
being paid once per test.

**Fail-all** — the policy that the first failure of any blocking check
cancels the entire run at once, rather than letting the surviving checks
run to completion for diagnostic completeness. Under fail-all, one red
run reports the first failure found, not necessarily every failure
present.

**Artifact gate** — a step inside a job that waits for a named artifact
from an upstream job in the same run, instead of a `needs:` edge between
the jobs. It lets a job front-load work that does not depend on the
artifact, and it must abort promptly with a clear message when the
upstream job that produces the artifact concludes without success.
