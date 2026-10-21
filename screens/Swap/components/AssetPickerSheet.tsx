/* eslint-disable react-native/no-inline-styles */
import React, {
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { space12, space16, space8, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import type { TokenEntryType } from '@app/swap';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import ListRow from '@ui/primitives/ListRow';
import SearchField from '@ui/widgets/SearchField';
import Banner from '@ui/widgets/Banner';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import TokenLogo from './TokenLogo';
import SheetTitle from './SheetTitle';

type AssetPickerSheetProps = {
  tokens: TokenEntryType[];
  selected: TokenEntryType | null;
  onSelect: (token: TokenEntryType) => void;
};

/** Tall and fixed, so the list does not collapse as a query narrows it. */
const SNAP_POINTS = ['88%'];

/** The tickers listed first, in this order, when nothing is typed. */
const POPULAR = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'];

/** Rows rendered at once. The catalog runs to hundreds of entries. */
const VISIBLE_LIMIT = 60;

const lower = (value: string | undefined): string =>
  (value ?? '').toLowerCase();

/** The catalog entries that share a ticker, one row in the picker. */
type TickerGroup = { ticker: string; name: string; tokens: TokenEntryType[] };

function groupByTicker(tokens: TokenEntryType[]): TickerGroup[] {
  const groups = new Map<string, TickerGroup>();
  for (const token of tokens) {
    const ticker = (token.ticker || token.symbol || '').toUpperCase();
    const group = groups.get(ticker);
    if (group) {
      group.tokens.push(token);
    } else {
      groups.set(ticker, { ticker, name: token.name ?? '', tokens: [token] });
    }
  }
  return [...groups.values()];
}

/**
 * The asset picker. One row per ticker; a ticker on several networks opens a
 * second step that names them, since sending on the wrong network loses the
 * funds. Search matches ticker, name and network, the closest match first.
 */
const AssetPickerSheet = forwardRef<BottomSheetModal, AssetPickerSheetProps>(
  ({ tokens, selected, onSelect }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const { colors } = useTheme();
    const [query, setQuery] = useState<string>('');
    const [networksOf, setNetworksOf] = useState<TickerGroup | null>(null);

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const groups = useMemo(() => groupByTicker(tokens), [tokens]);

    const matches = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) {
        const popular = POPULAR.map(t =>
          groups.find(g => g.ticker === t),
        ).filter((g): g is TickerGroup => !!g);
        const rest = groups
          .filter(g => !POPULAR.includes(g.ticker))
          .sort((a, b) => a.ticker.localeCompare(b.ticker));
        return { popular, rest: rest.slice(0, VISIBLE_LIMIT) };
      }
      const rank = (g: TickerGroup): number => {
        const ticker = g.ticker.toLowerCase();
        if (ticker === q) {
          return 0;
        }
        if (ticker.startsWith(q)) {
          return 1;
        }
        if (g.tokens.some(t => lower(t.chain) === q)) {
          return 2;
        }
        if (lower(g.name).startsWith(q)) {
          return 3;
        }
        return 4;
      };
      const hit = (g: TickerGroup): boolean =>
        g.ticker.toLowerCase().includes(q) ||
        lower(g.name).includes(q) ||
        g.tokens.some(t => lower(t.chain).includes(q));
      return {
        popular: [],
        rest: groups
          .filter(hit)
          .sort((a, b) => rank(a) - rank(b))
          .slice(0, VISIBLE_LIMIT),
      };
    }, [groups, query]);

    const pick = (token: TokenEntryType) => {
      onSelect(token);
      setNetworksOf(null);
      setQuery('');
      dismiss();
    };

    const row = (group: TickerGroup) => {
      const multi = group.tokens.length > 1;
      const isSelected =
        !multi && group.tokens[0].identifier === selected?.identifier;
      return (
        <ListRow
          key={group.ticker}
          testID={`swap.asset.${group.ticker}`}
          leading={
            <TokenLogo
              token={group.tokens[0]}
              size={32}
              surfaceColor={colors.bgSurface}
              forceBadge={!multi}
            />
          }
          title={group.ticker}
          subtitle={group.name}
          trailing={
            multi ? (
              <Text variant="bodySmall" tone="muted">
                {`${group.tokens.length} ${translate('swap.assets-networks') as string}`}
              </Text>
            ) : isSelected ? (
              <CheckIcon size={17} color={colors.fgAccent} />
            ) : undefined
          }
          chevron={multi}
          onPress={() => (multi ? setNetworksOf(group) : pick(group.tokens[0]))}
        />
      );
    };

    const header = (
      <SheetTitle
        title={
          networksOf
            ? `${networksOf.ticker} · ${translate('swap.assets-network-title') as string}`
            : (translate('swap.assets-title') as string)
        }
        onClose={dismiss}
        closeLabel={translate('swap.close') as string}
        onBack={networksOf ? () => setNetworksOf(null) : undefined}
        backLabel={translate('swap.assets-all') as string}
      />
    );

    return (
      <AppSheetModal
        ref={ref}
        header={header}
        snapPoints={SNAP_POINTS}
        onDismiss={() => {
          setNetworksOf(null);
          setQuery('');
        }}
      >
        {networksOf ? (
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingHorizontal: space16,
              paddingBottom: 30,
            }}
          >
            <Banner
              tone="warning"
              title={`${networksOf.ticker} ${translate('swap.assets-network-warning') as string}`}
            />
            <View style={{ height: space12 }} />
            {networksOf.tokens.map(token => (
              <ListRow
                key={token.identifier}
                testID={`swap.network.${token.chain}`}
                leading={
                  <TokenLogo
                    token={token}
                    size={32}
                    surfaceColor={colors.bgSurface}
                    forceBadge
                  />
                }
                title={chainDisplayName(token.chain) || token.chain}
                trailing={
                  token.identifier === selected?.identifier ? (
                    <CheckIcon size={17} color={colors.fgAccent} />
                  ) : undefined
                }
                onPress={() => pick(token)}
              />
            ))}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: space16,
              paddingBottom: 30,
            }}
          >
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={translate('swap.assets-search') as string}
              testID="swap.asset-search"
            />
            {matches.popular.length > 0 && (
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: space12, marginBottom: space8 }}
              >
                {translate('swap.assets-popular') as string}
              </Text>
            )}
            {matches.popular.map(row)}
            {matches.popular.length > 0 && matches.rest.length > 0 && (
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: space16, marginBottom: space8 }}
              >
                {translate('swap.assets-more') as string}
              </Text>
            )}
            {matches.rest.map(row)}
            {matches.popular.length === 0 && matches.rest.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Text variant="body" tone="muted">
                  {`${translate('swap.assets-empty') as string} “${query.trim()}”`}
                </Text>
                <Text
                  variant="bodySmall"
                  tone="muted"
                  style={{ marginTop: space8 }}
                >
                  {translate('swap.assets-empty-hint') as string}
                </Text>
              </View>
            )}
          </BottomSheetScrollView>
        )}
      </AppSheetModal>
    );
  },
);

export default AssetPickerSheet;
