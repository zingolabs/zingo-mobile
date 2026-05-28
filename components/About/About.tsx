/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import DetailLine from '../Components/DetailLine';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { getZingoName, getZingoVersion } from '../../app/utils/ZingoAppData';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type AboutProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.About>;

const About: React.FunctionComponent<AboutProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { zingolibVersion, translate } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.About;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const aboutSheetRef = useRef<BottomSheet>(null);

  const arrayTxtObject = translate('about.copyright');
  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const aboutSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderAboutHandle = useCallback(
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
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText style={{ fontSize: 16, lineHeight: 28 }}>
            {getZingoName() + ' ' + getZingoVersion()}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen],
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
        ref={aboutSheetRef}
        snapPoints={aboutSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderAboutHandle}
      >
        <BottomSheetScrollView
          testID="about.scroll-view"
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            padding: 20,
          }}
        >
          <FadeText>{arrayTxt[0]}</FadeText>
          <DetailLine
            label={translate('info.zingolib') as string}
            value={zingolibVersion}
          />
          <View style={{ marginTop: 20 }}>
            {arrayTxt.map((txt: string, ind: number) => (
              <View key={txt.substring(0, 10)}>
                {ind !== 0 && (
                  <FadeText style={{ marginBottom: 20 }}>{txt}</FadeText>
                )}
              </View>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default About;
