/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';

import { useTheme } from '@app/theme';
import {
  AddressBookFileClass,
  AddressKindEnum,
  GlobalConst,
  Route,
  SendPageStateClass,
  SnackbarDurationEnum,
  ToAddrClass,
} from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { showConfirm } from '@app/services/showConfirm';
import { deliver } from '@app/navigation/results';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Button from '@ui/primitives/Button';
import Header from '@ui/widgets/Header';
import SearchField from '@ui/widgets/SearchField';
import { ChevronDown, ChevronLeft } from '@ui/primitives/Icons/Chevron';
import ContactRow, { ROW_LINE } from './components/ContactRow';
import AddressRowHead from './components/AddressRowHead';
import SegmentedSwitch from '@ui/widgets/SegmentedSwitch';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import ContactSheet, { ContactEdit } from '@ui/widgets/ContactSheet';

const SIDE = 22;
const SOFT_INK = '#8DA0B8';
const HINT_ICON = '#7D93B3';
const FLASH_MS = 1400;

type Victim =
  { kind: 'none' } | { kind: 'contact'; contact: AddressBookFileClass };

type Tab = 'contacts' | 'wallet';

/** One of the wallet's own addresses, as Receive offers them. */
export type MineEntry = {
  address: string;
  name: string;
  current: boolean;
  transparent: boolean;
};

type AddressBookProps = NativeStackScreenProps<
  AppDrawerParamList,
  'AddressBook'
>;

/** Contacts the book lists: other people, on the wallet's own network. */
export const listedContacts = (
  book: AddressBookFileClass[],
  walletChain: string,
  query: string,
): AddressBookFileClass[] => {
  const q = query.trim().toLowerCase();
  return book
    .filter(
      contact =>
        !contact.own &&
        (contact.chain || walletChain) === walletChain &&
        (q.length === 0 ||
          contact.label.toLowerCase().includes(q) ||
          contact.address.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * The wallet's own addresses Receive offers, unified then external
 * transparent, each named by its kind, its number when there are several,
 * and the tag the user gave it. The newest unified one is the one Receive
 * shows.
 */
export const mineEntries = (
  addresses: {
    address: string;
    addressKind: AddressKindEnum;
    scope?: string;
  }[],
  book: AddressBookFileClass[],
  names: { unified: string; transparent: string },
  query: string,
): MineEntry[] => {
  const q = query.trim().toLowerCase();
  const unified = addresses.filter(a => a.addressKind === AddressKindEnum.u);
  const transparent = addresses.filter(
    a =>
      a.addressKind === AddressKindEnum.t &&
      a.scope === RPCAddressScopeEnum.external,
  );
  const named = (
    list: { address: string }[],
    kind: string,
    isTransparent: boolean,
  ): MineEntry[] =>
    list.map((a, i) => {
      const tag = book.find(entry => entry.address === a.address)?.label;
      const number = list.length > 1 ? ` ${i + 1}` : '';
      return {
        address: a.address,
        name: `${kind}${number}${tag ? ` · ${tag}` : ''}`,
        current: !isTransparent && i === list.length - 1,
        transparent: isTransparent,
      };
    });
  return [
    ...named(unified, names.unified, false),
    ...named(transparent, names.transparent, true),
  ].filter(
    m =>
      q.length === 0 ||
      m.name.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q),
  );
};

// Other people's addresses: one list, actions under the tapped row, a sheet to
// add or edit. Opened with `pick`, the same list chooses an address for Send.
const AddressBook: React.FunctionComponent<AddressBookProps> = ({
  navigation,
  route,
}) => {
  const {
    translate,
    setAddressBook,
    addresses,
    addressBook,
    walletChainName,
    server,
    readOnly,
    addLastSnackbar,
    setSendPageState,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const walletChain = walletChainName || server.chainName;

  const [query, setQuery] = useState('');
  const [openAddress, setOpenAddress] = useState('');
  const [flashAddress, setFlashAddress] = useState('');
  const [leavingAddress, setLeavingAddress] = useState('');
  const [edit, setEdit] = useState<ContactEdit>({
    kind: 'new',
    preset: '',
    label: '',
  });
  const [editNonce, setEditNonce] = useState(0);
  const [victim, setVictim] = useState<Victim>({ kind: 'none' });
  const [tab, setTab] = useState<Tab>('contacts');
  const pick = route.params?.pick;

  const scrollRef = useRef<ScrollView>(null);
  const contactSheet = useRef<BottomSheetModal>(null);
  useScrollToTop(scrollRef);

  const canSend = !readOnly && server.kind !== 'offline';
  const contacts = listedContacts(addressBook, walletChain, query).filter(
    contact => !pick || contact.swapChain === GlobalConst.zecSwapChain,
  );
  const mine =
    pick && tab === 'wallet'
      ? mineEntries(
          addresses ?? [],
          addressBook,
          {
            unified: translate('addressbook.mine-unified') as string,
            transparent: translate('addressbook.mine-transparent') as string,
          },
          query,
        )
      : [];

  const choose = (address: string) => {
    if (pick) {
      deliver(pick, address);
    }
    navigation.goBack();
  };

  const toast = (text: string) =>
    addLastSnackbar(text, SnackbarDurationEnum.short);

  const openContact = (next: ContactEdit) => {
    setEdit(next);
    setEditNonce(n => n + 1);
    contactSheet.current?.present();
  };

  const persist = async (book: AddressBookFileClass[]) => {
    const sorted = [...book].sort((a, b) => a.label.localeCompare(b.label));
    setAddressBook(sorted);
    await AddressBookFileImpl.writeAddressBook(sorted);
  };

  const save = async (name: string, address: string) => {
    setAddressBook(
      await AddressBookFileImpl.saveContact(
        edit.kind === 'edit' ? edit.contact : undefined,
        name,
        address,
        walletChain,
      ),
    );
    contactSheet.current?.dismiss();
    setOpenAddress('');
    setFlashAddress(address);
    setTimeout(() => setFlashAddress(''), FLASH_MS);
    toast(
      edit.kind === 'edit'
        ? (translate('addressbook.updated') as string)
        : (translate('addressbook.added') as string).replace('{name}', name),
    );
  };

  const send = (contact: AddressBookFileClass) => {
    const sendPageState = new SendPageStateClass(new ToAddrClass(0));
    sendPageState.toaddr.to = contact.address;
    setSendPageState(sendPageState);
    navigation.navigate(Route.Home, { screen: Route.Send });
  };

  const copy = (contact: AddressBookFileClass) => {
    Clipboard.setString(contact.address);
    toast(translate('addressbook.address-copied') as string);
  };

  const askDelete = (contact: AddressBookFileClass) =>
    showConfirm({
      title: (translate('addressbook.delete-question') as string).replace(
        '{name}',
        contact.label,
      ),
      message: translate('addressbook.delete-body') as string,
      buttons: [
        {
          text: translate('addressbook.delete') as string,
          style: 'destructive',
          onPress: () => {
            setVictim({ kind: 'contact', contact });
            setOpenAddress('');
            setLeavingAddress(contact.address);
          },
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });

  const removeLeaving = async () => {
    if (victim.kind === 'none') {
      return;
    }
    const book = await AddressBookFileImpl.removeAddressBookItem(
      victim.contact.label,
      victim.contact.address,
    );
    await persist(book);
    setLeavingAddress('');
    toast(
      (translate('addressbook.deleted') as string).replace(
        '{name}',
        victim.contact.label,
      ),
    );
  };

  const emptyLine =
    query.trim().length > 0
      ? (translate('addressbook.no-match') as string).replace(
          '{query}',
          query.trim(),
        )
      : (translate(
          pick ? 'addressbook.no-zcash' : 'addressbook.empty',
        ) as string);

  return (
    <View
      testID="addressbook"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={''}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <View
        style={{
          height: 44,
          marginTop: 6,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Pressable
          testID="addressbook.back"
          accessibilityRole="button"
          accessibilityLabel={translate('addressbook.back-acc') as string}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            position: 'absolute',
            left: 10,
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : undefined,
          })}
        >
          <ChevronLeft size={22} color={colors.fgAccent} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
        >
          {
            translate(
              pick ? 'addressbook.pick-title' : 'addressbook.title',
            ) as string
          }
        </Text>
      </View>

      <View style={{ marginHorizontal: SIDE }}>
        <SearchField
          testID="addressbook.search"
          value={query}
          onChangeText={setQuery}
          placeholder={
            translate(
              tab === 'wallet'
                ? 'addressbook.search-mine'
                : 'addressbook.search-contacts',
            ) as string
          }
          clearLabel={translate('clear') as string}
        />
        {!!pick && (
          <SegmentedSwitch
            testID="addressbook.tabs"
            options={[
              {
                key: 'contacts',
                label: translate('addressbook.tab-contacts') as string,
                testID: 'addressbook.tab.contacts',
              },
              {
                key: 'wallet',
                label: translate('addressbook.tab-wallet') as string,
                testID: 'addressbook.tab.wallet',
              },
            ]}
            value={tab}
            onChange={setTab}
            style={{ marginTop: 12 }}
          />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        testID="addressbook.scroll-view"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, marginTop: 12 }}
        contentContainerStyle={{
          paddingHorizontal: SIDE,
          paddingBottom: pick ? insets.bottom + 16 : 16,
        }}
      >
        {tab === 'wallet' ? (
          mine.length > 0 ? (
            <>
              <View
                testID="addressbook.mine"
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.bottomSheetBorder,
                  backgroundColor: colors.bgSurface,
                  overflow: 'hidden',
                }}
              >
                {mine.map((m, index) => (
                  <View
                    key={m.address}
                    style={{
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: ROW_LINE,
                    }}
                  >
                    <AddressRowHead
                      testID={`addressbook.mine.${m.address}`}
                      name={m.name}
                      ticker=""
                      address={m.address}
                      avatar={{ kind: 'wallet' }}
                      tag={
                        m.transparent
                          ? 'public'
                          : m.current
                            ? 'current'
                            : 'none'
                      }
                      expanded="none"
                      onPress={() => choose(m.address)}
                    />
                  </View>
                ))}
              </View>
              <Text
                style={{
                  marginTop: 12,
                  marginHorizontal: 2,
                  color: SOFT_INK,
                  fontSize: 11.5,
                  lineHeight: 17,
                }}
              >
                {translate('addressbook.mine-note') as string}
              </Text>
            </>
          ) : (
            <Text
              testID="addressbook.empty"
              style={{
                marginVertical: 26,
                marginHorizontal: 10,
                textAlign: 'center',
                color: SOFT_INK,
                fontSize: 12.5,
                lineHeight: 19,
              }}
            >
              {(translate('addressbook.no-match') as string).replace(
                '{query}',
                query.trim(),
              )}
            </Text>
          )
        ) : contacts.length > 0 ? (
          <>
            {!pick && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 7,
                  marginHorizontal: 2,
                  marginBottom: 10,
                }}
              >
                <ChevronDown size={18} color={HINT_ICON} />
                <Text
                  style={{
                    flexShrink: 1,
                    marginTop: 1,
                    color: SOFT_INK,
                    fontSize: 11.5,
                    lineHeight: 16,
                  }}
                >
                  {
                    translate(
                      canSend ? 'addressbook.hint' : 'addressbook.hint-vo',
                    ) as string
                  }
                </Text>
              </View>
            )}
            <View
              testID="addressbook.list"
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
                backgroundColor: colors.bgSurface,
                overflow: 'hidden',
              }}
            >
              {contacts.map((contact, index) => {
                const zcash = contact.swapChain === GlobalConst.zecSwapChain;
                return (
                  <ContactRow
                    key={contact.address}
                    contact={contact}
                    first={index === 0}
                    open={!pick && openAddress === contact.address}
                    sendable={!pick && canSend && zcash}
                    editable={zcash}
                    flash={flashAddress === contact.address}
                    leaving={leavingAddress === contact.address}
                    onToggle={() =>
                      pick
                        ? choose(contact.address)
                        : setOpenAddress(current =>
                            current === contact.address ? '' : contact.address,
                          )
                    }
                    onSwipe={() => setOpenAddress('')}
                    onSend={() => send(contact)}
                    onCopy={() => copy(contact)}
                    onEdit={() => openContact({ kind: 'edit', contact })}
                    onDelete={() => askDelete(contact)}
                    onLeft={removeLeaving}
                  />
                );
              })}
            </View>
          </>
        ) : (
          <Text
            testID="addressbook.empty"
            style={{
              marginVertical: 26,
              marginHorizontal: 10,
              textAlign: 'center',
              color: SOFT_INK,
              fontSize: 12.5,
              lineHeight: 19,
            }}
          >
            {emptyLine}
          </Text>
        )}
      </ScrollView>

      {!pick && (
        <View
          style={{
            paddingHorizontal: SIDE,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
            alignItems: 'center',
          }}
        >
          <Button
            testID="addressbook.new"
            variant="primary"
            title={translate('addressbook.new-contact') as string}
            onPress={() => openContact({ kind: 'new', preset: '', label: '' })}
          />
        </View>
      )}

      <AppSheetModal
        ref={contactSheet}
        handle
        contentStyle={{
          paddingBottom:
            keyboardHeight > 0 ? keyboardHeight + 20 : insets.bottom + 24,
        }}
      >
        <ContactSheet
          key={`contact-${editNonce}`}
          edit={edit}
          book={addressBook}
          walletChain={walletChain}
          onSave={save}
          onCancel={() => contactSheet.current?.dismiss()}
        />
      </AppSheetModal>
    </View>
  );
};

export default React.memo(AddressBook);
