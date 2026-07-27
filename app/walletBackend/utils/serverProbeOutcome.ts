/**
 * The pure half of the Connection Doctor's probe surface: the typed outcome
 * unions and the total interpretation of decoded FFI payloads (ADR 0002:
 * errors are types; ADR 0004: consumers dispatch through exhaustive handler
 * records). Every closed possibility space is a discriminated union — no
 * boolean-plus-optional pairs, and no bare null where absence has a name.
 * Step and stage names stay open strings on the FfiErrorCode precedent:
 * upstream may add stages, and a closed union would break forward
 * compatibility on an open space.
 *
 * This module imports no native surface — type-only imports keep it
 * loadable in any test environment. The effectful wrappers live in
 * connectionProbe.ts.
 */
import type { FfiErrorCode, FfiJsonDecode } from '../ffi';

/**
 * The typed failure record of one probe stage or leg (zingolib's net-diag
 * taxonomy): the kebab-case stage, the target, and the cause chain as a
 * vector, one text per layer, outermost first. Never parsed to make
 * decisions — the stage field is the decision surface.
 */
export type ProbeFailure = {
  readonly stage: string;
  readonly target: string;
  readonly causeChain: readonly string[];
};

/** What a successful probe proves, as fields. */
export type ProbeAnswer = {
  readonly chain: string;
  readonly height: number;
};

/** The exhaustive outcome of one probe leg. */
export type ProbeLegOutcome =
  | { readonly kind: 'answered'; readonly info: ProbeAnswer }
  | { readonly kind: 'failed'; readonly failure: ProbeFailure };

/** One timed leg of a paired probe. */
export type ProbeLeg = {
  readonly millis: number;
  readonly outcome: ProbeLegOutcome;
};

/**
 * The mixnet side of a paired probe. Absence has exactly one producer —
 * the proxy was not ready to carry the leg — and it is named, never null.
 */
export type MixnetLeg =
  | { readonly kind: 'probed'; readonly leg: ProbeLeg }
  | { readonly kind: 'notCarried' };

/** One target's paired probe: the clearnet leg always runs. */
export type PairedProbeReport = {
  readonly host: string;
  readonly clearnet: ProbeLeg;
  readonly mixnet: MixnetLeg;
};

/** The exhaustive outcome of one staged sync-probe stage. */
export type SyncStageOutcome =
  | { readonly kind: 'passed' }
  | { readonly kind: 'failed'; readonly failure: ProbeFailure };

/**
 * One timed stage of the staged sync-path probe. The run stops at the
 * first failure, so a stage that does not appear was never reached.
 */
export type SyncProbeStage = {
  readonly step: string;
  readonly millis: number;
  readonly outcome: SyncStageOutcome;
};

/**
 * The staged probe's verdict: every stage passed and the server answered
 * with its identity, or the run stopped at the failing stage the stages
 * vector already carries.
 */
export type SyncServerVerdict =
  | { readonly kind: 'reachable'; readonly info: ProbeAnswer }
  | { readonly kind: 'stopped' };

/** The staged sync-path probe's report for one server. */
export type SyncServerProbeReport = {
  readonly server: string;
  readonly stages: readonly SyncProbeStage[];
  readonly verdict: SyncServerVerdict;
};

/**
 * The typed outcome of one paired-probe call:
 * - `report`: the probe ran; each target carries its two legs.
 * - `ffiRejection`: the typed error channel rejected (an unparseable uri
 *   is `InvalidInput`; an uninitialized client is its own code).
 * - `malformedPayload`: the resolution is unusable — the payload travels
 *   for diagnosis, never silently dropped.
 */
export type ServerProbeOutcome =
  | {
      readonly kind: 'report';
      readonly reports: readonly PairedProbeReport[];
    }
  | {
      readonly kind: 'ffiRejection';
      readonly code: FfiErrorCode;
      readonly message: string;
    }
  | {
      readonly kind: 'malformedPayload';
      readonly payload: string;
      readonly detail: string;
    };

export type ServerProbeOutcomeHandlers<R> = {
  [K in ServerProbeOutcome['kind']]: (
    outcome: Extract<ServerProbeOutcome, { kind: K }>,
  ) => R;
};

export function matchServerProbeOutcome<R>(
  outcome: ServerProbeOutcome,
  handlers: ServerProbeOutcomeHandlers<R>,
): R {
  return (handlers[outcome.kind] as (o: ServerProbeOutcome) => R)(outcome);
}

/**
 * The typed outcome of one staged sync-path probe call, with the same
 * rejection and malformed arms as the paired probe.
 */
export type SyncProbeOutcome =
  | { readonly kind: 'staged'; readonly probe: SyncServerProbeReport }
  | {
      readonly kind: 'ffiRejection';
      readonly code: FfiErrorCode;
      readonly message: string;
    }
  | {
      readonly kind: 'malformedPayload';
      readonly payload: string;
      readonly detail: string;
    };

export type SyncProbeOutcomeHandlers<R> = {
  [K in SyncProbeOutcome['kind']]: (
    outcome: Extract<SyncProbeOutcome, { kind: K }>,
  ) => R;
};

export function matchSyncProbeOutcome<R>(
  outcome: SyncProbeOutcome,
  handlers: SyncProbeOutcomeHandlers<R>,
): R {
  return (handlers[outcome.kind] as (o: SyncProbeOutcome) => R)(outcome);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function probeFailure(value: unknown): ProbeFailure | null {
  const failure = asRecord(value);
  if (
    failure === null ||
    typeof failure.stage !== 'string' ||
    typeof failure.target !== 'string' ||
    !isStringArray(failure.cause_chain)
  ) {
    return null;
  }
  return {
    stage: failure.stage,
    target: failure.target,
    causeChain: failure.cause_chain,
  };
}

function probeAnswer(value: unknown): ProbeAnswer | null {
  const info = asRecord(value);
  if (
    info === null ||
    typeof info.chain !== 'string' ||
    typeof info.height !== 'number'
  ) {
    return null;
  }
  return { chain: info.chain, height: info.height };
}

function probeLegOutcome(value: unknown): ProbeLegOutcome | null {
  const outcome = asRecord(value);
  if (outcome === null) {
    return null;
  }
  if (outcome.kind === 'answered') {
    const info = probeAnswer(outcome.info);
    return info === null ? null : { kind: 'answered', info };
  }
  if (outcome.kind === 'failed') {
    const failure = probeFailure(outcome.failure);
    return failure === null ? null : { kind: 'failed', failure };
  }
  return null;
}

function probeLeg(value: unknown): ProbeLeg | null {
  const leg = asRecord(value);
  if (leg === null || typeof leg.millis !== 'number') {
    return null;
  }
  const outcome = probeLegOutcome(leg.outcome);
  return outcome === null ? null : { millis: leg.millis, outcome };
}

function mixnetLeg(value: unknown): MixnetLeg | null {
  const mixnet = asRecord(value);
  if (mixnet === null) {
    return null;
  }
  if (mixnet.kind === 'notCarried') {
    return { kind: 'notCarried' };
  }
  if (mixnet.kind === 'probed') {
    const leg = probeLeg(mixnet.leg);
    return leg === null ? null : { kind: 'probed', leg };
  }
  return null;
}

function pairedReport(value: unknown): PairedProbeReport | null {
  const entry = asRecord(value);
  if (entry === null || typeof entry.host !== 'string') {
    return null;
  }
  const clearnet = probeLeg(entry.clearnet);
  const mixnet = mixnetLeg(entry.mixnet);
  return clearnet === null || mixnet === null
    ? null
    : { host: entry.host, clearnet, mixnet };
}

function syncStageOutcome(value: unknown): SyncStageOutcome | null {
  const outcome = asRecord(value);
  if (outcome === null) {
    return null;
  }
  if (outcome.kind === 'passed') {
    return { kind: 'passed' };
  }
  if (outcome.kind === 'failed') {
    const failure = probeFailure(outcome.failure);
    return failure === null ? null : { kind: 'failed', failure };
  }
  return null;
}

function syncProbeStage(value: unknown): SyncProbeStage | null {
  const stage = asRecord(value);
  if (
    stage === null ||
    typeof stage.step !== 'string' ||
    typeof stage.millis !== 'number'
  ) {
    return null;
  }
  const outcome = syncStageOutcome(stage.outcome);
  return outcome === null
    ? null
    : { step: stage.step, millis: stage.millis, outcome };
}

function syncServerVerdict(value: unknown): SyncServerVerdict | null {
  const verdict = asRecord(value);
  if (verdict === null) {
    return null;
  }
  if (verdict.kind === 'stopped') {
    return { kind: 'stopped' };
  }
  if (verdict.kind === 'reachable') {
    const info = probeAnswer(verdict.info);
    return info === null ? null : { kind: 'reachable', info };
  }
  return null;
}

/**
 * Pure, total classification of a paired-probe call: every arm of the
 * decode and every payload shape lands in exactly one outcome arm. No
 * effects, no clock, no logging — unit-testable without mocks.
 */
export function interpretServerProbe(
  decoded: FfiJsonDecode,
): ServerProbeOutcome {
  switch (decoded.kind) {
    case 'ffiRejection':
      return {
        kind: 'ffiRejection',
        code: decoded.code,
        message: decoded.message,
      };
    case 'emptyPayload':
      return { kind: 'malformedPayload', payload: '', detail: 'empty payload' };
    case 'malformedPayload':
      return {
        kind: 'malformedPayload',
        payload: decoded.payload,
        detail: decoded.detail,
      };
    case 'json': {
      if (!Array.isArray(decoded.value)) {
        return {
          kind: 'malformedPayload',
          payload: decoded.raw,
          detail: 'non-array payload',
        };
      }
      const reports: PairedProbeReport[] = [];
      for (const entry of decoded.value) {
        const report = pairedReport(entry);
        if (report === null) {
          return {
            kind: 'malformedPayload',
            payload: decoded.raw,
            detail: 'probe entry missing host or a well-formed leg',
          };
        }
        reports.push(report);
      }
      return { kind: 'report', reports };
    }
    default: {
      const unhandled: never = decoded;
      throw new Error(`unhandled decode: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Pure, total classification of a staged sync-path probe call, on the same
 * doctrine as [`interpretServerProbe`].
 */
export function interpretSyncProbe(decoded: FfiJsonDecode): SyncProbeOutcome {
  switch (decoded.kind) {
    case 'ffiRejection':
      return {
        kind: 'ffiRejection',
        code: decoded.code,
        message: decoded.message,
      };
    case 'emptyPayload':
      return { kind: 'malformedPayload', payload: '', detail: 'empty payload' };
    case 'malformedPayload':
      return {
        kind: 'malformedPayload',
        payload: decoded.payload,
        detail: decoded.detail,
      };
    case 'json': {
      const probe = asRecord(decoded.value);
      if (
        probe === null ||
        typeof probe.server !== 'string' ||
        !Array.isArray(probe.stages)
      ) {
        return {
          kind: 'malformedPayload',
          payload: decoded.raw,
          detail: 'probe missing server or stages',
        };
      }
      const stages: SyncProbeStage[] = [];
      for (const entry of probe.stages) {
        const stage = syncProbeStage(entry);
        if (stage === null) {
          return {
            kind: 'malformedPayload',
            payload: decoded.raw,
            detail: 'stage missing step or a well-formed outcome',
          };
        }
        stages.push(stage);
      }
      const verdict = syncServerVerdict(probe.verdict);
      if (verdict === null) {
        return {
          kind: 'malformedPayload',
          payload: decoded.raw,
          detail: 'verdict missing or malformed',
        };
      }
      return { kind: 'staged', probe: { server: probe.server, stages, verdict } };
    }
    default: {
      const unhandled: never = decoded;
      throw new Error(`unhandled decode: ${JSON.stringify(unhandled)}`);
    }
  }
}
