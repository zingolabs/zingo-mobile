/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {FadeText, SecondaryButton} from './Components';
import {useTheme} from '@react-navigation/native';

type AboutModalProps = {
  closeModal: () => void;
};
const AboutModal: React.FunctionComponent<AboutModalProps> = ({closeModal}) => {
  const {colors} = useTheme();
  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <View>
        <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25, paddingTop: 25}}>
          <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Zecwallet Lite v1.6.1</Text>
        </View>
        <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
          <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
        </View>
      </View>

      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <FadeText>
          {'\n'}
          Copyright (c) 2018-2021, Aditya Kulkarni.
          {'\n'}
          {'\n'}
          Built with React Native.
          {'\n'}
          {'\n'}
          The MIT License (MIT) Copyright (c) 2018-2021 Zecwallet
          {'\n'}
          {'\n'}
          Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
          documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without
          limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
          Software, and to permit persons to whom the Software is furnished to do so, subject to the following
          conditions:
          {'\n'}
          {'\n'}
          The above copyright notice and this permission notice shall be included in all copies or substantial portions
          of the Software.
          {'\n'}
          {'\n'}
          THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
          NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
          EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
          AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
          OR OTHER DEALINGS IN THE SOFTWARE.
        </FadeText>
      </ScrollView>
      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10}}>
        <SecondaryButton title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default AboutModal;
