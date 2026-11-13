import { PINNED, pinGlobals } from '@app/utils/pinGlobals';

type Target = Record<string, unknown>;

const lazy = (target: Target, name: string, value: unknown) => {
  let reads = 0;
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    get() {
      reads += 1;
      Object.defineProperty(target, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      return value;
    },
  });
  return () => reads;
};

const RENDERER_PRIVATE = [
  'queueReactNativeMicrotask',
  'clearReactNativeMicrotask',
];

const installedBy = (bridgeless: boolean): string[] => {
  const names: string[] = [];
  jest.isolateModules(() => {
    jest.doMock('react-native/Libraries/Utilities/PolyfillFunctions', () => ({
      polyfillGlobal: (name: string) => {
        names.push(name);
      },
      polyfillObjectProperty: () => {},
    }));
    const host = globalThis as Target;
    const previous = host.RN$Bridgeless;
    host.RN$Bridgeless = bridgeless;
    try {
      require('react-native/Libraries/Core/setUpXHR');
      require('react-native/Libraries/Core/setUpTimers');
    } finally {
      host.RN$Bridgeless = previous;
    }
  });
  return names;
};

test('Tests that a write to a pinned global throws when a module assigns to it after the pin.', () => {
  const realFetch = () => 'real';
  const target: Target = { fetch: realFetch };
  pinGlobals(target);
  expect(() => {
    target.fetch = () => 'evil';
  }).toThrow(TypeError);
  expect(() => Object.defineProperty(target, 'fetch', { value: 1 })).toThrow(
    TypeError,
  );
  expect(Reflect.deleteProperty(target, 'fetch')).toBe(false);
  expect(target.fetch).toBe(realFetch);
});

test('Tests that a lazy React Native global resolves once when it is pinned.', () => {
  const timer = () => 1;
  const target: Target = {};
  const reads = lazy(target, 'setTimeout', timer);
  pinGlobals(target);
  expect(target.setTimeout).toBe(timer);
  expect(target.setTimeout).toBe(timer);
  expect(reads()).toBe(1);
  const pinned = Object.getOwnPropertyDescriptor(target, 'setTimeout');
  expect(pinned?.configurable).toBe(false);
  expect(pinned?.enumerable).toBe(true);
  expect(typeof pinned?.set).toBe('function');
});

test('Tests that a pinned global keeps rejecting writes when Fast Refresh runs the pin a second time.', () => {
  const realFetch = () => 'real';
  const target: Target = { fetch: realFetch };
  pinGlobals(target);
  pinGlobals(target);
  expect(() => {
    target.fetch = () => 'evil';
  }).toThrow(TypeError);
  expect(target.fetch).toBe(realFetch);
});

test('Tests that an inherited global stays on its prototype when the target holds no own binding for it.', () => {
  const realFetch = () => 'real';
  const target: Target = Object.create({ fetch: realFetch });
  pinGlobals(target);
  expect(Object.getOwnPropertyDescriptor(target, 'fetch')).toBeUndefined();
  expect(target.fetch).toBe(realFetch);
});

test('Tests that the pinned set equals the host globals React Native installs when setUpXHR and setUpTimers run in both bridge modes.', () => {
  const installed = [...installedBy(true), ...installedBy(false)].filter(
    name => !RENDERER_PRIVATE.includes(name),
  );
  expect(new Set(PINNED)).toEqual(new Set(installed));
});

test('Tests that a write to a pinned global throws when the writer discards the [[Set]] result, as a sloppy-mode module does. A data pin answers false there and the write completes as a silent no-op.', () => {
  const realFetch = () => 'real';
  const target: Target = { fetch: realFetch };
  pinGlobals(target);
  expect(() => Reflect.set(target, 'fetch', () => 'evil')).toThrow(TypeError);
  expect(target.fetch).toBe(realFetch);
});
