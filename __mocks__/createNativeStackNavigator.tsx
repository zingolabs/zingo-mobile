import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

const createNativeStackNavigator = () => {
  const Stack = createStackNavigator();

  return {
    ...Stack,
    Navigator: (props: any) => (
      <Stack.Navigator {...props} headerMode="none" screenOptions={{ animationEnabled: false }} />
    )
  };
};

export default createNativeStackNavigator;
