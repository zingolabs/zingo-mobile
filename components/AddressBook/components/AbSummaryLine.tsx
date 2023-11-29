/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAddressCard, faQrcode, faTrashCan, faPencil } from '@fortawesome/free-solid-svg-icons';
//import { TouchableOpacity } from 'react-native-gesture-handler';

import FadeText from '../../Components/FadeText';
import { AddressBookFileClass } from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
//import { ContextAppLoaded } from '../../../app/context';

type AbSummaryLineProps = {
  index: number;
  item: AddressBookFileClass;
  setCurrentItem: (b: number) => void;
  setAction: (action: 'Add' | 'Modify' | 'Delete') => void;
};
const AbSummaryLine: React.FunctionComponent<AbSummaryLineProps> = ({ index, item, setCurrentItem, setAction }) => {
  //const context = useContext(ContextAppLoaded);
  //const { translate, privacy, info } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  const displayAddress = item.address ? Utils.trimToSmall(item.address, 7) : 'Unknown';

  console.log('render Ab SummaryLine - 5', index);

  return (
    <View testID={`addressBookList.${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <TouchableOpacity
        onPress={() => {
          setCurrentItem(index);
          setAction('Modify');
        }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            marginTop: 15,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <FontAwesomeIcon style={{ marginHorizontal: 10 }} size={24} icon={faAddressCard} color={colors.zingo} />
              <FadeText style={{ fontSize: 18, marginHorizontal: 10, color: colors.primary }}>{item.label}</FadeText>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <FontAwesomeIcon style={{ marginHorizontal: 10 }} size={24} icon={faQrcode} color={colors.zingo} />
              <FadeText style={{ fontSize: 18, marginHorizontal: 10 }}>{displayAddress}</FadeText>
            </View>
          </View>
          <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesomeIcon style={{}} size={20} icon={faPencil} color={colors.primary} />
          </View>
          <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ zIndex: 999 }}
              onPress={() => {
                setCurrentItem(index);
                setAction('Delete');
              }}>
              <FontAwesomeIcon style={{ opacity: 0.8 }} size={20} icon={faTrashCan} color={'red'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(AbSummaryLine);
