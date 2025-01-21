/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  TextInput,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { ButtonTypeEnum, GlobalConst } from '../../app/AppState';
import FadeText from '../Components/FadeText';
import { Buffer } from 'buffer';

type MemoProps = {
  closeModal: () => void;
  memoUpdateToField: (memo: string | null) => void;
};
const Memo: React.FunctionComponent<MemoProps> = ({ closeModal, memoUpdateToField }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, sendPageState, language, uOrchardAddress } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [memo, setMemo] = useState<string>(sendPageState.toaddr.memo);

  const includeUAMemo = sendPageState.toaddr.includeUAMemo;

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const doSaveAndClose = () => {
    memoUpdateToField(memo);
    closeModal();
  };

  const memoTotal = useCallback(
    (memoStr: string, includeUAMemoBoo: boolean) => {
      return `${memoStr || ''}${includeUAMemoBoo ? GlobalConst.replyTo + uOrchardAddress : ''}`;
    },
    [uOrchardAddress],
  );

  const countMemoBytes = (memoStr: string, includeUAMemoBoo: boolean) => {
    const len = Buffer.byteLength(memoTotal(memoStr, includeUAMemoBoo), 'utf8');
    return len;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === GlobalConst.platformOSios ? 10 : 0}
      style={{ backgroundColor: colors.background }}>
      <SafeAreaView
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          height: '100%',
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('send.memo') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={closeModal}
        />
        <ScrollView
          style={{
            height: '80%',
            maxHeight: '80%',
            minHeight: '50%',
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            padding: 20,
          }}>
          <View
            accessible={true}
            accessibilityLabel={translate('send.memo-acc') as string}
            style={{
              flexGrow: 1,
              borderWidth: 1,
              borderRadius: 5,
              borderColor: colors.text,
              minWidth: 48,
              minHeight: 48,
              maxHeight: dimensions.height * 0.4,
              flexDirection: 'row',
            }}>
            <TextInput
              testID="send.memo-field"
              multiline
              style={{
                flex: 1,
                color: colors.text,
                fontWeight: '600',
                fontSize: 14,
                minWidth: 48,
                minHeight: 48,
                margin: 5,
                backgroundColor: 'transparent',
                textAlignVertical: 'top',
              }}
              value={memo}
              onChangeText={(text: string) => setMemo(text)}
              maxLength={GlobalConst.memoMaxLength}
            />
            {memo && (
              <TouchableOpacity
                onPress={() => {
                  setMemo('');
                }}>
                <FontAwesomeIcon style={{ margin: 10 }} size={25} icon={faXmark} color={colors.primaryDisabled} />
              </TouchableOpacity>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}>
            <FadeText
              style={{
                marginTop: 0,
                fontWeight: 'bold',
                color: countMemoBytes(memo, includeUAMemo) > GlobalConst.memoMaxLength ? 'red' : colors.text,
              }}>{`${countMemoBytes(memo, includeUAMemo)} `}</FadeText>
            <FadeText style={{ marginTop: 0 }}>{translate('loadedapp.of') as string}</FadeText>
            <FadeText style={{ marginTop: 0 }}>{' ' + GlobalConst.memoMaxLength.toString() + ' '}</FadeText>
          </View>
        </ScrollView>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 10,
          }}>
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('save') as string}
            onPress={doSaveAndClose}
            disabled={countMemoBytes(memo, includeUAMemo) > GlobalConst.memoMaxLength}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default Memo;
