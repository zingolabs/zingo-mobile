import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import Banner, { BannerPlainContext } from '@ui/widgets/Banner';
import { themeTokens } from '@app/theme';

const background = (node: React.ReactElement) => {
  const { StyleSheet } = require('react-native');
  const view = render(node);
  return StyleSheet.flatten(view.getByTestId('banner').props.style)
    .backgroundColor;
};

describe('Banner in the notice stack', () => {
  test('Tests that a warning banner keeps its own colour when it is on a screen', () => {
    expect(
      background(<Banner testID="banner" tone="warning" title="Public" />),
    ).toBe(themeTokens.bgWarning);
  });

  test('Tests that a warning banner takes the shared surface when it is in the notice stack', () => {
    expect(
      background(
        <BannerPlainContext.Provider value={true}>
          <Banner testID="banner" tone="warning" title="Public" />
        </BannerPlainContext.Provider>,
      ),
    ).toBe(themeTokens.bgSurface);
  });
});
