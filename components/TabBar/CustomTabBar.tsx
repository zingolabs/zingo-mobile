import React, { useContext, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  BottomTabBarHeightCallbackContext,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faHouse,
  faRefresh,
  faPaperPlane as faPaperPlaneSolid,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import {
  faHouse as faHouseRegular,
  faPaperPlane as faPaperPlaneRegular,
} from '@fortawesome/free-regular-svg-icons';
import { ModeEnum, RouteEnum } from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import TotalBalanceClass from '../../app/AppState/classes/TotalBalanceClass';

const ICON_SIZE = 28;
const BUBBLE_V_MARGIN = 4;
const TAB_H_PADDING = 20;
const TAB_V_PADDING = 10;
const PILL_BG = '#040C17';
const PILL_BORDER = '#071A35';
const BUBBLE_COLOR = '#149D05';

function resolveIcons(
  routeName: string,
  mode: ModeEnum,
  totalBalance: TotalBalanceClass | null,
  somePending: boolean,
) {
  if (routeName === RouteEnum.History) {
    return { solidIcon: faHouse, regularIcon: faHouseRegular };
  }
  if (routeName === RouteEnum.Send) {
    const isPending =
      mode === ModeEnum.basic &&
      !!totalBalance &&
      ((totalBalance.totalOrchardBalance > 0 &&
        totalBalance.confirmedOrchardBalance === 0) ||
        (totalBalance.totalSaplingBalance > 0 &&
          totalBalance.confirmedSaplingBalance === 0) ||
        (totalBalance.totalTransparentBalance > 0 &&
          totalBalance.confirmedTransparentBalance === 0)) &&
      somePending;
    return isPending
      ? { solidIcon: faRefresh, regularIcon: faRefresh }
      : { solidIcon: faPaperPlaneSolid, regularIcon: faPaperPlaneRegular };
  }
  return { solidIcon: faDownload, regularIcon: faDownload };
}

const CustomTabBar = ({
  state,
  navigation,
}: BottomTabBarProps): React.ReactElement => {
  const { mode, totalBalance, somePending } = useContext(ContextAppLoaded);
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);

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

  const iconAnimsRef = useRef<Record<string, Animated.Value> | null>(null);
  if (!iconAnimsRef.current) {
    iconAnimsRef.current = Object.fromEntries(
      state.routes.map(r => [r.key, new Animated.Value(1)]),
    );
  }
  const iconAnims = iconAnimsRef.current;

  const pressAnimsRef = useRef<Record<string, Animated.Value> | null>(null);
  if (!pressAnimsRef.current) {
    pressAnimsRef.current = Object.fromEntries(
      state.routes.map(r => [r.key, new Animated.Value(1)]),
    );
  }
  const pressAnims = pressAnimsRef.current;

  useEffect(() => {
    state.routes.forEach(r => {
      if (!bubbleAnims[r.key]) bubbleAnims[r.key] = new Animated.Value(0);
      if (!iconAnims[r.key]) iconAnims[r.key] = new Animated.Value(1);
      if (!pressAnims[r.key]) pressAnims[r.key] = new Animated.Value(1);
    });
  }, [state.routes.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const focusedKey = state.routes[state.index]?.key;
    if (focusedKey && iconAnims[focusedKey]) {
      Animated.sequence([
        Animated.timing(iconAnims[focusedKey], {
          toValue: 1.2,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconAnims[focusedKey], {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state.index]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <View
      style={[styles.wrapper, { bottom: 25 }]}
      pointerEvents="box-none"
    >
      {/* Shadow wrapper — kept separate from pill so overflow:hidden doesn't clip the shadow */}
      <View
        style={styles.shadowWrap}
        onLayout={e => reportHeight?.(e.nativeEvent.layout.height)}
      >
        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            const isFocused = index === state.index;
            const { solidIcon, regularIcon } = resolveIcons(
              route.name,
              mode,
              totalBalance,
              somePending,
            );
            return (
              <Pressable
                key={route.key}
                style={styles.tabItem}
                onPressIn={() => handlePressIn(route.key)}
                onPressOut={() => handlePressOut(route.key)}
                onPress={() => handlePress(route, isFocused)}
                onLongPress={() => handleLongPress(route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
              >
                <Animated.View
                  style={[
                    styles.bubble,
                    { transform: [{ scale: bubbleAnims[route.key] }] },
                  ]}
                />
                <Animated.View
                  style={{ transform: [{ scale: pressAnims[route.key] }] }}
                >
                  <Animated.View
                    style={{ transform: [{ scale: iconAnims[route.key] }] }}
                  >
                    <FontAwesomeIcon
                      icon={isFocused ? solidIcon : regularIcon}
                      size={ICON_SIZE}
                      color={isFocused ? PILL_BG : '#FFFFFF'}
                    />
                  </Animated.View>
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
    alignItems: 'center',
  },
  shadowWrap: {
    borderRadius: 999,
    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    // Android
    elevation: Platform.OS === 'android' ? 6 : 0,
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
    paddingHorizontal: TAB_H_PADDING,
    paddingVertical: TAB_V_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BUBBLE_COLOR,
    borderRadius: 999,
  },
});

export default CustomTabBar;
