import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import { useGuide } from '../context/GuideContext';
import { t } from '../i18n';
import { BleSimulatorScreen } from '../screens/BleSimulatorScreen';
import { ExhibitDetailScreen } from '../screens/ExhibitDetailScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { PermissionScreen } from '../screens/PermissionScreen';
import { QrScreen } from '../screens/QrScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { theme } from '../theme';
import { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcon = (glyph: string) =>
  function TabIcon({ color }: { color: string }) {
    return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
  };

function MainTabs() {
  const { language } = useGuide();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.line },
      }}
    >
      <Tabs.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: t(language, 'explore'), tabBarIcon: tabIcon('◎') }}
      />
      <Tabs.Screen
        name="Qr"
        component={QrScreen}
        options={{ title: 'QR', tabBarIcon: tabIcon('▣') }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t(language, 'settings'), tabBarIcon: tabIcon('⚙') }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { language } = useGuide();

  return (
    <NavigationContainer
      linking={{
        // Lets a scanned QR deep link straight into the app when it is installed.
        prefixes: ['museumguide://', 'https://museum.example.com'],
        config: {
          screens: {
            Welcome: 'welcome',
            Main: 'main',
            ExhibitDetail: 'exhibit',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Permission" component={PermissionScreen} options={{ title: '' }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="ExhibitDetail"
          component={ExhibitDetailScreen}
          options={{ title: t(language, 'currentExhibit') }}
        />
        <Stack.Screen
          name="Simulator"
          component={BleSimulatorScreen}
          options={{ title: t(language, 'simulator') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
