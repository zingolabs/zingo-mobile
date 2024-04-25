import { getNumberFormatSettings } from 'react-native-localize';
import { ZecAmountSplitType } from './types/ZecAmountSplitType';
import { ChainNameEnum, TranslateType } from '../AppState';

import randomColor from 'randomcolor';
import RPCModule from '../RPCModule';

export default class Utils {
  static trimToSmall(addr?: string, numChars?: number): string {
    if (!addr) {
      return '';
    }
    const trimSize = numChars || 5;
    return `${addr.slice(0, trimSize)}...${addr.slice(addr.length - trimSize)}`;
  }

  // Convert to max 8 decimal places, and remove trailing zeros
  static maxPrecision(v: number): string {
    return v.toFixed(8);
  }

  static maxPrecisionTrimmed(v: number): string {
    let s = Utils.maxPrecision(v);
    if (!s) {
      return s;
    }

    while (s.indexOf('.') >= 0 && s.substr(s.length - 1, 1) === '0') {
      s = s.substr(0, s.length - 1);
    }

    if (s.substr(s.length - 1, 1) === '.') {
      s = s.substr(0, s.length - 1);
    }

    return s;
  }

  static splitZecAmountIntoBigSmall(zecValue?: number): ZecAmountSplitType {
    if (typeof zecValue === 'undefined') {
      return { bigPart: '--', smallPart: '' };
    }

    const { decimalSeparator } = getNumberFormatSettings();

    const intPart = parseInt(zecValue.toString(), 10);
    let bigPart = Utils.parseNumberFloatToStringLocale(zecValue, 8);
    let smallPart = '';
    let decimalPart = '';

    if (bigPart.indexOf(`${decimalSeparator}`) >= 0) {
      decimalPart = bigPart.substr(bigPart.indexOf(`${decimalSeparator}`) + 1);
      if (decimalPart.length > 4) {
        smallPart = decimalPart.substr(4);
        decimalPart = decimalPart.substr(0, decimalPart.length - smallPart.length);

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
      chunks.push(s.substr(i * chunkSize, chunkSize));
    }
    // Last chunk might contain un-even length
    chunks.push(s.substr((numChunks - 1) * chunkSize));

    return chunks;
  }

  static nextToAddrID: number = 0;

  static getNextToAddrID(): number {
    return Utils.nextToAddrID++;
  }

  static getShieldingFee(): number {
    return 0.0002;
  }

  static async getDonationAddress(chain_name: ChainNameEnum): Promise<string> {
    // donations only for mainnet.
    if (chain_name === ChainNameEnum.mainChainName) {
      // UA -> we need a fresh one.
      const ua: string = await RPCModule.getDonationAddress();
      return ua;
    }
    return '';
  }

  static getDefaultDonationAmount(): string {
    const { decimalSeparator } = getNumberFormatSettings();

    return '0' + decimalSeparator + '01';
  }

  static getDefaultDonationMemo(translate: (key: string) => TranslateType): string {
    return translate('donation') as string;
  }

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

    return Number(stringValue.replace(new RegExp(`\\${decimalSeparator}`), '.'));
  }

  static parseNumberFloatToStringLocale(numberValue: number, toFixed: number): string {
    const { decimalSeparator } = getNumberFormatSettings();

    let stringValue = Utils.maxPrecisionTrimmed(Number(numberValue.toFixed(toFixed)));

    return stringValue.replace(new RegExp('\\.'), `${decimalSeparator}`);
  }

  static getBlockExplorerTxIDURL(txid: string, chain_name: ChainNameEnum): string {
    if (chain_name === ChainNameEnum.testChainName) {
      return `https://testnet.zcashblockexplorer.com/transactions/${txid}`;
    } else {
      return `https://zcashblockexplorer.com/transactions/${txid}`;
    }
    // updated a new server
    //return `https://blockchair.com/zcash/transaction/${txid}`;
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
}
