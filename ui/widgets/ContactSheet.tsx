/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { openScanner } from '@app/navigation/navigate';
import { useResult } from '@app/navigation/results';
import { isZnsAlias, resolveZnsName } from '@app/uris/resolveZnsName';
import Utils from '@app/utils';
import { isWalletAddress } from '@app/walletBackend';
import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import RegText from '@ui/primitives/RegText';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import ChainSelect from '@ui/widgets/ChainSelect';
import { fieldBorder } from '@ui/primitives/fieldBorder';

const ZEC = 'ZEC';
const NAME_MAX = 32;
const CHECK_AT = 250;
const ZNS_AT = 500;
const OK_INK = '#7FD96E';
const WARN_INK = '#E6C46A';
const ERR_INK = '#F2878A';

type Field = 'none' | 'name' | 'address';

type Note = { tone: 'ok' | 'warn' | 'err'; text: string } | { tone: 'none' };

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
  | { kind: 'own' }
  | { kind: 'valid' };

type ContactSheetProps = {
  edit: ContactEdit;
  book: AddressBookFileClass[];
  walletChain: ChainNameEnum;
  onSave: (name: string, address: string) => Promise<void>;
  onCancel: () => void;
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
  const [focus, setFocus] = useState<Field>('none');
  const [touched, setTouched] = useState(false);
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
      const own = isValid && (await isWalletAddress(typed));
      if (!cancelled) {
        setCheck({ kind: own ? 'own' : isValid ? 'valid' : 'invalid' });
      }
    }, CHECK_AT);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, alias, walletChain]);

  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  /** The wallet's own tagged addresses are not contacts and are never listed, so they cannot clash with one. */
  const others = book.filter(
    entry =>
      !entry.own &&
      (edit.kind === 'new' || entry.address !== edit.contact.address),
  );
  const dupName = others.some(
    entry => entry.label.toLowerCase() === trimmedName.toLowerCase(),
  );
  const sameAddress =
    check.kind === 'valid'
      ? others.find(entry => entry.address === trimmedAddress)
      : undefined;
  const dupAddress = !!sameAddress;
  const ready =
    trimmedName.length > 0 && !dupName && check.kind === 'valid' && !dupAddress;

  const nameError = dupName
    ? (translate('addressbook.dup-name') as string).replace(
        '{name}',
        trimmedName,
      )
    : '';
  const addressError =
    zns.kind === 'missing'
      ? (translate('send.znsnamenotfound') as string)
      : sameAddress
        ? (translate('addressbook.dup-address') as string).replace(
            '{name}',
            sameAddress.label,
          )
        : check.kind === 'own'
          ? (translate('addressbook.own-address') as string)
          : check.kind === 'invalid' && touched
            ? (translate('send.invalidaddress') as string)
            : '';
  const transparent = /^t/i.test(trimmedAddress);
  const note: Note = nameError
    ? { tone: 'err', text: nameError }
    : addressError
      ? { tone: 'err', text: addressError }
      : check.kind === 'valid'
        ? {
            tone: transparent ? 'warn' : 'ok',
            text: translate(kindKey(trimmedAddress)) as string,
          }
        : { tone: 'none' };
  const noteInk = { ok: OK_INK, warn: WARN_INK, err: ERR_INK };

  const border = (field: Field, bad: boolean, good: boolean): string =>
    fieldBorder(
      colors,
      focus === field,
      bad ? 'invalid' : good ? 'valid' : 'unknown',
    );

  const save = async () => {
    Keyboard.dismiss();
    setSaving(true);
    await onSave(trimmedName, trimmedAddress);
  };

  useResult('addressbook.address', scanned => setAddress(scanned.trim()));
  const scan = () => {
    Keyboard.dismiss();
    const open = (origin?: { x: number; y: number }) =>
      openScanner({
        request: 'addressbook.address',
        accepts: { kind: 'any' },
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
        <RegText>{translate('addressbook.name') as string}</RegText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
            marginTop: 5,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: border('name', dupName, false),
            backgroundColor: colors.bgCanvas,
          }}
        >
          <TextInput
            testID="addressbook.name-field"
            onFocus={() => setFocus('name')}
            onBlur={() => setFocus('none')}
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
                color={colors.fgMuted}
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
        <RegText>{translate('addressbook.address') as string}</RegText>
        <View
          style={{
            flexDirection: 'row',
            marginTop: 5,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: border(
              'address',
              !!addressError,
              check.kind === 'valid' && !dupAddress,
            ),
            backgroundColor: colors.bgCanvas,
          }}
        >
          <TextInput
            testID="addressbook.address-field"
            onFocus={() => setFocus('address')}
            onBlur={() => {
              setFocus('none');
              setTouched(true);
            }}
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
                  color={colors.fgMuted}
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
        <View
          testID={`addressbook.note.${note.tone}`}
          style={{
            minHeight: 18,
            marginTop: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {note.tone === 'ok' && (
            <FontAwesomeIcon icon={faCheck} size={11} color={OK_INK} />
          )}
          {note.tone !== 'none' && (
            <RegText
              color={noteInk[note.tone]}
              style={{ flex: 1, fontSize: 11, lineHeight: 16 }}
            >
              {note.text}
            </RegText>
          )}
        </View>
      </View>

      <Button
        testID="addressbook.save"
        variant="primary"
        title={translate('save') as string}
        disabled={saving || !ready}
        onPress={save}
        style={{
          marginTop: 20,
        }}
      />
      <Button
        testID="addressbook.cancel"
        variant="quiet"
        title={translate('cancel') as string}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
        style={{ marginTop: 8 }}
      />
    </View>
  );
};

export default ContactSheet;
