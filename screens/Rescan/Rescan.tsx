/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import SheetRim from '@ui/primitives/SheetRim';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import Header from '@ui/widgets/Header';
import {
  ButtonTypeEnum,
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
} from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';

type RescanProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Rescan
> & {
  doRescan: () => Promise<void>;
};

const Rescan: React.FunctionComponent<RescanProps> = ({
  navigation,
  doRescan,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    birthday,
    translate,
    netInfo,
    addLastSnackbar,
    selectServer,
    security,
    foregroundEpoch,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.Rescan;

  // Audit Issue D — single source of truth for security.rescanScreen.
  const authPassed = useBiometricGate({
    needsAuth: !!security?.rescanScreen,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: !!security?.foregroundApp,
    foregroundEpoch,
  });

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const rescanSheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const doRescanAndClose = useCallback(async () => {
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }
    doRescan();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    setTimeout(() => {
      addLastSnackbar(
        translate('loadedapp.syncing') as string,
        SnackbarDurationEnum.longer,
      );
    }, 3 * 1000);
  }, [netInfo, selectServer, addLastSnackbar, translate, doRescan, navigation]);

  const rescanSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderRescanHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.fgAccent}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('rescan.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  const renderRescanFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bgSurface,
            paddingTop: 10,
            paddingBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('rescan.button') as string}
            onPress={doRescanAndClose}
          />
        </View>
      </BottomSheetFooter>
    ),
    [colors, translate, doRescanAndClose],
  );

  if (!authPassed) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
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
        ref={rescanSheetRef}
        snapPoints={rescanSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderRescanHandle}
        footerComponent={renderRescanFooter}
      >
        <BottomSheetScrollView
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bgSurface,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            paddingBottom: 80,
          }}
        >
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            <RegText>
              {(translate('rescan.text-1') as string) +
                birthday +
                translate('rescan.text-2')}
            </RegText>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default Rescan;
