/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { radiusMd, slopFor, useTheme } from '@app/theme';
import { AddressBookFileClass } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import { ContactIcon } from '@ui/primitives/Icons/ContactIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { SearchIcon } from '@ui/primitives/Icons/SearchIcon';
import Avatar, { avatarCategoryOf } from '@ui/widgets/Avatar';

/** A pasted address reads in the monospace face, as everywhere else. */
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Where a Zcash Name typed in the field stands. */
export type NameLookup =
  | { kind: 'none' }
  | { kind: 'loading'; name: string }
  | { kind: 'found'; name: string; address: string }
  | { kind: 'missing'; name: string };

/** The catalog key naming a Zcash address kind, from its prefix. */
export const kindKey = (address: string): string =>
  /^tex/i.test(address)
    ? 'addressbook.kind-tex'
    : /^t/i.test(address)
      ? 'addressbook.kind-transparent'
      : /^zs/i.test(address)
        ? 'addressbook.kind-sapling'
        : 'addressbook.kind-unified';

type RecipientFieldProps = {
  text: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  /** 1 a valid address, 0 nothing to judge yet, -1 not an address, contact or name. */
  valid: number;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  /** The saved contact the address belongs to, when it is one. */
  contact: AddressBookFileClass | undefined;
  /** The Zcash Name the address was picked from, when it was. */
  pickedName: string;
  /** Contacts whose name starts with what is typed. */
  matches: AddressBookFileClass[];
  lookup: NameLookup;
  onPickContact: (contact: AddressBookFileClass) => void;
  onPickName: (name: string, address: string) => void;
  onOpenBook: () => void;
  onScan: () => void;
  scanRef: React.RefObject<View | null>;
  onSaveContact: () => void;
  /** The book button is off while the field is being replaced. */
  busy: boolean;
};

/**
 * The To field of Send: an address, a contact or a Zcash Name. A contact or a
 * name becomes a token with its avatar, name and short address. Typing a name
 * opens a box under the field with the matching contacts and the Zcash Name
 * being looked up; a pasted address says its kind, and a transparent one
 * warns that the payment will be public.
 */
export default function RecipientField({
  text,
  onChangeText,
  onClear,
  valid,
  focused,
  onFocus,
  onBlur,
  contact,
  pickedName,
  matches,
  lookup,
  onPickContact,
  onPickName,
  onOpenBook,
  onScan,
  scanRef,
  onSaveContact,
  busy,
}: RecipientFieldProps) {
  const { translate, addressBook } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();
  const token = valid === 1 && (!!contact || !!pickedName);
  const transparent = valid === 1 && /^t/i.test(text);
  const searching = matches.length > 0 || lookup.kind !== 'none';

  /** A Zcash Name not in the book draws its avatar from the name. */
  const avatarFor = (name: string, color?: string) => (
    <Avatar
      kind="contact"
      name={name}
      category={avatarCategoryOf(color ?? name)}
      size="md"
    />
  );

  const resultRow = (
    key: string,
    avatar: React.ReactNode,
    title: string,
    line: React.ReactNode,
    onPress?: () => void,
    trailing?: React.ReactNode,
  ) => (
    <Pressable
      key={key}
      testID={`send.result.${key}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
      })}
    >
      {avatar}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {line}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
  const section = (label: string) => (
    <Text
      variant="caption"
      tone="muted"
      style={{
        fontWeight: '700',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 2,
      }}
    >
      {label}
    </Text>
  );
  const searchAvatar = (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgMutedSubtle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SearchIcon size={18} color={colors.fgMuted} />
    </View>
  );

  const message = (() => {
    if (valid === -1) {
      return (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6 }}
        >
          <InfoIcon size={14} color={colors.fgDanger} />
          <Text
            testID="send.address.error"
            variant="caption"
            style={{ color: colors.fgDanger, flexShrink: 1 }}
          >
            {t('send.to-invalid')}
          </Text>
        </View>
      );
    }
    if (valid !== 1 || token) {
      return null;
    }
    if (transparent) {
      return (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6 }}
        >
          <TriangleAlert size={14} color={colors.fgTransparent} />
          <Text variant="caption" style={{ color: colors.fgTransparent }}>
            {t('send.to-transparent')}
          </Text>
        </View>
      );
    }
    return (
      <View
        style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6 }}
      >
        <CheckIcon size={14} color={colors.fgAccent} />
        <Text
          testID="send.address.check"
          variant="caption"
          tone="muted"
          style={{ flexShrink: 1 }}
        >
          {t(kindKey(text))}
        </Text>
        <Pressable
          testID="send.add-address"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSaveContact}
          style={{ marginLeft: 'auto' }}
        >
          <Text
            variant="caption"
            style={{ fontWeight: '700', color: colors.fgAccent }}
          >
            {t('swap.save-contact')}
          </Text>
        </Pressable>
      </View>
    );
  })();

  const border = fieldBorder(
    colors,
    focused,
    valid === 1 ? 'valid' : valid === -1 ? 'invalid' : 'unknown',
  );

  return (
    <View>
      <Text
        variant="caption"
        tone="muted"
        style={{ fontWeight: '600', marginBottom: 8 }}
      >
        {t('send.to')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderWidth: 1,
          borderRadius: radiusMd,
          borderColor: border,
          backgroundColor: colors.bgCanvas,
          paddingLeft: token ? 8 : 14,
          paddingRight: 4,
        }}
      >
        {token ? (
          <View
            testID="send.token"
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 10,
              paddingVertical: 6,
            }}
          >
            {avatarFor(contact?.label ?? pickedName, contact?.color)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {contact?.label ?? pickedName}
              </Text>
              <Text variant="address" tone="muted" numberOfLines={1}>
                {Utils.trimToSmall(text, 8)}
              </Text>
            </View>
          </View>
        ) : (
          <TextInput
            testID="send.addressplaceholder"
            onFocus={onFocus}
            onBlur={onBlur}
            accessibilityLabel={t('send.address-acc')}
            placeholder={t('send.to-placeholder')}
            placeholderTextColor={colors.fgMuted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            value={text}
            onChangeText={onChangeText}
            style={{
              flex: 1,
              minWidth: 0,
              color: colors.fgDefault,
              fontSize: valid === 1 ? 13 : 15,
              fontFamily: valid === 1 ? MONO : undefined,
              paddingVertical: 12,
            }}
          />
        )}
        {!!text && (
          <TouchableOpacity
            testID="send.address.clear"
            hitSlop={slopFor(20)}
            onPress={onClear}
            style={{ padding: 6 }}
          >
            <XIcon size={18} color={colors.fgMuted} />
          </TouchableOpacity>
        )}
        {!token && (
          <>
            <TouchableOpacity
              testID="send.address-book"
              hitSlop={slopFor(24)}
              disabled={busy}
              accessibilityLabel={t('addressbook.pick-title')}
              onPress={onOpenBook}
              style={{ padding: 6 }}
            >
              <ContactIcon
                size={22}
                color={busy ? colors.fgAccentDisabled : colors.fgMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              ref={scanRef}
              testID="send.scan-button"
              hitSlop={slopFor(24)}
              accessibilityLabel={t('send.scan-acc')}
              onPress={onScan}
              style={{ padding: 6 }}
            >
              <ScanIcon size={22} color={colors.fgMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>
      {!!message && <View style={{ marginTop: 6 }}>{message}</View>}
      {searching && !token && (
        <View
          testID="send.results"
          style={{
            marginTop: 6,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.bgCanvas,
            overflow: 'hidden',
            paddingBottom: 4,
          }}
        >
          {matches.length > 0 && section(t('send.results-contacts'))}
          {matches.map(entry =>
            resultRow(
              `contact.${entry.label}`,
              avatarFor(entry.label, entry.color),
              entry.label,
              Utils.trimToSmall(entry.address, 6),
              () => onPickContact(entry),
            ),
          )}
          {lookup.kind !== 'none' && section(t('send.results-name'))}
          {lookup.kind === 'loading' &&
            resultRow(
              'name',
              searchAvatar,
              lookup.name,
              t('send.name-looking'),
              undefined,
              <ActivityIndicator size="small" color={colors.fgMuted} />,
            )}
          {lookup.kind === 'missing' &&
            resultRow('name', searchAvatar, lookup.name, t('send.name-nobody'))}
          {lookup.kind === 'found' &&
            (() => {
              const saved = addressBook.find(
                entry => entry.address === lookup.address,
              );
              return resultRow(
                'name',
                avatarFor(lookup.name, saved?.color),
                lookup.name,
                `${
                  saved
                    ? t('send.name-your-contact').replace('{name}', saved.label)
                    : t('send.name-not-contact')
                } · ${Utils.trimToSmall(lookup.address, 6)}`,
                () =>
                  saved
                    ? onPickContact(saved)
                    : onPickName(lookup.name, lookup.address),
              );
            })()}
        </View>
      )}
    </View>
  );
}
