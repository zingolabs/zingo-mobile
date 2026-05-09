/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ButtonTypeEnum, FilterEnum } from '../../../app/AppState';
import RegText from '../../Components/RegText';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import FadeText from '../../Components/FadeText';

type FiltersProps = {
  closeSheet: () => void;
  setHeightLayout: (h: number) => void;
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
  setHeightLayout,
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
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 80);
      }}
      style={{
        backgroundColor: colors.background,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          clearLocal();
          setTimeout(() => {
            closeSheet();
          }, 100);
        }}
      >
        <FontAwesomeIcon
          size={30}
          icon={faXmark}
          color={colors.text}
          style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <RegText
        style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}
      >
        {translate('history.filters') as string}
      </RegText>
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
                      ? colors.primary
                      : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor:
                    filterKindLocal === FilterEnum.sent
                      ? colors.primary
                      : colors.muted,
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
                        ? colors.sideMenuBackground
                        : colors.muted,
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
                      ? colors.primary
                      : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor:
                    filterKindLocal === FilterEnum.received
                      ? colors.primary
                      : colors.muted,
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
                        ? colors.sideMenuBackground
                        : colors.muted,
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
                      ? colors.primary
                      : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor:
                    filterKindLocal === FilterEnum.shielded
                      ? colors.primary
                      : colors.muted,
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
                        ? colors.sideMenuBackground
                        : colors.muted,
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
                    ? colors.primary
                    : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor: filterFailedLocal
                    ? colors.primary
                    : colors.muted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color: filterFailedLocal
                      ? colors.sideMenuBackground
                      : colors.muted,
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
                    ? colors.primary
                    : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor: filterMemosLocal ? colors.primary : colors.muted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginRight: 10,
                }}
              >
                <FadeText
                  style={{
                    color: filterMemosLocal
                      ? colors.sideMenuBackground
                      : colors.muted,
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
                    ? colors.primary
                    : colors.sideMenuBackground,
                  borderRadius: 15,
                  borderColor: filterWithFundsLocal
                    ? colors.primary
                    : colors.muted,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <FadeText
                  style={{
                    color: filterWithFundsLocal
                      ? colors.sideMenuBackground
                      : colors.muted,
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
