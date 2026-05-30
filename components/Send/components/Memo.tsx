/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  TextInputEndEditingEventData,
  NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  ButtonTypeEnum,
  GlobalConst,
  TranslateType,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import FadeText from '../../Components/FadeText';
import Button from '../../Components/Button';

type MemoProps = {
  closeSheet: () => void;
  initialMemo: string;
  includeUAMemoBoolean: boolean;
  defaultUnifiedAddress: string;
  setMemoText: (m: string) => void;
  translate: (key: string) => TranslateType;
};

const Memo: React.FunctionComponent<MemoProps> = ({
  closeSheet,
  initialMemo,
  includeUAMemoBoolean,
  defaultUnifiedAddress,
  setMemoText,
  translate,
}) => {
  const { colors } = useTheme() as ThemeType;

  // Local draft — initialised from `initialMemo` (parent passes the latest
  // value each time the sheet is presented). The X close discards the draft,
  // the Save button commits it via setMemoText.
  const [memo, setMemo] = useState<string>(initialMemo);

  const memoDisabled =
    Utils.countMemoBytes(memo, includeUAMemoBoolean, defaultUnifiedAddress) >
    GlobalConst.memoMaxLength;

  const doSave = useCallback(() => {
    setMemoText(memo);
    Keyboard.dismiss();
    closeSheet();
  }, [memo, setMemoText, closeSheet]);

  return (
    <View
      style={{
        backgroundColor: colors.bottomSheetBackground,
      }}
    >
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
          maxHeight: Dimensions.get('window').height * 0.4,
          flexDirection: 'row',
        }}
      >
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
          onEndEditing={(
            e: NativeSyntheticEvent<TextInputEndEditingEventData>,
          ) => setMemo(e.nativeEvent.text)}
          maxLength={GlobalConst.memoMaxLength}
        />
        {memo ? (
          <TouchableOpacity onPress={() => setMemo('')}>
            <FontAwesomeIcon
              style={{ margin: 10 }}
              size={20}
              icon={faXmark}
              color={colors.primaryDisabled}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 5,
        }}
      >
        <FadeText
          style={{
            marginTop: 0,
            fontWeight: 'bold',
            color: memoDisabled ? 'red' : colors.text,
            opacity: 1,
          }}
        >{`${Utils.countMemoBytes(memo, includeUAMemoBoolean, defaultUnifiedAddress)} `}</FadeText>
        <FadeText style={{ marginTop: 0 }}>
          {translate('loadedapp.of') as string}
        </FadeText>
        <FadeText style={{ marginTop: 0 }}>
          {' ' + GlobalConst.memoMaxLength.toString() + ' '}
        </FadeText>
      </View>
      <View style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
            marginTop: 15,
          }}
        >
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('save') as string}
            onPress={doSave}
            disabled={memoDisabled}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(Memo);
