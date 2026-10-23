/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Route } from '@app/AppState';
import CustomTabBar from './CustomTabBar';
import { tabBarCompact } from './tabBarScroll';
import { withAppContext } from '../../.storybook/storyDecorators';

const routes = [Route.History, Route.Send, Route.Receive, Route.Swap].map(
  name => ({ key: `${name}-key`, name, params: undefined }),
);

/** The bar over a plain canvas, full or shrunk as a scrolled list leaves it. */
const Bar = ({ index, shrunk }: { index: number; shrunk: boolean }) => {
  useEffect(() => {
    tabBarCompact.value = shrunk ? 1 : 0;
    return () => {
      tabBarCompact.value = 0;
    };
  }, [shrunk]);
  const props = {
    state: { index, routes },
    navigation: {
      emit: () => ({ defaultPrevented: true }),
      dispatch: () => {},
    },
  } as unknown as BottomTabBarProps;
  return (
    <View style={{ height: 160 }}>
      <CustomTabBar {...props} />
    </View>
  );
};

const meta: Meta<typeof Bar> = {
  title: 'Components/TabBar',
  component: Bar,
  decorators: [withAppContext()],
  args: { index: 0, shrunk: false },
};

export default meta;
type Story = StoryObj<typeof Bar>;

export const Normal: Story = {};
export const SwapSelected: Story = { args: { index: 3 } };
export const Shrunk: Story = { tags: ['static'], args: { shrunk: true } };
