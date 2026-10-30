/* eslint-disable react-native/no-inline-styles */
import Button, { BUTTON_HEIGHT } from '@ui/primitives/Button';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Keyboard, Pressable } from 'react-native';

import {
  iconSizeSm,
  space12,
  space16,
  space20,
  space32,
  useTheme,
} from '@app/theme';

import Text from '@ui/primitives/Text';
import TextField, { FieldAction } from '@ui/primitives/TextField';
import TitleBar from '@ui/widgets/TitleBar';
import { ContextAppLoading } from '@app/context';
import SeedPhraseInput from '@ui/widgets/SeedPhraseInput';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { RevealOrigin } from '@ui/widgets/CircularReveal';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import ScanOverlay from '@ui/widgets/ScanOverlay';
import {
  UfvkCheck,
  checkUfvk,
  getLatestBlockServerInfo,
} from '@app/walletBackend';
import { ChainNameEnum, GlobalConst } from '@app/AppState';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import {
  isViewingKey,
  scannedSeedPhrase,
  seedStatus,
  viewingKeyProblem,
} from '@app/utils/seedPhrase';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';

// Positions from the 402 x 874 design.
const FIELD_WIDTH = 270;
/** The note's bottom, above the button's. */
const NOTE_ABOVE_BUTTON = 65;

type ImportUfvkProps = {
  busy: boolean;
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => void;
};
// Waits for typing to pause before decoding the key.
const KEY_CHECK_DELAY_MS = 300;
// A key the decode rejects reads as incomplete only once typing pauses
// this long, so it does not turn red on every keystroke.
const KEY_PAUSE_MS = 1200;

const ImportUfvk: React.FunctionComponent<ImportUfvkProps> = ({
  busy,
  onClickCancel,
  onClickOK,
}) => {
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, server, addLastSnackbar } = context;
  const { colors } = useTheme();
  const bottomPad = useBottomActionPad();

  const [seedufvkText, setSeedufvkText] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [latestBlock, setLatestBlock] = useState<number>(0);
  const [tipOpen, setTipOpen] = useState<boolean>(false);
  const scanButton = useRef<View>(null);
  const [scan, setScan] = useState<
    { kind: 'closed' } | { kind: 'open'; origin: RevealOrigin }
  >({ kind: 'closed' });
  const [pulse, setPulse] = useState(0);
  const keyboardHeight = useKeyboardHeight();

  const status = seedStatus(seedufvkText);
  const typedKey = status.kind === 'ufvk' ? status.key : '';
  // The check of the key in the field; unknown while it runs, or when the
  // native call failed and the restore itself will report.
  const [keyCheck, setKeyCheck] = useState<{ key: string; check: UfvkCheck }>({
    key: '',
    check: { kind: 'unknown' },
  });
  const check: UfvkCheck =
    keyCheck.key === typedKey ? keyCheck.check : { kind: 'unknown' };
  const keyChainMismatch =
    check.kind === 'ufvk' &&
    server.chainName !== ChainNameEnum.noneChainName &&
    check.chainName !== server.chainName;
  const chainLabel = (chain: ChainNameEnum) =>
    translate(`settings.value-chainname-${chain}`) as string;
  const problem = viewingKeyProblem(typedKey);
  // Set once typing pauses or the key loses focus.
  const [keyPaused, setKeyPaused] = useState(false);
  const keyError =
    problem.kind === 'prefix'
      ? (translate('import.key-prefix') as string)
      : problem.kind === 'char'
        ? (translate('import.key-char') as string).replace(
            '{char}',
            problem.char,
          )
        : check.kind === 'ufvk' && keyChainMismatch
          ? (translate('import.key-wrong-chain') as string)
              .replace('{key}', chainLabel(check.chainName))
              .replace('{server}', chainLabel(server.chainName))
          : check.kind === 'invalid' && keyPaused
            ? (translate('import.key-incomplete') as string)
            : undefined;
  const keyValid =
    problem.kind === 'none' && check.kind === 'ufvk' && !keyChainMismatch;
  // A key whose decode could not run passes on; the restore reports.
  const keyReady =
    (status.kind === 'ufvk' &&
      keyCheck.key === typedKey &&
      (keyValid || (problem.kind === 'none' && check.kind === 'unknown'))) ||
    (status.kind === 'seed' && status.complete);

  useEffect(() => {
    if (!typedKey) {
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      const result = await checkUfvk(typedKey);
      if (live) {
        setKeyCheck({ key: typedKey, check: result });
      }
    }, KEY_CHECK_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [typedKey]);

  useEffect(() => {
    setKeyPaused(false);
    if (!typedKey) {
      return;
    }
    const timer = setTimeout(() => setKeyPaused(true), KEY_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [typedKey]);

  /** A birthday that came with the phrase fills the field when the user left it empty. */
  const fillBirthday = (height: number) => {
    if (!birthday) {
      setBirthday(String(height));
    }
  };

  const tipBody = translate('import.birthday-tip-body') as string;

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

  const openScanner = () => {
    Keyboard.dismiss();
    scanButton.current?.measureInWindow((x, y, width, height) =>
      setScan({
        kind: 'open',
        origin: { x: x + width / 2, y: y + height / 2 },
      }),
    );
  };

  /** The one bottom distance, above the keyboard too. */
  const buttonBottom = bottomPad;

  return (
    <View style={{ flex: 1 }}>
      <TitleBar
        title={translate('import.screen-title') as string}
        left={{
          icon: ChevronLeft,
          onPress: onClickCancel,
          accessibilityLabel: translate('import.back-acc') as string,
          testID: 'import.back',
          accent: true,
          disabled: busy,
        }}
      />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={BUTTON_HEIGHT + space12 + space16}
        bounces={false}
        onScrollBeginDrag={() => setTipOpen(false)}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: space32,
          paddingHorizontal: space20,
          paddingBottom: 200,
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
            marginBottom: space12,
          }}
        >
          <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
            {translate('import.seed-label') as string}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!!seedufvkText && (
              <FieldAction
                icon={XIcon}
                label={translate('clear') as string}
                onPress={() => setSeedufvkText('')}
              />
            )}
            <View ref={scanButton} collapsable={false}>
              <FieldAction
                icon={ScanIcon}
                label={translate('scanner.title') as string}
                onPress={openScanner}
                testID="import.scan"
              />
            </View>
          </View>
        </View>
        <SeedPhraseInput
          testID="import.seedufvkinput"
          accessibilityLabel={translate('seed.seed-acc') as string}
          value={seedufvkText}
          onChangeValue={setSeedufvkText}
          translate={translate}
          keyError={keyError}
          keyValid={keyValid}
          onKeyBlur={() => setKeyPaused(true)}
          pulse={pulse}
          onBirthday={fillBirthday}
        />

        <View style={{ marginTop: space32, alignItems: 'center' }}>
          <InfoTooltip
            testID="import.birthdayinfo"
            label={translate('import.birthday') as string}
            title={translate('import.birthday-tip-title') as string}
            text={tipBody}
            open={tipOpen}
            onToggle={setTipOpen}
          />
          <View style={{ marginTop: space12, width: FIELD_WIDTH }}>
            <TextField
              label=""
              testID="import.birthdayinput"
              accessibilityLabel={translate('import.birthday-acc') as string}
              placeholder={translate('import.birthday-placeholder') as string}
              value={birthday}
              onChangeText={(text: string) => {
                const height = Number(text.replace(/\D/g, ''));
                if (
                  height <= 0 ||
                  (height > latestBlock && server.kind !== 'offline')
                ) {
                  setBirthday('');
                } else {
                  setBirthday(String(height));
                }
              }}
              disabled={!latestBlock && server.kind !== 'offline'}
              clearable
              clearLabel={translate('clear') as string}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      {keyboardHeight === 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: space20,
            right: space20,
            bottom: bottomPad + NOTE_ABOVE_BUTTON,
            flexDirection: 'row',
            gap: space12,
          }}
        >
          <InfoIcon size={iconSizeSm} color={colors.fgMuted} />
          <Text variant="caption" style={{ flex: 1 }}>
            {translate('import.text') as string}
          </Text>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          left: space20,
          right: space20,
          bottom: buttonBottom,
        }}
      >
        <View>
          <Button
            variant="primary"
            testID="import.button.ok"
            title={translate('import.submit') as string}
            disabled={!keyReady}
            busy={busy}
            onPress={() => {
              okButton();
            }}
          />
        </View>
      </View>
      {scan.kind === 'open' && (
        <ScanOverlay
          testID="import.scanner"
          origin={scan.origin}
          texts={{
            title: translate('scanner.title') as string,
            hint: translate('import.scan-hint') as string,
            miss: translate('import.scan-miss') as string,
            found: value =>
              translate(
                isViewingKey(value)
                  ? 'import.scan-found'
                  : 'import.scan-found-seed',
              ) as string,
            back: translate('scanner.back') as string,
            torch: translate('scanner.torch') as string,
          }}
          accepts={value => isViewingKey(value) || !!scannedSeedPhrase(value)}
          onRead={value => {
            const seed = scannedSeedPhrase(value);
            if (seed) {
              setSeedufvkText(seed.words.join(' '));
              if (seed.birthday) {
                fillBirthday(seed.birthday);
              }
            } else {
              setSeedufvkText(value);
            }
            setPulse(p => p + 1);
          }}
          onClosed={() => setScan({ kind: 'closed' })}
        />
      )}
    </View>
  );
};

export default ImportUfvk;
