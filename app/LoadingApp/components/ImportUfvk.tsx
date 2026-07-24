/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { View, TouchableOpacity, TextInput, Keyboard } from 'react-native';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import {
  faChevronLeft,
  faQrcode,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import FadeText from '../../../components/Components/FadeText';
import RegText from '../../../components/Components/RegText';
import BoldText from '../../../components/Components/BoldText';
import Button from '../../../components/Components/Button';
import { ThemeType } from '../../types';
import { ContextAppLoading } from '../../context';
import Header from '../../../components/Header';
import { getLatestBlockServerInfo } from '../../walletBackend';
import {
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
} from '../../AppState';
import { useFullSheetSnapPoints } from '../../hooks/useFullSheetSnapPoints';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

const activationHeight = {
  main: 419200,
  test: 280000,
  regtest: 1,
  '': 1,
};

type ImportUfvkProps = {
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => void;
};
const ImportUfvk: React.FunctionComponent<ImportUfvkProps> = ({
  onClickCancel,
  onClickOK,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, server, mode, addLastSnackbar, selectServer } =
    context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ImportUfvk;

  const [seedufvkText, setSeedufvkText] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [latestBlock, setLatestBlock] = useState<number>(0);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const importUfvkSheetRef = useRef<BottomSheet>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (!netInfo.isConnected || selectServer !== SelectServerEnum.offline) {
      (async () => {
        const resp = await getLatestBlockServerInfo(server.uri);
        if (resp.ok && resp.value) {
          setLatestBlock(Number(resp.value));
        }
      })();
    }
  }, [server, selectServer, netInfo.isConnected]);

  useEffect(() => {
    if (seedufvkText) {
      if (
        seedufvkText.toLowerCase().startsWith(GlobalConst.uview) ||
        seedufvkText.toLowerCase().startsWith(GlobalConst.uviewtest)
      ) {
        // if it is a ufvk
        const seedufvkTextArray: string[] = seedufvkText
          .replaceAll('\n', ' ')
          .trim()
          .replaceAll('  ', ' ')
          .split(' ');
        // if the ufvk have 2 -> means it is a copy/paste from the stored ufvk in the device.
        if (seedufvkTextArray.length === 2) {
          const lastWord: string =
            seedufvkTextArray[seedufvkTextArray.length - 1];
          const possibleBirthday: number | null = isNaN(Number(lastWord))
            ? null
            : Number(lastWord);
          if (possibleBirthday && !birthday) {
            setBirthday(possibleBirthday.toString());
            setSeedufvkText(seedufvkTextArray.slice(0, 1).join(' '));
          }
        }
      } else {
        // if it is a seed
        const seedufvkTextArray: string[] = seedufvkText
          .replaceAll('\n', ' ')
          .trim()
          .replaceAll('  ', ' ')
          .split(' ');
        // if the seed have 25 -> means it is a copy/paste from the stored seed in the device.
        if (seedufvkTextArray.length === 25) {
          const lastWord: string =
            seedufvkTextArray[seedufvkTextArray.length - 1];
          const possibleBirthday: number | null = isNaN(Number(lastWord))
            ? null
            : Number(lastWord);
          if (possibleBirthday && !birthday) {
            setBirthday(possibleBirthday.toString());
            setSeedufvkText(seedufvkTextArray.slice(0, 24).join(' '));
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedufvkText]);

  const okButton = async () => {
    // Offline mode is a deliberate no-server flow: exactly like creating a
    // wallet, a seed/UFVK can be restored locally and will simply sync once a
    // server is chosen. So only block when the device is genuinely offline AND
    // the user is NOT in explicit Offline mode — mirroring createNewWallet.
    // (Previously this also blocked whenever Offline mode was selected, which
    // rejected restores even with a working internet connection.)
    if (!netInfo.isConnected && selectServer !== SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }
    onClickOK(seedufvkText.trimEnd().trimStart(), Number(birthday));
    Keyboard.dismiss();
  };

  const showQrcodeModalVisible = () => {
    navigation.navigate(RouteEnum.ScannerUfvk, {
      setUfvkText: (k: string) => setSeedufvkText(k),
      active: true,
    });
  };

  const importUfvkSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderImportUfvkHandle = useCallback(
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
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={onClickCancel}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
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
            {translate('import.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, onClickCancel, translate],
  );

  const renderImportUfvkFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={keyboardHeight}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            testID="import.button.ok"
            type={ButtonTypeEnum.Primary}
            title={translate('import.button') as string}
            onPress={() => {
              okButton();
            }}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, translate, seedufvkText, birthday, keyboardHeight],
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
          translate={translate}
          netInfo={netInfo}
          mode={mode}
        />
      </View>
      <BottomSheet
        ref={importUfvkSheetRef}
        snapPoints={importUfvkSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderImportUfvkHandle}
        footerComponent={renderImportUfvkFooter}
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
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 80,
          }}
        >
          <FadeText style={{ marginTop: 0, padding: 20, textAlign: 'center' }}>
            {translate('import.key-label') as string}
          </FadeText>
          <View
            style={{
              margin: 10,
              padding: 10,
              borderWidth: 1,
              borderRadius: 12,
              borderColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View
              accessible={true}
              accessibilityLabel={translate('seed.seed-acc') as string}
              style={{
                marginRight: 5,
                width: 'auto',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <TextInput
                testID="import.seedufvkinput"
                multiline
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
                keyboardType="visible-password"
                style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 16,
                  minHeight: 100,
                  marginHorizontal: 5,
                  backgroundColor: 'transparent',
                  textAlignVertical: 'top',
                }}
                value={seedufvkText}
                onChangeText={setSeedufvkText}
              />
            </View>
            {seedufvkText && (
              <TouchableOpacity
                onPress={() => {
                  setSeedufvkText('');
                }}
              >
                <FontAwesomeIcon
                  style={{ margin: 0 }}
                  size={20}
                  icon={faXmark}
                  color={colors.primaryDisabled}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                showQrcodeModalVisible();
              }}
            >
              <FontAwesomeIcon
                size={28}
                icon={faQrcode}
                color={colors.border}
              />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10, alignItems: 'center' }}>
            <FadeText>{translate('import.birthday') as string}</FadeText>
            {selectServer !== SelectServerEnum.offline && (
              <FadeText style={{ textAlign: 'center' }}>
                {translate('seed.birthday-no-readonly') +
                  ` (${activationHeight[server.chainName]}, ` +
                  (latestBlock ? latestBlock.toString() : '--') +
                  ')'}
              </FadeText>
            )}
            <View
              accessible={true}
              accessibilityLabel={translate('import.birthday-acc') as string}
              style={{
                margin: 10,
                borderWidth: 1,
                borderRadius: 12,
                borderColor: colors.border,
                width: '30%',
                maxWidth: '40%',
                maxHeight: 48,
                minWidth: '20%',
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                testID="import.birthdayinput"
                placeholder={'#'}
                placeholderTextColor={colors.placeholder}
                style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 18,
                  flex: 1,
                  minHeight: 48,
                  marginLeft: 5,
                  backgroundColor: 'transparent',
                }}
                value={birthday}
                onChangeText={(text: string) => {
                  if (isNaN(Number(text))) {
                    setBirthday('');
                  } else if (
                    Number(text) <= 0 ||
                    (Number(text) > latestBlock &&
                      selectServer !== SelectServerEnum.offline)
                  ) {
                    setBirthday('');
                  } else {
                    setBirthday(
                      Number(text.replace('.', '').replace(',', '')).toFixed(0),
                    );
                  }
                }}
                editable={
                  latestBlock
                    ? true
                    : selectServer !== SelectServerEnum.offline
                      ? false
                      : true
                }
                keyboardType="numeric"
              />
              {!!birthday &&
                (!!latestBlock ||
                  selectServer === SelectServerEnum.offline) && (
                  <TouchableOpacity onPress={() => setBirthday('')}>
                    <FontAwesomeIcon
                      style={{ marginRight: 5 }}
                      size={20}
                      icon={faXmark}
                      color={colors.primaryDisabled}
                    />
                  </TouchableOpacity>
                )}
            </View>

            <RegText style={{ margin: 20, marginBottom: 30 }}>
              {translate('import.text') as string}
            </RegText>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default ImportUfvk;
