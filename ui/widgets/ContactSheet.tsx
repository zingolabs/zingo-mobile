/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';

import { useTheme, slopFor } from '@app/theme';
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { openScanner } from '@app/navigation/navigate';
import { useResult } from '@app/navigation/results';
import { isZnsAlias, resolveZnsName } from '@app/uris/resolveZnsName';
import Utils from '@app/utils';
import { isWalletAddress } from '@app/walletBackend';
import {
  SWAP_ADDRESS_CHAINS,
  addressFromPaymentUri,
  canonicalChainAddress,
  chainFromPaymentUri,
  isValidChainAddress,
} from '@app/swap';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import RegText from '@ui/primitives/RegText';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import ChainSelect from '@ui/widgets/ChainSelect';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

const ZEC = 'ZEC';
const NAME_MAX = 32;
const CHECK_AT = 250;
const ZNS_AT = 500;

type Field = 'none' | 'name' | 'address';

type Note = { tone: 'ok' | 'warn' | 'err'; text: string } | { tone: 'none' };

export type ContactEdit =
  | {
      kind: 'new';
      preset: string;
      label: string;
      /** The chain when the caller knows it (a swap); the field is then fixed. */
      chain?: string;
    }
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
  /** `chain` is the SwapKit code the contact is filed under ('ZEC', 'BTC'…). */
  onSave: (name: string, address: string, chain: string) => Promise<void>;
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

/**
 * The form that adds or edits a contact anywhere in the app: its name, its
 * chain and its address. A chain the caller knows (a swap, an existing
 * contact) is fixed. Otherwise the most likely one is proposed and the list
 * offers only the chains the address could belong to.
 */
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

  /** Fixed when known: a swap names it, an existing contact keeps its own. */
  const fixedChain = edit.kind === 'edit' ? edit.contact.swapChain : edit.chain;
  /** What the user picked from the list, while it still fits the address. */
  const [picked, setPicked] = useState<string>('');
  /** Whether zingolib read the address as Zcash; unknown until it answers. */
  const [zcashCheck, setZcashCheck] = useState<{
    plain: string;
    valid: boolean;
  }>({ plain: '', valid: false });
  const plain = useMemo(() => {
    const typed = address.trim();
    const named = chainFromPaymentUri(typed);
    return named ? addressFromPaymentUri(named, typed) : typed;
  }, [address]);
  /** Zcash stays a candidate until zingolib says otherwise, so the proposal does not jump. */
  const zcashValid = zcashCheck.plain === plain ? zcashCheck.valid : true;
  const compatible = useMemo(() => {
    if (fixedChain) {
      return [fixedChain];
    }
    if (plain.length === 0) {
      return [...SWAP_ADDRESS_CHAINS];
    }
    return SWAP_ADDRESS_CHAINS.filter(code =>
      code === ZEC ? zcashValid : isValidChainAddress(code, plain),
    );
  }, [fixedChain, plain, zcashValid]);
  const likely = (() => {
    const named = chainFromPaymentUri(address.trim());
    if (named && compatible.includes(named)) {
      return named;
    }
    return compatible[0] ?? ZEC;
  })();
  const chain = fixedChain
    ? fixedChain
    : picked && compatible.includes(picked)
      ? picked
      : likely;
  const zcash = chain === ZEC;

  const alias = zcash && isZnsAlias(address);

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
      const zec = (await Utils.isValidAddress(plain, walletChain)).isValid;
      if (cancelled) {
        return;
      }
      setZcashCheck({ plain, valid: zec });
      if (!zcash) {
        setCheck({
          kind: isValidChainAddress(chain, plain) ? 'valid' : 'invalid',
        });
        return;
      }
      const own = zec && (await isWalletAddress(plain));
      if (!cancelled) {
        setCheck({ kind: own ? 'own' : zec ? 'valid' : 'invalid' });
      }
    }, CHECK_AT);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, alias, walletChain, plain, zcash, chain]);

  const trimmedName = name.trim();
  const trimmedAddress = canonicalChainAddress(chain, plain);
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
      ? others.find(
          entry =>
            entry.address === trimmedAddress &&
            entry.swapChain.toUpperCase() === chain.toUpperCase(),
        )
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
            ? zcash
              ? (translate('send.invalidaddress') as string)
              : (translate('addressbook.not-chain-address') as string).replace(
                  '{chain}',
                  chainDisplayName(chain) || chain,
                )
            : '';
  const transparent = zcash && /^t/i.test(trimmedAddress);
  const note: Note = nameError
    ? { tone: 'err', text: nameError }
    : addressError
      ? { tone: 'err', text: addressError }
      : check.kind === 'valid'
        ? {
            tone: transparent ? 'warn' : 'ok',
            text: zcash
              ? (translate(kindKey(trimmedAddress)) as string)
              : (translate('addressbook.chain-address') as string).replace(
                  '{chain}',
                  chainDisplayName(chain) || chain,
                ),
          }
        : { tone: 'none' };
  const noteInk = {
    ok: colors.fgAccent,
    warn: colors.fgTransparent,
    err: colors.fgDanger,
  };

  const border = (field: Field, bad: boolean, good: boolean): string =>
    fieldBorder(
      colors,
      focus === field,
      bad ? 'invalid' : good ? 'valid' : 'unknown',
    );

  const save = async () => {
    Keyboard.dismiss();
    setSaving(true);
    await onSave(trimmedName, trimmedAddress, chain);
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
          fontSize: 15,
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
              fontSize: 15,
            }}
          />
          {!!name && (
            <TouchableOpacity hitSlop={slopFor(20)} onPress={() => setName('')}>
              <XIcon
                style={{ marginRight: 10 }}
                size={20}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <ChainSelect
          label={translate('addressbook.chain') as string}
          value={chain}
          options={compatible}
          onChange={setPicked}
          translate={translate}
          disabled={!!fixedChain}
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
            placeholder={
              zcash
                ? (translate('addressbook.address-placeholder') as string)
                : (translate('addressbook.chain-address') as string).replace(
                    '{chain}',
                    chainDisplayName(chain) || chain,
                  )
            }
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
              fontSize: 15,
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
                size={24}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
            {!!address && (
              <TouchableOpacity
                hitSlop={slopFor(20)}
                testID="addressbook.address-clear"
                onPress={() => setAddress('')}
              >
                <XIcon
                  style={{ marginRight: 5 }}
                  size={20}
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
            <CheckIcon size={16} color={colors.fgAccent} />
          )}
          {note.tone !== 'none' && (
            <RegText
              color={noteInk[note.tone]}
              style={{ flex: 1, fontSize: 12, lineHeight: 16 }}
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
