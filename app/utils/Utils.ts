import { getNumberFormatSettings } from 'react-native-localize';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';

import { ZecAmountSplitType } from './types/ZecAmountSplitType';
import {
  ChainNameEnum,
  ContactType,
  GlobalConst,
  LanguageEnum,
  SendJsonToTypeType,
  SendPageStateClass,
  ServerType,
  ToAddrClass,
  TranslateType,
  ValueTransferKindEnum,
  ValueTransferType,
} from '../AppState';

import randomColor from 'randomcolor';
import RPCModule from '../RPCModule';
import { Buffer } from 'buffer';
import { RPCParseAddressType } from '../rpc/types/RPCParseAddressType';
import { RPCParseAddressStatusEnum } from '../rpc/enums/RPCParseAddressStatusEnum';
import { RPCAddressKindEnum } from '../rpc/enums/RPCAddressKindEnum';
import { RPCReceiversEnum } from '../rpc/enums/RPCReceiversEnum';

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

    let bigPart = Utils.parseNumberFloatToStringLocale(zecValue, 5);

    // remove the `0` at the end.
    while (true) {
      if (bigPart[bigPart.length - 1] === '0') {
        bigPart = bigPart.slice(0, bigPart.length - 1);
      } else if (bigPart[bigPart.length - 1] === `${decimalSeparator}`) {
        bigPart = bigPart.slice(0, bigPart.length - 1);
        break;
      } else {
        break;
      }
    }

    return { bigPart: bigPart, smallPart: '' };
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

  // DONATION TO ZINGOLABS
  static async getDonationAddress(chainName: ChainNameEnum): Promise<string> {
    // donations only for mainnet.
    if (chainName === ChainNameEnum.mainChainName) {
      // UA -> we need a fresh one.
      //const start = Date.now();
      const ua: string = await RPCModule.getDonationAddress();
      //console.log('=========================================== > get donation address - ', Date.now() - start);
      return ua;
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
      //const start = Date.now();
      const ua: string = await RPCModule.getZenniesDonationAddress();
      //console.log('=========================================== > get zennies donation address - ', Date.now() - start);
      return ua;
    }
    return '';
  }

  static getZenniesDonationAmount(): string {
    const { decimalSeparator } = getNumberFormatSettings();

    return '0' + decimalSeparator + '01';
  }

  // NYM
  static async getNymDonationAddress(
    chainName: ChainNameEnum,
  ): Promise<string> {
    // donations only for mainnet.
    if (chainName === ChainNameEnum.mainChainName) {
      // UA -> we need a fresh one.
      //const start = Date.now();
      const ua: string = await RPCModule.getDonationAddress();
      //console.log('=========================================== > get nym donation address - ', Date.now() - start);
      return ua;
    }
    return '';
  }

  static getNymDonationAmount(): string {
    const { decimalSeparator } = getNumberFormatSettings();

    return '0' + decimalSeparator + '01';
  }

  static getNymDonationMemo(translate: (key: string) => TranslateType): string {
    return translate('nym-donation') as string;
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
  ): string {
    if (chainName === ChainNameEnum.testChainName) {
      return `https://testnet.zcashexplorer.app/transactions/${txid}`;
    } else {
      return `https://mainnet.zcashexplorer.app/transactions/${txid}`;
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
    let donationAddress: boolean = false;
    const json: Promise<SendJsonToTypeType[][]> = Promise.all(
      [sendPageState.toaddr].map(async (to: ToAddrClass) => {
        const memo = Utils.buildMemo(to.memo, to.includeUAMemo, uAddress);
        const amount = parseInt(
          (Utils.parseStringLocaleToNumberFloat(to.amount) * 10 ** 8).toFixed(
            0,
          ),
          10,
        );

        donationAddress =
          to.to === (await Utils.getDonationAddress(server.chainName)) ||
          to.to === (await Utils.getZenniesDonationAddress(server.chainName)) ||
          to.to === (await Utils.getNymDonationAddress(server.chainName));

        if (memo === '') {
          return [{ address: to.to, amount } as SendJsonToTypeType];
        } else if (
          Buffer.byteLength(memo, GlobalConst.utf8 as BufferEncoding) <=
          GlobalConst.memoMaxLength
        ) {
          return [{ address: to.to, amount, memo } as SendJsonToTypeType];
        } else {
          // If the memo is more than 511 bytes, then we split it into multiple transactions.
          // Each memo will be `(xx/yy)memo part`. The prefix "(xx/yy)" is 7 bytes long, so
          // we'll split the memo into 511-7 = 505 bytes length
          // this make sense if we make long memos... in the future.
          const splits = Utils.utf16Split(memo, GlobalConst.memoMaxLength - 7);
          const tos = [];

          // The first one contains all the tx value
          tos.push({
            address: to.to,
            amount,
            memo: `(1/${splits.length})${splits[0]}`,
          } as SendJsonToTypeType);

          for (let i = 1; i < splits.length; i++) {
            tos.push({
              address: to.to,
              amount: 0,
              memo: `(${i + 1}/${splits.length})${splits[i]}`,
            } as SendJsonToTypeType);
          }

          return tos;
        }
      }),
    );
    const jsonFlat: SendJsonToTypeType[] = (await json).flat();

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

    console.log('Sending:');
    console.log(jsonFlat);
    console.log(donationTransaction);

    return [...jsonFlat, ...donationTransaction];
  }

  static async isValidAddress(
    address: string,
    serverChainName: string,
  ): Promise<{ isValid: boolean; onlyOrchardUA: string }> {
    //const start = Date.now();
    const result: string = await RPCModule.parseAddressInfo(address);
    //console.log('=========================================== > parse address - ', Date.now() - start);
    console.log('is valid address?', result, serverChainName);
    let isValid: boolean = false;
    let isFullUA: boolean = false;
    let onlyOrchardUA: string = '';

    if (result) {
      if (result.toLowerCase().startsWith(GlobalConst.error)) {
        return { isValid, onlyOrchardUA };
      }
    } else {
      return { isValid, onlyOrchardUA };
    }
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result);
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
    //const start = Date.now();
    const result: string = await RPCModule.parseAddressInfo(address);
    //console.log('=========================================== > parse address - ', Date.now() - start);
    //console.log(result);
    if (result) {
      if (result.toLowerCase().startsWith(GlobalConst.error)) {
        return false;
      }
    } else {
      return false;
    }
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result);
    } catch (e) {
      return false;
    }

    //console.log('parse-memo', address, resultJSON);

    return (
      resultJSON.status === RPCParseAddressStatusEnum.successAddressParse &&
      resultJSON.address_kind !== RPCAddressKindEnum.transparentAddressKind &&
      resultJSON.address_kind !== RPCAddressKindEnum.texAddressKind &&
      resultJSON.chain_name === serverChainName
    );
  }

  static isMessagesAddress(vt: ValueTransferType | ContactType): boolean {
    // we can't check here in this VT if the memo is empty
    // because this address/contact could have memos in another
    // VT in the list.
    // only for orchard or sapling
    if (vt.address) {
      // the performance in the list is really bad if here I asked properly
      // to zingolib (parse_address command) about the type of the address.
      return !vt.address.startsWith('t');
    } else {
      const { memoUA } = Utils.splitMemo(vt.memos);
      return !!memoUA;
    }
  }

  static messagesAddress = (vt: ValueTransferType | ContactType): string => {
    // we can't check here in this VT if the memo is empty
    // because this address/contact could have memos in another
    // VT in the list.
    // only for orchard or sapling
    if (vt.address) {
      // the performance in the list is really bad if here I asked properly
      // to zingolib (parse_address command) about the type of the address.
      return !vt.address.startsWith('t') ? vt.address : '';
    } else {
      const { memoUA } = Utils.splitMemo(vt.memos);
      return memoUA ? memoUA : '';
    }
  };

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

  static setMomentLocale = async (language: LanguageEnum) => {
    moment.locale(language);
  };

  static valueTransferKindText = (
    translate: (key: string) => TranslateType,
    vt: ValueTransferType,
  ): string => {
    if (!!vt.stakingAction && !!vt.stakingAction.kind) {
      return vt.stakingAction.kind === 'create_bond' && vt.confirmations === 0
        ? '...Staking...'
        : vt.stakingAction.kind === 'create_bond' && vt.confirmations !== 0
          ? 'Bond'
          : vt.stakingAction.kind === 'begin_unbonding' &&
              vt.confirmations === 0
            ? '...Unbonding...'
            : vt.stakingAction.kind === 'begin_unbonding' &&
                vt.confirmations !== 0
              ? 'Unbond'
              : vt.stakingAction.kind === 'withdraw_bond' &&
                  vt.confirmations === 0
                ? '...Withdrawing...'
                : vt.stakingAction.kind === 'withdraw_bond' &&
                    vt.confirmations !== 0
                  ? 'Withdraw'
                  : vt.stakingAction.kind === 'redelegate' &&
                      vt.confirmations === 0
                    ? '...Retargeting...'
                    : vt.stakingAction.kind !== 'redelegate' &&
                        vt.confirmations !== 0
                      ? 'Retarget'
                      : '';
    }
    return vt.kind === ValueTransferKindEnum.Sent && vt.confirmations === 0
      ? (translate('history.sending') as string)
      : vt.kind === ValueTransferKindEnum.Sent && vt.confirmations !== 0
        ? (translate('history.sent') as string)
        : vt.kind === ValueTransferKindEnum.Received && vt.confirmations === 0
          ? (translate('history.receiving') as string)
          : vt.kind === ValueTransferKindEnum.Received && vt.confirmations !== 0
            ? (translate('history.received') as string)
            : vt.kind === ValueTransferKindEnum.MemoToSelf &&
                vt.confirmations === 0
              ? (translate('history.sendingtoself') as string)
              : vt.kind === ValueTransferKindEnum.MemoToSelf &&
                  vt.confirmations !== 0
                ? (translate('history.memotoself') as string)
                : vt.kind === ValueTransferKindEnum.SendToSelf &&
                    vt.confirmations === 0
                  ? (translate('history.sendingtoself') as string)
                  : vt.kind === ValueTransferKindEnum.SendToSelf &&
                      vt.confirmations !== 0
                    ? (translate('history.sendtoself') as string)
                    : vt.kind === ValueTransferKindEnum.Shield &&
                        vt.confirmations === 0
                      ? (translate('history.shielding') as string)
                      : vt.kind === ValueTransferKindEnum.Shield &&
                          vt.confirmations !== 0
                        ? (translate('history.shield') as string)
                        : vt.kind === ValueTransferKindEnum.Rejection &&
                            vt.confirmations === 0
                          ? (translate('history.sending') as string)
                          : vt.kind === ValueTransferKindEnum.Rejection &&
                              vt.confirmations !== 0
                            ? (translate('history.rejection') as string)
                            : '';
  };

  static valueTransferKindColor = (
    color: string,
    vt: ValueTransferType,
  ): string => {
    return vt.stakingAction && vt.stakingAction.kind === 'create_bond'
      ? '#0091FF80'
      : vt.stakingAction &&
          (vt.stakingAction.kind === 'begin_unbonding' ||
            vt.stakingAction.kind === 'redelegate')
        ? '#FFAF0E80'
        : color;
  };
}
