/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext, useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { space16, space8, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  formatAmountForDisplay,
  providerShortLabel,
  renderSwapText,
} from '@app/swap';
import type { SwapTextType } from '@app/swap';
import type { RouteOptionType, UnavailableProviderType } from '@app/swap';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import ListRow from '@ui/primitives/ListRow';
import Tag from '@ui/widgets/Tag';
import Button from '@ui/primitives/Button';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import SheetTitle from './SheetTitle';

type RoutesSheetProps = {
  routes: RouteOptionType[];
  unavailable: UnavailableProviderType[];
  selectedRouteId: string;
  /** The symbol the routes deliver, from the quote they came from. */
  receiveSymbol: string;
  /** USD per unit of the delivered asset at quote time; 0 when unpriced. */
  receiveUsdUnitPrice: number;
  onSelect: (routeId: string) => void;
};

/**
 * The routes a quote returned, best price first: what arrives, what it is
 * worth, how long it takes and through whom. The providers that answered but
 * cannot be used are listed under them, inert, with their reason.
 */
const RoutesSheet = forwardRef<BottomSheetModal, RoutesSheetProps>(
  (
    {
      routes,
      unavailable,
      selectedRouteId,
      receiveSymbol,
      receiveUsdUnitPrice,
      onSelect,
    },
    ref,
  ) => {
    const { translate } = useContext(ContextAppLoaded);
    const say = (text: SwapTextType) =>
      renderSwapText(text, key => (translate(key) as string).trim());
    const { colors } = useTheme();
    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    /** Best price first, whatever order the providers answered in. */
    const sorted = useMemo(
      () =>
        [...routes].sort(
          (a, b) =>
            parseFloat(b.expectedReceiveAmount) -
            parseFloat(a.expectedReceiveAmount),
        ),
      [routes],
    );

    const usd = (amount: string): string => {
      const value = parseFloat(amount) * receiveUsdUnitPrice;
      return Number.isFinite(value) && receiveUsdUnitPrice > 0
        ? `≈ $${value.toFixed(2)}`
        : '';
    };

    return (
      <AppSheetModal
        ref={ref}
        header={
          <SheetTitle
            title={translate('swap.routes-title') as string}
            onClose={dismiss}
            closeLabel={translate('swap.close') as string}
          />
        }
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: space16,
            paddingBottom: 30,
          }}
        >
          <Text variant="caption" tone="muted" style={{ marginBottom: space8 }}>
            {translate('swap.routes-sub') as string}
          </Text>
          {sorted.map((route, index) => {
            const selected = route.routeId === selectedRouteId;
            const best = index === 0;
            const details = [
              usd(route.expectedReceiveAmount),
              route.estimatedTimeText ? `~${route.estimatedTimeText}` : '',
              providerShortLabel(route.provider),
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <ListRow
                key={route.routeId}
                testID={`swap.route.${route.provider}`}
                title={
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: space8,
                    }}
                  >
                    <Text variant="bodyStrong">
                      {`${formatAmountForDisplay(route.expectedReceiveAmount)} ${receiveSymbol}`}
                    </Text>
                    {best && (
                      <Tag tone="accent">
                        {translate('swap.routes-best') as string}
                      </Tag>
                    )}
                  </View>
                }
                subtitle={
                  <View>
                    <Text variant="bodySmall" tone="muted">
                      {details}
                    </Text>
                    {!!route.warningsText && (
                      <Text variant="bodySmall" tone="warning">
                        {route.warningsText}
                      </Text>
                    )}
                  </View>
                }
                trailing={
                  selected ? (
                    <CheckIcon size={17} color={colors.fgAccent} />
                  ) : undefined
                }
                onPress={() => {
                  onSelect(route.routeId);
                  dismiss();
                }}
              />
            );
          })}
          {unavailable.map(entry => (
            <ListRow
              key={entry.provider}
              testID={`swap.route.${entry.provider}.unavailable`}
              title={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: space8,
                  }}
                >
                  <Text variant="bodyStrong" tone="muted">
                    {providerShortLabel(entry.provider)}
                  </Text>
                  <Tag tone="neutral">
                    {translate('swap.routes-unavailable') as string}
                  </Tag>
                </View>
              }
              subtitle={say(entry.reason)}
            />
          ))}
          <View style={{ marginTop: space16 }}>
            <Button
              variant="quiet"
              title={translate('swap.close') as string}
              onPress={dismiss}
            />
          </View>
        </BottomSheetScrollView>
      </AppSheetModal>
    );
  },
);

export default RoutesSheet;
