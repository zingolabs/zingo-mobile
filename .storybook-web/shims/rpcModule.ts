// Web stand-in for the native RPCModule bridge: every method resolves from
// the story's registered fixtures (components/storyRpc.ts). Vite aliases the
// real module to this file for the web Storybook build.
import { callRpcFixture } from '../../components/storyRpc';

export default new Proxy(
  {},
  {
    get: (_target, method) =>
      typeof method === 'string'
        ? (...args: string[]) => callRpcFixture(method, args)
        : undefined,
  },
);
