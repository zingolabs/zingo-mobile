/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { AddressBookFileClass, ChainNameEnum, RouteEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { isZnsAlias, resolveZnsName } from '@app/uris/resolveZnsName';
import { ChainLogo } from '@ui/widgets/ChainSelect';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import {
  AddressCheck,
  checkZcashAddress,
} from '@screens/AddressBook/zcashAddressKind';

const ZEC = 'ZEC';
const NAME_MAX = 32;
const CHECK_AT = 250;
const ZNS_AT = 500;
const SHAKE_MS = 60;
const LABEL_INK = '#B9C6D6';
const SOFT_INK = '#8DA0B8';
const PLACEHOLDER = '#4A5F80';
const OK_INK = '#7FD96E';
const WARN_INK = '#E6C46A';
const ERR_INK = '#F2878A';
const OK_BORDER = 'rgba(20,157,5,0.6)';
const ERR_BORDER = '#E5484D';
const SAVE_OFF_INK = '#5E8A5E';
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

export type ContactEdit =
  | { kind: 'new'; preset: string }
  | { kind: 'edit'; contact: AddressBookFileClass };

type Zns =
  | { kind: 'none' }
  | { kind: 'resolving' }
  | { kind: 'missing' }
  | { kind: 'resolved'; alias: string; address: string };

type Check = AddressCheck | { kind: 'checking' };

type Tone = 'ok' | 'warn' | 'err' | 'plain';

type Message = { tone: Tone; text: string };

type Field = 'none' | 'name' | 'address';

type ContactSheetProps = {
  edit: ContactEdit;
  book: AddressBookFileClass[];
  walletChain: ChainNameEnum;
  onSave: (name: string, address: string) => Promise<void>;
  onCancel: () => void;
  /** The sheet is portaled, so the scanner opens through the host screen's navigation. */
  navigation: NavigationProp<ParamListBase>;
};

const KIND_KEY = {
  unified: 'addressbook.kind-unified',
  sapling: 'addressbook.kind-sapling',
  transparent: 'addressbook.kind-transparent',
  tex: 'addressbook.kind-tex',
} as const;

// The form of a contact: its name, the chain (always Zcash) and its address.
const ContactSheet: React.FunctionComponent<ContactSheetProps> = ({
  edit,
  book,
  walletChain,
  onSave,
  onCancel,
  navigation,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [name, setName] = useState(
    edit.kind === 'edit' ? edit.contact.label : '',
  );
  const [address, setAddress] = useState(
    edit.kind === 'edit' ? edit.contact.address : edit.preset,
  );
  const [touched, setTouched] = useState(false);
  const [focus, setFocus] = useState<Field>('none');
  const [check, setCheck] = useState<Check>({ kind: 'empty' });
  const [zns, setZns] = useState<Zns>({ kind: 'none' });
  const [saving, setSaving] = useState(false);
  const scanButton = useRef<View>(null);
  const shake = useSharedValue(0);

  const alias = isZnsAlias(address);

  useEffect(() => {
    const typed = address.trim();
    if (alias) {
      setCheck({ kind: 'checking' });
      setZns({ kind: 'resolving' });
      let cancelled = false;
      const timer = setTimeout(async () => {
        const found = await resolveZnsName(typed, walletChain);
        if (cancelled) {
          return;
        }
        if (found.ok) {
          const lower = typed.toLowerCase();
          setZns({ kind: 'resolved', alias: lower, address: found.address });
          setName(previous => (previous.trim() ? previous : lower));
          setAddress(found.address);
          return;
        }
        setZns({ kind: 'missing' });
        setCheck({ kind: 'invalid' });
      }, ZNS_AT);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    setZns(previous =>
      previous.kind === 'resolved' && previous.address === typed
        ? previous
        : { kind: 'none' },
    );
    if (typed.length === 0) {
      setCheck({ kind: 'empty' });
      return;
    }
    setCheck({ kind: 'checking' });
    let cancelled = false;
    const timer = setTimeout(async () => {
      const verdict = await checkZcashAddress(typed, walletChain);
      if (!cancelled) {
        setCheck(verdict);
      }
    }, CHECK_AT);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, alias, walletChain]);

  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  const others = book.filter(
    entry => edit.kind === 'new' || entry.address !== edit.contact.address,
  );
  const dupName = others.some(
    entry => entry.label.toLowerCase() === trimmedName.toLowerCase(),
  );
  const dupAddress =
    check.kind === 'valid' &&
    others.some(entry => entry.address === trimmedAddress);
  const ready =
    trimmedName.length > 0 && !dupName && check.kind === 'valid' && !dupAddress;

  const message = (): Message => {
    if (dupName) {
      return {
        tone: 'err',
        text: (translate('addressbook.dup-name') as string).replace(
          '{name}',
          trimmedName,
        ),
      };
    }
    if (zns.kind === 'missing') {
      return { tone: 'err', text: translate('send.znsnamenotfound') as string };
    }
    if (dupAddress) {
      return {
        tone: 'err',
        text: translate('addressbook.dup-address') as string,
      };
    }
    if (check.kind === 'invalid' && touched) {
      return { tone: 'err', text: translate('addressbook.invalid') as string };
    }
    if (check.kind === 'valid') {
      const transparent = check.type === 'transparent' || check.type === 'tex';
      return {
        tone: transparent ? 'warn' : 'ok',
        text: translate(KIND_KEY[check.type]) as string,
      };
    }
    return { tone: 'plain', text: '' };
  };
  const shown = message();
  const inks: Record<Tone, string> = {
    ok: OK_INK,
    warn: WARN_INK,
    err: ERR_INK,
    plain: SOFT_INK,
  };

  const border = (field: Field, bad: boolean, good: boolean): string =>
    bad
      ? ERR_BORDER
      : good
        ? OK_BORDER
        : focus === field
          ? colors.borderFocus
          : colors.bottomSheetBorder;

  const fieldStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.bgCanvas,
    paddingLeft: 14,
    paddingRight: 6,
    gap: 4,
  };

  const labelStyle = {
    marginTop: 10,
    marginBottom: 8,
    marginHorizontal: 2,
    color: LABEL_INK,
    fontSize: 12.5,
    fontWeight: '600' as const,
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const save = async () => {
    if (!ready) {
      setTouched(true);
      const step = (x: number) =>
        withTiming(x, {
          duration: SHAKE_MS,
          easing: ease.standard,
          reduceMotion: ReduceMotion.System,
        });
      shake.value = withSequence(step(-4), step(4), step(-4), step(0));
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    await onSave(trimmedName, trimmedAddress);
  };

  const scan = () => {
    Keyboard.dismiss();
    const open = (origin?: { x: number; y: number }) =>
      navigation.navigate(RouteEnum.ScannerAddress, {
        setAddress: (scanned: string) => setAddress(scanned.trim()),
        accepts: () => true,
        texts: {
          title: translate('scanner.title') as string,
          hint: translate('scanner.hint-any') as string,
          miss: '',
          found: translate('scanner.found') as string,
          back: translate('scanner.back') as string,
          torch: translate('scanner.torch') as string,
        },
        origin,
      });
    if (scanButton.current) {
      scanButton.current.measureInWindow((x, y, width, height) =>
        open({ x: x + width / 2, y: y + height / 2 }),
      );
      return;
    }
    open();
  };

  return (
    <View
      testID={`addressbook.sheet.${edit.kind}`}
      style={{ paddingHorizontal: 22, paddingTop: 6 }}
    >
      <Text style={labelStyle}>{translate('addressbook.name') as string}</Text>
      <View
        style={[fieldStyle, { borderColor: border('name', dupName, false) }]}
      >
        <TextInput
          testID="addressbook.name-field"
          value={name}
          onChangeText={setName}
          onFocus={() => setFocus('name')}
          onBlur={() => setFocus('none')}
          maxLength={NAME_MAX}
          placeholder={translate('addressbook.name-placeholder') as string}
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="words"
          autoCorrect={false}
          style={{
            flex: 1,
            minWidth: 0,
            paddingVertical: 0,
            color: colors.fgDefault,
            fontSize: 14,
          }}
        />
      </View>

      <Text style={labelStyle}>{translate('addressbook.chain') as string}</Text>
      <View
        testID="addressbook.chain-field"
        style={[
          fieldStyle,
          { gap: 10, paddingRight: 14, borderColor: colors.bottomSheetBorder },
        ]}
      >
        <ChainLogo chain={ZEC} size={18} />
        <Text
          style={{
            flex: 1,
            color: colors.fgDefault,
            fontSize: 14,
            fontWeight: '500',
          }}
        >
          {chainDisplayName(ZEC)}
        </Text>
        <Text
          style={{
            color: SOFT_INK,
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 0.4,
          }}
        >
          {ZEC}
        </Text>
      </View>

      <Text style={labelStyle}>
        {translate('addressbook.address') as string}
      </Text>
      <View
        style={[
          fieldStyle,
          {
            alignItems: 'flex-start',
            paddingVertical: 6,
            borderColor: border(
              'address',
              dupAddress ||
                zns.kind === 'missing' ||
                (touched && check.kind === 'invalid'),
              check.kind === 'valid' && !dupAddress,
            ),
          },
        ]}
      >
        <TextInput
          testID="addressbook.address-field"
          value={address}
          onChangeText={text => setAddress(text.replace(/\s+/g, ''))}
          onFocus={() => setFocus('address')}
          onBlur={() => {
            setFocus('none');
            setTouched(true);
          }}
          multiline
          placeholder={translate('addressbook.address-placeholder') as string}
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 58,
            paddingVertical: 4,
            textAlignVertical: 'top',
            color: colors.fgDefault,
            fontFamily: MONO,
            fontSize: 12.5,
            lineHeight: 19,
          }}
        />
        <View style={{ alignItems: 'center' }}>
          <Pressable
            ref={scanButton}
            testID="addressbook.scan-button"
            accessibilityRole="button"
            accessibilityLabel={translate('scanner.title') as string}
            hitSlop={8}
            onPress={scan}
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScanIcon size={24} color={SOFT_INK} />
          </Pressable>
          {address.length > 0 && (
            <Pressable
              testID="addressbook.address-clear"
              accessibilityRole="button"
              accessibilityLabel={translate('clear') as string}
              hitSlop={8}
              onPress={() => setAddress('')}
              style={{
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XIcon size={18} color={SOFT_INK} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </View>
      {zns.kind === 'resolved' && (
        <Text
          testID="addressbook.address.zns"
          style={{
            marginTop: 6,
            marginHorizontal: 2,
            color: colors.fgAccent,
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          {`ZNS: ${zns.alias}`}
        </Text>
      )}
      <View
        testID={`addressbook.message.${shown.tone}`}
        style={{
          minHeight: 18,
          marginTop: 6,
          marginHorizontal: 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {shown.tone === 'ok' && (
          <CheckIcon size={13} color={OK_INK} strokeWidth={2.8} />
        )}
        <Text style={{ color: inks[shown.tone], fontSize: 11, lineHeight: 16 }}>
          {shown.text}
        </Text>
      </View>

      <Animated.View style={shakeStyle}>
        <Pressable
          testID="addressbook.save"
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || saving }}
          disabled={saving}
          onPress={save}
          style={({ pressed }) => ({
            height: 46,
            marginTop: 20,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ready ? colors.bgAccent : colors.bgAccentDisabled,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text
            style={{
              color: ready ? colors.bgCanvas : SAVE_OFF_INK,
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            {translate('save') as string}
          </Text>
        </Pressable>
      </Animated.View>
      <Pressable
        testID="addressbook.cancel"
        accessibilityRole="button"
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
        style={({ pressed }) => ({
          minHeight: 38,
          marginTop: 8,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: SOFT_INK, fontSize: 13, fontWeight: '500' }}>
          {translate('cancel') as string}
        </Text>
      </Pressable>
    </View>
  );
};

export default ContactSheet;
