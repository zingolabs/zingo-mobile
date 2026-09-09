/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  TextInputEndEditingEventData,
  NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { GlobalConst, TranslateType } from '@app/AppState';
import Utils from '@app/utils';
import FadeText from '@ui/primitives/FadeText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';

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
  const { colors } = useTheme();

  const inputRef = useRef<TextInput>(null);

  // Local draft — initialised from `initialMemo` (parent passes the latest
  // value each time the sheet is presented). The X close discards the draft,
  // the Save button commits it via setMemoText.
  const [memo, setMemo] = useState<string>(initialMemo);

  // The sheet is opened while the user is mid-typing in the inline memo field
  // (keyboard already up). Focus this field on mount so the keyboard stays and
  // the caret moves here — the user keeps writing without interruption. The
  // parent remounts Memo on every present (via `key`), so this fires each open.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

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
        backgroundColor: colors.bgSurface,
      }}
    >
      <View
        accessible={true}
        accessibilityLabel={translate('send.memo-acc') as string}
        style={{
          flexGrow: 1,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: colors.borderMuted,
          minWidth: 48,
          minHeight: 48,
          maxHeight: Dimensions.get('window').height * 0.4,
          flexDirection: 'row',
        }}
      >
        <TextInput
          ref={inputRef}
          testID="send.memo-field"
          multiline
          placeholder={translate('send.memo-placeholder') as string}
          placeholderTextColor={colors.fgMuted}
          style={{
            flex: 1,
            color: colors.fgDefault,
            fontWeight: '600',
            fontSize: 15,
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
              color={colors.fgAccentDisabled}
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
            color: memoDisabled ? 'red' : colors.fgDefault,
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
