import { get } from 'lodash';
import en from '@app/translations/en.json';
import { renderSwapText } from '@app/swap/swapText';
import type { SwapTextType } from '@app/swap/swapText';

/** A swap message as the English app shows it, so tests read the sentence. */
export function english(text: SwapTextType): string;
export function english(text: SwapTextType | undefined): string | undefined;
export function english(text: SwapTextType | undefined): string | undefined {
  return text && renderSwapText(text, key => String(get(en, key)));
}
