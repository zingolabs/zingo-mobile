/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faRefresh,
} from '@fortawesome/free-solid-svg-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  ScreenEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';

import { ContextAppLoaded } from '../../../app/context';
import { RPCValueTransferStatusEnum } from '../../../app/rpc/enums/RPCValueTransferStatusEnum';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import Stake from '../../../assets/icons/stake-blue.svg';
import Unstake from '../../../assets/icons/unstake-yellow.svg';

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  nextLineWithSameTxid: boolean;
  //setMessagesAddressModalShow: (vt: ValueTransferType) => void;
  addressProtected?: boolean;
  screenName: ScreenEnum;
  registerSwipeable: (r: Swipeable) => void;
  closeAllSwipeables: () => void;
  closeOtherSwipeables: () => void;
};
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  closeAllSwipeables,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, privacy, info } = context;
  const { colors } = useTheme() as ThemeType;

  //const [messagesAddress, setMessagesAddress] = useState<boolean>(false);

  //const dimensions = {
  //  width: Dimensions.get('window').width,
  //  height: Dimensions.get('window').height,
  //};
  //const maxWidthHit = useRef<boolean>(false);

  const amountColor = Utils.valueTransferKindColor(colors.text, vt);

  const icon =
    vt.kind === ValueTransferKindEnum.Received ||
    vt.kind === ValueTransferKindEnum.Shield ||
    vt.kind === ValueTransferKindEnum.WithdrawBond
      ? faArrowDown
      : faArrowUp;

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  return (
    <View
      testID={`vt-${index + 1}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginHorizontal: 10,
      }}
    >
      {month !== '' && (
        <View
          style={{
            marginTop: 20,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            paddingVertical: 10,
            paddingHorizontal: 25,
            backgroundColor: '#78788029',
          }}
        >
          <RegText>Activity</RegText>
          <FadeText>Transactions</FadeText>
        </View>
      )}
      <TouchableOpacity
        style={{
          zIndex: 999,
          backgroundColor: colors.secondary,
          paddingHorizontal: 5,
        }}
        onPress={async () => {
          closeAllSwipeables();
          await new Promise(r => requestAnimationFrame(r));
          setValueTransferDetailModalShow(index, vt);
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginTop: 10,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#333333',
            borderStyle: 'solid',
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ display: 'flex', marginHorizontal: 5 }}>
              {vt.confirmations >= 0 &&
              vt.confirmations < GlobalConst.minConfirmations ? (
                <FontAwesomeIcon
                  style={{ transform: [{ rotate: '45deg' }] }}
                  size={20}
                  icon={faRefresh}
                  color={amountColor}
                />
              ) : (
                <>
                  {vt.kind === ValueTransferKindEnum.CreateBond ? (
                    <Stake width={20} height={20} />
                  ) : vt.kind === ValueTransferKindEnum.BeginUnbond ||
                    vt.kind === ValueTransferKindEnum.RetargetDelegationBond ? (
                    <Unstake width={20} height={20} />
                  ) : (
                    <FontAwesomeIcon
                      style={{ transform: [{ rotate: '45deg' }] }}
                      size={20}
                      icon={icon}
                      color={amountColor}
                    />
                  )}
                </>
              )}
            </View>
            <View style={{ display: 'flex' }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <FadeText
                  style={{
                    opacity: 1,
                    fontWeight: 'bold',
                    color: '#d3d3d3ff',
                    fontSize: 18,
                  }}
                >
                  {Utils.valueTransferKindText(translate, vt)}
                </FadeText>

                {!!vt.address && (
                  <View>
                    <RegText>{`to: ${Utils.trimToSmall(vt.address, 8)}`}</RegText>
                  </View>
                )}

                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <FadeText>2026</FadeText>
                  {vt.confirmations === 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FadeText
                        style={{
                          color:
                            vt.status ===
                              RPCValueTransferStatusEnum.transmitted ||
                            vt.status ===
                              RPCValueTransferStatusEnum.calculated ||
                            vt.status === RPCValueTransferStatusEnum.mempool ||
                            vt.status === RPCValueTransferStatusEnum.failed
                              ? colors.primary
                              : colors.primaryDisabled,
                          fontSize: 12,
                          opacity: 1,
                          fontWeight: '700',
                          textAlign: 'left',
                          marginLeft: 10,
                        }}
                      >
                        {translate(`history.${vt.status}`) as string}
                      </FadeText>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <ZecAmount
              style={{
                flexGrow: 1,
                alignSelf: 'auto',
                justifyContent: 'flex-end',
                paddingRight: 5,
              }}
              size={18}
              currencyName={info.currencyName}
              color={amountColor}
              amtZec={
                vt.kind === ValueTransferKindEnum.Received ||
                vt.kind === ValueTransferKindEnum.Shield ||
                vt.kind === ValueTransferKindEnum.WithdrawBond
                  ? vt.amount
                  : Number(
                        Utils.splitZecAmountIntoBigSmall(vt.amount).bigPart,
                      ) === 0
                    ? vt.amount
                    : vt.amount * -1
              }
              privacy={privacy}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ValueTransferLine);
