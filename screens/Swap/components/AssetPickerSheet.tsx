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
import { ChainLogo } from '@ui/widgets/ChainSelect';
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

/** Network badges stacked on a coin that lives on several. */
const BADGES = 4;

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

const networkName = (token: TokenEntryType): string =>
  chainDisplayName(token.chain) || token.chain;

/**
 * The asset picker. One row per ticker; a coin on several networks shows
 * their badges and opens them in the same sheet, since sending on the wrong
 * network loses the funds. Search finds coins by ticker and name, and lists
 * apart the coins that live on a network matching it.
 */
const AssetPickerSheet = forwardRef<BottomSheetModal, AssetPickerSheetProps>(
  ({ tokens, selected, onSelect }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const { colors } = useTheme();
    const t = (key: string) => translate(key) as string;
    const [query, setQuery] = useState<string>('');
    const [networksOf, setNetworksOf] = useState<TickerGroup | null>(null);

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const groups = useMemo(() => groupByTicker(tokens), [tokens]);

    const matches = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) {
        const popular = POPULAR.map(ticker =>
          groups.find(g => g.ticker === ticker),
        ).filter((g): g is TickerGroup => !!g);
        const rest = groups
          .filter(g => !POPULAR.includes(g.ticker))
          .sort((a, b) => a.ticker.localeCompare(b.ticker));
        return { popular, rest: rest.slice(0, VISIBLE_LIMIT), onNetwork: [] };
      }
      const rank = (g: TickerGroup): number => {
        const ticker = g.ticker.toLowerCase();
        if (ticker === q) {
          return 0;
        }
        if (ticker.startsWith(q)) {
          return 1;
        }
        if (lower(g.name).startsWith(q)) {
          return 2;
        }
        return 3;
      };
      const direct = groups
        .filter(
          g => g.ticker.toLowerCase().includes(q) || lower(g.name).includes(q),
        )
        .sort((a, b) => rank(a) - rank(b));
      const onNetwork = groups
        .filter(g => !direct.includes(g))
        .flatMap(g =>
          g.tokens.filter(
            token =>
              (lower(token.chain).includes(q) ||
                lower(networkName(token)).includes(q)) &&
              (g.tokens.length > 1 || token.chain !== token.symbol),
          ),
        );
      return {
        popular: [],
        rest: direct.slice(0, VISIBLE_LIMIT),
        onNetwork: onNetwork.slice(0, VISIBLE_LIMIT),
      };
    }, [groups, query]);

    const pick = (token: TokenEntryType) => {
      onSelect(token);
      setNetworksOf(null);
      setQuery('');
      dismiss();
    };

    const check = <CheckIcon size={18} color={colors.fgAccent} />;

    const badgeStack = (group: TickerGroup) => (
      <View style={{ flexDirection: 'row' }}>
        {group.tokens.slice(0, BADGES).map((token, index) => (
          <View
            key={token.identifier}
            style={{
              marginLeft: index === 0 ? 0 : -5,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: colors.bgSurface,
            }}
          >
            <ChainLogo chain={token.chain} size={14} />
          </View>
        ))}
      </View>
    );

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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: 6,
                }}
              >
                {badgeStack(group)}
                <Text variant="caption" tone="muted">
                  {t('swap.assets-networks').replace(
                    '{n}',
                    String(group.tokens.length),
                  )}
                </Text>
              </View>
            ) : isSelected ? (
              check
            ) : undefined
          }
          chevron={multi}
          onPress={() => (multi ? setNetworksOf(group) : pick(group.tokens[0]))}
        />
      );
    };

    const networkRow = (token: TokenEntryType) => (
      <ListRow
        key={token.identifier}
        testID={`swap.asset.${token.identifier}`}
        leading={
          <TokenLogo
            token={token}
            size={32}
            surfaceColor={colors.bgSurface}
            forceBadge
          />
        }
        title={(token.ticker || token.symbol || '').toUpperCase()}
        subtitle={t('swap.asset-on')
          .replace('{asset}', token.name ?? token.ticker ?? '')
          .replace('{network}', networkName(token))}
        trailing={token.identifier === selected?.identifier ? check : undefined}
        onPress={() => pick(token)}
      />
    );

    const groupLabel = (text: string, first: boolean) => (
      <Text
        variant="caption"
        tone="muted"
        style={{
          fontWeight: '700',
          marginTop: first ? space12 : space16,
          marginBottom: space8,
        }}
      >
        {text}
      </Text>
    );

    const header = (
      <SheetTitle
        title={
          networksOf
            ? t('swap.assets-network-title').replace(
                '{coin}',
                networksOf.ticker,
              )
            : t('swap.assets-title')
        }
        onClose={dismiss}
        closeLabel={t('swap.close')}
        onBack={networksOf ? () => setNetworksOf(null) : undefined}
        backLabel={t('swap.assets-all')}
      />
    );

    const nothing =
      matches.popular.length === 0 &&
      matches.rest.length === 0 &&
      matches.onNetwork.length === 0;

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
              title={t('swap.assets-network-warning').replace(
                '{coin}',
                networksOf.ticker,
              )}
            />
            <View style={{ height: space12 }} />
            {networksOf.tokens.map(token => (
              <ListRow
                key={token.identifier}
                testID={`swap.network.${token.chain}`}
                leading={<ChainLogo chain={token.chain} size={32} />}
                title={networkName(token)}
                trailing={
                  token.identifier === selected?.identifier ? check : undefined
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
              placeholder={t('swap.assets-search')}
              testID="swap.asset-search"
            />
            {matches.popular.length > 0 &&
              groupLabel(t('swap.assets-popular'), true)}
            {matches.popular.map(row)}
            {matches.popular.length > 0 &&
              matches.rest.length > 0 &&
              groupLabel(t('swap.assets-more'), false)}
            {matches.popular.length === 0 && matches.rest.length > 0 && (
              <View style={{ height: space12 }} />
            )}
            {matches.rest.map(row)}
            {matches.onNetwork.length > 0 &&
              groupLabel(
                t('swap.assets-on-network'),
                matches.rest.length === 0,
              )}
            {matches.onNetwork.map(networkRow)}
            {nothing && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Text variant="body" tone="muted">
                  {t('swap.assets-empty').replace('{query}', query.trim())}
                </Text>
                <Text
                  variant="bodySmall"
                  tone="muted"
                  style={{ marginTop: space8 }}
                >
                  {t('swap.assets-empty-hint')}
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
