/**
 * One-off wallet utilities that don't require a running WalletBackend instance.
 *
 * These were originally static methods on the RPC class. They are standalone
 * named exports so components can import only what they need without depending
 * on the full WalletBackend.
 */
import { WalletType, GlobalConst } from '../../AppState';
import RPCModule from '../../RPCModule';
import { RPCZecPriceType } from '../types/RPCZecPriceType';
import { RPCSeedType } from '../types/RPCSeedType';

/**
 * Fetches the current ZEC/USD price from the zingolib price oracle.
 *
 * Price sentinel values from zingolib:
 *   0   — initial/default (no price data yet)
 *  -1   — error inside zingolib
 *  -2   — error in RPCModule or this function
 *  > 0  — real USD price
 */
export async function getZecPrice(): Promise<{
  price: number;
  error: string;
}> {
  try {
    // values:
    // 0   - initial/default value
    // -1  - error in zingolib.
    // -2  - error in RPCModule, likely.
    // > 0 - real value
    const start = Date.now();
    const resultStr: string = await RPCModule.zecPriceInfo();
    if (Date.now() - start > 4000) {
      console.log(
        '=========================================== > get ZEC price - ',
        Date.now() - start,
      );
    }

    if (resultStr) {
      if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error fetching price ${resultStr}`);
        return { price: -1, error: resultStr };
      } else {
        const resultJSON: RPCZecPriceType = await JSON.parse(resultStr);
        if (resultJSON.error) {
          console.log(`Error fetching price ${resultJSON.error}`);
          return { price: -1, error: resultJSON.error };
        }
        if (!resultJSON.current_price) {
          // if no exists the field or is empty
          return { price: 0, error: '' };
        }
        if (resultJSON.current_price && isNaN(resultJSON.current_price)) {
          console.log(`Error fetching price ${resultJSON.current_price}`);
          return {
            price: -1,
            error: `Error fetching price ${resultJSON.current_price}`,
          };
        } else {
          return { price: resultJSON.current_price, error: '' };
        }
      }
    } else {
      console.log('Internal Error fetching price');
      return { price: -2, error: 'Internal Error fetching price' };
    }
  } catch (error) {
    console.log(`Critical Error fetching price ${error}`);
    return { price: -2, error: `Critical Error fetching price ${error}` };
  }
}

export async function shieldFunds(): Promise<string> {
  try {
    const shieldStr: string = await RPCModule.confirmProcess();
    if (shieldStr) {
      if (shieldStr.toLowerCase().startsWith(GlobalConst.error)) {
        console.log(`Error shield ${shieldStr}`);
        return shieldStr;
      }
    } else {
      console.log('Internal Error shield ');
      return 'Error: Internal RPC Error: shield ';
    }

    return shieldStr;
  } catch (error) {
    console.log(`Critical Error shield ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Returns the wallet's secret material for the backup/seed display screens.
 *
 * readOnly = true  → returns { birthday, ufvk } (viewing-key wallets only)
 * readOnly = false → returns { birthday, seed } (full wallet)
 * Returns null on any error.
 */
export async function fetchWallet(
  readOnly: boolean,
): Promise<WalletType | null> {
  if (readOnly) {
    // only viewing key & birthday
    try {
      const start = Date.now();
      const ufvkStr: string = await RPCModule.getUfvkInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > get ufvk - ',
          Date.now() - start,
        );
      }
      if (ufvkStr) {
        if (ufvkStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error ufvk ${ufvkStr}`);
          return null;
        }
      } else {
        console.log('Internal Error ufvk');
        return null;
      }
      const RPCufvk: WalletType = await JSON.parse(ufvkStr);

      const wallet: WalletType = {} as WalletType;
      if (RPCufvk.birthday) {
        wallet.birthday = RPCufvk.birthday;
      }
      if (RPCufvk.ufvk) {
        wallet.ufvk = RPCufvk.ufvk;
      }

      return wallet;
    } catch (error) {
      console.log(`Critical Error ufvk ${error}`);
      return null;
    }
  } else {
    // only seed & birthday
    try {
      const start2 = Date.now();
      const seedStr: string = await RPCModule.getSeedInfo();
      if (Date.now() - start2 > 4000) {
        console.log(
          '=========================================== > get seed - ',
          Date.now() - start2,
        );
      }
      if (seedStr) {
        if (seedStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error seed ${seedStr}`);
          return null;
        }
      } else {
        console.log('Internal Error seed');
        return null;
      }
      const RPCseed: RPCSeedType = await JSON.parse(seedStr);

      const wallet: WalletType = {} as WalletType;
      if (RPCseed.seed_phrase) {
        wallet.seed = RPCseed.seed_phrase;
      }
      if (RPCseed.birthday) {
        wallet.birthday = RPCseed.birthday;
      }

      return wallet;
    } catch (error) {
      console.log(`Critical Error seed ${error}`);
      return null;
    }
  }
}
