import React, { useContext, useEffect, useState } from 'react';
import TextField, { FieldAction } from '@ui/primitives/TextField';
import Clipboard from '@react-native-clipboard/clipboard';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import { ClipboardPasteIcon } from '@ui/primitives/Icons/ClipboardPasteIcon';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';
import { ContactIcon } from '@ui/primitives/Icons/ContactIcon';

import { ContextAppLoaded } from '@app/context';
import { Request, useResult } from '@app/navigation/results';
import { openScanner } from '@app/navigation/navigate';
import { addressFromPaymentUri, validateAddressForChain } from '@app/swap';
import { GlobalConst } from '@app/AppState';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';

type TextInputAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
  showLabel: boolean;
  // SwapKit chain code the address is for ('ZEC' / 'BTC' / ...). Defaults to
  // 'ZEC' → the existing zingolib validation (against `server.chainName`).
  // Non-ZEC values validate by the format-only per-chain regex.
  swapChain?: string;
  // The request the scanner answers with the code it read.
  scanRequest: Request;
  /** Names the paste button the empty field shows; no label, no button. */
  pasteLabel?: string;
  /** Replaces the Zcash hint (address or ZNS name) for another chain's field. */
  placeholder?: string;
  /** Saves a valid address to the address book; no handler, no button. */
  onSaveContact?: () => void;
  saveContactLabel?: string;
  /** Opens the address book to choose a contact; no handler, no button. */
  onPickContact?: () => void;
  pickContactLabel?: string;
};
const TextInputAddress: React.FunctionComponent<TextInputAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
  showLabel,
  swapChain,
  scanRequest,
  pasteLabel,
  placeholder,
  onSaveContact,
  saveContactLabel,
  onPickContact,
  pickContactLabel,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server } = context;
  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO

  useEffect(() => {
    let cancelled = false;

    if (address) {
      validateAddressForChain(
        swapChain ?? GlobalConst.zecSwapChain,
        address,
        server.chainName,
      ).then(valid => {
        if (!cancelled) {
          setValidAddress(valid ? 1 : -1);
          setError(valid ? '' : (translate('send.invalidaddress') as string));
        }
      });
    } else {
      setValidAddress(0);
      setError('');
    }

    return () => {
      cancelled = true;
    };
  }, [address, server.chainName, swapChain, setError, translate]);

  /** A swap chain's field keeps the address out of a payment URI for it. */
  const take = (text: string) =>
    setAddress(
      swapChain && swapChain !== GlobalConst.zecSwapChain
        ? addressFromPaymentUri(swapChain, text)
        : text,
    );

  useResult(scanRequest, take);
  // A swap chain's address is checked by its own format.
  const setQrcodeModalShow = () => {
    const chain = swapChain ?? GlobalConst.zecSwapChain;
    const zcash = chain === GlobalConst.zecSwapChain;
    const named = (key: string) =>
      (translate(key) as string).replace(
        '{chain}',
        chainDisplayName(chain) || chain,
      );
    openScanner({
      request: scanRequest,
      // A Zcash field takes an address or a payment URI, as when pasted.
      accepts: zcash
        ? { kind: 'zcash', chain: server.chainName }
        : { kind: 'chain', chain, network: server.chainName },
      texts: {
        title: translate('scanner.title') as string,
        hint: zcash
          ? (translate('scanner.hint-address') as string)
          : named('scanner.hint-chain'),
        miss: zcash
          ? (translate('scanner.miss-address') as string)
          : named('scanner.miss-chain'),
        found: translate('scanner.found') as string,
        back: translate('scanner.back') as string,
        torch: translate('scanner.torch') as string,
      },
    });
  };

  return (
    <TextField
      testID="send.addressplaceholder"
      label={showLabel ? (translate('send.toaddress') as string) : ''}
      accessibilityLabel={translate('send.address-acc') as string}
      value={address}
      onChangeText={take}
      placeholder={
        placeholder ?? (translate('send.addressplaceholder') as string)
      }
      mono
      disabled={disabled}
      valid={validAddress === 1}
      invalid={validAddress === -1}
      clearable
      clearLabel={translate('clear') as string}
      trailing={
        <>
          {validAddress === 1 && !disabled && !!onSaveContact && (
            <FieldAction
              testID="send.save-contact-button"
              icon={UserPlusIcon}
              label={saveContactLabel ?? ''}
              onPress={onSaveContact}
            />
          )}
          {!address && !disabled && !!pasteLabel && (
            <FieldAction
              testID="send.paste-button"
              icon={ClipboardPasteIcon}
              label={pasteLabel}
              onPress={async () => take(await Clipboard.getString())}
            />
          )}
          {!disabled && !!onPickContact && (
            <FieldAction
              testID="send.address-book"
              icon={ContactIcon}
              label={pickContactLabel ?? ''}
              onPress={onPickContact}
            />
          )}
          <FieldAction
            testID="send.scan-button"
            icon={ScanIcon}
            label={translate('send.scan-acc') as string}
            onPress={() => setQrcodeModalShow()}
            disabled={disabled}
          />
        </>
      }
    />
  );
};

export default TextInputAddress;
