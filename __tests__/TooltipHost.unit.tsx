import 'react-native';
import React, { useContext, useState } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import TooltipHost, { TooltipHostContext } from '@ui/widgets/TooltipHost';
import Text from '@ui/primitives/Text';

/** Alone in its file: React reports a setState during render once per module. */
test('Tests that a host closes the bubble showing outside its render when another opens in the same batch', () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  let host: React.ContextType<typeof TooltipHostContext> = null;
  const Owner: React.FunctionComponent = () => {
    const [closed, setClosed] = useState(false);
    host = useContext(TooltipHostContext);
    ownerClose = () => setClosed(true);
    return <Text>{closed ? 'closed' : 'open'}</Text>;
  };
  let ownerClose = () => {};
  render(
    <TooltipHost>
      <Owner />
    </TooltipHost>,
  );
  act(() => {
    host?.show({
      owner: {},
      node: <Text>first tip</Text>,
      onClose: () => ownerClose(),
    });
    host?.show({ owner: {}, node: <Text>second tip</Text>, onClose: () => {} });
  });
  expect(screen.getByText('second tip')).toBeOnTheScreen();
  expect(screen.getByText('closed')).toBeOnTheScreen();
  expect(
    errors.mock.calls.some(call =>
      String(call[0]).includes('Cannot update a component'),
    ),
  ).toBe(false);
  errors.mockRestore();
});
