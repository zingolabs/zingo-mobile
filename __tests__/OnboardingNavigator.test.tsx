import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createOnboardingNavigator } from '@app/navigation/OnboardingNavigator';
import { RouteEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';

jest.unmock('@react-navigation/native');

// `__mocks__/react-native.js` only registers the real module for later
// importers, so a top-level `import { Pressable }` here lands on the empty
// shim.
const { Pressable }: typeof import('react-native') =
  jest.requireActual('react-native');

type Routes = {
  [RouteEnum.Welcome]: undefined;
  [RouteEnum.ImportWallet]: undefined;
};

const Onboarding = createOnboardingNavigator<Routes>();

const Tree: React.FC = () => (
  <NavigationContainer>
    <Onboarding.Navigator initialRouteName={RouteEnum.Welcome}>
      <Onboarding.Screen name={RouteEnum.Welcome}>
        {({ navigation }) => (
          <Pressable
            testID="go"
            onPress={() => navigation.navigate(RouteEnum.ImportWallet)}
          >
            <RegText>welcome</RegText>
          </Pressable>
        )}
      </Onboarding.Screen>
      <Onboarding.Screen name={RouteEnum.ImportWallet}>
        {({ navigation }) => (
          <Pressable testID="back" onPress={() => navigation.goBack()}>
            <RegText>form</RegText>
          </Pressable>
        )}
      </Onboarding.Screen>
    </Onboarding.Navigator>
  </NavigationContainer>
);

test('Tests that only the focused route is on stage and the branches outlive a push and a pop', () => {
  render(<Tree />);
  act(() => {
    fireEvent(screen.getByTestId('onboarding.stage'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 800 } },
    });
  });
  expect(screen.getByText('welcome')).toBeOnTheScreen();
  expect(screen.getByTestId('welcome.left.stem')).toBeOnTheScreen();

  fireEvent.press(screen.getByTestId('go'));
  expect(screen.getByText('form')).toBeOnTheScreen();
  expect(screen.queryByText('welcome')).toBeNull();
  expect(screen.getByTestId('welcome.left.stem')).toBeOnTheScreen();

  fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByText('welcome')).toBeOnTheScreen();
  expect(screen.queryByText('form')).toBeNull();
});
