// Pure reader of the build pre-actions in an Xcode scheme.

const ENTITIES = {
  '&quot;': '"',
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
};

function unescape(attribute) {
  return attribute
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(quot|apos|lt|gt|amp);/g, entity => ENTITIES[entity]);
}

export function buildPreActions(xml) {
  const [, preActions] =
    xml.match(/<BuildAction[\s\S]*?<PreActions>([\s\S]*?)<\/PreActions>/) ?? [];
  return [...(preActions ?? '').matchAll(/<ActionContent\s+([\s\S]*?)>/g)].map(
    ([, attributes]) => ({
      title: unescape(attributes.match(/title\s*=\s*"([^"]*)"/)[1]),
      script: unescape(attributes.match(/scriptText\s*=\s*"([^"]*)"/)[1]),
    }),
  );
}
