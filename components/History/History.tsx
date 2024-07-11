/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Modal, RefreshControl } from 'react-native';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme } from '@react-navigation/native';

import { ButtonTypeEnum, SendPageStateClass, ValueTransferType } from '../../app/AppState';
import { ThemeType } from '../../app/types';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import ValueTransferDetail from './components/ValueTransferDetail';
import ValueTransferLine from './components/ValueTransferLine';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';

type HistoryProps = {
  doRefresh: () => void;
  toggleMenuDrawer: () => void;
  poolsMoreInfoOnClick: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
  setComputingModalVisible: (visible: boolean) => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
  //setPoolsToShieldSelectSapling: (v: boolean) => void;
  //setPoolsToShieldSelectTransparent: (v: boolean) => void;
  setUfvkViewModalVisible?: (v: boolean) => void;
  setSendPageState: (s: SendPageStateClass) => void;
  setShieldingAmount: (value: number) => void;
};

const History: React.FunctionComponent<HistoryProps> = ({
  doRefresh,
  toggleMenuDrawer,
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  setZecPrice,
  setComputingModalVisible,
  setPrivacyOption,
  //setPoolsToShieldSelectSapling,
  //setPoolsToShieldSelectTransparent,
  setUfvkViewModalVisible,
  setSendPageState,
  setShieldingAmount,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, valueTransfers, language, setBackgroundError, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [isValueTransferDetailModalShowing, setValueTransferDetailModalShowing] = useState<boolean>(false);
  const [valueTransferDetail, setValueTransferDetail] = useState<ValueTransferType>({} as ValueTransferType);
  const [valueTransferDetailIndex, setValueTransferDetailIndex] = useState<number>(-1);
  const [numVt, setNumVt] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(numVt < (valueTransfers.length || 0));
  const [valueTransfersSorted, setValueTransfersSorted] = useState<ValueTransferType[]>([]);

  var lastMonth = '';

  const fetchValueTransfersSorted = useMemo(() => {
    // we need to sort the array properly.
    // by:
    // - time
    // - txid
    // - address
    // - pool
    return valueTransfers
      .sort((a, b) => {
        const timeComparison = b.time - a.time;
        if (timeComparison === 0) {
          // same time
          const txidComparison = a.txid.localeCompare(b.txid);
          if (txidComparison === 0) {
            // same txid
            const addressComparison = a.address.localeCompare(b.address);
            if (addressComparison === 0) {
              // same address
              const aPoolType = a.poolType?.toString() || '';
              const bPoolType = b.poolType?.toString() || '';
              // last one sort criteria - poolType.
              return aPoolType.localeCompare(bPoolType);
            } else {
              // different address
              return addressComparison;
            }
          } else {
            // different txid
            return txidComparison;
          }
        } else {
          // different time
          return timeComparison;
        }
      })
      .slice(0, numVt);
  }, [valueTransfers, numVt]);

  useEffect(() => {
    setLoadMoreButton(numVt < (valueTransfers.length || 0));
    setValueTransfersSorted(fetchValueTransfersSorted);
  }, [fetchValueTransfersSorted, numVt, valueTransfers]);

  const loadMoreClicked = useCallback(() => {
    setNumVt(numVt + 50);
  }, [numVt]);

  const moveValueTransferDetail = (index: number, type: number) => {
    // -1 -> Previous ValueTransfer
    //  1 -> Next ValueTransfer
    if ((index > 0 && type === -1) || (index < valueTransfersSorted.length - 1 && type === 1)) {
      setValueTransferDetail(valueTransfersSorted[index + type]);
      setValueTransferDetailIndex(index + type);
    }
  };

  //console.log('render History - 4');

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('history.title-acc') as string}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isValueTransferDetailModalShowing}
        onRequestClose={() => setValueTransferDetailModalShowing(false)}>
        <ValueTransferDetail
          index={valueTransferDetailIndex}
          length={valueTransfersSorted.length}
          vt={valueTransferDetail}
          closeModal={() => setValueTransferDetailModalShowing(false)}
          openModal={() => setValueTransferDetailModalShowing(true)}
          setPrivacyOption={setPrivacyOption}
          setSendPageState={setSendPageState}
          moveValueTransferDetail={moveValueTransferDetail}
        />
      </Modal>

      <Header
        testID="ValueTransfer text"
        poolsMoreInfoOnClick={poolsMoreInfoOnClick}
        syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
        toggleMenuDrawer={toggleMenuDrawer}
        setZecPrice={setZecPrice}
        title={translate('history.title') as string}
        setComputingModalVisible={setComputingModalVisible}
        setBackgroundError={setBackgroundError}
        setPrivacyOption={setPrivacyOption}
        //setPoolsToShieldSelectSapling={setPoolsToShieldSelectSapling}
        //setPoolsToShieldSelectTransparent={setPoolsToShieldSelectTransparent}
        setUfvkViewModalVisible={setUfvkViewModalVisible}
        addLastSnackbar={addLastSnackbar}
        setShieldingAmount={setShieldingAmount}
      />

      <ScrollView
        accessible={true}
        accessibilityLabel={translate('history.list-acc') as string}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={doRefresh}
            tintColor={colors.text}
            title={translate('history.refreshing') as string}
          />
        }
        style={{ flexGrow: 1, marginTop: 10, width: '100%' }}>
        {valueTransfersSorted.flatMap((vt, index) => {
          let txmonth = vt.time ? moment(vt.time * 1000).format('MMM YYYY') : '--- ----';

          var month = '';
          if (txmonth !== lastMonth) {
            month = txmonth;
            lastMonth = txmonth;
          }

          return (
            <ValueTransferLine
              index={index}
              key={`${index}-${vt.txid}-${vt.kind}`}
              vt={vt}
              month={month}
              setValueTransferDetail={(ttt: ValueTransferType) => setValueTransferDetail(ttt)}
              setValueTransferDetailIndex={(iii: number) => setValueTransferDetailIndex(iii)}
              setValueTransferDetailModalShowing={(bbb: boolean) => setValueTransferDetailModalShowing(bbb)}
            />
          );
        })}
        {loadMoreButton ? (
          <View
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginTop: 10,
              marginBottom: 30,
            }}>
            <Button
              type={ButtonTypeEnum.Secondary}
              title={translate('history.loadmore') as string}
              onPress={loadMoreClicked}
            />
          </View>
        ) : (
          <>
            {!!valueTransfers && !!valueTransfers.length && (
              <View
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginTop: 10,
                  marginBottom: 30,
                }}>
                <FadeText style={{ color: colors.primary }}>{translate('history.end') as string}</FadeText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default React.memo(History);
