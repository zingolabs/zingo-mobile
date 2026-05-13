import RPCModule from '../../RPCModule';
import { GlobalConst, WalletType } from '../../AppState';
import { RPCZecPriceType } from '../types/rpcTransactionTypes';

export async function getZecPrice(
  withTOR: boolean,
): Promise<{ price: number; error: string }> {
  try {
    if (withTOR) {
      const result: string = await RPCModule.createTorClientProcess();
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Create Tor client error: ${result}`);
      }
    }
    const start = Date.now();
    const resultStr: string = await RPCModule.zecPriceInfo(
      withTOR ? GlobalConst.true : GlobalConst.false,
    );
    if (Date.now() - start > 4000) {
      console.log('=========================================== > get ZEC price - ', Date.now() - start);
    }
    if (resultStr) {
      if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error fetching price ${resultStr}`);
        return { price: -1, error: resultStr };
      }
      const resultJSON: RPCZecPriceType = await JSON.parse(resultStr);
      if (resultJSON.error) {
        console.log(`Error fetching price ${resultJSON.error}`);
        return { price: -1, error: resultJSON.error };
      }
      if (!resultJSON.current_price) {
        return { price: 0, error: '' };
      }
      if (isNaN(resultJSON.current_price)) {
        console.log(`Error fetching price ${resultJSON.current_price}`);
        return { price: -1, error: `Error fetching price ${resultJSON.current_price}` };
      }
      return { price: resultJSON.current_price, error: '' };
    }
    console.log('Internal Error fetching price');
    return { price: -2, error: 'Internal Error fetching price' };
  } catch (error) {
    console.log(`Critical Error fetching price ${error}`);
    return { price: -2, error: `Critical Error fetching price ${error}` };
  }
}

export async function shieldFunds(): Promise<string> {
  try {
    const confirmInfo = await RPCModule.confirmProcess();
    return confirmInfo.txids.join(', ');
  } catch (error) {
    console.log(`Critical Error shield ${error}`);
    return `Error: ${error}`;
  }
}

export async function fetchWallet(
  readOnly: boolean,
): Promise<WalletType | null> {
  if (readOnly) {
    try {
      const start = Date.now();
      const ufvkInfo = await RPCModule.getUfvkInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > get ufvk - ', Date.now() - start);
      }
      const wallet: WalletType = {} as WalletType;
      wallet.birthday = ufvkInfo.birthday;
      wallet.ufvk = ufvkInfo.ufvk;
      return wallet;
    } catch (error) {
      console.log(`Critical Error ufvk ${error}`);
      return null;
    }
  } else {
    try {
      const start = Date.now();
      const seedInfo = await RPCModule.getSeedInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > get seed - ', Date.now() - start);
      }
      const wallet: WalletType = {} as WalletType;
      wallet.seed = seedInfo.seed_phrase;
      wallet.birthday = seedInfo.birthday;
      return wallet;
    } catch (error) {
      console.log(`Critical Error seed ${error}`);
      return null;
    }
  }
}
