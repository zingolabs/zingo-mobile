/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import {
  faChevronLeft,
  faCircleInfo,
  faQrcode,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import { ContextAppLoading } from '@app/context';
import SeedPhraseInput from '@ui/widgets/SeedPhraseInput';
import BusyButton from '@ui/widgets/BusyButton';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { getLatestBlockServerInfo } from '@app/walletBackend';
import { GlobalConst, RouteEnum } from '@app/AppState';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { seedStatus } from '@app/utils/seedPhrase';
import { duration, ease } from '@app/theme/motion';

const activationHeight = {
  main: 419200,
  test: 280000,
  regtest: 1,
  '': 1,
};

// Positions from the 402 x 874 design.
const BODY_TOP = 112;
const SIDE = 28;
const FIELD_WIDTH = 270;
const BUTTON_WIDTH = 301;
const BUTTON_BOTTOM = 31;
const NOTE_BOTTOM = 96;

type ImportUfvkProps = {
  busy: boolean;
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => void;
};
const ImportUfvk: React.FunctionComponent<ImportUfvkProps> = ({
  busy,
  onClickCancel,
  onClickOK,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, server, addLastSnackbar } = context;
  const { colors } = useTheme();

  const [seedufvkText, setSeedufvkText] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [latestBlock, setLatestBlock] = useState<number>(0);
  const [tipOpen, setTipOpen] = useState<boolean>(false);
  const keyboardHeight = useKeyboardHeight();

  const activation = activationHeight[server.chainName];
  const status = seedStatus(seedufvkText);
  const keyReady =
    status.kind === 'ufvk' || (status.kind === 'seed' && status.complete);
  const birthdayLow = !!birthday && Number(birthday) < activation;
  const ready = keyReady && !birthdayLow;

  const birthdayFocus = useSharedValue(0);
  const birthdayBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      birthdayFocus.value,
      [0, 1],
      [colors.bottomSheetBorder, colors.borderFocus],
    ),
  }));
  const setBirthdayFocused = (focused: boolean) => {
    birthdayFocus.value = withTiming(focused ? 1 : 0, {
      duration: duration.base,
      easing: ease.standard,
    });
  };

  const tipBody =
    (translate('import.birthday-tip-body') as string) +
    (server.kind === 'offline'
      ? ''
      : '\n' +
        (translate('import.birthday-tip-range') as string)
          .replace('{from}', activation.toLocaleString())
          .replace('{to}', latestBlock ? latestBlock.toLocaleString() : '--'));

  useEffect(() => {
    // Both conditions must hold: a session with no server has nothing to ask,
    // and a device with no network has nobody to ask. The disjunction this
    // replaces entered on a downed radio in Offline mode.
    if (netInfo.isConnected && server.kind !== 'offline') {
      (async () => {
        const resp = await getLatestBlockServerInfo(server.uri);
        if (resp.ok && resp.value) {
          setLatestBlock(Number(resp.value));
        }
      })();
    }
  }, [server, netInfo.isConnected]);

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
    if (!netInfo.isConnected && server.kind !== 'offline') {
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

  const buttonBottom = keyboardHeight > 0 ? keyboardHeight + 12 : BUTTON_BOTTOM;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <BoldText
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 50,
          fontSize: 16,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {translate('import.screen-title') as string}
      </BoldText>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        onScrollBeginDrag={() => setTipOpen(false)}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: BODY_TOP,
          paddingHorizontal: SIDE,
          paddingBottom: (keyboardHeight > 0 ? keyboardHeight : 0) + 200,
        }}
      >
        {tipOpen && (
          <Pressable
            onPress={() => setTipOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            }}
          />
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <BoldText style={{ fontSize: 12.5, lineHeight: 16 }}>
            {translate('import.seed-label') as string}
          </BoldText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {!!seedufvkText && (
              <TouchableOpacity onPress={() => setSeedufvkText('')} hitSlop={8}>
                <FontAwesomeIcon
                  size={16}
                  icon={faXmark}
                  color={colors.fgMuted}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={showQrcodeModalVisible} hitSlop={8}>
              <FontAwesomeIcon
                size={20}
                icon={faQrcode}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
        <SeedPhraseInput
          testID="import.seedufvkinput"
          accessibilityLabel={translate('seed.seed-acc') as string}
          value={seedufvkText}
          onChangeValue={setSeedufvkText}
          translate={translate}
        />

        <View style={{ marginTop: 39, alignItems: 'center' }}>
          <InfoTooltip
            testID="import.birthdayinfo"
            label={translate('import.birthday') as string}
            title={translate('import.birthday-tip-title') as string}
            text={tipBody}
            open={tipOpen}
            onToggle={setTipOpen}
          />
          <Animated.View
            style={[
              {
                marginTop: 14,
                width: FIELD_WIDTH,
                height: 42,
                borderWidth: 1,
                borderRadius: 10,
                backgroundColor: colors.bgSurface,
                flexDirection: 'row',
                alignItems: 'center',
                overflow: 'hidden',
              },
              birthdayBorder,
              birthdayLow && { borderColor: colors.fgDangerEmphasis },
            ]}
          >
            <TextInput
              testID="import.birthdayinput"
              accessible={true}
              accessibilityLabel={translate('import.birthday-acc') as string}
              placeholder={translate('import.birthday-placeholder') as string}
              placeholderTextColor={colors.fgMuted}
              onFocus={() => setBirthdayFocused(true)}
              onBlur={() => setBirthdayFocused(false)}
              style={{
                color: colors.fgDefault,
                fontSize: 13,
                flex: 1,
                height: 42,
                paddingHorizontal: 15,
                paddingVertical: 0,
                backgroundColor: 'transparent',
              }}
              value={birthday}
              onChangeText={(text: string) => {
                if (isNaN(Number(text))) {
                  setBirthday('');
                } else if (
                  Number(text) <= 0 ||
                  (Number(text) > latestBlock && server.kind !== 'offline')
                ) {
                  setBirthday('');
                } else {
                  setBirthday(
                    Number(text.replace('.', '').replace(',', '')).toFixed(0),
                  );
                }
              }}
              editable={
                latestBlock ? true : server.kind !== 'offline' ? false : true
              }
              keyboardType="numeric"
            />
            {!!birthday && (!!latestBlock || server.kind === 'offline') && (
              <TouchableOpacity
                onPress={() => setBirthday('')}
                hitSlop={8}
                style={{ paddingRight: 12 }}
              >
                <FontAwesomeIcon
                  size={14}
                  icon={faXmark}
                  color={colors.fgMuted}
                />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {keyboardHeight === 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 37,
            right: 40,
            bottom: NOTE_BOTTOM,
            flexDirection: 'row',
            gap: 11,
          }}
        >
          <FontAwesomeIcon
            icon={faCircleInfo}
            size={13}
            color={colors.fgAccent}
            style={{ marginTop: 1 }}
          />
          <RegText style={{ flex: 1, fontSize: 9.5, lineHeight: 13 }}>
            {translate('import.text') as string}
          </RegText>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: buttonBottom,
          alignItems: 'center',
        }}
      >
        <View style={{ width: BUTTON_WIDTH }}>
          <BusyButton
            testID="import.button.ok"
            title={translate('import.submit') as string}
            enabled={ready}
            busy={busy}
            onPress={() => {
              okButton();
            }}
            onDisabledPress={() =>
              addLastSnackbar(
                translate(
                  keyReady ? 'import.need-birthday' : 'import.need-words',
                ) as string,
              )
            }
          />
        </View>
      </View>
      <Pressable
        testID="import.back"
        onPress={onClickCancel}
        disabled={busy}
        hitSlop={14}
        accessibilityRole="button"
        style={({ pressed }) => ({
          position: 'absolute',
          left: 17,
          top: 38,
          width: 44,
          height: 44,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          opacity: busy ? 0.4 : 1,
          backgroundColor: pressed ? colors.bgSurface : 'transparent',
        })}
      >
        <FontAwesomeIcon
          icon={faChevronLeft}
          size={18}
          color={colors.fgAccent}
        />
      </Pressable>
    </View>
  );
};

export default ImportUfvk;
