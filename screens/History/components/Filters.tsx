/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme, space8 } from '@app/theme';

import { FilterEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Button from '@ui/primitives/Button';
import Chip from '@ui/primitives/Chip';
import ButtonStack from '@ui/primitives/ButtonStack';

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
const Filters: React.FunctionComponent<FiltersProps> = ({
  closeSheet,
  filterKind,
  setFilterKind,
  filterFailed,
  setFilterFailed,
  filterMemos,
  setFilterMemos,
  filterWithFunds,
  setFilterWithFunds,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme();

  const [filterWithFundsLocal, setFilterWithFundsLocal] =
    useState<boolean>(filterWithFunds);
  const [filterKindLocal, setFilterKindLocal] = useState<FilterEnum | null>(
    filterKind,
  );
  const [filterFailedLocal, setFilterFailedLocal] =
    useState<boolean>(filterFailed);
  const [filterMemosLocal, setFilterMemosLocal] =
    useState<boolean>(filterMemos);

  const clearLocal = () => {
    setFilterWithFundsLocal(false);
    setFilterKindLocal(null);
    setFilterFailedLocal(false);
    setFilterMemosLocal(false);
  };

  console.log('Filters render');

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginVertical: 10,
          marginHorizontal: 20,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            width: '100%',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 10,
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: space8,
            }}
          >
            <Chip
              selected={filterKindLocal === FilterEnum.sent}
              onPress={() => {
                setFilterKindLocal(
                  filterKindLocal === FilterEnum.sent ? null : FilterEnum.sent,
                );
              }}
            >
              {translate('history.sent') as string}
            </Chip>
            <Chip
              selected={filterKindLocal === FilterEnum.received}
              onPress={() => {
                setFilterKindLocal(
                  filterKindLocal === FilterEnum.received
                    ? null
                    : FilterEnum.received,
                );
              }}
            >
              {translate('history.received') as string}
            </Chip>
            <Chip
              selected={filterKindLocal === FilterEnum.shielded}
              onPress={() => {
                setFilterKindLocal(
                  filterKindLocal === FilterEnum.shielded
                    ? null
                    : FilterEnum.shielded,
                );
              }}
            >
              {translate('history.shield') as string}
            </Chip>
            <Chip
              selected={filterFailedLocal}
              onPress={() => {
                setFilterFailedLocal(!filterFailedLocal);
              }}
            >
              {translate('history.failed') as string}
            </Chip>
            <Chip
              selected={filterMemosLocal}
              onPress={() => {
                setFilterMemosLocal(!filterMemosLocal);
              }}
            >
              {translate('history.memo') as string}
            </Chip>
            <Chip
              selected={filterWithFundsLocal}
              onPress={() => {
                setFilterWithFundsLocal(!filterWithFundsLocal);
              }}
            >
              {translate('history.filter-withfunds') as string}
            </Chip>
          </View>
        </ScrollView>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
            marginTop: 30,
          }}
        >
          <ButtonStack>
            <Button
              variant="text"
              title={translate('clear') as string}
              onPress={() => {
                setFilterWithFunds(false);
                setFilterKind(null);
                setFilterFailed(false);
                setFilterMemos(false);
                clearLocal();
                closeSheet();
              }}
            />
            <Button
              variant="primary"
              title={translate('save') as string}
              onPress={() => {
                setFilterWithFunds(filterWithFundsLocal);
                setFilterKind(filterKindLocal);
                setFilterFailed(filterFailedLocal);
                setFilterMemos(filterMemosLocal);
                clearLocal();
                closeSheet();
              }}
            />
          </ButtonStack>
        </View>
      </View>
    </View>
  );
};

export default React.memo(Filters);
