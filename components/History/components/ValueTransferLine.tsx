/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { IconDefinition, faArrowDown, faArrowUp, faRefresh, faComment } from '@fortawesome/free-solid-svg-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { ValueTransferType, ValueTransferKindEnum, GlobalConst } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetail: (t: ValueTransferType) => void;
  setValueTransferDetailIndex: (i: number) => void;
  setValueTransferDetailModalShowing: (b: boolean) => void;
  nextLineWithSameTxid: boolean;
};
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetail,
  setValueTransferDetailIndex,
  setValueTransferDetailModalShowing,
  nextLineWithSameTxid,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, privacy, info } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [amountColor, setAmountColor] = useState<string>(colors.primaryDisabled);
  const [vtIcon, setVtIcon] = useState<IconDefinition>(faRefresh);
  const [haveMemo, setHaveMemo] = useState<boolean>(false);

  useEffect(() => {
    const amountCo =
      vt.confirmations === 0
        ? colors.primaryDisabled
        : vt.kind === ValueTransferKindEnum.Received || vt.kind === ValueTransferKindEnum.Shield
        ? colors.primary
        : colors.text;

    setAmountColor(amountCo);
  }, [colors.primary, colors.primaryDisabled, colors.text, vt.confirmations, vt.kind]);

  useEffect(() => {
    const txIc =
      vt.confirmations === 0
        ? faRefresh
        : vt.kind === ValueTransferKindEnum.Received || vt.kind === ValueTransferKindEnum.Shield
        ? faArrowDown
        : faArrowUp;
    setVtIcon(txIc);
  }, [vt.confirmations, vt.kind]);

  useEffect(() => {
    // if have any memo
    const memos: string[] = vt.memos ? vt.memos.filter(m => !!m) : [];
    setHaveMemo(memos.length > 0);
  }, [vt.memos]);

  console.log('render ValueTransferLine - 5', index);

  return (
    <View testID={`vt-${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      {month !== '' && (
        <View
          style={{
            paddingLeft: 15,
            paddingTop: 5,
            paddingBottom: 5,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.card,
            backgroundColor: colors.background,
          }}>
          <FadeText>{month}</FadeText>
        </View>
      )}
      <TouchableOpacity
        onPress={() => {
          setValueTransferDetail(vt);
          setValueTransferDetailIndex(index);
          setValueTransferDetailModalShowing(true);
        }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 15,
            paddingBottom: 10,
            borderBottomWidth: nextLineWithSameTxid ? (Platform.OS === GlobalConst.platformOSandroid ? 1 : 0.5) : 1.5,
            borderBottomColor: nextLineWithSameTxid ? colors.primaryDisabled : colors.border,
            borderStyle: nextLineWithSameTxid
              ? Platform.OS === GlobalConst.platformOSandroid
                ? 'dotted'
                : 'solid'
              : 'solid',
          }}>
          <View style={{ display: 'flex' }}>
            <FontAwesomeIcon
              style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
              size={30}
              icon={vtIcon}
              color={amountColor}
            />
          </View>
          <View style={{ display: 'flex' }}>
            {!!vt.address && (
              <View>
                <AddressItem address={vt.address} oneLine={true} closeModal={() => {}} openModal={() => {}} />
              </View>
            )}
            <View
              style={{
                display: 'flex',
                flexDirection: vt.kind === ValueTransferKindEnum.Sent ? 'row' : 'column',
                alignItems: vt.kind === ValueTransferKindEnum.Sent ? 'center' : 'flex-start',
              }}>
              <FadeText
                style={{
                  opacity: 1,
                  fontWeight: 'bold',
                  color: amountColor,
                  fontSize: vt.confirmations === 0 ? 14 : 18,
                }}>
                {vt.kind === ValueTransferKindEnum.Sent && vt.confirmations === 0
                  ? (translate('history.sending') as string)
                  : vt.kind === ValueTransferKindEnum.Sent && vt.confirmations > 0
                  ? (translate('history.sent') as string)
                  : vt.kind === ValueTransferKindEnum.Received && vt.confirmations === 0
                  ? (translate('history.receiving') as string)
                  : vt.kind === ValueTransferKindEnum.Received && vt.confirmations > 0
                  ? (translate('history.received') as string)
                  : vt.kind === ValueTransferKindEnum.MemoToSelf && vt.confirmations === 0
                  ? (translate('history.sendingtoself') as string)
                  : vt.kind === ValueTransferKindEnum.MemoToSelf && vt.confirmations > 0
                  ? (translate('history.memotoself') as string)
                  : vt.kind === ValueTransferKindEnum.SendToSelf && vt.confirmations === 0
                  ? (translate('history.sendingtoself') as string)
                  : vt.kind === ValueTransferKindEnum.SendToSelf && vt.confirmations > 0
                  ? (translate('history.sendtoself') as string)
                  : vt.kind === ValueTransferKindEnum.Shield && vt.confirmations === 0
                  ? (translate('history.shielding') as string)
                  : vt.kind === ValueTransferKindEnum.Shield && vt.confirmations > 0
                  ? (translate('history.shield') as string)
                  : ''}
              </FadeText>
              {vt.confirmations === 0 && (
                <FadeText style={{ color: colors.syncing, fontSize: 12, opacity: 1, fontWeight: '900' }}>
                  {('[ ' + translate('history.not-confirmed') + ' ]') as string}
                </FadeText>
              )}
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <FadeText>{vt.time ? moment((vt.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
                {haveMemo && (
                  <FontAwesomeIcon
                    style={{ marginLeft: 10 }}
                    size={15}
                    icon={faComment}
                    color={colors.primaryDisabled}
                  />
                )}
              </View>
            </View>
          </View>
          <ZecAmount
            style={{ flexGrow: 1, alignSelf: 'auto', justifyContent: 'flex-end', paddingRight: 5 }}
            size={18}
            currencyName={info.currencyName}
            color={amountColor}
            amtZec={vt.amount}
            privacy={privacy}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ValueTransferLine);
