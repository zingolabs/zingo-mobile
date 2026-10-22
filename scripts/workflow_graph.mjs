// Pure readers of parsed GitHub workflow and action documents.

const LOCAL_ACTION = './.github/actions/';

function steps(doc) {
  return [
    ...Object.values(doc.jobs ?? {}).flatMap(job => job.steps ?? []),
    ...(doc.runs?.steps ?? []),
  ];
}

function isLocal(uses) {
  return typeof uses === 'string' && uses.startsWith('./');
}

export function unreadInputs(doc, text) {
  return Object.keys(doc.on?.workflow_call?.inputs ?? {}).filter(
    name => !text.includes(`inputs.${name}`),
  );
}

export function unreadExpressionEnv(doc, text) {
  const keys = [
    ...Object.keys(doc.env ?? {}),
    ...Object.values(doc.jobs ?? {}).flatMap(job => Object.keys(job.env ?? {})),
  ];
  return [...new Set(keys)].filter(
    key => key.includes('-') && !text.includes(`env.${key}`),
  );
}

export function calledWorkflows(doc) {
  return Object.values(doc.jobs ?? {})
    .map(job => job.uses)
    .filter(isLocal);
}

export function undeclaredInputs(doc, calleeOf) {
  return Object.entries(doc.jobs ?? {}).flatMap(([name, job]) => {
    if (!isLocal(job.uses)) {
      return [];
    }
    const declared = Object.keys(
      calleeOf(job.uses).on?.workflow_call?.inputs ?? {},
    );
    return Object.keys(job.with ?? {})
      .filter(input => !declared.includes(input))
      .map(input => `${name}: ${input}`);
  });
}

export function stepsUsing(doc, action) {
  return steps(doc)
    .filter(
      step => typeof step.uses === 'string' && step.uses.startsWith(action),
    )
    .map(step => step.name ?? step.uses);
}

export function localActionsUsed(docs) {
  return new Set(
    docs
      .flatMap(steps)
      .map(step => step.uses)
      .filter(uses => typeof uses === 'string' && uses.startsWith(LOCAL_ACTION))
      .map(uses => uses.slice(LOCAL_ACTION.length)),
  );
}
