/* eslint-disable react-native/no-inline-styles */
import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import BoldText from '../../../components/Components/BoldText';
import Button from '../../../components/Components/Button';
import { ThemeType } from '../../types';
import { ContextAppLoading } from '../../context';
import WalletType from '../../AppState/types/WalletType';
import {
  ModeEnum,
  SnackbarDurationEnum,
  ButtonTypeEnum,
  ScreenEnum,
} from '../../AppState';
import Header from '../../../components/Header';
import Utils from '../../utils';
import { useFullSheetSnapPoints } from '../../hooks/useFullSheetSnapPoints';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type NewSeedProps = {
  wallet: WalletType;
  onClickOK: () => void;
};
const NewSeed: React.FunctionComponent<NewSeedProps> = ({
  wallet,
  onClickOK,
}) => {
  const context = useContext(ContextAppLoading);
  const {
    translate,
    netInfo,
    privacy,
    mode,
    addLastSnackbar,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Seed;

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const newSeedSheetRef = useRef<BottomSheet>(null);

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  useEffect(() => {
    return () => {
      if (clipboardTimer.current) {
        clearTimeout(clipboardTimer.current);
      }
      Clipboard.setString('');
    };
  }, []);

  const copySeedToClipboard = (expandOnCopy?: boolean) => {
    if (!seedPhrase) return;
    if (clipboardTimer.current) {
      clearTimeout(clipboardTimer.current);
    }
    Clipboard.setString(seedPhrase);
    if (addLastSnackbar) {
      addLastSnackbar(
        translate('seed.tapcopy-seed-message') as string,
        SnackbarDurationEnum.longer,
      );
    }
    if (expandOnCopy) {
      setExpandSeed(true);
      if (privacy) {
        setTimeout(() => setExpandSeed(false), 5 * 1000);
      }
    }
    clipboardTimer.current = setTimeout(() => {
      Clipboard.setString('');
      clipboardTimer.current = null;
      if (addLastSnackbar) {
        addLastSnackbar(
          translate('seed.clipboard-cleared') as string,
          SnackbarDurationEnum.long,
        );
      }
    }, 60 * 1000);
  };

  useEffect(() => {
    if (privacy) {
      setExpandSeed(false);
      setExpandBithday(false);
    } else {
      setExpandSeed(true);
      setExpandBithday(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandSeed && !privacy) {
      setExpandSeed(true);
    }
  }, [expandSeed, privacy]);

  useEffect(() => {
    if (!expandBirthday && !privacy) {
      setExpandBithday(true);
    }
  }, [expandBirthday, privacy]);

  useEffect(() => {
    const buttonTextsArray = translate('seed.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
  }, [translate]);

  const onClickOKHide = () => {
    onClickOK();
  };

  const newSeedSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const seedTitle =
    translate('seed.title') + ' (' + translate('seed.new') + ')';

  const renderNewSeedHandle = useCallback(
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
            onPress={onClickOKHide}
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
            {seedTitle}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, seedTitle],
  );

  const renderNewSeedFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            type={
              mode === ModeEnum.basic
                ? ButtonTypeEnum.Secondary
                : ButtonTypeEnum.Primary
            }
            title={
              mode === ModeEnum.basic
                ? (translate('cancel') as string)
                : !!texts && !!texts.new
                  ? texts.new[0]
                  : ''
            }
            onPress={() => onClickOKHide()}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, mode, texts, translate],
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
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          translate={translate}
          netInfo={netInfo}
          mode={mode}
          privacy={privacy}
        />
      </View>
      <BottomSheet
        ref={newSeedSheetRef}
        snapPoints={newSeedSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderNewSeedHandle}
        footerComponent={renderNewSeedFooter}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
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
            paddingBottom: 80,
          }}
        >
          <RegText
            style={{
              marginTop: 0,
              padding: 20,
              textAlign: 'center',
              fontWeight: '900',
            }}
          >
            {translate('seed.text-readonly') as string}
          </RegText>
          <View
            style={{
              margin: 10,
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.text,
            }}
          >
            <TouchableOpacity onPress={() => copySeedToClipboard(true)}>
              <RegText
                color={colors.text}
                style={{
                  textAlign: 'center',
                }}
              >
                {!expandSeed ? Utils.trimToSmall(seedPhrase, 5) : seedPhrase}
              </RegText>
            </TouchableOpacity>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <View />
              <TouchableOpacity onPress={() => copySeedToClipboard(false)}>
                <Text
                  style={{
                    color: colors.text,
                    textDecorationLine: 'underline',
                    padding: 10,
                    marginTop: 0,
                    textAlign: 'center',
                    minHeight: 48,
                  }}
                >
                  {translate('seed.tapcopy') as string}
                </Text>
              </TouchableOpacity>
              <View />
            </View>
          </View>

          <View style={{ marginTop: 10, alignItems: 'center' }}>
            <FadeText style={{ textAlign: 'center' }}>
              {translate('seed.birthday-readonly') as string}
            </FadeText>
            <TouchableOpacity
              onPress={() => {
                if (birthdayNumber) {
                  Clipboard.setString(birthdayNumber);
                  if (addLastSnackbar) {
                    addLastSnackbar(
                      translate('seed.tapcopy-birthday-message') as string,
                      SnackbarDurationEnum.short,
                    );
                  }
                  setExpandBithday(true);
                  if (privacy) {
                    setTimeout(() => {
                      setExpandBithday(false);
                    }, 5 * 1000);
                  }
                }
              }}
            >
              <RegText color={colors.text} style={{ textAlign: 'center' }}>
                {!expandBirthday
                  ? Utils.trimToSmall(birthdayNumber, 1)
                  : birthdayNumber}
              </RegText>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default NewSeed;
