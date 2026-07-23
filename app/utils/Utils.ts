import { getNumberFormatSettings } from 'react-native-localize';
import { format as dateFnsFormat, differenceInMinutes } from 'date-fns';
import type { Locale } from 'date-fns';
import {
  enUS,
  es as esLocale,
  pt as ptLocale,
  ru as ruLocale,
  tr as trLocale,
} from 'date-fns/locale';

import { ZecAmountSplitType } from './types/ZecAmountSplitType';
import {
  ChainNameEnum,
  GlobalConst,
  LanguageEnum,
  SendJsonToTypeType,
  SendPageStateClass,
  ServerType,
  TranslateType,
  BlockExplorerEnum,
} from '../AppState';

import randomColor from 'randomcolor';
import {
  getDonationAddress,
  getZenniesDonationAddress,
  parseAddress,
} from '../walletBackend';
import { Buffer } from 'buffer';
import { RPCParseAddressType } from '../walletBackend/types/RPCParseAddressType';
import { RPCParseAddressStatusEnum } from '../walletBackend/enums/RPCParseAddressStatusEnum';
import { RPCAddressKindEnum } from '../walletBackend/enums/RPCAddressKindEnum';
import { RPCReceiversEnum } from '../walletBackend/enums/RPCReceiversEnum';

export default class Utils {
  static trimToSmall(addr?: string, numChars?: number): string {
    if (!addr) {
      return '';
    }
    const trimSize = numChars || 5;
    return `${addr.slice(0, trimSize)}...${addr.slice(addr.length - trimSize)}`;
  }

  static splitZecAmountIntoBigSmall(zecValue?: number): ZecAmountSplitType {
    if (typeof zecValue === 'undefined') {
      return { bigPart: '--', smallPart: '' };
    }

    const { decimalSeparator } = getNumberFormatSettings();

    const intPart = parseInt(
      Utils.parseNumberFloatToStringLocale(zecValue, 8),
      10,
    );
    let bigPart = Utils.parseNumberFloatToStringLocale(zecValue, 8);
    let smallPart = '';
    let decimalPart = '';

    if (bigPart.indexOf(`${decimalSeparator}`) >= 0) {
      decimalPart = bigPart.slice(bigPart.indexOf(`${decimalSeparator}`) + 1);
      if (decimalPart.length > 4) {
        smallPart = decimalPart.slice(4);
        decimalPart = decimalPart.slice(
          0,
          decimalPart.length - smallPart.length,
        );

        // Pad the small part with trailing 0s
        while (smallPart.length < 4) {
          smallPart += '0';
        }
      } else {
        while (decimalPart.length < 4) {
          decimalPart += '0';
        }
        smallPart = '0000';
      }
    } else {
      decimalPart = '0000';
      smallPart = '0000';
    }

    // Trim trailing zeros from decimalPart only when smallPart has no significant digits.
    // When smallPart is non-zero we preserve all four positions for visual alignment.
    if (smallPart === '0000') {
      decimalPart = decimalPart.replace(/0+$/, '') || '0';
    }

    // Drop the "0." suffix entirely when the value is exactly zero — show plain "0".
    if (intPart === 0 && smallPart === '0000' && decimalPart === '0') {
      return { bigPart: '0', smallPart };
    }

    return { bigPart: intPart + decimalSeparator + decimalPart, smallPart };
  }

  static splitStringIntoChunks(s: string, numChunks: number): string[] {
    if (!s || numChunks > s.length) {
      return [s];
    }
    if (s.length < 16) {
      return [s];
    }

    const chunkSize = Math.round(s.length / numChunks);
    const chunks = [];
    for (let i = 0; i < numChunks - 1; i++) {
      chunks.push(s.slice(i * chunkSize, i * chunkSize + chunkSize));
    }
    // Last chunk might contain un-even length
    chunks.push(s.slice((numChunks - 1) * chunkSize));

    return chunks;
  }

  // DONATION TO ZINGOLABS
  static async getDonationAddress(chainName: ChainNameEnum): Promise<string> {
    // donations only for mainnet.
    if (chainName === ChainNameEnum.mainChainName) {
      // UA -> we need a fresh one.
      const ua = await getDonationAddress();
      return ua.ok ? ua.value : '';
    }
    return '';
  }

  static getDonationAmount(): string {
    const { decimalSeparator } = getNumberFormatSettings();

    return '0' + decimalSeparator + '01';
  }

  static getDonationMemo(translate: (key: string) => TranslateType): string {
    return translate('donation') as string;
  }

  // ZENNIES FOR ZINGO
  static async getZenniesDonationAddress(
    chainName: ChainNameEnum,
  ): Promise<string> {
    // donations only for mainnet.
    if (chainName === ChainNameEnum.mainChainName) {
      // UA -> we need a fresh one.
      const ua = await getZenniesDonationAddress();
      return ua.ok ? ua.value : '';
    }
    return '';
  }

  static getZenniesDonationAmount(): string {
    const { decimalSeparator } = getNumberFormatSettings();

    return '0' + decimalSeparator + '01';
  }

  // NYM
  static utf16Split(s: string, chunksize: number): string[] {
    const ans = [];

    let current = '';
    let currentLen = 0;
    const a = [...s];
    for (let i = 0; i < a.length; i++) {
      // Each UTF-16 char will take up to 4 bytes when encoded
      const utf8len = a[i].length > 1 ? 4 : 1;

      // Test if adding it will exceed the size
      if (currentLen + utf8len > chunksize) {
        ans.push(current);
        current = '';
        currentLen = 0;
      }

      current += a[i];
      currentLen += utf8len;
    }

    if (currentLen > 0) {
      ans.push(current);
    }

    return ans;
  }

  static parseStringLocaleToNumberFloat(stringValue: string): number {
    const { decimalSeparator } = getNumberFormatSettings();

    return Number(
      stringValue.replace(new RegExp(`\\${decimalSeparator}`), '.'),
    );
  }

  static parseNumberFloatToStringLocale(
    numberValue: number,
    toFixed: number,
  ): string {
    const { decimalSeparator } = getNumberFormatSettings();

    let stringValue = numberValue.toFixed(toFixed);

    return stringValue.replace(new RegExp('\\.'), `${decimalSeparator}`);
  }

  static getBlockExplorerTxIDURL(
    txid: string,
    chainName: ChainNameEnum,
    blockExplorer: BlockExplorerEnum,
  ): string {
    // Regtest is a local dev chain no public explorer can index — never link,
    // regardless of the selected explorer. Returning '' makes every caller
    // hide the affordance.
    if (chainName === ChainNameEnum.regtestChainName) {
      return '';
    }
    if (blockExplorer === BlockExplorerEnum.Zcashexplorer) {
      if (chainName === ChainNameEnum.testChainName) {
        return `https://testnet.zcashexplorer.app/transactions/${txid}`;
      } else {
        return `https://mainnet.zcashexplorer.app/transactions/${txid}`;
      }
    } else if (blockExplorer === BlockExplorerEnum.Cipherscan) {
      if (chainName === ChainNameEnum.testChainName) {
        return `https://testnet.cipherscan.app/tx/${txid}`;
      } else {
        return `https://cipherscan.app/tx/${txid}`;
      }
    } else if (blockExplorer === BlockExplorerEnum.Zexplorer) {
      if (chainName === ChainNameEnum.testChainName) {
        return `https://zexplorer.app/testnet/tx/${txid}`;
      } else {
        return `https://zexplorer.app/mainnet/tx/${txid}`;
      }
    } else {
      // BlockExplorerEnum.None (or any unknown value) → no explorer link.
      return '';
    }
  }

  static generateColorList(numColors: number): string[] {
    const colorList: string[] = [];

    for (let i = 0; i < numColors; i++) {
      const color = randomColor({
        luminosity: 'bright', // Define la luminosidad de los colores generados
        format: 'hex', // Formato de color en hexadecimal
      });

      colorList.push(color);
    }

    return colorList;
  }

  // Deterministic bright colour keyed by an arbitrary string (e.g. a token
  // ticker). Same seed always yields the same colour, so a per-asset avatar
  // keeps a stable identity across re-renders instead of flickering a new
  // random colour each time. Mirrors `generateColorList`'s options; only the
  // `seed` makes it reproducible.
  static generateColorFromSeed(seed: string): string {
    return randomColor({
      seed,
      luminosity: 'bright',
      format: 'hex',
    });
  }

  static getLabelColor(bgColor: string): string {
    // Remove the '#' if present.
    if (bgColor.startsWith('#')) {
      bgColor = bgColor.slice(1);
    }

    // Convert the hexadecimal color to its red, green, and blue components.
    const r: number = parseInt(bgColor.substring(0, 2), 16);
    const g: number = parseInt(bgColor.substring(2, 4), 16);
    const b: number = parseInt(bgColor.substring(4, 6), 16);

    // Calculate the brightness using the standard luminance formula.
    const brightness: number = (r * 299 + g * 587 + b * 114) / 1000;

    // If the brightness is greater than 128, return dark text (black); otherwise, return light text (white).
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  static async getSendManyJSON(
    sendPageState: SendPageStateClass,
    uAddress: string,
    server: ServerType,
    donation: boolean,
  ): Promise<SendJsonToTypeType[]> {
    const to = sendPageState.toaddr;
    const donationAddress: boolean =
      to.to === (await Utils.getDonationAddress(server.chainName)) ||
      to.to === (await Utils.getZenniesDonationAddress(server.chainName));

    const memo = Utils.buildMemo(to.memo, to.includeUAMemo, uAddress);
    const amount = parseInt(
      (Utils.parseStringLocaleToNumberFloat(to.amount) * 10 ** 8).toFixed(0),
      10,
    );

    let jsonFlat: SendJsonToTypeType[];
    if (memo === '') {
      jsonFlat = [{ address: to.to, amount } as SendJsonToTypeType];
    } else if (
      Buffer.byteLength(memo, GlobalConst.utf8 as BufferEncoding) <=
      GlobalConst.memoMaxLength
    ) {
      jsonFlat = [{ address: to.to, amount, memo } as SendJsonToTypeType];
    } else {
      // If the memo is more than 511 bytes, then we split it into multiple transactions.
      // Each memo will be `(xx/yy)memo part`. The prefix "(xx/yy)" is 7 bytes long, so
      // we'll split the memo into 511-7 = 505 bytes length
      // this make sense if we make long memos... in the future.
      const splits = Utils.utf16Split(memo, GlobalConst.memoMaxLength - 7);
      jsonFlat = [
        {
          address: to.to,
          amount,
          memo: `(1/${splits.length})${splits[0]}`,
        } as SendJsonToTypeType,
      ];
      for (let i = 1; i < splits.length; i++) {
        jsonFlat.push({
          address: to.to,
          amount: 0,
          memo: `(${i + 1}/${splits.length})${splits[i]}`,
        } as SendJsonToTypeType);
      }
    }

    const donationTransaction: SendJsonToTypeType[] = [];

    // we need to exclude 2 use cases:
    // 2. send to one of our donation UA's
    // (make no sense to do a double donation)
    if (
      donation &&
      server.chainName === ChainNameEnum.mainChainName &&
      !donationAddress
    ) {
      donationTransaction.push({
        address: await Utils.getZenniesDonationAddress(server.chainName),
        amount: parseInt(
          (
            Utils.parseStringLocaleToNumberFloat(
              Utils.getZenniesDonationAmount(),
            ) *
            10 ** 8
          ).toFixed(0),
          10,
        ),
        memo: '', // zancas decision to not leak info with no reason.
      });
    }

    return [...jsonFlat, ...donationTransaction];
  }

  static async isValidAddress(
    address: string,
    serverChainName: string,
  ): Promise<{ isValid: boolean; onlyOrchardUA: string }> {
    const result = await parseAddress(address);
    let isValid: boolean = false;
    let isFullUA: boolean = false;
    let onlyOrchardUA: string = '';

    if (!result.ok || !result.value) {
      return { isValid, onlyOrchardUA };
    }
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result.value);
    } catch (e) {
      return { isValid, onlyOrchardUA };
    }

    isValid =
      resultJSON.status === RPCParseAddressStatusEnum.successAddressParse &&
      resultJSON.chain_name === serverChainName;
    if (isValid) {
      isFullUA =
        resultJSON.address_kind === RPCAddressKindEnum.unifiedAddressKind &&
        !!resultJSON.receivers_available &&
        resultJSON.receivers_available.includes(
          RPCReceiversEnum.orchardRPCReceiver,
        ) &&
        resultJSON.receivers_available.includes(
          RPCReceiversEnum.saplingRPCReceiver,
        ) &&
        resultJSON.receivers_available.includes(
          RPCReceiversEnum.transparentRPCReceiver,
        );
      if (isFullUA) {
        // the only use case for this is: if the UA is full (3 receivers)
        onlyOrchardUA = resultJSON.only_orchard_ua
          ? resultJSON.only_orchard_ua
          : '';
      }
    }

    return { isValid, onlyOrchardUA };
  }

  static async isValidOrchardOrSaplingAddress(
    address: string,
    serverChainName: string,
  ): Promise<boolean> {
    const result = await parseAddress(address);
    if (!result.ok || !result.value) {
      return false;
    }
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result.value);
    } catch (e) {
      return false;
    }

    return (
      resultJSON.status === RPCParseAddressStatusEnum.successAddressParse &&
      resultJSON.address_kind !== RPCAddressKindEnum.transparentAddressKind &&
      resultJSON.address_kind !== RPCAddressKindEnum.texAddressKind &&
      resultJSON.chain_name === serverChainName
    );
  }

  static splitMemo = (
    memos: string[] | undefined,
  ): { memo: string; memoUA: string } => {
    const memoTotal = memos && memos.length > 0 ? memos.join('\n') : '';
    if (memoTotal.includes(GlobalConst.replyTo)) {
      let memoArray = memoTotal.split(GlobalConst.replyTo);
      const memoUA = memoArray.pop();
      const memo = memoArray.join('');
      return { memo, memoUA: memoUA ? memoUA : '' };
    }
    return { memo: memoTotal, memoUA: '' };
  };

  static buildMemo = (
    memo: string | undefined,
    includeUAMemo: boolean,
    uAddress: string,
  ): string => {
    return `${memo || ''}${includeUAMemo ? GlobalConst.replyTo + uAddress : ''}`;
  };

  static countMemoBytes = (
    memo: string | undefined,
    includeUAMemo: boolean,
    uAddress: string,
  ): number => {
    const memoTotal = Utils.buildMemo(memo, includeUAMemo, uAddress);
    const len = Buffer.byteLength(
      memoTotal,
      GlobalConst.utf8 as BufferEncoding,
    );
    return len;
  };

  private static getDateFnsLocale(language: LanguageEnum) {
    const locales = {
      [LanguageEnum.es]: esLocale,
      [LanguageEnum.pt]: ptLocale,
      [LanguageEnum.ru]: ruLocale,
      [LanguageEnum.tr]: trLocale,
    } as Partial<Record<LanguageEnum, Locale>>;
    return locales[language] ?? enUS;
  }

  static formatDate(
    timestamp: number,
    pattern: string,
    language: LanguageEnum,
  ): string {
    return dateFnsFormat(new Date(timestamp), pattern, {
      locale: Utils.getDateFnsLocale(language),
    });
  }

  static diffInMinutes(from: Date, to: Date): number {
    return differenceInMinutes(from, to);
  }

  /**
   * zingolib surfaces chain-mismatch errors with the raw `ChainNameEnum`
   * values ("main" / "test" / "regtest") embedded in the message (e.g.
   * "Wallet chain name main doesn't match expected test"). This helper
   * rewrites any standalone occurrence of those tokens with the matching
   * `settings.value-chainname-*` translation (Mainnet / Testnet / Regtest)
   * so error alerts and snackbars read naturally to the user.
   *
   * The match is word-bounded, so the substitution is safe for messages
   * that don't contain a chain reference at all.
   */
  static humanizeChainTokens(
    text: string,
    translate: (key: string) => TranslateType,
  ): string {
    return text.replace(
      /\b(main|test|regtest)\b/g,
      token => translate(`settings.value-chainname-${token}`) as string,
    );
  }
}
