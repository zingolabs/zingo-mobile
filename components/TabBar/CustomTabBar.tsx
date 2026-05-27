import React, { useContext, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  BottomTabBarHeightCallbackContext,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import { ModeEnum, RouteEnum } from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import TotalBalanceClass from '../../app/AppState/classes/TotalBalanceClass';
import { HouseFilledIcon } from '../Components/Icons/HouseFilledIcon';
import { HouseOutlineIcon } from '../Components/Icons/HouseOutlineIcon';
import { SendFilledIcon } from '../Components/Icons/SendFilledIcon';
import { SendOutlineIcon } from '../Components/Icons/SendOutlineIcon';
import { ReceiveIcon } from '../Components/Icons/ReceiveIcon';
import { ReceiveFilledIcon } from '../Components/Icons/ReceiveFilledIcon';

const ICON_SIZE = 28;
const SEND_SIZE = 25;
const BUBBLE_V_MARGIN = 4;
const TAB_H_PADDING = 30;
const TAB_V_PADDING = 10;
const PILL_BG = '#040C17';
const PILL_BORDER = '#071A35';
const BUBBLE_COLOR = '#149D05';

function renderNavIcon(
  routeName: string,
  isFocused: boolean,
  mode: ModeEnum,
  totalBalance: TotalBalanceClass | null,
  somePending: boolean,
  color: string,
): React.ReactElement {
  if (routeName === RouteEnum.History) {
    return isFocused ? (
      <HouseFilledIcon size={ICON_SIZE} color={color} />
    ) : (
      <HouseOutlineIcon size={ICON_SIZE} color={color} />
    );
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
    if (isPending) {
      return (
        <FontAwesomeIcon icon={faRefresh} size={SEND_SIZE} color={color} />
      );
    }
    return isFocused ? (
      <SendFilledIcon size={SEND_SIZE} color={color} />
    ) : (
      <SendOutlineIcon size={SEND_SIZE} color={color} />
    );
  }
  return isFocused ? (
    <ReceiveFilledIcon size={ICON_SIZE} color={color} />
  ) : (
    <ReceiveIcon size={ICON_SIZE} color={color} />
  );
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
    <View style={styles.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View onLayout={e => reportHeight?.(e.nativeEvent.layout.height)}>
        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            const isFocused = index === state.index;
            const color = isFocused ? PILL_BG : '#FFFFFF';
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
                  {renderNavIcon(
                    route.name,
                    isFocused,
                    mode,
                    totalBalance,
                    somePending,
                    color,
                  )}
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
    paddingBottom: 25,
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
