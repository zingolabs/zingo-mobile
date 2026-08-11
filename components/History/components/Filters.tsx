/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../app/theme';

import { ButtonTypeEnum, FilterEnum } from '../../../app/AppState';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../../ui/primitives/Button';
import FadeText from '../../../ui/primitives/FadeText';

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
      <View style={{ display: 'flex', flexDirection: 'column', margin: 10 }}>
        <ScrollView
          contentContainerStyle={{
            width: '100%',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              width: '90%',
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 10,
              alignItems: 'center',
              justifyContent: 'flex-start',
              rowGap: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setFilterKindLocal(
                  filterKindLocal === FilterEnum.sent ? null : FilterEnum.sent,
                );
              }}
            >
              <View
                style={{
                  backgroundColor:
                    filterKindLocal === FilterEnum.sent
                      ? colors.bgAccent
                      : colors.bgChrome,
                  borderRadius: 15,
                  borderColor:
                    filterKindLocal === FilterEnum.sent
                      ? colors.borderAccent
                      : colors.borderMuted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color:
                      filterKindLocal === FilterEnum.sent
                        ? colors.bgChrome
                        : colors.fgMuted,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('history.sent') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFilterKindLocal(
                  filterKindLocal === FilterEnum.received
                    ? null
                    : FilterEnum.received,
                );
              }}
            >
              <View
                style={{
                  backgroundColor:
                    filterKindLocal === FilterEnum.received
                      ? colors.bgAccent
                      : colors.bgChrome,
                  borderRadius: 15,
                  borderColor:
                    filterKindLocal === FilterEnum.received
                      ? colors.borderAccent
                      : colors.borderMuted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color:
                      filterKindLocal === FilterEnum.received
                        ? colors.bgChrome
                        : colors.fgMuted,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('history.received') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFilterKindLocal(
                  filterKindLocal === FilterEnum.shielded
                    ? null
                    : FilterEnum.shielded,
                );
              }}
            >
              <View
                style={{
                  backgroundColor:
                    filterKindLocal === FilterEnum.shielded
                      ? colors.bgAccent
                      : colors.bgChrome,
                  borderRadius: 15,
                  borderColor:
                    filterKindLocal === FilterEnum.shielded
                      ? colors.borderAccent
                      : colors.borderMuted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color:
                      filterKindLocal === FilterEnum.shielded
                        ? colors.bgChrome
                        : colors.fgMuted,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('history.shield') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFilterFailedLocal(!filterFailedLocal);
              }}
            >
              <View
                style={{
                  backgroundColor: filterFailedLocal
                    ? colors.bgAccent
                    : colors.bgChrome,
                  borderRadius: 15,
                  borderColor: filterFailedLocal
                    ? colors.borderAccent
                    : colors.borderMuted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color: filterFailedLocal
                      ? colors.bgChrome
                      : colors.fgMuted,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('history.failed') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFilterMemosLocal(!filterMemosLocal);
              }}
            >
              <View
                style={{
                  backgroundColor: filterMemosLocal
                    ? colors.bgAccent
                    : colors.bgChrome,
                  borderRadius: 15,
                  borderColor: filterMemosLocal ? colors.borderAccent : colors.borderMuted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color: filterMemosLocal
                      ? colors.bgChrome
                      : colors.fgMuted,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('history.memo') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFilterWithFundsLocal(!filterWithFundsLocal);
              }}
            >
              <View
                style={{
                  backgroundColor: filterWithFundsLocal
                    ? colors.bgAccent
                    : colors.bgChrome,
                  borderRadius: 15,
                  borderColor: filterWithFundsLocal
                    ? colors.borderAccent
                    : colors.borderMuted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <FadeText
                  style={{
                    color: filterWithFundsLocal
                      ? colors.bgChrome
                      : colors.fgMuted,
                    fontWeight: 'bold',
                  }}
                >
                  {translate('history.filter-withfunds') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
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
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('clear') as string}
            onPress={() => {
              setFilterWithFunds(false);
              setFilterKind(null);
              setFilterFailed(false);
              setFilterMemos(false);
              clearLocal();
              closeSheet();
            }}
            twoButtons={true}
          />
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('save') as string}
            style={{ marginLeft: 10 }}
            onPress={() => {
              setFilterWithFunds(filterWithFundsLocal);
              setFilterKind(filterKindLocal);
              setFilterFailed(filterFailedLocal);
              setFilterMemos(filterMemosLocal);
              clearLocal();
              closeSheet();
            }}
            twoButtons={true}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(Filters);
