/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, TextInput, Keyboard, TouchableOpacity } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useTheme,
} from '@react-navigation/native';
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
import { ThemeType } from '../../../app/types';
import RegText from '../../Components/RegText';
import ErrorText from '../../Components/ErrorText';
import { ContextAppLoaded } from '../../../app/context';
import ChainSelect from '../../Components/ChainSelect';
import Utils from '../../../app/utils';
import { parseZcashURI } from '../../../app/uris';
import {
  possibleChainsForAddress,
  validateAddressForChain,
  SWAP_ADDRESS_CHAINS,
} from '../../../app/swap';
import Button from '../../Components/Button';
import FadeText from '../../Components/FadeText';

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
  const { colors } = useTheme() as ThemeType;

  const [label, setLabel] = useState<string>(item.label);
  const [address, setAddress] = useState<string>(item.address);
  const [action, setAction] = useState<AddressBookActionEnum>(actionProp);
  const [error, setError] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  // 1 - OK, 0 - Empty, -1 - KO (mirrors the standalone TextInputAddress).
  const [validAddress, setValidAddress] = useState<number>(0);
  // SwapKit chain code of the contact ('ZEC' by default; 'BTC'/'ETH'/... when
  // the multi-chain UI is active). Editable only when adding + swaps enabled.
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
  // The chain picker only shows when swaps are enabled and we're adding a new
  // contact; otherwise the book stays Zcash-only / the chain is fixed.
  const showSwapChain =
    GlobalConst.swapEnabled && action === AddressBookActionEnum.Add;

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
    // Attempt to parse as a Zcash URI — only meaningful for ZEC contacts; a
    // non-ZEC address (BTC/ETH/...) is taken verbatim.
    if (
      swapChain === GlobalConst.zecSwapChain &&
      (addr.toLowerCase().startsWith(GlobalConst.zcash) ||
        addr.toLowerCase().includes(':'))
    ) {
      const { error: errorTarget, target } = await parseZcashURI(
        addr,
        translate,
        server,
      );

      // Audit Issue H — surface the parser error and abort before any
      // address-state mutation. parseZcashURI returns an empty target
      // when error is non-empty, but the explicit guard keeps intent
      // obvious here and protects against future contract changes.
      if (errorTarget) {
        setError(errorTarget);
        return;
      }

      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          if (tgt.address) {
            setAddress(tgt.address);
          }
        });
      }
    } else {
      setAddress(addr.replace(/[ \t\n\r]+/g, '')); // Remove spaces
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
        backgroundColor: colors.bottomSheetBackground,
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
              <FontAwesomeIcon icon={faCheck} color={colors.primary} />
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
              borderColor: colors.border,
              marginTop: 5,
            }}
          >
            <TextInput
              testID="addressbook.address-field"
              placeholder={translate('send.addressplaceholder') as string}
              placeholderTextColor={colors.placeholder}
              style={{
                flex: 1,
                color: colors.text,
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
                  color={colors.primaryDisabled}
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
                color={colors.border}
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
            borderColor: colors.border,
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
              color: colors.text,
              fontWeight: '600',
              fontSize: 14,
              flex: 1,
              minHeight: 48,
              marginLeft: 5,
              backgroundColor: 'transparent',
            }}
            placeholder={translate('addressbook.label-placeholder') as string}
            placeholderTextColor={colors.placeholder}
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
                color={colors.primaryDisabled}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {GlobalConst.swapEnabled && (
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
      )}
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
          <FadeText style={{ color: colors.primary }}>
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
              ? { borderColor: colors.danger.text }
              : undefined
          }
          textStyle={
            action === AddressBookActionEnum.Delete
              ? { color: colors.danger.text }
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
            doAction(
              action,
              label.trim(),
              address,
              item.color ? item.color : '',
              chain,
              swapChain,
            );
            Keyboard.dismiss();
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
