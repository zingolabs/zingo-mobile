/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import RegText from '../../../components/Components/RegText';
import BoldText from '../../../components/Components/BoldText';
import { AppDrawerParamList, ThemeType } from '../../types';
import { ContextAppLoaded } from '../../context';
import Header from '../../../components/Header';
import { RouteEnum, ScreenEnum } from '../../AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useFullSheetSnapPoints } from '../../hooks/useFullSheetSnapPoints';

type ComputingTxContentProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Computing
>;

const ComputingTxContent: React.FunctionComponent<
  ComputingTxContentProps
> = ({}) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ComputingTxContext;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const computingSheetRef = useRef<BottomSheet>(null);

  const computingSnapPoints = useFullSheetSnapPoints(containerH, headerH);

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
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
            {translate('send.sending-title') as string}
          </BoldText>
        </View>
      </View>
    ),
    [colors, translate],
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
      >
        <BottomSheetView
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <RegText>{translate('loadedapp.computingtx') as string}</RegText>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginVertical: 20 }}
          />
          <RegText>{translate('wait') as string}</RegText>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default ComputingTxContent;
