/**
 * One pump over `wallet.events()` shared by every subscriber: the first
 * subscriber starts it, each event fans out to all listeners, and the last
 * unsubscribe cancels the stream.
 */
import { EventStreamInterface, WalletEvent, WalletInterface } from 'zingo-ffi';
import { openWallet } from './wallet';

export type WalletEventListener = (event: WalletEvent) => void;

type Pump = { wallet: WalletInterface; stream: EventStreamInterface };

const listeners = new Set<WalletEventListener>();
let pump: Pump | undefined;

async function nextEvent(
  stream: EventStreamInterface,
): Promise<WalletEvent | undefined> {
  try {
    return await stream.next();
  } catch {
    return undefined;
  }
}

async function run(stream: EventStreamInterface): Promise<void> {
  for (;;) {
    const event = await nextEvent(stream);
    if (event === undefined || pump?.stream !== stream) {
      break;
    }
    listeners.forEach(listener => listener(event));
  }
  if (pump?.stream === stream) {
    pump = undefined;
  }
}

function stopPump(): void {
  if (pump !== undefined) {
    pump.stream.cancel();
    pump = undefined;
  }
}

function startPump(wallet: WalletInterface): void {
  stopPump();
  const stream = wallet.events();
  pump = { wallet, stream };
  run(stream);
}

export function subscribeWalletEvents(listener: WalletEventListener): () => void {
  listeners.add(listener);
  const handle = openWallet();
  if (handle.ok && pump?.wallet !== handle.value) {
    startPump(handle.value);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPump();
    }
  };
}
