/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { SafeAreaView, I18nManager, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as RNLocalize from 'react-native-localize';
import { I18n, TranslateOptions } from 'i18n-js';
import { memoize } from 'lodash';

import LoadedApp from './app/LoadedApp';
import LoadingApp from './app/LoadingApp';
import { ThemeType } from './app/types';
import platform from './app/platform/platform';

const en = require('./app/translations/en.json');
const es = require('./app/translations/es.json');

const Theme: ThemeType = {
  dark: true,
  colors: {
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: 'rgba(90, 140, 90, 1)',
    text: '#c3c3c3',
    zingo: '#888888',
    placeholder: '#888888',
    money: '#ffffff',
    notification: '',
  },
};

const Stack = createStackNavigator();

const useForceUpdate = () => {
  const [value, setValue] = useState(0);
  return () => {
    const newValue = value + 1;
    return setValue(newValue);
  };
};

export default function App() {
  const forceUpdate = useForceUpdate();
  const file = useMemo(
    () => ({
      en: en,
      es: es,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);
  const [widthDimensions, setWidthDimensions] = useState(Dimensions.get('screen').width);
  const [heightDimensions, setHeightDimensions] = useState(Dimensions.get('screen').height);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    platform.isPortrait() ? 'portrait' : 'landscape',
  );
  const [deviceType, setDeviceType] = useState<'tablet' | 'phone'>(platform.isTablet() ? 'tablet' : 'phone');

  const translate = memoize(
    (key: string, config?: TranslateOptions) => i18n.t(key, config),
    (key: string, config?: TranslateOptions) => (config ? key + JSON.stringify(config) : key),
  );

  const setI18nConfig = useCallback(() => {
    // fallback if no available language fits
    const fallback = { languageTag: 'en', isRTL: false };

    //console.log(RNLocalize.findBestAvailableLanguage(Object.keys(file)));
    //console.log(RNLocalize.getLocales());

    const { languageTag, isRTL } = RNLocalize.findBestAvailableLanguage(Object.keys(file)) || fallback;

    // clear translation cache
    if (translate && translate.cache) {
      translate?.cache?.clear?.();
    }
    // update layout direction
    I18nManager.forceRTL(isRTL);

    i18n.locale = languageTag;
  }, [file, i18n, translate]);

  useEffect(() => {
    const dim = Dimensions.addEventListener('change', () => {
      setWidthDimensions(Dimensions.get('screen').width);
      setHeightDimensions(Dimensions.get('screen').height);
      setOrientation(platform.isPortrait() ? 'portrait' : 'landscape');
      setDeviceType(platform.isTablet() ? 'tablet' : 'phone');
    });

    return () => dim.remove();
  }, []);

  useEffect(() => {
    setI18nConfig();
  }, [setI18nConfig]);

  const handleLocalizationChange = useCallback(() => {
    setI18nConfig();
    forceUpdate();
  }, [setI18nConfig, forceUpdate]);

  useEffect(() => {
    RNLocalize.addEventListener('change', handleLocalizationChange);
    return () => RNLocalize.removeEventListener('change', handleLocalizationChange);
  }, [handleLocalizationChange]);

  //console.log('w', widthDimensions, 'h', heightDimensions, 's', scaleDimensions);

  return (
    <NavigationContainer theme={Theme}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: Theme.colors.card,
        }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="LoadingApp">
            {props => (
              <LoadingApp
                {...props}
                translate={translate}
                dimensions={{
                  width: widthDimensions,
                  height: heightDimensions,
                  orientation: orientation,
                  deviceType: deviceType,
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="LoadedApp">
            {props => (
              <LoadedApp
                {...props}
                translate={translate}
                dimensions={{
                  width: widthDimensions,
                  height: heightDimensions,
                  orientation: orientation,
                  deviceType: deviceType,
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
