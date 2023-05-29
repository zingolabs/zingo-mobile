/* eslint-disable react-native/no-inline-styles */
import {
  faBars,
  faCheck,
  faInfoCircle,
  faPlay,
  faStop,
  faCloudDownload,
  faLockOpen,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '@react-navigation/native';
import React, { useContext } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { DimensionsType, NetInfoType, TranslateType } from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import CurrencyAmount from '../Components/CurrencyAmount';
import PriceFetcher from '../Components/PriceFetcher';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import { NetInfoStateType } from '@react-native-community/netinfo';
import Button from '../Components/Button';
import RPC from '../../app/rpc';
import { RPCShieldType } from '../../app/rpc/types/RPCShieldType';
import { createAlert } from '../../app/createAlert';

type HeaderProps = {
  poolsMoreInfoOnClick?: () => void;
  syncingStatusMoreInfoOnClick?: () => void;
  toggleMenuDrawer?: () => void;
  setZecPrice?: (p: number, d: number) => void;
  title: string;
  noBalance?: boolean;
  noSyncingStatus?: boolean;
  noDrawMenu?: boolean;
  testID?: string;
  translate?: (key: string) => TranslateType;
  dimensions?: DimensionsType;
  netInfo?: NetInfoType;
  setComputingModalVisible?: (visible: boolean) => void;
  setBackgroundError?: (title: string, error: string) => void;
  noPrivacy?: boolean;
  set_privacy_option?: (
    name: 'server' | 'currency' | 'language' | 'sendAll' | 'privacy',
    value: boolean,
  ) => Promise<void>;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  poolsMoreInfoOnClick,
  syncingStatusMoreInfoOnClick,
  toggleMenuDrawer,
  setZecPrice,
  title,
  noBalance,
  noSyncingStatus,
  noDrawMenu,
  testID,
  translate: translateProp,
  dimensions: dimensionsProp,
  netInfo: netInfoProp,
  setComputingModalVisible,
  setBackgroundError,
  noPrivacy,
  set_privacy_option,
}) => {
  const context = useContext(ContextAppLoaded);
  const { totalBalance, info, syncingStatus, currency, zecPrice, privacy } = context;
  let translate: (key: string) => TranslateType, dimensions, netInfo;
  if (translateProp) {
    translate = translateProp;
  } else {
    translate = context.translate;
  }
  if (dimensionsProp) {
    dimensions = dimensionsProp;
  } else {
    dimensions = context.dimensions;
  }
  if (netInfoProp) {
    netInfo = netInfoProp;
  } else {
    netInfo = context.netInfo;
  }

  const { colors } = useTheme() as unknown as ThemeType;

  const balanceColor = colors.text;

  const showShieldButton = totalBalance && totalBalance.transparentBal > 0;

  const shieldFunds = async () => {
    if (!setComputingModalVisible || !setBackgroundError) {
      return;
    }

    setComputingModalVisible(true);
    // We need to activate this flag because if the App is syncing
    // while shielding, then it going to finish the current batch
    // and after that it run the shield process.
    await RPC.rpc_setInterruptSyncAfterBatch('true');

    const shieldStr = await RPC.rpc_shieldTransparent();

    if (shieldStr) {
      if (shieldStr.toLowerCase().startsWith('error')) {
        createAlert(
          setBackgroundError,
          translate('history.shieldfunds') as string,
          `${translate('history.shield-error')} ${shieldStr}`,
          true,
        );
      } else {
        const shieldJSON: RPCShieldType = await JSON.parse(shieldStr);

        if (shieldJSON.error) {
          createAlert(
            setBackgroundError,
            translate('history.shieldfunds') as string,
            `${translate('history.shield-error')} ${shieldJSON.error}`,
            true,
          );
        } else {
          createAlert(
            setBackgroundError,
            translate('history.shieldfunds') as string,
            `${translate('history.shield-message')} ${shieldJSON.txid}`,
            true,
          );
        }
      }
      setComputingModalVisible(false);
      await RPC.rpc_setInterruptSyncAfterBatch('false');
    }
  };

  console.log('render header', title, privacy);

  return (
    <View
      testID="header"
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingBottom: 0,
        backgroundColor: colors.card,
        zIndex: -1,
        paddingTop: 10,
      }}>
      <Image
        source={require('../../assets/img/logobig-zingo.png')}
        style={{ width: 80, height: 80, resizeMode: 'contain' }}
      />
      {noBalance && <View style={{ height: 20 }} />}
      {!noBalance && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
          }}>
          <ZecAmount
            currencyName={info.currencyName}
            color={balanceColor}
            size={36}
            amtZec={totalBalance.total}
            privacy={privacy}
          />
          {totalBalance.total > 0 && (totalBalance.privateBal > 0 || totalBalance.transparentBal > 0) && (
            <TouchableOpacity onPress={() => poolsMoreInfoOnClick && poolsMoreInfoOnClick()}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  margin: 0,
                  marginLeft: 5,
                  padding: 0,
                  minWidth: 25,
                  minHeight: 25,
                }}>
                <FontAwesomeIcon icon={faInfoCircle} size={25} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {currency === 'USD' && !noBalance && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CurrencyAmount
            style={{ marginTop: 0, marginBottom: 5 }}
            price={zecPrice.zecPrice}
            amtZec={totalBalance.total}
            currency={currency}
            privacy={privacy}
          />
          <View style={{ marginLeft: 5 }}>
            <PriceFetcher setZecPrice={setZecPrice} />
          </View>
        </View>
      )}

      {showShieldButton && setComputingModalVisible && (
        <View style={{ margin: 5 }}>
          <Button type="Primary" title={translate('history.shieldfunds') as string} onPress={shieldFunds} />
        </View>
      )}

      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginVertical: 5,
        }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
          <RegText testID={testID} color={colors.money} style={{ paddingHorizontal: 5 }}>
            {title}
          </RegText>
        </View>
        {!noSyncingStatus && (
          <>
            {netInfo.isConnected && (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  marginRight: 5,
                  padding: 1,
                  borderColor: colors.primary,
                  borderWidth: 1,
                  borderRadius: 10,
                  minWidth: 25,
                  minHeight: 25,
                }}>
                {!syncingStatus.inProgress && syncingStatus.synced && (
                  <View style={{ margin: 0, padding: 0 }}>
                    <FontAwesomeIcon icon={faCheck} color={colors.primary} size={20} />
                  </View>
                )}
                {!syncingStatus.inProgress && !syncingStatus.synced && (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                    <FontAwesomeIcon icon={faStop} color={colors.zingo} size={17} />
                  </TouchableOpacity>
                )}
                {syncingStatus.inProgress && (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                    <FontAwesomeIcon icon={faPlay} color={colors.primary} size={17} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {(!netInfo.isConnected || netInfo.type === NetInfoStateType.cellular || netInfo.isConnectionExpensive) && (
              <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick && syncingStatusMoreInfoOnClick()}>
                <FontAwesomeIcon icon={faCloudDownload} color={!netInfo.isConnected ? 'red' : 'yellow'} size={20} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {!noDrawMenu && (
        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', left: 0 }}>
          <TouchableOpacity
            testID="header.drawmenu"
            accessible={true}
            accessibilityLabel={translate('menudrawer-acc') as string}
            onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ padding: 15, position: 'absolute', right: 0, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 8, color: colors.border }}>{translate('version') as string}</Text>
        {__DEV__ && !!dimensions && (
          <Text style={{ fontSize: 8, color: colors.border }}>
            {'(' + dimensions.width + 'x' + dimensions.height + ')-' + dimensions.scale}
          </Text>
        )}
        {!noPrivacy && set_privacy_option && (
          <TouchableOpacity onPress={() => set_privacy_option('privacy', !privacy)}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 15,
              }}>
              <Text style={{ fontSize: 13, color: colors.border }}>{'Privacy: '}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: privacy ? 2 : 1,
                  borderColor: privacy ? colors.primary : colors.primaryDisabled,
                  borderRadius: 5,
                  paddingHorizontal: 5,
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.border,
                    marginRight: 5,
                  }}>
                  {privacy ? 'HIGH' : 'Normal'}
                </Text>
                {privacy ? (
                  <FontAwesomeIcon icon={faLock} size={14} color={colors.primary} />
                ) : (
                  <FontAwesomeIcon icon={faLockOpen} size={14} color={colors.primaryDisabled} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
    </View>
  );
};

export default Header;
