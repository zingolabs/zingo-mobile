import { pinGlobals } from '@app/utils/pinGlobals';

const lazy = (target: Record<string, unknown>, name: string, value: unknown) =>
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    get() {
      Object.defineProperty(target, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      return value;
    },
  });

/**
 * The React Native Babel preset emits sloppy-mode modules, so a plain
 * assignment is ignored rather than thrown; the binding keeps its value
 * either way.
 */
test('Tests that a pinned global keeps its value when a module reassigns or redefines it.', () => {
  const realFetch = () => 'real';
  const target: Record<string, unknown> = { fetch: realFetch };
  pinGlobals(target);
  target.fetch = () => 'evil';
  expect(target.fetch).toBe(realFetch);
  expect(() => Object.defineProperty(target, 'fetch', { value: 1 })).toThrow(
    TypeError,
  );
  expect(delete target.fetch).toBe(false);
  expect(target.fetch).toBe(realFetch);
});

test('Tests that a lazy React Native global is resolved and then pinned when it has not been read yet.', () => {
  const timer = () => 1;
  const target: Record<string, unknown> = {};
  lazy(target, 'setTimeout', timer);
  pinGlobals(target);
  expect(Object.getOwnPropertyDescriptor(target, 'setTimeout')).toEqual({
    value: timer,
    writable: false,
    configurable: false,
    enumerable: true,
  });
});

test('Tests that pinning skips globals the runtime does not define and survives a second run.', () => {
  const target: Record<string, unknown> = { fetch: () => 'real' };
  pinGlobals(target);
  expect(() => pinGlobals(target)).not.toThrow();
  expect('WebSocket' in target).toBe(false);
});
