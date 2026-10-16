/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { AddressBookFileClass, GlobalConst } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import Utils from '@app/utils';
import BoldText from '@ui/primitives/BoldText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import RegText from '@ui/primitives/RegText';
import ChainSelect from '@ui/widgets/ChainSelect';

const NAME_MAX = 32;
const SHAKE_MS = 60;
const SAVE_OFF = 0.4;

type NewAddressTagProps = {
  /** One of this wallet's own addresses. */
  address: string;
  closeSheet: () => void;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
};

// Names one of the wallet's own addresses, in the same shape as the New
// contact sheet: the tag, the chain (Zcash) and the address it names.
const NewAddressTag: React.FunctionComponent<NewAddressTagProps> = ({
  address,
  closeSheet,
  setAddressBook,
}) => {
  const { translate, server } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  const ready = label.trim().length > 0;

  const save = async () => {
    if (!ready) {
      const step = (x: number) =>
        withTiming(x, {
          duration: SHAKE_MS,
          easing: ease.standard,
          reduceMotion: ReduceMotion.System,
        });
      shake.value = withSequence(step(-4), step(4), step(-4), step(0));
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    setAddressBook(
      await AddressBookFileImpl.writeAddressBookItem(
        label.trim(),
        address,
        Utils.generateColorList(1)[0],
        true,
        server.chainName,
        GlobalConst.zecSwapChain,
      ),
    );
    closeSheet();
  };

  const box = {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: colors.bottomSheetBorder,
    backgroundColor: colors.bgCanvas,
  };

  return (
    <View testID="addresstag.sheet" style={{ paddingHorizontal: 22 }}>
      <BoldText
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 15.5,
          lineHeight: 21,
        }}
      >
        {translate('addressbook.add-tag') as string}
      </BoldText>

      <View style={{ marginTop: 10 }}>
        <RegText>{translate('addressbook.tag') as string}</RegText>
        <View
          style={[
            box,
            {
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
              borderColor: focused
                ? colors.borderFocus
                : colors.bottomSheetBorder,
            },
          ]}
        >
          <TextInput
            testID="addresstag.label-field"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            value={label}
            onChangeText={setLabel}
            maxLength={NAME_MAX}
            placeholder={translate('addressbook.label-placeholder') as string}
            placeholderTextColor={colors.fgMuted}
            autoCorrect={false}
            style={{
              flex: 1,
              padding: 10,
              color: colors.fgDefault,
              fontWeight: '600',
              fontSize: 14,
              backgroundColor: 'transparent',
            }}
          />
          {!!label && (
            <TouchableOpacity onPress={() => setLabel('')}>
              <FontAwesomeIcon
                style={{ marginRight: 10 }}
                size={20}
                icon={faXmark}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <ChainSelect
          label={translate('addressbook.chain') as string}
          value={GlobalConst.zecSwapChain}
          options={[GlobalConst.zecSwapChain]}
          onChange={() => {}}
          translate={translate}
          disabled
        />
      </View>

      <View style={{ marginTop: 18 }}>
        <RegText>{translate('addressbook.address') as string}</RegText>
        <View style={[box, { padding: 10, minHeight: 58 }]}>
          <RegText
            testID="addresstag.address"
            style={{ fontWeight: '600', fontSize: 14 }}
          >
            {address}
          </RegText>
        </View>
      </View>

      <Animated.View style={shakeStyle}>
        <Button
          testID="addresstag.save"
          type={ButtonTypeEnum.Primary}
          title={translate('save') as string}
          disabled={saving}
          onPress={save}
          fullWidth
          style={{
            marginTop: 20,
            opacity: ready ? 1 : SAVE_OFF,
          }}
          textStyle={{ fontSize: 15 }}
        />
      </Animated.View>
      <Button
        testID="addresstag.cancel"
        type={ButtonTypeEnum.Link}
        title={translate('cancel') as string}
        onPress={() => {
          Keyboard.dismiss();
          closeSheet();
        }}
        fullWidth
        style={{ marginTop: 8 }}
      />
    </View>
  );
};

export default React.memo(NewAddressTag);
