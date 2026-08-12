/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput, Keyboard, TouchableOpacity } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTheme } from '../../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  AddressBookActionEnum,
  AddressBookFileClass,
  ButtonTypeEnum,
  ChainNameEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  //SecurityType,
} from '../../../app/AppState';
import RegText from '../../../ui/primitives/RegText';
import ErrorText from '../../../ui/primitives/ErrorText';
import { ContextAppLoaded } from '../../../app/context';
import { showConfirm } from '../../../app/services/showConfirm';
import ChainSelect from '../../../ui/widgets/ChainSelect';
import { chainDisplayName } from '../../../ui/widgets/chainDisplayName';
import Utils from '../../../app/utils';
import { parseZcashURI } from '../../../app/uris';
import {
  possibleChainsForAddress,
  validateAddressForChain,
  extractPlainAddress,
  SWAP_ADDRESS_CHAINS,
} from '../../../app/swap';
import Button from '../../../ui/primitives/Button';
import FadeText from '../../../ui/primitives/FadeText';

type AbDetailProps = {
  index: number;
  item: AddressBookFileClass;
  cancel: () => void;
  action: AddressBookActionEnum;
  doAction: (
    action: AddressBookActionEnum,
    label: string,
    address: string,
    color: string,
    chain: ChainNameEnum,
    swapChain: string,
  ) => void;
  currentAddress?: string;
  screenName: ScreenEnum;
  routeStack: RouteEnum;
  // AbDetail is rendered inside a portaled BottomSheetModal; the host screen
  // (AddressBook) must pass its own `navigation` so the QR button can
  // navigate to ScannerAddress (useNavigation context is lost in the portal).
  navigation: NavigationProp<ParamListBase>;
};
const AbDetail: React.FunctionComponent<AbDetailProps> = ({
  index,
  item,
  cancel,
  action: actionProp,
  doAction,
  currentAddress,
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addressBook } = context;
  const { colors } = useTheme();

  const [label, setLabel] = useState<string>(item.label);
  const [address, setAddress] = useState<string>(item.address);
  const [action, setAction] = useState<AddressBookActionEnum>(actionProp);
  const [error, setError] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  // 1 - OK, 0 - Empty, -1 - KO (mirrors the standalone TextInputAddress).
  const [validAddress, setValidAddress] = useState<number>(0);
  // Chain code of the contact ('ZEC' by default; 'BTC'/'ETH'/... when
  // the multi-chain UI is active). Editable only when adding.
  const [swapChain, setSwapChain] = useState<string>(
    item.swapChain || GlobalConst.zecSwapChain,
  );
  // Chains the picker offers: recomputed from the typed address (validator-
  // matched ones), but seeded with the full list so on entry — before any
  // address is typed — every chain is available and the picker opens, with ZEC
  // selected by default.
  const [possibleChains, setPossibleChains] = useState<string[]>([
    ...SWAP_ADDRESS_CHAINS,
  ]);
  // The chain picker is only editable while adding a new contact; otherwise
  // the chain is fixed.
  const showSwapChain = action === AddressBookActionEnum.Add;

  useEffect(() => {
    if (currentAddress) {
      setAddress(currentAddress);
    }
    if (item.label !== label && item.address !== address) {
      setAction(AddressBookActionEnum.Add);
    } else {
      setAction(actionProp);
    }
    setError('');
    if ((!label || !address) && action === AddressBookActionEnum.Modify) {
      setError(translate('addressbook.fillboth') as string);
    }
    if (
      item.label !== label &&
      addressBook.filter((elem: AddressBookFileClass) => elem.label === label)
        .length > 0
    ) {
      if (
        item.address !== address &&
        addressBook.filter(
          (elem: AddressBookFileClass) => elem.address === address,
        ).length > 0
      ) {
        setError(translate('addressbook.bothexists') as string);
      } else {
        setError(translate('addressbook.labelexists') as string);
      }
    } else {
      if (
        item.address !== address &&
        addressBook.filter(
          (elem: AddressBookFileClass) => elem.address === address,
        ).length > 0
      ) {
        setError(translate('addressbook.addressexists') as string);
      }
      // Note: no "no changes" error — it made no sense to greet the user with
      // it the instant they opened an unmodified contact to edit it.
    }
  }, [
    action,
    actionProp,
    address,
    addressBook,
    currentAddress,
    error,
    item.address,
    item.label,
    label,
    translate,
  ]);

  // Recompute the selectable chains whenever the typed address changes
  // (debounced — the ZEC check hits the native RPC). Keep the selection valid:
  // if the current chain no longer matches the address, drop to the first
  // possible one.
  useEffect(() => {
    if (!showSwapChain) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const chains = await possibleChainsForAddress(address, server.chainName);
      if (cancelled) {
        return;
      }
      setPossibleChains(chains);
      if (chains.length > 0 && !chains.includes(swapChain)) {
        setSwapChain(chains[0]);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, server.chainName, showSwapChain]);

  const updateAddress = async (addr: string) => {
    if (!addr) {
      setAddress('');
      return;
    }
    // A real Zcash payment URI keeps its full parse (address + amount/memo) when
    // this is a ZEC contact — unchanged behaviour. We only match an actual
    // `zcash:` URI now (not any string containing ':'), so a foreign payment URI
    // scanned while ZEC is selected falls through to the generic unwrap below
    // and the chain auto-detects.
    if (
      swapChain === GlobalConst.zecSwapChain &&
      addr.toLowerCase().startsWith(GlobalConst.zcash)
    ) {
      const parsed = await parseZcashURI(addr, server);

      // Audit Issue H — surface the parser error and abort before any
      // address-state mutation. A failure result carries no target, so a
      // malformed URI cannot reach the state updates below.
      if (parsed.kind === 'error') {
        setError(Utils.renderErrorKeyed(parsed, translate));
        return;
      }

      const target = parsed.target;
      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          if (tgt.address) {
            setAddress(tgt.address);
          }
        });
      }
    } else {
      // Any other input: unwrap a foreign payment URI (BIP-21 `bitcoin:…`,
      // EIP-681 `ethereum:…`, cashaddr `bitcoincash:…`, …) down to the bare
      // address; a plain address passes through unchanged.
      setAddress(extractPlainAddress(addr).replace(/[ \t\n\r]+/g, ''));
    }
  };

  // Validate the address for the selected chain (async — the ZEC check hits the
  // native RPC), mirroring the standalone TextInputAddress.
  useEffect(() => {
    let cancelled = false;
    if (address) {
      validateAddressForChain(swapChain, address, server.chainName).then(
        valid => {
          if (!cancelled) {
            setValidAddress(valid ? 1 : -1);
            setErrorAddress(
              valid ? '' : (translate('send.invalidaddress') as string),
            );
          }
        },
      );
    } else {
      setValidAddress(0);
      setErrorAddress('');
    }
    return () => {
      cancelled = true;
    };
  }, [address, swapChain, server.chainName, translate]);

  // Same navigation the working Send / Swap / ImportUfvk scanners use: go to the
  // ScannerAddress screen and let its callback write the value straight back
  // into this (still-mounted) sheet. No dismiss-on-blur here, so the sheet
  // survives the round-trip.
  const onScanAddress = () => {
    Keyboard.dismiss();
    navigation.navigate(RouteEnum.ScannerAddress, {
      setAddress: (a: string) => updateAddress(a),
      active: true,
      // Always take the scan verbatim: adding a `zcash:` prefix to a non-ZEC
      // address (e.g. scanning a BTC/SOL QR while the selector still shows
      // Zcash) makes the ZEC parser reject it — the field stays empty and an
      // error pops the sheet. Verbatim lets `updateAddress` set it and the
      // chain auto-detect below pick the matching chain. `zcash:` URIs and bare
      // ZEC addresses are still handled by `updateAddress` itself.
      raw: true,
    });
  };

  //console.log('render Ab Detail - 5', index, address, label);
  //console.log(error, errorAddress);

  return (
    <View
      testID={`addressbookdetail.${index + 1}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bgSurface,
        paddingBottom: 5,
      }}
    >
      {action === AddressBookActionEnum.Add ? (
        <View style={{ paddingHorizontal: 10, marginTop: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <RegText>{translate('send.toaddress') as string}</RegText>
            {validAddress === 1 && (
              <FontAwesomeIcon icon={faCheck} color={colors.fgAccent} />
            )}
            {validAddress === -1 && (
              <ErrorText>
                {translate('send.invalidaddress') as string}
              </ErrorText>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderRadius: 12,
              borderColor: colors.borderMuted,
              marginTop: 5,
            }}
          >
            <TextInput
              testID="addressbook.address-field"
              placeholder={
                translate('addressbook.address-placeholder') as string
              }
              placeholderTextColor={colors.fgMuted}
              style={{
                flex: 1,
                color: colors.fgDefault,
                fontWeight: '600',
                fontSize: 14,
                padding: 10,
                backgroundColor: 'transparent',
              }}
              value={address}
              onChangeText={(text: string) => updateAddress(text)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {address ? (
              <TouchableOpacity onPress={() => updateAddress('')}>
                <FontAwesomeIcon
                  style={{ marginRight: 5 }}
                  size={20}
                  icon={faXmark}
                  color={colors.fgAccentDisabled}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              testID="addressbook.scan-button"
              onPress={onScanAddress}
              hitSlop={8}
            >
              <FontAwesomeIcon
                style={{ marginRight: 5 }}
                size={28}
                icon={faQrcode}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Modify / Delete: address is read-only — same UX as NewAddressTag.
        // To change an address the user must delete this entry and create a
        // new one.
        <View>
          <RegText style={{ marginTop: 10, paddingHorizontal: 10 }}>
            {translate('addressbook.address') as string}
          </RegText>
          <View style={{ paddingHorizontal: 10, marginTop: 6 }}>
            <RegText>{Utils.trimToSmall(address, 10)}</RegText>
          </View>
        </View>
      )}
      <RegText style={{ marginTop: 18, paddingHorizontal: 10 }}>
        {translate('addressbook.label') as string}
      </RegText>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          paddingHorizontal: 10,
          marginTop: 10,
        }}
      >
        <View
          accessible={true}
          style={{
            flexGrow: 1,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: colors.borderMuted,
            minWidth: 48,
            minHeight: 48,
            maxHeight: 150,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextInput
            testID="addressbook.label-field"
            style={{
              color: colors.fgDefault,
              fontWeight: '600',
              fontSize: 14,
              flex: 1,
              minHeight: 48,
              marginLeft: 5,
              backgroundColor: 'transparent',
            }}
            placeholder={translate('addressbook.label-placeholder') as string}
            placeholderTextColor={colors.fgMuted}
            value={label}
            onChangeText={(text: string) => setLabel(text)}
            editable={action !== AddressBookActionEnum.Delete}
            maxLength={50}
          />
          {label && action !== AddressBookActionEnum.Delete && (
            <TouchableOpacity onPress={() => setLabel('')}>
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
      <View style={{ paddingHorizontal: 10, marginTop: 18 }}>
        {/* Editable picker while adding; a read-only field on modify/delete so
            the user can still see the contact's chain. */}
        <ChainSelect
          label={translate('addressbook.chain') as string}
          value={swapChain}
          options={showSwapChain ? possibleChains : [swapChain]}
          onChange={setSwapChain}
          translate={translate}
          disabled={!showSwapChain}
        />
      </View>
      {(!!error || !!errorAddress) && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}
        >
          <FadeText style={{ color: colors.fgAccent }}>
            {error + errorAddress}
          </FadeText>
        </View>
      )}
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          marginVertical: 5,
          marginTop: 15,
        }}
      >
        <Button
          type={ButtonTypeEnum.Secondary}
          title={translate('cancel') as string}
          onPress={() => {
            cancel();
            Keyboard.dismiss();
          }}
          twoButtons={true}
        />
        <Button
          testID="addressbook.button.action"
          type={
            action === AddressBookActionEnum.Delete
              ? ButtonTypeEnum.Secondary
              : ButtonTypeEnum.Primary
          }
          title={translate(`addressbook.${action.toLowerCase()}`) as string}
          style={
            action === AddressBookActionEnum.Delete
              ? { borderColor: colors.fgDanger }
              : undefined
          }
          textStyle={
            action === AddressBookActionEnum.Delete
              ? { color: colors.fgDanger }
              : undefined
          }
          onPress={() => {
            // ZEC contacts carry the validation network (the current server
            // chain); non-ZEC swap contacts live in mainnet context. On
            // modify/delete the address is fixed → keep the entry's stored chain.
            const chain: ChainNameEnum =
              action === AddressBookActionEnum.Add
                ? swapChain === GlobalConst.zecSwapChain
                  ? server.chainName
                  : ChainNameEnum.mainChainName
                : item.chain;
            const commit = () => {
              doAction(
                action,
                label.trim(),
                address,
                item.color ? item.color : '',
                chain,
                swapChain,
              );
              Keyboard.dismiss();
            };
            // Adding a contact: confirm first, surfacing the detected network so
            // the user can catch a misdetection (chain formats overlap and are
            // validated by shape only) before it is saved.
            if (action === AddressBookActionEnum.Add) {
              Keyboard.dismiss();
              showConfirm({
                title: translate('addressbook.add-confirm-title') as string,
                message: `${translate('addressbook.add-confirm-message') as string}\n\n${chainDisplayName(
                  swapChain,
                )}\n${address}`,
                buttons: [
                  {
                    text: translate('confirm') as string,
                    onPress: commit,
                  },
                  { text: translate('cancel') as string, style: 'cancel' },
                ],
              });
            } else {
              commit();
            }
          }}
          disabled={
            action === AddressBookActionEnum.Delete
              ? false
              : error ||
                  errorAddress ||
                  !label ||
                  (label && !label.trim()) ||
                  !address
                ? true
                : false
          }
          twoButtons={true}
        />
      </View>
    </View>
  );
};

export default React.memo(AbDetail);
