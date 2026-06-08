/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons';

import RegText from '../../../components/Components/RegText';
import BoldText from '../../../components/Components/BoldText';
import Button from '../../../components/Components/Button';
import { AppDrawerParamList, ThemeType } from '../../types';
import { ContextAppLoaded } from '../../context';
import Header from '../../../components/Header';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '../../hooks/useFullSheetSnapPoints';

// Time spent on phase 1 ("Computing Transaction...") before swapping the
// copy to phase 2 ("Hang on tight..."). The actual `sendTransaction` runs
// in parallel — whichever finishes first (timer or send) decides what the
// user sees.
const PHASE1_DURATION_MS = 4000;

type ComputingTxContentProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Computing
>;

const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({
  route,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ComputingTxContext;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [timerPhase, setTimerPhase] = useState<0 | 1>(0);
  const computingSheetRef = useRef<BottomSheet>(null);

  const computingSnapPoints = useFullSheetSnapPoints(containerH, headerH);
  const phase = route.params?.phase ?? 'computing';
  const isCreated = phase === 'created';

  // Swap the copy after PHASE1_DURATION_MS — only while still in the
  // computing phase. If `phase === 'created'` arrives before the timer
  // fires, we drop the timer altogether.
  useEffect(() => {
    if (isCreated) {
      return;
    }
    const t = setTimeout(() => setTimerPhase(1), PHASE1_DURATION_MS);
    return () => clearTimeout(t);
  }, [isCreated]);

  const onContinue = useCallback(() => {
    navigation.navigate(RouteEnum.HomeStack, {
      screen: RouteEnum.History,
    });
  }, [navigation]);

  const renderComputingHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      />
    ),
    [colors],
  );

  // Footer is rendered in every phase (with the same reserved height) so
  // the BottomSheetView above always shrinks by the same amount, keeping
  // the centered content at the exact same vertical position regardless
  // of whether the button is visible.
  const renderComputingFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 24,
            minHeight: 82,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isCreated && (
            <Button
              type={ButtonTypeEnum.Primary}
              title={translate('loadedapp.continue') as string}
              onPress={onContinue}
            />
          )}
        </View>
      </BottomSheetFooter>
    ),
    [colors, isCreated, onContinue, translate],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
      </View>
      <BottomSheet
        ref={computingSheetRef}
        snapPoints={computingSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderComputingHandle}
        footerComponent={renderComputingFooter}
      >
        <BottomSheetView
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
            paddingHorizontal: 24,
            // Footer floats absolutely on top of the sheet (it doesn't
            // shrink the BottomSheetView), so we reserve its height as
            // paddingBottom to keep the centered content above it.
            paddingTop: 24,
            paddingBottom: 106,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Both icons share an identical 120x120 bounding box so
              `justifyContent: 'center'` lands them at the same Y. */}
          <View
            style={{
              width: 120,
              height: 120,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCreated ? (
              <FontAwesomeIcon
                icon={faCircleCheck}
                size={120}
                color={colors.primary}
              />
            ) : (
              // size="large" renders at ~36px; scale ≈ 3.3 brings the
              // visible footprint up to ~120px to match the success icon.
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ transform: [{ scale: 3.3 }] }}
              />
            )}
          </View>
          <BoldText
            style={{
              fontSize: 20,
              marginTop: 48,
              textAlign: 'center',
            }}
          >
            {
              translate(
                isCreated
                  ? 'loadedapp.transactioncreated-title'
                  : 'send.sending-title',
              ) as string
            }
          </BoldText>
          <RegText
            style={{
              marginTop: 12,
              textAlign: 'center',
              color: colors.placeholder,
            }}
          >
            {
              translate(
                isCreated
                  ? 'loadedapp.transactioncreated-body'
                  : timerPhase === 0
                    ? 'loadedapp.computingtx'
                    : 'loadedapp.computingtx-hangon',
              ) as string
            }
          </RegText>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default ComputingTxContent;
