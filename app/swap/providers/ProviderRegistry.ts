import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';
import { FlashnetExecutor } from './FlashnetExecutor';
import { MayaExecutor } from './MayaExecutor';
import { NearIntentsExecutor } from './NearIntentsExecutor';
import { ProviderExecutor } from './ProviderExecutor';

/**
 * Look-up table from `SwapKitProviderEnum` to the executor that handles it.
 *
 * Why a class (rather than a free `Map` constant):
 *   - Tests can construct a registry with mock executors without touching
 *     module-level state.
 *   - The "add a new provider" workflow becomes "pass it to the constructor"
 *     instead of "edit a global module".
 *
 * Production code instantiates a registry via `createDefaultProviderRegistry()`
 * and passes it to `SwapService`. Looking up an unsupported provider throws —
 * that is always a programming error at the SwapService level (records are
 * only created with providers we already support).
 */
export class ProviderRegistry {
  private readonly executors: Map<SwapKitProviderEnum, ProviderExecutor>;

  constructor(executors: readonly ProviderExecutor[]) {
    this.executors = new Map();
    for (const executor of executors) {
      if (this.executors.has(executor.provider)) {
        throw new Error(
          `ProviderRegistry: duplicate executor for provider "${executor.provider}".`,
        );
      }
      this.executors.set(executor.provider, executor);
    }
  }

  get(provider: SwapKitProviderEnum): ProviderExecutor {
    const executor = this.executors.get(provider);
    if (!executor) {
      throw new Error(
        `ProviderRegistry: no executor registered for provider "${provider}".`,
      );
    }
    return executor;
  }

  has(provider: SwapKitProviderEnum): boolean {
    return this.executors.has(provider);
  }

  /** Provider identifiers currently supported by this registry. */
  supportedProviders(): SwapKitProviderEnum[] {
    return Array.from(this.executors.keys());
  }
}

/**
 * Factory for the registry used in production builds.
 *
 * Add new providers by constructing them here. Anything not listed will be
 * `has() === false`, which lets the rest of the code (route chooser, etc.)
 * filter out unsupported routes returned by SwapKit without crashing.
 */
export function createDefaultProviderRegistry(): ProviderRegistry {
  return new ProviderRegistry([
    new MayaExecutor(),
    new NearIntentsExecutor(),
    new FlashnetExecutor(),
  ]);
}
