import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PositioningProvider } from '../features/indoor-positioning/model/PositioningContext';
import { ZoneNotificationBridge } from '../features/indoor-positioning/model/ZoneNotificationBridge';
import { GuideProvider } from '../features/tour/model/GuideContext';
import { env } from '../shared/config/env';
import { RootNavigator } from './navigation/RootNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    'BeVietnamPro': require('../../assets/fonts/BeVietnamPro-Regular.ttf'),
    'BeVietnamPro-SemiBold': require('../../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    'Newsreader': require('../../assets/fonts/Newsreader.ttf'),
  });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GuideProvider>
          <StatusBar style="dark" />
          <ZoneNotificationBridge />
          {/* The positioning engine only runs when the experimental map is on. */}
          {env.indoorMap ? (
            <PositioningProvider>
              <RootNavigator />
            </PositioningProvider>
          ) : (
            <RootNavigator />
          )}
        </GuideProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
