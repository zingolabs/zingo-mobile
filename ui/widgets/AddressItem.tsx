/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useMemo } from 'react';
import { TextStyle, View, ViewStyle } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ContextAppLoaded } from '@app/context';
import RegText from '@ui/primitives/RegText';
import {
  Field,
  TextView,
  addressLines,
  labelLines,
  textView,
  viewLines,
} from './addressItemText';
import { useTimedReveal } from '@app/hooks/useTimedReveal';
import {
  AddressBookFileClass,
  SendPageStateClass,
  ToAddrClass,
  SnackbarDurationEnum,
  Route,
} from '@app/AppState';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { useTheme, slopFor, iconSize, iconSizeMd } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';

type AddressItemProps = {
  address: string;
  oneLine?: boolean;
  onlyContact?: boolean;
  withIcon?: boolean;
  // The ZNS alias the address was resolved from, when the caller knows it.
  // Shown in place of a contact name — a contact of the user's own always wins
  // — and offered as the label when saving this address to the book.
  znsAlias?: string;
  withSendIcon?: boolean;
  ufvk?: boolean;
};

const ZNS_PREFIX = 'ZNS: ';

const column: ViewStyle = {
  display: 'flex',
  flexDirection: 'column',
  flexWrap: 'wrap',
};

type LinesProps = { view: TextView; prefix?: string; style?: TextStyle };

const Lines = ({ view, prefix = '', style }: LinesProps) => (
  <>
    {viewLines(view).map((line: string, idx: number) => (
      <RegText key={idx} style={style}>
        {`${prefix}${line}`}
      </RegText>
    ))}
  </>
);

const AddressItem: React.FunctionComponent<AddressItemProps> = ({
  address,
  oneLine,
  onlyContact,
  withIcon,
  znsAlias,
  withSendIcon,
  ufvk,
}) => {
  const navigation = useNavigation<WalletNavigation>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    addLastSnackbar,
    addressBook,
    launchAddTagModal,
    privacy,
    readOnly,
    server,
    setSendPageState,
  } = context;
  const { colors } = useTheme();

  const contactReveal = useTimedReveal(privacy);
  const aliasReveal = useTimedReveal(privacy);
  const addressReveal = useTimedReveal(privacy);

  const contact: string = useMemo(
    () =>
      addressBook
        .filter((ab: AddressBookFileClass) => ab.address === address)
        .map((ab: AddressBookFileClass) => ab.label)
        .join(' '),
    [address, addressBook],
  );
  const contactField: Field = {
    text: contact,
    lines: labelLines(contact),
    trims: labelLines(contact) > 1,
  };
  const aliasField: Field = { text: znsAlias ?? '', lines: 1, trims: false };
  const addressField: Field = {
    text: address,
    lines: addressLines(address),
    trims: true,
  };
  const alias = (
    <Lines
      view={textView(aliasField, privacy, aliasReveal.revealed)}
      prefix={ZNS_PREFIX}
      style={{ color: colors.fgAccent, fontWeight: '600' }}
    />
  );

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginRight: onlyContact ? 0 : 10,
        }}
      >
        {!!contact && (
          <Pressable kind="link" onPress={contactReveal.reveal}>
            <View style={column}>
              <Lines
                view={textView(contactField, privacy, contactReveal.revealed)}
              />
            </View>
          </Pressable>
        )}
        {!contact &&
          !!znsAlias &&
          (privacy ? (
            <Pressable kind="link" onPress={aliasReveal.reveal}>
              {alias}
            </Pressable>
          ) : (
            alias
          ))}
        {(!oneLine || (oneLine && !contact)) && !onlyContact && (
          <Pressable
            kind="link"
            onPress={() => {
              if (address && !oneLine) {
                Clipboard.setString(address);
                addLastSnackbar(
                  ufvk
                    ? (translate('seed.tapcopy-ufvk-message') as string)
                    : (translate('history.addresscopied') as string),
                  SnackbarDurationEnum.short,
                );
                addressReveal.reveal();
              }
            }}
          >
            <View style={column}>
              {address ? (
                <Lines
                  view={textView(addressField, privacy, addressReveal.revealed)}
                />
              ) : (
                <RegText>{'Unknown'}</RegText>
              )}
            </View>
          </Pressable>
        )}
      </View>
      {withIcon && !contact && oneLine && (
        <Pressable
          kind="icon"
          hitSlop={slopFor(20)}
          testID="addressitem.add-contact"
          onPress={() => launchAddTagModal(address, undefined, znsAlias)}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
              paddingBottom: 2,
            }}
          >
            <UserPlusIcon
              style={{ marginTop: 3 }}
              size={iconSizeMd}
              color={colors.fgAccent}
            />
          </View>
        </Pressable>
      )}
      {withIcon && !contact && !oneLine && (
        <Pressable
          kind="icon"
          hitSlop={slopFor(24)}
          testID="addressitem.add-contact"
          onPress={() => launchAddTagModal(address, undefined, znsAlias)}
        >
          <UserPlusIcon
            style={{ marginTop: 3 }}
            size={iconSize}
            color={colors.fgAccent}
          />
        </Pressable>
      )}
      {withSendIcon && !!contact && !readOnly && server.kind !== 'offline' && (
        <Pressable
          kind="icon"
          hitSlop={slopFor(24)}
          style={{ marginLeft: 10 }}
          onPress={() => {
            // enviar
            const sendPageState = new SendPageStateClass(new ToAddrClass(0));
            sendPageState.toaddr.to = address;
            setSendPageState(sendPageState);
            navigation.navigate(Route.Home, {
              screen: Route.Send,
            });
          }}
        >
          <PlaneIcon
            style={{ marginTop: 3 }}
            size={iconSize}
            color={colors.fgAccent}
          />
        </Pressable>
      )}
    </View>
  );
};

export default AddressItem;
