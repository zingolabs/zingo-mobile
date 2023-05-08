import React from 'react';
import { ScrollView } from 'react-native';

class MyScrollView extends ScrollView {
  render() {
    const { children, ...rest } = this.props;
    return (
      <ScrollView {...rest} showsVerticalScrollIndicator={true} persistentScrollbar={true} indicatorStyle={'white'}>
        {children}
      </ScrollView>
    );
  }
}

export default MyScrollView;

