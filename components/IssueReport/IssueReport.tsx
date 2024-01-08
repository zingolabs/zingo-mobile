/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded, ContextAppLoading } from '../../app/context';
import Header from '../Header';
import { TranslateType } from '../../app/AppState';
import SettingsFileImpl from '../Settings/SettingsFileImpl';

type IssueReportProps = {
  from: 'LoadedApp' | 'LoadingApp' | 'LoadingApp-firstDebugMode';
  closeModal: () => void;
};
const IssueReport: React.FunctionComponent<IssueReportProps> = ({ from, closeModal }) => {
  const contextLoaded = useContext(ContextAppLoaded);
  const contextLoading = useContext(ContextAppLoading);
  let translate: (key: string) => TranslateType;
  if (from === 'LoadedApp') {
    translate = contextLoaded.translate;
  } else {
    translate = contextLoading.translate;
  }
  const { colors } = useTheme() as unknown as ThemeType;

  //const [disabled, setDisabled] = useState<boolean>(false);
  const arrayTxtObject = translate('issuereport.firstdebugmode');

  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

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
        title={
          from === 'LoadingApp-firstDebugMode'
            ? (translate('issuereport.title-firstdebugmode') as string)
            : (translate('issuereport.title') as string)
        }
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noDebugMode={true}
      />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 20,
        }}>
        {arrayTxt.map((txt: string, index: number) => (
          <FadeText style={{ marginBottom: 30 }} key={`${index}-${txt.substring(0, 10)}`}>
            {txt}
          </FadeText>
        ))}
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
          testID="issuereport.button.save"
          disabled={false}
          type="Primary"
          title={
            from === 'LoadingApp-firstDebugMode'
              ? (translate('settings.value-debugmode-true') as string)
              : (translate('issuereport.send-report') as string)
          }
          onPress={async () => {
            if (from === 'LoadingApp-firstDebugMode') {
              // enable or disable the debug mode
              await SettingsFileImpl.writeSettings('debugMode', true);
            } else {
              // send a report
            }
          }}
        />
        <Button
          disabled={false}
          type="Secondary"
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default IssueReport;