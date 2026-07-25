/**
 * Pure core of the Send form's field updates.
 *
 * A form write is a value of [`SendFieldUpdate`]: the field is named by the
 * discriminant, so a call site states *which* field it writes and the type
 * system rejects a wrongly-shaped one — there are no positional slots to
 * transpose. `applySendFieldUpdates` folds a batch of updates over the
 * current field values and owns the one coupling in the form: the two
 * amount fields are a single value in two units, so writing either
 * recomputes its counterpart from the ZEC price, and clears it when the
 * input is not a number or no price is known (which is why clearing
 * either amount clears both).
 *
 * Pure and side-effect free: fields in, fields out. The URI-bearing
 * address path (async parser, user-facing errors) lives with the caller;
 * the `address` arm here receives plain addresses and strips whitespace.
 */
import {
  parseNumberFloatToStringLocale,
  parseStringLocaleToNumberFloat,
} from '../../app/utils/localeNumber';

export type SendFieldUpdate =
  | { readonly field: 'address'; readonly value: string }
  | { readonly field: 'amount'; readonly value: string }
  | { readonly field: 'amountCurrency'; readonly value: string }
  | { readonly field: 'memo'; readonly value: string }
  | { readonly field: 'includeUAMemo'; readonly value: boolean };

export type SendFields = {
  readonly address: string;
  readonly amount: string;
  readonly amountCurrency: string;
  readonly memo: string;
  readonly includeUAMemo: boolean;
};

const applyOne = (
  fields: SendFields,
  update: SendFieldUpdate,
  zecPriceUsd: number,
): SendFields => {
  switch (update.field) {
    case 'address':
      return { ...fields, address: update.value.replace(/[ \t\n\r]+/g, '') };
    case 'amount': {
      const amount = update.value.substring(0, 20);
      const parsed = parseStringLocaleToNumberFloat(amount);
      const amountCurrency = isNaN(parsed)
        ? ''
        : amount && zecPriceUsd > 0
          ? parseNumberFloatToStringLocale(parsed * zecPriceUsd, 2)
          : '';
      return { ...fields, amount, amountCurrency };
    }
    case 'amountCurrency': {
      const amountCurrency = update.value.substring(0, 15);
      const parsed = parseStringLocaleToNumberFloat(amountCurrency);
      const amount = isNaN(parsed)
        ? ''
        : amountCurrency && zecPriceUsd > 0
          ? parseNumberFloatToStringLocale(parsed / zecPriceUsd, 8)
          : '';
      return { ...fields, amount, amountCurrency };
    }
    case 'memo':
      return { ...fields, memo: update.value };
    case 'includeUAMemo':
      return { ...fields, includeUAMemo: update.value };
  }
};

export function applySendFieldUpdates(
  prev: SendFields,
  updates: readonly SendFieldUpdate[],
  zecPriceUsd: number,
): SendFields {
  return updates.reduce(
    (fields, update) => applyOne(fields, update, zecPriceUsd),
    prev,
  );
}
