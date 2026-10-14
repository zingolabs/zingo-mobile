/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';

import { useTheme } from '@app/theme';
import {
  AddressBookFileClass,
  GlobalConst,
  RouteEnum,
  SendPageStateClass,
  SnackbarDurationEnum,
  ToAddrClass,
} from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { isWalletAddress } from '@app/walletBackend';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import Utils from '@app/utils';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import MenuHeader from '@ui/widgets/MenuHeader';
import { ChevronDown, ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { SearchIcon } from '@ui/primitives/Icons/SearchIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import ContactRow from './components/ContactRow';
import ContactSheet, { ContactEdit } from './components/ContactSheet';

const SIDE = 22;
const SOFT_INK = '#8DA0B8';
const HINT_ICON = '#7D93B3';
const PLACEHOLDER = '#6B80A0';
const DELETE_BG = '#E5484D';
const FLASH_MS = 1400;

type Victim =
  { kind: 'none' } | { kind: 'contact'; contact: AddressBookFileClass };

type AddressBookProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.AddressBook
> & {
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

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

// Other people's addresses: one list, actions under the tapped row, a sheet to add or edit.
const AddressBook: React.FunctionComponent<AddressBookProps> = ({
  navigation,
  route,
  setAddressBook,
}) => {
  const {
    translate,
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
  /** The Send tab lives in another navigator, out of this route's typed params. */
  const rootNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const walletChain = walletChainName || server.chainName;
  const preset = route.params?.currentAddress ?? '';

  const [query, setQuery] = useState('');
  const [openAddress, setOpenAddress] = useState('');
  const [flashAddress, setFlashAddress] = useState('');
  const [leavingAddress, setLeavingAddress] = useState('');
  const [edit, setEdit] = useState<ContactEdit>({ kind: 'new', preset });
  const [editNonce, setEditNonce] = useState(0);
  const [victim, setVictim] = useState<Victim>({ kind: 'none' });

  const scrollRef = useRef<ScrollView>(null);
  const contactSheet = useRef<BottomSheetModal>(null);
  const deleteSheet = useRef<BottomSheetModal>(null);
  useScrollToTop(scrollRef);

  const canSend = !readOnly && server.kind !== 'offline';
  const contacts = listedContacts(addressBook, walletChain, query);

  const toast = (text: string) =>
    addLastSnackbar(text, SnackbarDurationEnum.short);

  const openContact = (next: ContactEdit) => {
    setEdit(next);
    setEditNonce(n => n + 1);
    contactSheet.current?.present();
  };

  useEffect(() => {
    if (preset) {
      contactSheet.current?.present();
    }
  }, [preset]);

  const leaveIfOpenedFor = () => {
    if (preset && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const persist = async (book: AddressBookFileClass[]) => {
    const sorted = [...book].sort((a, b) => a.label.localeCompare(b.label));
    setAddressBook(sorted);
    await AddressBookFileImpl.writeAddressBook(sorted);
  };

  const save = async (name: string, address: string) => {
    if (edit.kind === 'edit') {
      await AddressBookFileImpl.removeAddressBookItem(
        edit.contact.label,
        edit.contact.address,
      );
    }
    const own = await isWalletAddress(address);
    const book = await AddressBookFileImpl.writeAddressBookItem(
      name,
      address,
      edit.kind === 'edit' ? edit.contact.color : Utils.generateColorList(1)[0],
      own,
      walletChain,
      GlobalConst.zecSwapChain,
    );
    await persist(book);
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
    rootNavigation.navigate(RouteEnum.HomeStack, { screen: RouteEnum.Send });
  };

  const copy = (contact: AddressBookFileClass) => {
    Clipboard.setString(contact.address);
    toast(translate('addressbook.address-copied') as string);
  };

  const askDelete = (contact: AddressBookFileClass) => {
    setVictim({ kind: 'contact', contact });
    deleteSheet.current?.present();
  };

  const confirmDelete = () => {
    if (victim.kind === 'none') {
      return;
    }
    deleteSheet.current?.dismiss();
    setOpenAddress('');
    setLeavingAddress(victim.contact.address);
  };

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

  const sheetTitle = (text: string) => (
    <Text
      accessibilityRole="header"
      style={{
        marginTop: 10,
        textAlign: 'center',
        color: colors.fgDefault,
        fontSize: 15.5,
        lineHeight: 21,
        fontWeight: '700',
      }}
    >
      {text}
    </Text>
  );

  const emptyLine =
    query.trim().length > 0
      ? (translate('addressbook.no-match') as string).replace(
          '{query}',
          query.trim(),
        )
      : (translate('addressbook.empty') as string);

  return (
    <View
      testID="addressbook"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <MenuHeader />
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
          <ChevronLeft size={22} color={colors.fgAccent} strokeWidth={2.2} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
        >
          {translate('addressbook.title') as string}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          height: 42,
          marginHorizontal: SIDE,
          paddingHorizontal: 13,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgSurface,
        }}
      >
        <SearchIcon size={16} color={HINT_ICON} strokeWidth={2.2} />
        <TextInput
          testID="addressbook.search"
          value={query}
          onChangeText={setQuery}
          placeholder={translate('addressbook.search-contacts') as string}
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: 0,
            paddingVertical: 0,
            color: colors.fgDefault,
            fontSize: 13.5,
          }}
        />
        {query.length > 0 && (
          <Pressable
            testID="addressbook.search-clear"
            accessibilityRole="button"
            accessibilityLabel={translate('clear') as string}
            hitSlop={8}
            onPress={() => setQuery('')}
          >
            <XIcon size={16} color={HINT_ICON} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        testID="addressbook.scroll-view"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, marginTop: 12 }}
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: 16 }}
      >
        {contacts.length > 0 ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                marginHorizontal: 2,
                marginBottom: 10,
              }}
            >
              <ChevronDown size={18} color={HINT_ICON} strokeWidth={2.2} />
              <Text style={{ color: SOFT_INK, fontSize: 11.5, lineHeight: 16 }}>
                {
                  translate(
                    canSend ? 'addressbook.hint' : 'addressbook.hint-vo',
                  ) as string
                }
              </Text>
            </View>
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
                    open={openAddress === contact.address}
                    sendable={canSend && zcash}
                    editable={zcash}
                    flash={flashAddress === contact.address}
                    leaving={leavingAddress === contact.address}
                    onToggle={() =>
                      setOpenAddress(current =>
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

      <View
        style={{
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 50,
        }}
      >
        <Pressable
          testID="addressbook.new"
          accessibilityRole="button"
          onPress={() => openContact({ kind: 'new', preset: '' })}
          style={({ pressed }) => ({
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bgAccent,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text
            style={{ color: colors.bgCanvas, fontSize: 15, fontWeight: '700' }}
          >
            {translate('addressbook.new-contact') as string}
          </Text>
        </Pressable>
      </View>

      <AppSheetModal
        ref={contactSheet}
        header={sheetTitle(
          translate(
            edit.kind === 'edit'
              ? 'addressbook.edit-contact'
              : 'addressbook.new-contact',
          ) as string,
        )}
        contentStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
        onDismiss={leaveIfOpenedFor}
      >
        <ContactSheet
          key={`contact-${editNonce}`}
          edit={edit}
          book={addressBook}
          walletChain={walletChain}
          onSave={save}
          onCancel={() => contactSheet.current?.dismiss()}
          navigation={navigation}
        />
      </AppSheetModal>

      <AppSheetModal
        ref={deleteSheet}
        header={sheetTitle(
          (translate('addressbook.delete-question') as string).replace(
            '{name}',
            victim.kind === 'contact' ? victim.contact.label : '',
          ),
        )}
        contentStyle={{ paddingHorizontal: 22, paddingBottom: 34 }}
      >
        <Text
          style={{
            marginTop: 6,
            textAlign: 'center',
            color: SOFT_INK,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {translate('addressbook.delete-body') as string}
        </Text>
        <Pressable
          testID="addressbook.delete-confirm"
          accessibilityRole="button"
          onPress={confirmDelete}
          style={({ pressed }) => ({
            height: 46,
            marginTop: 20,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: DELETE_BG,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {translate('addressbook.delete') as string}
          </Text>
        </Pressable>
        <Pressable
          testID="addressbook.delete-cancel"
          accessibilityRole="button"
          onPress={() => deleteSheet.current?.dismiss()}
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
      </AppSheetModal>
    </View>
  );
};

export default React.memo(AddressBook);
