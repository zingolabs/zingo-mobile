import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoadingParamList, OnboardingParamList } from '@app/types';
import { createOnboardingNavigator } from './OnboardingNavigator';

export const LoadingStack = createNativeStackNavigator<LoadingParamList>();
export const Onboarding = createOnboardingNavigator<OnboardingParamList>();
