import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import NoticeStack, { Notice } from '@ui/widgets/NoticeStack';

const notice = (key: string): Notice => ({
  key,
  node: React.createElement('View', { testID: `card.${key}` }),
});

const renderStack = (notices: Notice[], onHeight = jest.fn()) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <NoticeStack notices={notices} onHeight={onHeight} />
    </ContextAppLoadedProvider>,
  );

const measure = (key: string, height: number) =>
  fireEvent(screen.getByTestId(`card.${key}`).parent!, 'layout', {
    nativeEvent: { layout: { height } },
  });

test('Tests that the label offers the hidden notices when two notices pile up. Pressing it switches to Show less.', () => {
  renderStack([notice('seed'), notice('price')]);
  expect(screen.getByText('notices.more-one')).toBeTruthy();
  fireEvent.press(screen.getByTestId('noticestack.toggle'));
  expect(screen.getByText('notices.less')).toBeTruthy();
});

test('Tests that no label renders when the stack holds one notice.', () => {
  renderStack([notice('price')]);
  expect(screen.queryByTestId('noticestack.toggle')).toBeNull();
});

test('Tests that the reported height grows when the pile expands. Collapsed, the cards behind the front one add a 12 pt peek each.', () => {
  const onHeight = jest.fn();
  renderStack([notice('seed'), notice('price')], onHeight);
  measure('seed', 80);
  measure('price', 46);
  expect(onHeight).toHaveBeenLastCalledWith(10 + 80 + 12 + 26 + 12);
  fireEvent.press(screen.getByTestId('noticestack.toggle'));
  expect(onHeight).toHaveBeenLastCalledWith(10 + 80 + 10 + 46 + 26 + 12);
});
