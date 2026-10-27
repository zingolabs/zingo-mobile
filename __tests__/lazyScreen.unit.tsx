import React, { Suspense } from 'react';
import 'react-native';
import Text from '@ui/primitives/Text';
import { render, screen, waitFor } from '@testing-library/react-native';
import { lazyScreen, preloadScreens } from '@app/navigation/lazyScreen';

const Hello = () => <Text>hello</Text>;

describe('lazyScreen', () => {
  test('Tests that a preloaded screen draws on its first frame when it renders', async () => {
    const Screen = lazyScreen(() => Promise.resolve({ default: Hello }));
    await Screen.preload();
    render(
      <Suspense fallback={<Text>fallback</Text>}>
        <Screen />
      </Suspense>,
    );
    expect(screen.queryByText('fallback')).toBeNull();
    expect(screen.getByText('hello')).toBeTruthy();
  });

  test('Tests that a screen not preloaded waits on the fallback and starts loading when it renders', () => {
    const spy = jest.fn();
    const Screen = lazyScreen(() => {
      spy();
      return Promise.resolve({ default: Hello });
    });
    render(
      <Suspense fallback={<Text>fallback</Text>}>
        <Screen />
      </Suspense>,
    );
    expect(screen.getByText('fallback')).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('Tests that every screen loads once when preloadScreens runs', async () => {
    const spies = [jest.fn(), jest.fn()];
    const screens = spies.map(spy =>
      lazyScreen(() => {
        spy();
        return Promise.resolve({ default: Hello });
      }),
    );
    preloadScreens(screens);
    await waitFor(() => spies.forEach(spy => expect(spy).toHaveBeenCalled()));
    await Promise.all(screens.map(s => s.preload()));
    spies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  });

  test('Tests that nothing loads when preloadScreens is cancelled at once', async () => {
    const spy = jest.fn();
    const cancel = preloadScreens([
      lazyScreen(() => {
        spy();
        return Promise.resolve({ default: Hello });
      }),
    ]);
    cancel();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(spy).not.toHaveBeenCalled();
  });
});
