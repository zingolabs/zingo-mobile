/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';

import ZecAmount from '../Components/ZecAmount';
import BoldText from '../Components/BoldText';
import DetailLine from '../Components/DetailLine';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import FadeText from '../Components/FadeText';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { useMagicModal } from 'react-native-magic-modal';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';

type PoolsProps = {
  setPrivacyOption: (value: boolean) => Promise<void>;
};

const Pools: React.FunctionComponent<PoolsProps> = ({ setPrivacyOption }) => {
  const context = useContext(ContextAppLoaded);
  const { totalBalance, info, translate, privacy, addLastSnackbar, somePending, language, shieldingAmount, snackbars, removeFirstSnackbar, orchardPool, saplingPool, transparentPool } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);
  const { clear } = useToast();

  console.log('render pools. Balance:', totalBalance, orchardPool, saplingPool, transparentPool);

  return (
    <ToastProvider>
      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          translate={translate}
        />

        <Header
          title={translate('pools.title') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          closeScreen={() => {
            clear();
            hide();
          }}
        />
        <ScrollView
          style={{ maxHeight: '90%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            {totalBalance && (
              <>
                {!orchardPool && !saplingPool && !transparentPool && (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
                )}
                {orchardPool && (
                  <>
                    <BoldText>{translate('pools.orchard-title') as string}</BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine label={translate('pools.orchard-balance') as string}>
                        <ZecAmount
                          testID="orchard-total-balance"
                          amtZec={totalBalance.orchardBal}
                          size={18}
                          currencyName={info.currencyName}
                          style={{
                            opacity:
                              totalBalance.spendableOrchard > 0 &&
                              totalBalance.spendableOrchard === totalBalance.orchardBal
                                ? 1
                                : 0.5,
                          }}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine label={translate('pools.orchard-spendable-balance') as string}>
                        <ZecAmount
                          testID="orchard-spendable-balance"
                          amtZec={totalBalance.spendableOrchard}
                          size={18}
                          currencyName={info.currencyName}
                          color={
                            totalBalance.spendableOrchard > 0 && totalBalance.spendableOrchard === totalBalance.orchardBal
                              ? colors.primary
                              : 'red'
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }}
                    />
                  </>
                )}

                {saplingPool && (
                  <>
                    <BoldText>{translate('pools.sapling-title') as string}</BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine label={translate('pools.sapling-balance') as string}>
                        <ZecAmount
                          testID="sapling-total-balance"
                          amtZec={totalBalance.privateBal}
                          size={18}
                          currencyName={info.currencyName}
                          style={{
                            opacity:
                              totalBalance.spendablePrivate > 0 &&
                              totalBalance.spendablePrivate === totalBalance.privateBal
                                ? 1
                                : 0.5,
                          }}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine label={translate('pools.sapling-spendable-balance') as string}>
                        <ZecAmount
                          testID="sapling-spendable-balance"
                          amtZec={totalBalance.spendablePrivate}
                          size={18}
                          currencyName={info.currencyName}
                          color={
                            totalBalance.spendablePrivate > 0 && totalBalance.spendablePrivate === totalBalance.privateBal
                              ? colors.syncing
                              : 'red'
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }}
                    />
                  </>
                )}

                {transparentPool && (
                  <>
                    <BoldText>{translate('pools.transparent-title') as string}</BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine label={translate('pools.transparent-balance') as string}>
                        <ZecAmount
                          testID="transparent-balance"
                          amtZec={totalBalance.transparentBal}
                          size={18}
                          currencyName={info.currencyName}
                          color={'red'}
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>
                  </>
                )}

                {transparentPool && totalBalance.transparentBal > 0 && shieldingAmount === 0 && (
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      marginTop: 5,
                      backgroundColor: colors.card,
                      padding: 5,
                      borderRadius: 10,
                    }}>
                    <FontAwesomeIcon icon={faInfoCircle} size={20} color={colors.primary} style={{ marginRight: 5 }} />
                    <FadeText>{translate('pools.dust') as string}</FadeText>
                  </View>
                )}

                {somePending && (
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      marginTop: 5,
                      backgroundColor: colors.card,
                      padding: 5,
                      borderRadius: 10,
                    }}>
                    <FontAwesomeIcon icon={faInfoCircle} size={20} color={colors.primary} style={{ marginRight: 5 }} />
                    <FadeText>{translate('send.somefunds') as string}</FadeText>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </ToastProvider>
  );
};

export default Pools;
