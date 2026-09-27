import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ExhibitDetailScreen } from '../../features/exhibit/ui/ExhibitDetailScreen';
import { pt } from '../../features/indoor-positioning/i18n';
import { CalibrationScreen } from '../../features/indoor-positioning/ui/CalibrationScreen';
import { MuseumMapScreen } from '../../features/indoor-positioning/ui/MuseumMapScreen';
import { PermissionScreen } from '../../features/onboarding/ui/PermissionScreen';
import { WelcomeScreen } from '../../features/onboarding/ui/WelcomeScreen';
import { SettingsScreen } from '../../features/preferences/ui/SettingsScreen';
import { QrScreen } from '../../features/qr/ui/QrScreen';
import { useGuide } from '../../features/tour/model/GuideContext';
import { ExploreScreen } from '../../features/tour/ui/ExploreScreen';
import { t } from '../../shared/i18n';
import { theme } from '../../shared/theme';
import { navigationRef } from './navigation-ref';
import { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcon = (kind: 'explore' | 'map' | 'qr' | 'settings') =>
  function TabIcon({ color }: { color: string; focused: boolean }) {
    return (
      <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'explore' ? <><Circle cx={12} cy={12} r={8} /><Circle cx={12} cy={12} r={2.5} /><Path d="M12 1v3M12 20v3M1 12h3M20 12h3" /></> : null}
        {kind === 'map' ? <><Path d="M3 5.5 9 3l6 2.5L21 3v15.5L15 21l-6-2.5L3 21zM9 3v15.5M15 5.5V21" /></> : null}
        {kind === 'qr' ? <><Path d="M3 9V3h6M15 3h6v6M3 15v6h6M21 15v6h-6" /><Rect x={8} y={8} width={8} height={8} rx={1} /></> : null}
        {kind === 'settings' ? <><Path d="M4 6h16M4 12h16M4 18h16" /><Circle cx={9} cy={6} r={2} fill={theme.colors.paper} /><Circle cx={15} cy={12} r={2} fill={theme.colors.paper} /><Circle cx={10} cy={18} r={2} fill={theme.colors.paper} /></> : null}
      </Svg>
    );
  };

function MainTabs() {
  const { language } = useGuide();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accentDark,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontFamily: theme.type.body,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 9,
          backgroundColor: theme.colors.paper,
          borderTopColor: theme.colors.line,
        },
      }}
    >
      <Tabs.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: t(language, 'explore'), tabBarIcon: tabIcon('explore') }}
      />
      <Tabs.Screen
        name="Map"
        component={MuseumMapScreen}
        options={{ title: pt(language, 'mapTab'), tabBarIcon: tabIcon('map') }}
      />
      <Tabs.Screen
        name="Qr"
        component={QrScreen}
        options={{ title: 'QR', tabBarIcon: tabIcon('qr') }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t(language, 'settings'), tabBarIcon: tabIcon('settings') }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { language } = useGuide();

  return (
    <NavigationContainer
      ref={navigationRef}
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
          headerStyle: { backgroundColor: theme.colors.canvas },
          headerTintColor: theme.colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: theme.type.body, fontSize: 15, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.colors.canvas },
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
          name="Calibration"
          component={CalibrationScreen}
          options={{ title: pt(language, 'calibration') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
