/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClock, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { ThemeType } from '../../../app/types';
import { TranslateType } from '../../../app/AppState';
import { RouteOptionType, formatAmountForDisplay } from '../../../app/swap';
import BoldText from '../../Components/BoldText';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { providerShortLabel } from './providerLabels';

/**
 * Route chooser sheet (Etapa 2).
 *
 * Lists every route SwapKit returned for the current quote — one card per
 * provider — and lets the user pick which one drives the commit. Cards
 * are tappable; the currently selected route gets the green border accent
 * from the design.
 *
 * Card content per the design mockup:
 *   - Provider short label + `Optimal` badge when SwapKit tagged the route
 *     `RECOMMENDED`.
 *   - Expected receive amount + the destination asset symbol.
 *   - Estimated time (clock icon + label) and a network-status indicator.
 *     The indicator is derived heuristically from the route's warnings —
 *     present warnings ⇒ `High`, otherwise ⇒ `Stable`. SwapKit does not
 *     return an explicit network-condition field; the warnings array is the
 *     closest signal we have.
 *   - Total fee re-expressed in ZEC (the wallet's frame of reference, same
 *     orientation logic as the swap-screen fees summary).
 */
type QuotesPickerSheetProps = {
  routes: ReadonlyArray<RouteOptionType>;
  selectedRouteId: string | null;
  onSelect: (route: RouteOptionType) => void;
  /** Source (sell) asset symbol — display for the receive line on inbound
   *  swaps where ZEC IS the receive, BTC/etc the source. Not used directly
   *  here; passed for symmetry and future expansion. */
  sellSymbol: string;
  receiveSymbol: string;
  /** When true, ZEC sits on the sell side (outbound). Drives which fee
   *  aggregate (sell vs receive) the per-card row reads from. */
  isOutbound: boolean;
  translate: (key: string) => TranslateType;
};

const SNAP_POINTS = ['70%'];

const QuotesPickerSheet = forwardRef<BottomSheetModal, QuotesPickerSheetProps>(
  (
    { routes, selectedRouteId, onSelect, receiveSymbol, isOutbound, translate },
    ref,
  ) => {
    const { colors } = useTheme() as ThemeType;
    const t = useCallback(
      (key: string, fallback: string): string =>
        (translate(key) as string) || fallback,
      [translate],
    );

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const onTapRoute = useCallback(
      (route: RouteOptionType) => {
        onSelect(route);
        dismiss();
      },
      [onSelect, dismiss],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handle = useMemo(
      () => (
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 6,
            paddingHorizontal: 16,
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderRightWidth: 0.5,
            borderTopColor: colors.bottomSheetBorder,
            borderLeftColor: colors.bottomSheetBorder,
            borderRightColor: colors.bottomSheetBorder,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'center', color: colors.text }}
            >
              {t('swap.quotes-title', 'Quotes returned')}
            </BoldText>
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              hitSlop={8}
              style={{ padding: 14 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, t],
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        handleComponent={() => handle}
        backgroundStyle={{ backgroundColor: colors.bottomSheetBackground }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.body}
          style={{ backgroundColor: colors.bottomSheetBackground }}
        >
          {routes.length === 0 ? (
            <FadeText style={{ textAlign: 'center', marginTop: 24 }}>
              {t(
                'swap.quotes-empty',
                'No routes available for this swap right now.',
              )}
            </FadeText>
          ) : (
            routes.map(route => {
              const isSelected = route.routeId === selectedRouteId;
              const isOptimal = route.tags?.includes('RECOMMENDED');
              // Heuristic for the "Network" indicator: SwapKit's `warnings`
              // array is the closest signal we have. Empty ⇒ stable; any
              // warning ⇒ high.
              const networkLabel = route.warningsText
                ? t('swap.network-high', 'High')
                : t('swap.network-stable', 'Stable');
              const networkColor = route.warningsText
                ? colors.danger.text
                : colors.primary;
              // Always expressed in ZEC. Outbound ⇒ ZEC is sell side.
              // Inbound ⇒ ZEC is receive side. Same pattern the swap-screen
              // fees summary uses.
              const feeInZec = isOutbound
                ? route.totalFeesInSellAsset
                : route.totalFeesInReceiveAsset;
              return (
                <Pressable
                  key={route.routeId}
                  onPress={() => onTapRoute(route)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  testID={`swap.quote-card.${route.provider}`}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.providerCell}>
                      <BoldText style={{ color: colors.text }}>
                        {providerShortLabel(route.provider)}
                      </BoldText>
                      {isOptimal && (
                        <View
                          style={[
                            styles.optimalBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <BoldText
                            style={{
                              ...styles.optimalText,
                              color: colors.background,
                            }}
                          >
                            {t('swap.optimal-badge', 'Optimal')}
                          </BoldText>
                        </View>
                      )}
                    </View>
                    <BoldText style={{ color: colors.primary }}>
                      {`${formatAmountForDisplay(route.expectedReceiveAmount)} ${receiveSymbol}`}
                    </BoldText>
                  </View>
                  <View style={styles.cardBottomRow}>
                    <View style={styles.metaCell}>
                      <FontAwesomeIcon
                        icon={faClock}
                        size={12}
                        color={colors.placeholder}
                      />
                      <FadeText style={styles.metaText}>
                        {`${route.estimatedTimeText ?? '~?'} | ${t(
                          'swap.network-label',
                          'Network',
                        )}: `}
                      </FadeText>
                      <RegText
                        style={{ ...styles.metaText, color: networkColor }}
                      >
                        {networkLabel}
                      </RegText>
                    </View>
                    <FadeText style={styles.feeText}>
                      {`${t('swap.fee-prefix', 'Fee')}: ${formatAmountForDisplay(
                        feeInZec,
                      )} ZEC`}
                    </FadeText>
                  </View>
                </Pressable>
              );
            })
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

QuotesPickerSheet.displayName = 'QuotesPickerSheet';
export default QuotesPickerSheet;

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    rowGap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    rowGap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  optimalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  optimalText: {
    fontSize: 11,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  feeText: {
    fontSize: 12,
  },
});
