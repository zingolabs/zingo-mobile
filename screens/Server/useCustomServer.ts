import { useRef, useState } from 'react';

import { ChainNameEnum, TranslateType } from '@app/AppState';
import { parseServerURI } from '@app/uris';
import { probeServer } from '@app/walletBackend';
import { LogLine } from './ServerLog';

type Translate = (key: string) => TranslateType;

// The custom address being edited on one network, and what its message box
// says about it. `tested` is the address that last passed a test.
type Draft = {
  host: string;
  port: string;
  log: LogLine[];
  // How many log lines were on screen before the last change.
  shown: number;
  tested: string | null;
};

const EMPTY: Draft = { host: '', port: '', log: [], shown: 0, tested: null };
const CHAINS: string[] = [
  ChainNameEnum.mainChainName,
  ChainNameEnum.testChainName,
  ChainNameEnum.regtestChainName,
];
const HOST = /^[a-z0-9.-]+$/i;

export const schemeFor = (chain: ChainNameEnum) =>
  chain === ChainNameEnum.regtestChainName ? 'http://' : 'https://';

// Splits a full address into host and port; a bare host has no port.
export const splitUrl = (url: string): [string, string] => {
  const m = /^(?:https?:\/\/)?([^/:\s]+)(?::(\d+))?/i.exec(url.trim());
  return m ? [m[1], m[2] ?? ''] : ['', ''];
};

export const hostOf = (uri: string) => splitUrl(uri)[0];

type Options = {
  translate: Translate;
  online: boolean;
  // The custom server Zingo uses on a network, if it uses one there.
  savedUri: (chain: ChainNameEnum) => string | null;
  netName: (chain: ChainNameEnum) => string;
  onSave: (chain: ChainNameEnum, uri: string) => Promise<boolean>;
};

const fill = (text: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (s, [k, v]) => s.split(`{${k}}`).join(String(v)),
    text,
  );

export const useCustomServer = ({
  translate,
  online,
  savedUri,
  netName,
  onSave,
}: Options) => {
  const t = (key: string, values: Record<string, string | number> = {}) =>
    fill(translate(`server.${key}`) as string, values);

  const initial = (): Record<string, Draft> => {
    const drafts: Record<string, Draft> = {};
    CHAINS.forEach(chain => {
      const saved = savedUri(chain as ChainNameEnum);
      if (saved) {
        const [host, port] = splitUrl(saved);
        drafts[chain] = { ...EMPTY, host, port };
      }
    });
    return drafts;
  };
  const [drafts, setDrafts] = useState<Record<string, Draft>>(initial);
  const ref = useRef(drafts);
  const [working, setWorking] = useState<'test' | 'save' | null>(null);
  // Bumped to shake the field, and to pulse Save, once each.
  const [shake, setShake] = useState(0);
  const [pulse, setPulse] = useState(0);

  const draft = (chain: ChainNameEnum): Draft => ref.current[chain] ?? EMPTY;
  const update = (chain: ChainNameEnum, next: (d: Draft) => Draft) => {
    ref.current = { ...ref.current, [chain]: next(draft(chain)) };
    setDrafts(ref.current);
  };
  const append = (chain: ChainNameEnum, lines: LogLine[]) =>
    update(chain, d => ({
      ...d,
      shown: d.log.length,
      log: [...d.log, ...lines],
    }));
  const step = (tone: LogLine['tone'], text: string, details?: string) =>
    ({ final: false, tone, text, details }) as LogLine;
  const final = (tone: LogLine['tone'], text: string) =>
    ({ final: true, tone, text }) as LogLine;

  // The address in the field, as Zingo stores it; null while it is not one.
  const uriOf = (chain: ChainNameEnum, d: Draft = draft(chain)) => {
    const parsed = parseServerURI(
      `${schemeFor(chain)}${d.host.trim()}:${d.port.trim()}`,
    );
    return parsed.kind === 'error' ? null : parsed.uri;
  };
  const savedSame = (chain: ChainNameEnum) => {
    const d = drafts[chain] ?? EMPTY;
    const saved = savedUri(chain);
    return !!saved && !!d.host.trim() && uriOf(chain, d) === saved;
  };

  const setHost = (chain: ChainNameEnum, text: string) => {
    let host = text;
    let port = draft(chain).port;
    if (/:\/\/|:\d/.test(text)) {
      const [h, p] = splitUrl(text);
      host = h;
      port = p || port;
    }
    update(chain, d => ({ ...d, host, port, log: [], shown: 0, tested: null }));
  };
  const setPort = (chain: ChainNameEnum, text: string) =>
    update(chain, d => ({
      ...d,
      port: text.replace(/\D/g, '').slice(0, 5),
      log: [],
      shown: 0,
      tested: null,
    }));
  const seed = (chain: ChainNameEnum, host: string, port: string) =>
    update(chain, () => ({ ...EMPTY, host, port }));
  const forget = (chain: ChainNameEnum) => {
    const saved = savedUri(chain);
    const [host, port] = saved ? splitUrl(saved) : ['', ''];
    seed(chain, host, port);
  };

  const fail = (chain: ChainNameEnum, lines: LogLine[]) => {
    append(chain, lines);
    setShake(s => s + 1);
    return false;
  };

  // Checks the address without switching to it. True when it is a server
  // of `chain`; the message box says each step and, on a failure, the fix.
  const test = async (
    chain: ChainNameEnum,
    fromSave = false,
  ): Promise<boolean> => {
    const d = draft(chain);
    const host = d.host.trim();
    const port = d.port.trim();
    update(chain, x => ({ ...x, log: [], shown: 0, tested: null }));
    if (!host) {
      return fail(chain, [final('bad', t('need-host'))]);
    }
    if (!HOST.test(host)) {
      return fail(chain, [final('bad', t('host-only'))]);
    }
    if (!port) {
      return fail(chain, [final('bad', t('need-port'))]);
    }
    const parsed = parseServerURI(`${schemeFor(chain)}${host}:${port}`);
    if (parsed.kind === 'error') {
      return fail(chain, [final('bad', translate(parsed.errorKey) as string)]);
    }
    setWorking(fromSave ? 'save' : 'test');
    append(chain, [step('', t('log-testing', { host, port }))]);
    if (!online) {
      setWorking(null);
      return fail(chain, [
        step('bad', t('fail-offline')),
        final('bad', t('fix-offline')),
      ]);
    }
    const result = await probeServer(parsed.uri);
    setWorking(null);
    if (!result.ok) {
      return fail(chain, [
        step('bad', result.error.message),
        final('bad', t('fix-address')),
      ]);
    }
    const probe = result.value;
    if (probe.outcome === 'unresolved') {
      return fail(chain, [
        step('bad', t('fail-dns', { host }), probe.cause),
        final('bad', t('fix-dns')),
      ]);
    }
    const ip = probe.resolved[0] ?? host;
    const reached = step(
      'ok',
      probe.literal ? t('log-literal', { ip }) : t('log-dns', { ip }),
    );
    if (probe.outcome === 'unreachable') {
      return fail(chain, [
        reached,
        step('bad', t('fail-connect', { host, port }), probe.cause),
        final('bad', t('fix-noanswer')),
      ]);
    }
    if (probe.outcome === 'noAnswer') {
      return fail(chain, [
        reached,
        step('bad', t('fail-noanswer', { port, seconds: probe.afterSeconds })),
        final('bad', t('fix-noanswer')),
      ]);
    }
    if (probe.outcome === 'refused') {
      return fail(chain, [
        reached,
        step('bad', t('fail-refused'), probe.cause),
        final('bad', t('fix-refused')),
      ]);
    }
    const answered = step('ok', t('log-info', { ms: probe.latencyMs }));
    if (probe.chainName !== chain) {
      const known = CHAINS.includes(probe.chainName);
      const got = known
        ? netName(probe.chainName as ChainNameEnum)
        : probe.chainName;
      const mismatch: LogLine = {
        ...final('bad', t('fix-chain', { got, want: netName(chain) })),
        switchTo: known
          ? {
              chain: probe.chainName as ChainNameEnum,
              label: t('switch-to', { net: got }),
            }
          : undefined,
      };
      return fail(chain, [
        reached,
        answered,
        step(
          'bad',
          t('fail-chain', { got: probe.chainName, want: chain }),
          probe.details,
        ),
        mismatch,
      ]);
    }
    const lines = [
      reached,
      answered,
      step(
        'ok',
        t('log-verified', {
          net: netName(chain),
          height: probe.blockHeight.toLocaleString('en-US'),
        }),
        probe.details,
      ),
    ];
    if (!fromSave) {
      if (savedUri(chain) === parsed.uri) {
        lines.push(final('ok', t('works-saved')));
      } else {
        lines.push(final('warn', t('works-unsaved')));
        setPulse(p => p + 1);
      }
    }
    append(chain, lines);
    update(chain, x => ({ ...x, tested: parsed.uri }));
    return true;
  };

  // Tests first unless the address has passed, so a broken server is never
  // saved; then hands it to the host to use.
  const save = async (chain: ChainNameEnum): Promise<boolean> => {
    if (working || savedSame(chain)) {
      return false;
    }
    const uri = uriOf(chain);
    if (!uri || draft(chain).tested !== uri) {
      const ok = await test(chain, true);
      if (!ok) {
        append(chain, [final('mut', t('not-saved'))]);
        return false;
      }
    }
    const target = uriOf(chain) as string;
    update(chain, d => ({
      ...d,
      shown: d.log.filter(l => !l.final).length,
      log: d.log.filter(l => !l.final),
    }));
    append(chain, [step('', t('saving'))]);
    setWorking('save');
    const ok = await onSave(chain, target);
    setWorking(null);
    append(chain, [
      ok
        ? final('ok', t('saved-now', { host: hostOf(target) }))
        : final('bad', t('save-failed', { host: hostOf(target) })),
    ]);
    return ok;
  };

  return {
    drafts,
    draft: (chain: ChainNameEnum) => drafts[chain] ?? EMPTY,
    working,
    shake,
    pulse,
    savedSame,
    setHost,
    setPort,
    seed,
    forget,
    test,
    save,
  };
};
