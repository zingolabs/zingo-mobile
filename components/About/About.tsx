/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useTheme } from '../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import FadeText from '../../ui/primitives/FadeText';
import BoldText from '../../ui/primitives/BoldText';
import SheetRim from '../../ui/primitives/SheetRim';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../../ui/widgets/Header';
import DetailLine from '../../ui/widgets/DetailLine';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { getZingoName, getZingoVersion } from '../../app/utils/ZingoAppData';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type AboutProps = NativeStackScreenProps<AppDrawerParamList, RouteEnum.About>;

const About: React.FunctionComponent<AboutProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { zingolibVersion, translate } = context;
  const { colors } = useTheme();
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
        ref={aboutSheetRef}
        snapPoints={aboutSnapPoints}
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
        handleComponent={renderAboutHandle}
      >
        <BottomSheetScrollView
          testID="about.scroll-view"
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
