import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import OnboardingStage from '@ui/widgets/OnboardingStage';
import { RouteEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';

test('the branches stay mounted while the hosted screen changes from the welcome to the form', () => {
  render(
    <OnboardingStage screen={RouteEnum.StartMenu}>
      <RegText>welcome</RegText>
    </OnboardingStage>,
  );
  act(() => {
    fireEvent(screen.getByTestId('onboarding.stage'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 800 } },
    });
  });
  expect(screen.getByText('welcome')).toBeOnTheScreen();
  expect(screen.getByTestId('welcome.left.stem')).toBeOnTheScreen();

  screen.rerender(
    <OnboardingStage screen={RouteEnum.ImportUfvk}>
      <RegText>form</RegText>
    </OnboardingStage>,
  );
  expect(screen.getByText('form')).toBeOnTheScreen();
  expect(screen.queryByText('welcome')).toBeNull();
  expect(screen.getByTestId('welcome.left.stem')).toBeOnTheScreen();
});
