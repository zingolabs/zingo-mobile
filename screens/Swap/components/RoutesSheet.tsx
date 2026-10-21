/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { space16, space8, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  describeCostVsMarket,
  formatAmountForDisplay,
  providerShortLabel,
} from '@app/swap';
import type { RouteOptionType, UnavailableProviderType } from '@app/swap';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import ListRow from '@ui/primitives/ListRow';
import Tag from '@ui/widgets/Tag';
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
 * The routes a quote returned, side by side: what arrives, what it is worth,
 * how long it takes and through whom. The providers that returned nothing are
 * listed under them, inert, with what they said about why.
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
    const { colors } = useTheme();
    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

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
          {routes.map(route => {
            const selected = route.routeId === selectedRouteId;
            const best = route.tags?.includes('RECOMMENDED');
            const costVsMarket = describeCostVsMarket(route.costVsMarketBps);
            const details = [
              usd(route.expectedReceiveAmount),
              route.estimatedTimeText,
              `${translate('swap.via') as string} ${providerShortLabel(route.provider)}`,
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
                    <Text variant="bodySmall" tone="muted">
                      {`${translate('swap.routes-at-least') as string} ${formatAmountForDisplay(route.minReceiveAmount)} ${receiveSymbol}`}
                    </Text>
                    {!!costVsMarket && (
                      <Text variant="bodySmall" tone="muted">
                        {costVsMarket}
                      </Text>
                    )}
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
              subtitle={entry.reason}
            />
          ))}
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', marginTop: space16 }}
          >
            {translate('swap.routes-refresh-note') as string}
          </Text>
        </BottomSheetScrollView>
      </AppSheetModal>
    );
  },
);

export default RoutesSheet;
