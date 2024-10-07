/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import ZecAmount from '../Components/ZecAmount';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import DetailLine from '../Components/DetailLine';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import RPC from '../../app/rpc';
import Header from '../Header';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import FadeText from '../Components/FadeText';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { ButtonTypeEnum, CommandEnum, GlobalConst } from '../../app/AppState';
import RPCModule from '../../app/RPCModule';
import { RPCWalletKindType } from '../../app/rpc/types/RPCWalletKindType';

type PoolsProps = {
  closeModal: () => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
};

const Pools: React.FunctionComponent<PoolsProps> = ({ closeModal, setPrivacyOption }) => {
  const context = useContext(ContextAppLoaded);
  const { totalBalance, info, translate, privacy, addLastSnackbar, somePending, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [orchardPool, setOrchardPool] = useState<boolean>(true);
  const [saplingPool, setSaplingPool] = useState<boolean>(true);
  const [transparentPool, setTransparentPool] = useState<boolean>(true);
  moment.locale(language);

  useEffect(() => {
    (async () => {
      // because this screen is fired from more places than the menu.
      await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
      // checking the pools of this wallet
      const walletKindStr: string = await RPCModule.execute(CommandEnum.walletKind, '');
      try {
        const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
        console.log(walletKindJSON);
        setOrchardPool(walletKindJSON.orchard);
        setSaplingPool(walletKindJSON.sapling);
        setTransparentPool(walletKindJSON.transparent);
      } catch (e) {}
    })();
  }, []);

  //console.log('render pools. Balance:', totalBalance);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('pools.title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        setPrivacyOption={setPrivacyOption}
        addLastSnackbar={addLastSnackbar}
      />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          {totalBalance && (
            <>
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

      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button
          testID="fundpools.button.close"
          type={ButtonTypeEnum.Secondary}
          title={translate('close') as string}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default Pools;
