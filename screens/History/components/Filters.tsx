/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { space8 } from '@app/theme';

import { FilterEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Button from '@ui/primitives/Button';
import Chip from '@ui/primitives/Chip';
import Text from '@ui/primitives/Text';

/** One kind of transfer at a time, as the redesign's filters sheet offers. */
export type HistoryFilter =
  'all' | 'received' | 'sent' | 'shielded' | 'failed' | 'memo' | 'swaps';

/** The kinds in the order the sheet lists them, with their label keys. */
export const HISTORY_FILTERS: ReadonlyArray<[HistoryFilter, string]> = [
  ['all', 'history.filter-all'],
  ['received', 'history.received'],
  ['sent', 'history.sent'],
  ['shielded', 'history.shield'],
  ['failed', 'history.failed'],
  ['memo', 'history.filter-memo'],
  ['swaps', 'history.filter-swaps'],
];

/** The one filter the History state holds, read back from its flags. */
export function filterOf(
  kind: FilterEnum | null,
  failed: boolean,
  memos: boolean,
): HistoryFilter {
  if (failed) {
    return 'failed';
  }
  if (memos) {
    return 'memo';
  }
  switch (kind) {
    case FilterEnum.received:
      return 'received';
    case FilterEnum.sent:
      return 'sent';
    case FilterEnum.shielded:
      return 'shielded';
    case FilterEnum.swaps:
      return 'swaps';
    default:
      return 'all';
  }
}

type FiltersProps = {
  closeSheet: () => void;
  filterKind: FilterEnum | null;
  setFilterKind: (f: FilterEnum | null) => void;
  filterFailed: boolean;
  setFilterFailed: (f: boolean) => void;
  filterMemos: boolean;
  setFilterMemos: (f: boolean) => void;
  filterWithFunds: boolean;
  setFilterWithFunds: (f: boolean) => void;
};

/**
 * The filters sheet: one chip per kind of transfer, one picked at a time,
 * and nothing changes until Apply.
 */
const Filters: React.FunctionComponent<FiltersProps> = ({
  closeSheet,
  filterKind,
  setFilterKind,
  filterFailed,
  setFilterFailed,
  filterMemos,
  setFilterMemos,
  setFilterWithFunds,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const t = (key: string) => (translate(key) as string).trim();
  const [picked, setPicked] = useState<HistoryFilter>(
    filterOf(filterKind, filterFailed, filterMemos),
  );

  const apply = () => {
    setFilterWithFunds(false);
    setFilterFailed(picked === 'failed');
    setFilterMemos(picked === 'memo');
    setFilterKind(
      picked === 'received'
        ? FilterEnum.received
        : picked === 'sent'
          ? FilterEnum.sent
          : picked === 'shielded'
            ? FilterEnum.shielded
            : picked === 'swaps'
              ? FilterEnum.swaps
              : null,
    );
    closeSheet();
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('history.filter-sub')}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: space8,
          marginTop: 16,
        }}
      >
        {HISTORY_FILTERS.map(([key, label]) => (
          <Chip
            key={key}
            testID={`history.filter.${key}`}
            selected={picked === key}
            onPress={() => setPicked(key)}
          >
            {t(label)}
          </Chip>
        ))}
      </View>
      <View style={{ marginTop: 20, rowGap: 8 }}>
        <Button
          testID="history.filter.apply"
          variant="primary"
          title={t('history.filter-apply')}
          onPress={apply}
        />
        <Button variant="quiet" title={t('cancel')} onPress={closeSheet} />
      </View>
    </View>
  );
};

export default React.memo(Filters);
