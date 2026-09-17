/**
 * @format
 */

import 'react-native';
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import MeetIronwood from '@screens/MeetIronwood';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum, SettingsNameEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// The screen owns the persisted "already onboarded" flag now, so the file
// layer is stubbed rather than reaching for RNFS.
const mockWriteSettings = jest.fn();
jest.mock('@app/services/SettingsFileImpl', () => ({
  __esModule: true,
  default: {
    readSettings: jest.fn(),
    writeSettings: (...args: unknown[]) => mockWriteSettings(...args),
  },
}));

// The shared reanimated/gesture mocks predate this screen and don't cover the
// APIs it uses. Overriding locally keeps the other 50-odd suites on the shared
// ones — none of the animation behaviour is under test here, only the flag.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  // `FadeInUp.duration(420).delay(140).withInitialValues({}).reduceMotion(x)`
  // — every builder method returns the builder.
  const builder: Record<string, unknown> = {};
  for (const m of [
    'duration',
    'delay',
    'withInitialValues',
    'reduceMotion',
    'springify',
  ]) {
    builder[m] = () => builder;
  }
  return {
    __esModule: true,
    default: { View },
    FadeInUp: builder,
    ReduceMotion: { System: 'system' },
    Extrapolation: { CLAMP: 'clamp' },
    useSharedValue: (v: unknown) => ({ value: v }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: unknown) => v,
    cancelAnimation: () => {},
    runOnJS: (fn: unknown) => fn,
    interpolate: (v: number) => v,
    interpolateColor: () => 'transparent',
  };
});

jest.mock('react-native-gesture-handler', () => {
  const pan: Record<string, unknown> = {};
  for (const m of [
    'activeOffsetX',
    'onBegin',
    'onUpdate',
    'onEnd',
    'onFinalize',
  ]) {
    pan[m] = () => pan;
  }
  return {
    __esModule: true,
    Gesture: { Pan: () => pan },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    ScrollView: jest.requireActual('react-native').ScrollView,
  };
});

// The shared @react-navigation/native mock stubs useFocusEffect out entirely,
// which would leave the hardware-back path unreachable. Run the callback so
// the BackHandler subscription registers.
jest.mock('@react-navigation/native', () => {
  const actualMock = jest.requireActual(
    '../__mocks__/@react-navigation/native',
  );
  const react = jest.requireActual('react');
  return {
    ...actualMock,
    useFocusEffect: (cb: React.EffectCallback) => react.useEffect(cb, [cb]),
  };
});

function renderScreen() {
  const navigate = jest.fn();
  const reset = jest.fn();
  const props: any = {
    navigation: { ...mockNavigation, navigate, reset },
    route: { key: 'Key-1', name: RouteEnum.MeetIronwood, params: undefined },
  };
  const utils = render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: mockTranslate }}
    >
      <MeetIronwood {...props} />
    </ContextAppLoadedProvider>,
  );
  return { ...utils, navigate, reset };
}

const seenWrites = () =>
  mockWriteSettings.mock.calls.filter(
    ([name]) => name === SettingsNameEnum.ironwoodOnboardSeen,
  );

describe('MeetIronwood seen flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('is not written just for opening the screen', () => {
    // The whole point of moving the write off the launch path: arriving here
    // and being killed before reading anything must not spend the onboarding.
    renderScreen();

    expect(seenWrites()).toHaveLength(0);
  });

  test('is written once the last page is reached', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('meetironwood.primary'));

    expect(seenWrites()).toEqual([
      [SettingsNameEnum.ironwoodOnboardSeen, true],
    ]);
  });

  test('is written when the user backs out, even from the first page', () => {
    // Re-showing a modal somebody just dismissed would be a nag; the History
    // banner remains as the way back in.
    // `__mocks__/react-native.js` is the manual mock for the module and only
    // registers the real one for later importers, so a top-level
    // `import { BackHandler } from 'react-native'` here lands on the empty
    // shim. requireActual reaches the same instance the screen imports.
    const { BackHandler } = jest.requireActual('react-native');
    const addEventListener = jest.spyOn(BackHandler, 'addEventListener');
    const { reset } = renderScreen();

    const [, onBack] = addEventListener.mock.calls[0];
    (onBack as () => boolean)();

    expect(seenWrites()).toEqual([
      [SettingsNameEnum.ironwoodOnboardSeen, true],
    ]);
    expect(reset).toHaveBeenCalled();
  });

  test('is written at most once, however many pages are crossed', () => {
    // writeSettings rewrites the entire settings file; paging back and forth
    // must not turn into a burst of read-modify-writes.
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('meetironwood.primary'));
    fireEvent.press(getByTestId('meetironwood.back'));
    fireEvent.press(getByTestId('meetironwood.primary'));

    expect(seenWrites()).toHaveLength(1);
  });
});
