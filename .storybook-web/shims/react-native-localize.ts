// Web stub for react-native-localize (no web build). Only the settings the
// storied components read are implemented. Vite aliases the real module to
// this file for the web Storybook build.
export const getNumberFormatSettings = () => ({
  decimalSeparator: '.',
  groupingSeparator: ',',
});

export const getLocales = () => [
  { countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false },
];

export const getCurrencies = () => ['USD'];
