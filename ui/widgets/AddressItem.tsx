/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
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
} from '@app/utils/reveal';
import { useTimedReveal } from '@app/hooks/useTimedReveal';
import {
  AddressBookFileClass,
  SendPageStateClass,
  ToAddrClass,
  SnackbarDurationEnum,
  RouteEnum,
  ScreenEnum,
} from '@app/AppState';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUserPlus, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

type AddressItemProps = {
  address: string;
  screenName: ScreenEnum;
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
  // screenName is still in the type for backward compat with all callers but
  // no longer consumed here — launchAddTagModal works the same regardless of
  // where it's invoked from.
  oneLine,
  onlyContact,
  withIcon,
  znsAlias,
  withSendIcon,
  ufvk,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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

  const contact: string = addressBook
    .filter((ab: AddressBookFileClass) => ab.address === address)
    .map((ab: AddressBookFileClass) => ab.label)
    .join(' ');
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
          <TouchableOpacity onPress={contactReveal.reveal}>
            <View style={column}>
              <Lines
                view={textView(contactField, privacy, contactReveal.revealed)}
              />
            </View>
          </TouchableOpacity>
        )}
        {!contact &&
          !!znsAlias &&
          (privacy ? (
            <TouchableOpacity onPress={aliasReveal.reveal}>
              {alias}
            </TouchableOpacity>
          ) : (
            alias
          ))}
        {(!oneLine || (oneLine && !contact)) && !onlyContact && (
          <TouchableOpacity
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
          </TouchableOpacity>
        )}
      </View>
      {withIcon && !contact && oneLine && (
        <TouchableOpacity
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
            <FontAwesomeIcon
              style={{ marginTop: 3 }}
              size={20}
              icon={faUserPlus}
              color={colors.fgAccent}
            />
          </View>
        </TouchableOpacity>
      )}
      {withIcon && !contact && !oneLine && (
        <TouchableOpacity
          testID="addressitem.add-contact"
          onPress={() => launchAddTagModal(address, undefined, znsAlias)}
        >
          <FontAwesomeIcon
            style={{ marginTop: 3 }}
            size={24}
            icon={faUserPlus}
            color={colors.fgAccent}
          />
        </TouchableOpacity>
      )}
      {withSendIcon && !!contact && !readOnly && server.kind !== 'offline' && (
        <TouchableOpacity
          style={{ marginLeft: 10 }}
          onPress={() => {
            // enviar
            const sendPageState = new SendPageStateClass(new ToAddrClass(0));
            sendPageState.toaddr.to = address;
            setSendPageState(sendPageState);
            navigation.navigate(RouteEnum.HomeStack, {
              screen: RouteEnum.Send,
            });
          }}
        >
          <FontAwesomeIcon
            style={{ marginTop: 3 }}
            size={24}
            icon={faPaperPlane}
            color={colors.fgAccent}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AddressItem;
