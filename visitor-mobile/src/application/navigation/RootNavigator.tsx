import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import { ExhibitDetailScreen } from '../../features/exhibit/ui/ExhibitDetailScreen';
import { PermissionScreen } from '../../features/onboarding/ui/PermissionScreen';
import { WelcomeScreen } from '../../features/onboarding/ui/WelcomeScreen';
import { SettingsScreen } from '../../features/preferences/ui/SettingsScreen';
import { QrScreen } from '../../features/qr/ui/QrScreen';
import { useGuide } from '../../features/tour/model/GuideContext';
import { ExploreScreen } from '../../features/tour/ui/ExploreScreen';
import { t } from '../../shared/i18n';
import { theme } from '../../shared/theme';
import { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcon = (glyph: string) =>
  function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
      <Text
        style={{
          color,
          fontFamily: theme.type.body,
          fontSize: focused ? 19 : 17,
          fontWeight: focused ? '700' : '500',
        }}
      >
        {glyph}
      </Text>
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
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: theme.colors.paper,
          borderTopColor: theme.colors.line,
        },
      }}
    >
      <Tabs.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: t(language, 'explore'), tabBarIcon: tabIcon('◉') }}
      />
      <Tabs.Screen
        name="Qr"
        component={QrScreen}
        options={{ title: 'QR', tabBarIcon: tabIcon('⌑') }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t(language, 'settings'), tabBarIcon: tabIcon('≡') }}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
