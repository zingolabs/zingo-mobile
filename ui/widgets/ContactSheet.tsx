/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { AddressBookFileClass, ChainNameEnum, RouteEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { isZnsAlias, resolveZnsName } from '@app/uris/resolveZnsName';
import Utils from '@app/utils';
import BoldText from '@ui/primitives/BoldText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import ErrorText from '@ui/primitives/ErrorText';
import FadeText from '@ui/primitives/FadeText';
import RegText from '@ui/primitives/RegText';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import ChainSelect from '@ui/widgets/ChainSelect';

const ZEC = 'ZEC';
const NAME_MAX = 32;
const CHECK_AT = 250;
const ZNS_AT = 500;

export type ContactEdit =
  | { kind: 'new'; preset: string; label: string }
  | { kind: 'edit'; contact: AddressBookFileClass };

type Zns =
  | { kind: 'none' }
  | { kind: 'resolving' }
  | { kind: 'missing' }
  | { kind: 'resolved'; alias: string; address: string };

type Check =
  | { kind: 'empty' }
  | { kind: 'checking' }
  | { kind: 'invalid' }
  | { kind: 'valid' };

type ContactSheetProps = {
  edit: ContactEdit;
  book: AddressBookFileClass[];
  walletChain: ChainNameEnum;
  onSave: (name: string, address: string) => Promise<void>;
  onCancel: () => void;
  /** The sheet is portaled, so the scanner opens through the host screen's navigation. */
  navigation?: NavigationProp<ParamListBase>;
};

/** The catalog key naming a Zcash address kind, from its prefix. */
const kindKey = (address: string): string =>
  /^tex/i.test(address)
    ? 'addressbook.kind-tex'
    : /^t/i.test(address)
      ? 'addressbook.kind-transparent'
      : /^zs/i.test(address)
        ? 'addressbook.kind-sapling'
        : 'addressbook.kind-unified';

// The form that adds or edits a contact anywhere in the app: its name, the
// chain (always Zcash for now) and its address.
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
    edit.kind === 'edit' ? edit.contact.label : edit.label,
  );
  const [address, setAddress] = useState(
    edit.kind === 'edit' ? edit.contact.address : edit.preset,
  );
  const [check, setCheck] = useState<Check>({ kind: 'empty' });
  const [zns, setZns] = useState<Zns>({ kind: 'none' });
  const [saving, setSaving] = useState(false);
  const scanButton = useRef<View>(null);

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
      const { isValid } = await Utils.isValidAddress(typed, walletChain);
      if (!cancelled) {
        setCheck({ kind: isValid ? 'valid' : 'invalid' });
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

  const addressError =
    zns.kind === 'missing'
      ? (translate('send.znsnamenotfound') as string)
      : dupAddress
        ? (translate('addressbook.dup-address') as string)
        : check.kind === 'invalid'
          ? (translate('send.invalidaddress') as string)
          : '';
  const transparent = /^t/i.test(trimmedAddress);

  const save = async () => {
    Keyboard.dismiss();
    setSaving(true);
    await onSave(trimmedName, trimmedAddress);
  };

  const scan = () => {
    Keyboard.dismiss();
    const open = (origin?: { x: number; y: number }) =>
      navigation?.navigate(RouteEnum.ScannerAddress, {
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

  const labelRow = (label: string, error: string, ok: boolean) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <RegText>{label}</RegText>
      {!!error && <ErrorText>{error}</ErrorText>}
      {!error && ok && (
        <FontAwesomeIcon icon={faCheck} color={colors.fgAccent} />
      )}
    </View>
  );

  return (
    <View
      testID={`addressbook.sheet.${edit.kind}`}
      style={{ paddingHorizontal: 22 }}
    >
      <BoldText
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 15.5,
          lineHeight: 21,
        }}
      >
        {
          translate(
            edit.kind === 'edit'
              ? 'addressbook.edit-contact'
              : 'addressbook.new-contact',
          ) as string
        }
      </BoldText>
      <View style={{ marginTop: 10 }}>
        {labelRow(
          translate('addressbook.name') as string,
          dupName
            ? (translate('addressbook.dup-name') as string).replace(
                '{name}',
                trimmedName,
              )
            : '',
          false,
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
            marginTop: 5,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: colors.borderMuted,
          }}
        >
          <TextInput
            testID="addressbook.name-field"
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX}
            placeholder={translate('addressbook.name-placeholder') as string}
            placeholderTextColor={colors.fgMuted}
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              flex: 1,
              padding: 10,
              color: colors.fgDefault,
              fontWeight: '600',
              fontSize: 14,
              backgroundColor: 'transparent',
            }}
          />
          {!!name && (
            <TouchableOpacity onPress={() => setName('')}>
              <FontAwesomeIcon
                style={{ marginRight: 10 }}
                size={20}
                icon={faXmark}
                color={colors.fgAccentDisabled}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <ChainSelect
          label={translate('addressbook.chain') as string}
          value={ZEC}
          options={[ZEC]}
          onChange={() => {}}
          translate={translate}
          disabled
        />
      </View>

      <View style={{ marginTop: 18 }}>
        {labelRow(
          translate('addressbook.address') as string,
          addressError,
          check.kind === 'valid' && !dupAddress,
        )}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 5,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: colors.borderMuted,
          }}
        >
          <TextInput
            testID="addressbook.address-field"
            value={address}
            onChangeText={text => setAddress(text.replace(/\s+/g, ''))}
            multiline
            placeholder={translate('addressbook.address-placeholder') as string}
            placeholderTextColor={colors.fgMuted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={{
              flex: 1,
              padding: 10,
              minHeight: 58,
              textAlignVertical: 'top',
              color: colors.fgDefault,
              fontWeight: '600',
              fontSize: 14,
              backgroundColor: 'transparent',
            }}
          />
          <View style={{ alignItems: 'center', paddingVertical: 6, gap: 6 }}>
            <TouchableOpacity
              ref={scanButton}
              testID="addressbook.scan-button"
              accessibilityLabel={translate('scanner.title') as string}
              hitSlop={8}
              onPress={scan}
            >
              <ScanIcon
                style={{ marginRight: 5 }}
                size={28}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
            {!!address && (
              <TouchableOpacity
                testID="addressbook.address-clear"
                onPress={() => setAddress('')}
              >
                <FontAwesomeIcon
                  style={{ marginRight: 5 }}
                  size={20}
                  icon={faXmark}
                  color={colors.fgAccentDisabled}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {zns.kind === 'resolved' && (
          <RegText
            testID="addressbook.address.zns"
            style={{ color: colors.fgAccent, fontWeight: '600', marginTop: 5 }}
          >
            {`ZNS: ${zns.alias}`}
          </RegText>
        )}
        {check.kind === 'valid' && !dupAddress && (
          <FadeText
            testID={`addressbook.kind.${transparent ? 'public' : 'shielded'}`}
            style={{
              marginTop: 5,
              color: transparent ? colors.fgWarning : colors.fgMuted,
            }}
          >
            {translate(kindKey(trimmedAddress)) as string}
          </FadeText>
        )}
      </View>

      <Button
        testID="addressbook.save"
        type={ButtonTypeEnum.Primary}
        title={translate('save') as string}
        disabled={!ready || saving}
        onPress={save}
        fullWidth
        style={{ marginTop: 20, minHeight: 46, borderRadius: 23 }}
        textStyle={{ fontSize: 15 }}
      />
      <Button
        testID="addressbook.cancel"
        type={ButtonTypeEnum.Link}
        title={translate('cancel') as string}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
        fullWidth
        style={{ marginTop: 8 }}
      />
    </View>
  );
};

export default ContactSheet;
