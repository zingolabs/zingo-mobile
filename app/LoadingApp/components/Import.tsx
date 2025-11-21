/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';

import { useTheme } from '@react-navigation/native';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import FadeText from '../../../components/Components/FadeText';
import RegText from '../../../components/Components/RegText';
import Button from '../../../components/Components/Button';
import { ThemeType } from '../../types';
import { ContextAppLoading } from '../../context';
import { ButtonTypeEnum, ScreenEnum, SelectServerEnum } from '../../AppState';
import Snackbars from '../../../components/Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ImportProps = {
  actionButtonsDisabled: boolean;
  onClickCancel: () => void;
  onClickOK: (keyText: string, birthday: number) => void;
};
const Import: React.FunctionComponent<ImportProps> = ({ actionButtonsDisabled, onClickCancel, onClickOK }) => {
  const context = useContext(ContextAppLoading);
  const { translate, netInfo, addLastSnackbar, selectIndexerServer, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Import;

  const [seedText, setSeedText] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);
  const [kbOpen, setKbOpen] = React.useState(false);
  const [seedTextVisible, setSeedTextVisible] = useState<boolean>(true);

  const SEED_LENGTH = 24;

  const [words, setWords] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  const insets = useSafeAreaInsets();

  const maxW = 520; //tablets -> landscape. 

  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  useEffect(() => {
    const seedTextArray: string[] = seedText
      .replaceAll('\n', ' ')
      .trimStart()
      .replaceAll('  ', ' ')
      .split(' ')
      .filter((w: string) => !!w);

    const _seedText: string = seedText
      .replaceAll('\n', ' ')
      .trimStart()
      .replaceAll('  ', ' ');

    let _words: string[] = [];

    //console.log(seedTextArray);
    // if the seed have 25 -> means it is a copy/paste from the stored seed in the device.
    if (seedTextArray.length === 25) {
      // if the last word is a number -> move it to the birthday field
      const lastWord: string = seedTextArray[seedTextArray.length - 1];
      const possibleBirthday: number | null = isNaN(Number(lastWord)) ? null : Number(lastWord);
      if ((possibleBirthday && !birthday) || (possibleBirthday && possibleBirthday === Number(birthday))) {
        setBirthday(possibleBirthday.toString());
        setSeedTextVisible(false);
        setSeedText(seedTextArray.slice(0, 24).join(' '));
      } else {
        setSeedText(_seedText);
      }
      _words = seedTextArray.slice(0, 24);
      setWords(seedTextArray.slice(0, 24));
      setButtonDisabled(false);
    } else if (seedTextArray.length > 0) {
      if (seedTextArray.length === 24) {
        setSeedTextVisible(false);
        setTimeout(() => {
          inputsRef.current[23]?.focus();
        }, 50);
      } else {
        setSeedTextVisible(true);
      }
      const lengthWords: number = seedTextArray.length > 25 ? 24 : seedTextArray.length;
      setSeedText(_seedText);
      _words = seedTextArray.slice(0, lengthWords);
      setWords(seedTextArray.slice(0, lengthWords));
      if (lengthWords === 24) {
        setButtonDisabled(false);
      } else {
        setButtonDisabled(true);
      }
    } else {
      setButtonDisabled(true);
    }
    if (_words.length > 0) {
      const _rows: string[][] = [];
      for (let i = 0; i < SEED_LENGTH; i += 3) {
        _rows.push(_words.slice(i, i + 3));
      }
      setRows(_rows);
    }
    // only if seed changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedText]);

  const okButton = async () => {
    if (!netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, screenName: [screenName] });
      return;
    }
    onClickOK(words.join(' '), Number(birthday));
    Keyboard.dismiss();
  };

  const handleWordChange = (index: number, text: string) => {
    if (text.includes(' ') || text.includes('\n')) {
      setSeedText(text);
      return;
    }

    setWords(prev => {
      const next = [...prev];
      next[index] = text.toLowerCase().trim();
      setSeedText(next.join(' '));
      return next;
    });
  };


  console.log('Render Import', words, buttonDisabled, rows, seedText);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{ 
          flex: 1, 
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0}
      >

        <View style={{
          position: 'absolute',
          width: 75,
          top: 10,
          left: 10,
          zIndex: 999,
        }}>
          <View
            style={{
              borderRadius: 25,
              borderColor: colors.text,
              borderWidth: 1,
              padding: 10,
              margin: 10,
              backgroundColor: colors.background,
            }}>
              <TouchableOpacity onPress={() => {
                clear();
                onClickCancel();
              }}>
                <FontAwesomeIcon
                  size={30}
                  icon={faChevronLeft}
                  color={colors.text}
                />
              </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}>
          <View
            style={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              
            <RegText color={colors.text} style={{ fontSize: 25 }}>Import wallet</RegText>

            <FadeText style={{ marginBottom: 20, marginTop: 5 }}>texto</FadeText>

            {seedTextVisible && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 25,
                  marginBottom: 10,
                  backgroundColor: colors.secondary,
                  width: '100%',
                  maxWidth: maxW,
                  minWidth: '50%',
                  minHeight: 48,
                  alignItems: 'center',
                  paddingHorizontal: 25,
                  paddingVertical: 7,
                }}>
                <TextInput
                  placeholder='Paste your seed phrase (24 words)'
                  placeholderTextColor={colors.placeholder}
                  testID="import.seedufvkinput"
                  multiline
                  style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    color: colors.text,
                    fontWeight: '600',
                    fontSize: 16,
                    minHeight: 100,
                    marginHorizontal: 5,
                    backgroundColor: 'transparent',
                    textAlignVertical: 'top',
                  }}
                  value={seedText}
                  onChangeText={setSeedText}
                  editable={!actionButtonsDisabled}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                {!!seedText && (
                  <TouchableOpacity 
                    disabled={actionButtonsDisabled} 
                    onPress={() => {
                      setSeedText('');
                      setWords([]);
                      setRows([]);
                  }}>
                    <View 
                      style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.zingo,
                        borderRadius: 11,
                        height: 22,
                        width: 22,
                        padding: 0,
                    }}>
                      <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {rows.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map((word, colIndex) => {
                      const index = rowIndex * 3 + colIndex;
                      return (
                        <View
                          key={index}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            borderColor: colors.border,
                            borderWidth: 1,
                            borderRadius: 25,
                            marginBottom: 10,
                            backgroundColor: colors.secondary,
                            width: '30%',
                            maxWidth: maxW,
                            minWidth: '30%',
                            minHeight: 48,
                            alignItems: 'center',
                            paddingHorizontal: 15,
                            paddingVertical: 2,
                          }}>
                          <FadeText>{`${index + 1}`}.</FadeText>
                          <TextInput
                            ref={(el: TextInput | null) => {
                              inputsRef.current[index] = el;
                            }}
                            style={{
                              flexGrow: 1,
                              flexShrink: 1,
                              color: colors.text,
                              fontWeight: '600',
                              fontSize: 15,
                              minHeight: 48,
                              marginLeft: 5,
                              backgroundColor: 'transparent',
                            }}
                            value={word}
                            onChangeText={(txt) => handleWordChange(index, txt)}
                            editable={!actionButtonsDisabled}
                            keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
                {!seedTextVisible && (
                  <TouchableOpacity 
                    style={{ alignSelf: 'flex-end' }}
                    disabled={actionButtonsDisabled} 
                    onPress={() => {
                      setSeedText('');
                      setWords([]);
                      setRows([]);
                      setSeedTextVisible(true);
                  }}>
                    <View 
                      style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '30%',
                        height: 30,
                        padding: 0,
                    }}>
                      <RegText style={{ color: colors.primary, textDecorationStyle: 'solid', textDecorationLine: 'underline' }}>Clear words</RegText>
                    </View>
                  </TouchableOpacity>
                ) }
              </View>
            )}

            <RegText color={colors.text} style={{ fontSize: 20, marginTop: 20, marginBottom: 10 }}>Birthday (Optional)</RegText>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 25,
                marginBottom: 10,
                backgroundColor: colors.secondary,
                width: '100%',
                maxWidth: maxW,
                minWidth: '50%',
                minHeight: 48,
                alignItems: 'center',
                paddingHorizontal: 25,
                paddingVertical: 7,
              }}>
              <TextInput
                placeholder={'0'}
                placeholderTextColor={colors.placeholder}
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 18,
                  minHeight: 48,
                  marginLeft: 5,
                  backgroundColor: 'transparent',
                }}
                value={birthday}
                onChangeText={(text) => {
                  setBirthday(text);
                }}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              {!!birthday && (
                <TouchableOpacity disabled={actionButtonsDisabled} onPress={() => setBirthday('')}>
                  <View 
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                      padding: 0,
                  }}>
                    <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
          }}>
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('continue') as string}
            disabled={actionButtonsDisabled || buttonDisabled}
            onPress={() => {
              clear();
              okButton();
              Keyboard.dismiss();
            }}
            style={{ 
              marginBottom: 4,
              maxWidth: maxW,
            }}
            twoButtons={false}
          />
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default Import;
