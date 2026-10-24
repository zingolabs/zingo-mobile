import React, { useContext, useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  ReduceMotion,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  BottomTabBarHeightCallbackContext,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { themeTokens } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { Route } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import {
  HomeTabIcon,
  ReceiveTabIcon,
  SendTabIcon,
  SwapTabIcon,
} from '@ui/primitives/Icons/TabIcons';
import { expandTabBar, tabBarCompact } from './tabBarScroll';

/**
 * The tab bar is the one place drawn at the prototype's own values (the
 * designer's exception): its size, the 28 pt marks and the 11 pt names.
 */
const FULL = {
  width: 366,
  height: 66,
  pad: 5,
  radius: 33,
  capsule: 28,
  bottom: 22,
};
const SHRUNK = {
  width: 250,
  height: 50,
  pad: 4,
  radius: 25,
  capsule: 21,
  bottom: 26,
};
const ICON = 28;
const NAME_H = 14;
const NAME_GAP = 3;
const PRESSED = 0.88;
const SHRUNK_ICON = 0.86;
/** The bar keeps this gutter on a narrow phone. */
const GUTTER = 16;
const FADE_COLORS = ['transparent', themeTokens.bgScrim];

const idle = {
  color: themeTokens.fgTabIdle,
  leaf: themeTokens.fgTabIdle,
  vein: themeTokens.bgTabBar,
};
const selected = {
  color: themeTokens.fgTabSelected,
  leaf: themeTokens.fgAccent,
  vein: themeTokens.bottomSheetBorder,
};

type Paint = typeof idle;

/** Each tab's mark, drawn in the given colours, and the catalog key of its name. */
function tabOf(routeName: string): {
  icon: (paint: Paint) => React.ReactElement;
  label: string;
} {
  if (routeName === Route.History) {
    return {
      icon: paint => <HomeTabIcon size={ICON} {...paint} />,
      label: 'loadedapp.tab-home',
    };
  }
  if (routeName === Route.Send) {
    return {
      icon: paint => <SendTabIcon size={ICON} {...paint} />,
      label: 'loadedapp.tab-send',
    };
  }
  if (routeName === Route.Swap) {
    return {
      icon: paint => <SwapTabIcon size={ICON} {...paint} />,
      label: 'loadedapp.tab-swap',
    };
  }
  return {
    icon: paint => <ReceiveTabIcon size={ICON} {...paint} />,
    label: 'loadedapp.tab-receive',
  };
}

const colorMotion = {
  duration: duration.tabColor,
  easing: ease.standard,
  reduceMotion: ReduceMotion.System,
};
const barMotion = {
  duration: duration.tabBar,
  easing: ease.emphasized,
  reduceMotion: ReduceMotion.System,
};

/** One tab: the mark over its name, its colours fading between the two states. */
const Tab = ({
  routeName,
  focused,
  label,
  onPress,
  onLongPress,
  testID,
}: {
  routeName: string;
  focused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  testID: string;
}) => {
  const tab = tabOf(routeName);
  const on = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);
  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, colorMotion);
  }, [focused, on]);

  const icon = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          press.value *
          interpolate(tabBarCompact.value, [0, 1], [1, SHRUNK_ICON]),
      },
    ],
  }));
  const onLayer = useAnimatedStyle(() => ({ opacity: on.value }));
  const name = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [idle.color, selected.leaf]),
    opacity: 1 - tabBarCompact.value,
    height: NAME_H * (1 - tabBarCompact.value),
    marginTop: NAME_GAP * (1 - tabBarCompact.value),
  }));

  return (
    <Pressable
      testID={testID}
      style={styles.tab}
      onPressIn={() => {
        press.value = withTiming(PRESSED, { duration: duration.fast });
      }}
      onPressOut={() => {
        press.value = withTiming(1, { duration: duration.fast });
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={icon}>
        {tab.icon(idle)}
        <Animated.View style={[StyleSheet.absoluteFill, onLayer]}>
          {tab.icon(selected)}
        </Animated.View>
      </Animated.View>
      <Animated.Text numberOfLines={1} style={[styles.name, name]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
};

/** The sliding capsule under the selected tab. */
const Capsule = ({
  index,
  count,
  widthFull,
}: {
  index: SharedValue<number>;
  count: number;
  widthFull: number;
}) => {
  const style = useAnimatedStyle(() => {
    const c = tabBarCompact.value;
    const width = interpolate(c, [0, 1], [widthFull, SHRUNK.width]);
    const pad = interpolate(c, [0, 1], [FULL.pad, SHRUNK.pad]);
    const height = interpolate(c, [0, 1], [FULL.height, SHRUNK.height]);
    const tabW = (width - 2 - pad * 2) / count;
    return {
      left: pad + tabW * index.value,
      top: pad,
      width: tabW,
      height: height - 2 - pad * 2,
      borderRadius: interpolate(c, [0, 1], [FULL.capsule, SHRUNK.capsule]),
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.capsule, style]} />;
};

/**
 * The floating tab bar: Home, Send, Receive and Swap, each mark over its
 * name, with one capsule sliding to the selected tab. Scrolling a tab's
 * list down shrinks it; scrolling up or changing tab brings it back.
 */
const CustomTabBar = ({
  state,
  navigation,
}: BottomTabBarProps): React.ReactElement => {
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const { translate } = useContext(ContextAppLoaded);
  const { width: screenW } = useWindowDimensions();
  const widthFull = Math.min(FULL.width, screenW - GUTTER * 2);
  const count = state.routes.length;

  const index = useSharedValue(state.index);
  const selectedKey = state.routes[state.index]?.key;
  useEffect(() => {
    index.value = withTiming(state.index, barMotion);
    expandTabBar();
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const bar = useAnimatedStyle(() => {
    const c = tabBarCompact.value;
    return {
      width: interpolate(c, [0, 1], [widthFull, SHRUNK.width]),
      height: interpolate(c, [0, 1], [FULL.height, SHRUNK.height]),
      padding: interpolate(c, [0, 1], [FULL.pad, SHRUNK.pad]),
      borderRadius: interpolate(c, [0, 1], [FULL.radius, SHRUNK.radius]),
      marginBottom: interpolate(c, [0, 1], [FULL.bottom, SHRUNK.bottom]),
    };
  });

  const press = (route: (typeof state.routes)[number], focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.dispatch(TabActions.jumpTo(route.name));
    }
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={FADE_COLORS}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* The space the full bar takes, reported once; shrinking floats inside it. */}
      <View
        style={styles.slot}
        pointerEvents="box-none"
        onLayout={e => reportHeight?.(e.nativeEvent.layout.height)}
      >
        <Animated.View style={[styles.bar, bar]}>
          <Capsule index={index} count={count} widthFull={widthFull} />
          {state.routes.map((route, i) => {
            const focused = i === state.index;
            return (
              <Tab
                key={route.key}
                testID={`tab.${route.name.toLowerCase()}`}
                routeName={route.name}
                focused={focused}
                label={translate(tabOf(route.name).label) as string}
                onPress={() => press(route, focused)}
                onLongPress={() =>
                  navigation.emit({ type: 'tabLongPress', target: route.key })
                }
              />
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  slot: {
    height: FULL.height + FULL.bottom,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: themeTokens.bgTabBar,
    borderWidth: 1,
    borderColor: themeTokens.borderTabBar,
    boxShadow: `0 10px 30px ${themeTokens.shadowTabBar}`,
  },
  capsule: {
    position: 'absolute',
    backgroundColor: themeTokens.bgTabCapsule,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 11,
    lineHeight: NAME_H,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

export default CustomTabBar;
