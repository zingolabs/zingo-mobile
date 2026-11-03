/* eslint-disable react-native/no-inline-styles */
import React, {
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  space12,
  space16,
  space8,
  useTheme,
  iconSizeMd,
  radiusSm,
  space20,
} from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import type { TokenEntryType } from '@app/swap';
import AppSheetModal, {
  SheetFlatList,
  SheetScrollView,
} from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import SearchField from '@ui/widgets/SearchField';
import Banner from '@ui/widgets/Banner';
import RadioRow, { RadioList, RadioListSlice } from '@ui/widgets/RadioRow';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';
import { ChainLogo } from '@ui/widgets/ChainSelect';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { formatInteger } from '@app/utils/formatAmount';
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

/** What the picker lists for `query`, every coin and every match. */
export function assetMatches(
  tokens: TokenEntryType[],
  query: string,
): {
  popular: TickerGroup[];
  rest: TickerGroup[];
  onNetwork: TokenEntryType[];
} {
  const groups = groupByTicker(tokens);
  const q = query.trim().toLowerCase();
  if (!q) {
    const popular = POPULAR.map(ticker =>
      groups.find(g => g.ticker === ticker),
    ).filter((g): g is TickerGroup => !!g);
    const rest = groups
      .filter(g => !POPULAR.includes(g.ticker))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
    return { popular, rest, onNetwork: [] };
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
  return { popular: [], rest: direct, onNetwork };
}

/** A line of the virtualized list. */
type PickerItem =
  | { kind: 'label'; key: string; first: boolean }
  | { kind: 'gap' }
  | { kind: 'coin'; group: TickerGroup; first: boolean; last: boolean }
  | { kind: 'network'; token: TokenEntryType; first: boolean; last: boolean }
  | { kind: 'nothing' };

const itemKey = (item: PickerItem): string => {
  switch (item.kind) {
    case 'label':
      return item.key;
    case 'coin':
      return item.group.ticker;
    case 'network':
      return item.token.identifier;
    default:
      return item.kind;
  }
};

function pickerItems({
  popular,
  rest,
  onNetwork,
}: ReturnType<typeof assetMatches>): PickerItem[] {
  const coins = (list: TickerGroup[]): PickerItem[] =>
    list.map((group, index) => ({
      kind: 'coin',
      group,
      first: index === 0,
      last: index === list.length - 1,
    }));
  const items: PickerItem[] = [];
  if (popular.length > 0) {
    items.push(
      { kind: 'label', key: 'swap.assets-popular', first: true },
      ...coins(popular),
    );
  }
  if (rest.length > 0) {
    items.push(
      popular.length > 0
        ? { kind: 'label', key: 'swap.assets-more', first: false }
        : { kind: 'gap' },
      ...coins(rest),
    );
  }
  if (onNetwork.length > 0) {
    items.push(
      {
        kind: 'label',
        key: 'swap.assets-on-network',
        first: rest.length === 0,
      },
      ...onNetwork.map((token, index): PickerItem => ({
        kind: 'network',
        token,
        first: index === 0,
        last: index === onNetwork.length - 1,
      })),
    );
  }
  return items.length > 0 ? items : [{ kind: 'nothing' }];
}

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

    const items = useMemo(
      () => pickerItems(assetMatches(tokens, query)),
      [tokens, query],
    );

    const pick = (token: TokenEntryType) => {
      onSelect(token);
      setNetworksOf(null);
      setQuery('');
      dismiss();
    };

    const badgeStack = (group: TickerGroup) => (
      <View style={{ flexDirection: 'row' }}>
        {group.tokens.slice(0, BADGES).map((token, index) => (
          <View
            key={token.identifier}
            style={{
              marginLeft: index === 0 ? 0 : -5,
              borderRadius: radiusSm,
              borderWidth: 2,
              borderColor: colors.bgSurface,
            }}
          >
            <ChainLogo chain={token.chain} size={14} />
          </View>
        ))}
      </View>
    );

    const row = (group: TickerGroup, first: boolean) => {
      const multi = group.tokens.length > 1;
      const isSelected = group.tokens.some(
        token => token.identifier === selected?.identifier,
      );
      return (
        <RadioRow
          testID={`swap.asset.${group.ticker}`}
          first={first}
          selected={isSelected}
          leading={
            <TokenLogo
              token={group.tokens[0]}
              size={32}
              surfaceColor={colors.bgSurface}
              forceBadge={!multi}
              hideBadge={multi}
            />
          }
          title={group.ticker}
          sub={group.name}
          aside={
            multi ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: space8,
                }}
              >
                {badgeStack(group)}
                <Text variant="caption" tone="muted">
                  {t('swap.assets-networks').replace(
                    '{n}',
                    formatInteger(group.tokens.length),
                  )}
                </Text>
                <ChevronRight size={iconSizeMd} color={colors.fgMuted} />
              </View>
            ) : undefined
          }
          onPress={() => (multi ? setNetworksOf(group) : pick(group.tokens[0]))}
        />
      );
    };

    const networkRow = (token: TokenEntryType, first: boolean) => (
      <RadioRow
        testID={`swap.asset.${token.identifier}`}
        first={first}
        selected={token.identifier === selected?.identifier}
        leading={
          <TokenLogo
            token={token}
            size={32}
            surfaceColor={colors.bgSurface}
            forceBadge
          />
        }
        title={(token.ticker || token.symbol || '').toUpperCase()}
        sub={t('swap.asset-on')
          .replace('{asset}', token.name ?? token.ticker ?? '')
          .replace('{network}', networkName(token))}
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

    const renderItem = ({ item }: { item: PickerItem }) => {
      switch (item.kind) {
        case 'label':
          return groupLabel(t(item.key), item.first);
        case 'gap':
          return <View style={{ height: space12 }} />;
        case 'coin':
          return (
            <RadioListSlice first={item.first} last={item.last}>
              {row(item.group, item.first)}
            </RadioListSlice>
          );
        case 'network':
          return (
            <RadioListSlice first={item.first} last={item.last}>
              {networkRow(item.token, item.first)}
            </RadioListSlice>
          );
        case 'nothing':
          return (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text variant="body" tone="muted">
                {t('swap.assets-empty').replace('{query}', query.trim())}
              </Text>
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: space8 }}
              >
                {t('swap.assets-empty-hint')}
              </Text>
            </View>
          );
      }
    };

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
          <SheetScrollView
            contentContainerStyle={{
              paddingHorizontal: space20,
              paddingTop: space8,
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
            <RadioList>
              {networksOf.tokens.map((token, index) => (
                <RadioRow
                  key={token.identifier}
                  testID={`swap.network.${token.chain}`}
                  first={index === 0}
                  leading={<ChainLogo chain={token.chain} size={32} />}
                  title={networkName(token)}
                  selected={token.identifier === selected?.identifier}
                  onPress={() => pick(token)}
                />
              ))}
            </RadioList>
          </SheetScrollView>
        ) : (
          <SheetFlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={itemKey}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: space20,
              paddingTop: space8,
            }}
            ListHeaderComponent={
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={t('swap.assets-search')}
                testID="swap.asset-search"
              />
            }
          />
        )}
      </AppSheetModal>
    );
  },
);

export default AssetPickerSheet;
