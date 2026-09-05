import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GuideProvider } from '../features/tour/model/GuideContext';
import { RootNavigator } from './navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GuideProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </GuideProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
