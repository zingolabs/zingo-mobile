/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef, useState } from 'react';
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
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import {
  ScreenEnum,
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
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { showConfirm } from '@app/services/showConfirm';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import Header from '@ui/widgets/Header';
import { ChevronDown, ChevronLeft } from '@ui/primitives/Icons/Chevron';
import ContactRow from './components/ContactRow';
import ContactSheet, { ContactEdit } from '@ui/widgets/ContactSheet';

const SIDE = 22;
const SOFT_INK = '#8DA0B8';
const HINT_ICON = '#7D93B3';
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

  const scrollRef = useRef<ScrollView>(null);
  const contactSheet = useRef<BottomSheetModal>(null);
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
    rootNavigation.navigate(RouteEnum.HomeStack, { screen: RouteEnum.Send });
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
      : (translate('addressbook.empty') as string);

  return (
    <View
      testID="addressbook"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={''}
        screenName={ScreenEnum.AddressBook}
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
          columnGap: 8,
          marginHorizontal: SIDE,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: colors.bgCanvas,
          borderColor: colors.borderMuted,
        }}
      >
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          size={14}
          color={colors.fgMuted}
        />
        <TextInput
          testID="addressbook.search"
          value={query}
          onChangeText={setQuery}
          placeholder={translate('addressbook.search-contacts') as string}
          placeholderTextColor={colors.fgMuted}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={{ flex: 1, fontSize: 14, padding: 0, color: colors.fgDefault }}
        />
        {query.length > 0 && (
          <Pressable
            testID="addressbook.search-clear"
            onPress={() => setQuery('')}
            hitSlop={8}
          >
            <FontAwesomeIcon icon={faXmark} size={14} color={colors.fgMuted} />
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
          alignItems: 'center',
        }}
      >
        <Button
          testID="addressbook.new"
          type={ButtonTypeEnum.Primary}
          title={translate('addressbook.new-contact') as string}
          onPress={() => openContact({ kind: 'new', preset: '', label: '' })}
        />
      </View>

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
          navigation={navigation}
        />
      </AppSheetModal>
    </View>
  );
};

export default React.memo(AddressBook);
