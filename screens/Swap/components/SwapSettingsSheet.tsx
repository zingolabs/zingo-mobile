/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { space12, space16, space8 } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import Chip from '@ui/primitives/Chip';
import TextField from '@ui/primitives/TextField';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { DEFAULT_SLIPPAGE_BPS } from '@screens/Swap/useSwapForm';
import SheetTitle from './SheetTitle';
import InfoTooltip from '@ui/widgets/InfoTooltip';

type SwapSettingsSheetProps = {
  slippageBps: number;
  onChange: (bps: number) => void;
};

/** 0.5%, 1%, 3%. */
const PRESETS_BPS: ReadonlyArray<number> = [50, 100, 300];
/** The tolerance can be set between these. */
const MIN_BPS = 10;
const MAX_BPS = 1_000;
/** Past this, the fill may land well under the estimate. */
const HIGH_BPS = 500;

export function formatSlippagePercent(bps: number): string {
  return (bps / 100).toFixed(bps % 100 === 0 ? 0 : 1);
}

/**
 * The slippage tolerance: how far the price may move while the swap travels
 * before the provider returns the funds instead of filling. Lower protects
 * the amount, higher fails less. Neither is the safe choice in general,
 * which is why it is the user's.
 */
const SwapSettingsSheet = forwardRef<BottomSheetModal, SwapSettingsSheetProps>(
  ({ slippageBps, onChange }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const keyboardHeight = useKeyboardHeight();
    const [editing, setEditing] = useState<boolean>(
      !PRESETS_BPS.includes(slippageBps),
    );
    const [custom, setCustom] = useState<string>(
      PRESETS_BPS.includes(slippageBps)
        ? ''
        : formatSlippagePercent(slippageBps),
    );

    // A preset picked but not yet applied: nothing changes until Done.
    const [preset, setPreset] = useState<number>(slippageBps);
    const reset = useCallback(() => {
      setPreset(slippageBps);
      setEditing(!PRESETS_BPS.includes(slippageBps));
      setCustom(
        PRESETS_BPS.includes(slippageBps)
          ? ''
          : formatSlippagePercent(slippageBps),
      );
    }, [slippageBps]);

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const parsedCustom = Math.round(parseFloat(custom.replace(',', '.')) * 100);
    const customValid =
      Number.isFinite(parsedCustom) &&
      parsedCustom >= MIN_BPS &&
      parsedCustom <= MAX_BPS;
    const draft = editing ? (customValid ? parsedCustom : null) : preset;
    const low = draft !== null && draft < DEFAULT_SLIPPAGE_BPS;
    const high = draft !== null && draft > HIGH_BPS;

    const customError =
      editing && custom.length > 0 && !customValid
        ? (translate('swap.slippage-range') as string)
        : undefined;
    const customHelper =
      editing && high ? (translate('swap.slippage-high') as string) : undefined;

    return (
      <AppSheetModal
        ref={ref}
        onDismiss={reset}
        header={
          <SheetTitle
            title={translate('swap.settings-title') as string}
            onClose={dismiss}
            closeLabel={translate('swap.close') as string}
          />
        }
        contentStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
      >
        <View style={{ paddingHorizontal: space16 }}>
          {/* One row when it fits; the chips drop under the label when not. */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              columnGap: space12,
              rowGap: space8,
              marginTop: space8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: 4,
              }}
            >
              <Text variant="bodyStrong">
                {translate('swap.slippage') as string}
              </Text>
              <InfoTooltip
                testID="swap.slippage-info"
                label={translate('swap.slippage') as string}
                text={translate('swap.tip-slip') as string}
              >
                <></>
              </InfoTooltip>
            </View>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                columnGap: space8,
                rowGap: space8,
              }}
            >
              {PRESETS_BPS.map(bps => (
                <Chip
                  key={bps}
                  testID={`swap.slippage.${bps}`}
                  selected={!editing && preset === bps}
                  onPress={() => {
                    setEditing(false);
                    setPreset(bps);
                  }}
                >
                  {`${formatSlippagePercent(bps)}%`}
                </Chip>
              ))}
              <Chip
                testID="swap.slippage.custom"
                selected={editing}
                onPress={() => setEditing(true)}
              >
                {editing && customValid
                  ? `${formatSlippagePercent(parsedCustom)}%`
                  : (translate('swap.slippage-other') as string)}
              </Chip>
            </View>
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: space12 }}>
            {(translate('swap.slippage-help') as string).replace(
              '{n}',
              formatSlippagePercent(DEFAULT_SLIPPAGE_BPS),
            )}
          </Text>
          {editing && (
            <View style={{ marginTop: space12 }}>
              <TextField
                testID="swap.slippage.input"
                label={translate('swap.slippage') as string}
                value={custom}
                onChangeText={setCustom}
                placeholder={formatSlippagePercent(slippageBps)}
                error={customError}
                helper={customHelper}
                valid={customValid}
              />
            </View>
          )}
          {low && (
            <View style={{ marginTop: space12 }}>
              <Banner
                tone="warning"
                title={(translate('swap.slippage-low') as string).replace(
                  '{n}',
                  formatSlippagePercent(draft),
                )}
              />
            </View>
          )}
          <View style={{ marginTop: space16 }}>
            <Button
              testID="swap.slippage.done"
              variant="primary"
              title={translate('swap.done') as string}
              disabled={editing && !customValid}
              onPress={() => {
                onChange(editing && customValid ? parsedCustom : preset);
                dismiss();
              }}
            />
          </View>
        </View>
      </AppSheetModal>
    );
  },
);

export default SwapSettingsSheet;
