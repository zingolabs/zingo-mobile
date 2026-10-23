import React, { useContext, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  BottomTabBarHeightCallbackContext,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { useTheme, themeTokens } from '@app/theme';
import { Route } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
import {
  HomeTabIcon,
  ReceiveTabIcon,
  SendTabIcon,
  SwapTabIcon,
} from '@ui/primitives/Icons/TabIcons';

const ICON_SIZE = 24;
const BUBBLE_V_MARGIN = 4;
const TAB_WIDTH = 80;
const TAB_V_PADDING = 7;
const PILL_BG = themeTokens.bgTabBar;
const PILL_BORDER = themeTokens.bottomSheetBorder;
const WRAPPER_PADDING_BOTTOM = 25;
const FADE_COLORS = ['transparent', themeTokens.bgScrim];

/** Each tab's mark and the catalog key of its name. */
function tabOf(routeName: string): { icon: React.ReactElement; label: string } {
  if (routeName === Route.History) {
    return {
      icon: <HomeTabIcon size={ICON_SIZE} />,
      label: 'loadedapp.tab-home',
    };
  }
  if (routeName === Route.Send) {
    return {
      icon: <SendTabIcon size={ICON_SIZE} />,
      label: 'loadedapp.tab-send',
    };
  }
  if (routeName === Route.Swap) {
    return {
      icon: <SwapTabIcon size={ICON_SIZE} />,
      label: 'loadedapp.tab-swap',
    };
  }
  return {
    icon: <ReceiveTabIcon size={ICON_SIZE} />,
    label: 'loadedapp.tab-receive',
  };
}

const CustomTabBar = ({
  state,
  navigation,
}: BottomTabBarProps): React.ReactElement => {
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const { translate } = useContext(ContextAppLoaded);
  // The marks carry the accent green themselves, so the active tab sits on
  // a quiet bubble and only its name turns green.
  const { colors } = useTheme();

  const bubbleAnimsRef = useRef<Record<string, Animated.Value> | null>(null);
  if (!bubbleAnimsRef.current) {
    bubbleAnimsRef.current = Object.fromEntries(
      state.routes.map((r, i) => [
        r.key,
        new Animated.Value(i === state.index ? 1 : 0),
      ]),
    );
  }
  const bubbleAnims = bubbleAnimsRef.current;

  const pressAnimsRef = useRef<Record<string, Animated.Value> | null>(null);
  if (!pressAnimsRef.current) {
    pressAnimsRef.current = Object.fromEntries(
      state.routes.map(r => [r.key, new Animated.Value(1)]),
    );
  }
  const pressAnims = pressAnimsRef.current;

  // Backfill animation slots SYNCHRONOUSLY for any newly added route.key.
  // This used to live in a useEffect, but useEffect runs after the render —
  // so the first render after a mode toggle (which can produce a different
  // set of Tab.Screen routes with new keys) tried to read
  // bubbleAnims[route.key] before the effect populated it, crashing inside
  // Animated.View with "Cannot read property 'getValue' of undefined".
  state.routes.forEach(r => {
    if (!bubbleAnims[r.key]) {
      bubbleAnims[r.key] = new Animated.Value(
        r.key === state.routes[state.index]?.key ? 1 : 0,
      );
    }
    if (!pressAnims[r.key]) pressAnims[r.key] = new Animated.Value(1);
  });

  // Track the currently-selected route by its KEY, not by index. When the
  // tab list shrinks (e.g. mode toggle removes the Send tab while the
  // active index stays 0), React Navigation reassigns index 0 to the next
  // remaining route — but `state.index` stays equal to 0, so depending on
  // it alone never re-fires the effect, leaving the new active tab with a
  // bubble value of 0 and the removed-but-still-cached one at 1.
  const selectedRouteKey = state.routes[state.index]?.key;
  useEffect(() => {
    Animated.parallel(
      state.routes.map((r, i) =>
        Animated.timing(bubbleAnims[r.key], {
          toValue: i === state.index ? 1 : 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [selectedRouteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePressIn = (key: string) => {
    Animated.timing(pressAnims[key], {
      toValue: 0.85,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (key: string) => {
    Animated.timing(pressAnims[key], {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (
    route: (typeof state.routes)[number],
    isFocused: boolean,
  ) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.dispatch(TabActions.jumpTo(route.name));
    }
  };

  const handleLongPress = (route: (typeof state.routes)[number]) => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={FADE_COLORS}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View onLayout={e => reportHeight?.(e.nativeEvent.layout.height)}>
        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            const isFocused = index === state.index;
            const tab = tabOf(route.name);
            const label = translate(tab.label) as string;
            return (
              <Pressable
                key={route.key}
                testID={`tab.${route.name.toLowerCase()}`}
                style={styles.tabItem}
                onPressIn={() => handlePressIn(route.key)}
                onPressOut={() => handlePressOut(route.key)}
                onPress={() => handlePress(route, isFocused)}
                onLongPress={() => handleLongPress(route)}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: isFocused }}
              >
                <Animated.View
                  style={[
                    styles.bubble,
                    { backgroundColor: colors.bgMutedSubtle },
                    { transform: [{ scale: bubbleAnims[route.key] }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.tabContent,
                    { transform: [{ scale: pressAnims[route.key] }] },
                  ]}
                >
                  {tab.icon}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      {
                        color: isFocused ? colors.fgAccent : colors.fgDefault,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
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
    paddingBottom: WRAPPER_PADDING_BOTTOM,
  },
  pill: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: PILL_BG,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    paddingVertical: BUBBLE_V_MARGIN,
    paddingHorizontal: BUBBLE_V_MARGIN,
    overflow: 'hidden',
  },
  tabItem: {
    width: TAB_WIDTH,
    paddingVertical: TAB_V_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  bubble: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 999,
  },
});

export default CustomTabBar;
