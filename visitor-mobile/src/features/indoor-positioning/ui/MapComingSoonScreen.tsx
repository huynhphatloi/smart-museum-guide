import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../../shared/theme';
import { Body, Button, Eyebrow, Pill, Screen, Title } from '../../../shared/ui';
import { useGuide } from '../../tour/model/GuideContext';
import { pt } from '../i18n';

/**
 * Placeholder for the Map tab while the indoor map is disabled
 * (`EXPO_PUBLIC_INDOOR_MAP=false`). Zone detection, narration and arrival
 * notifications do not depend on the map and keep working.
 */
export function MapComingSoonScreen() {
  const { language } = useGuide();
  const navigation = useNavigation();

  return (
    <Screen>
      <Eyebrow>{pt(language, 'mapEyebrow')}</Eyebrow>
      <Title>{pt(language, 'comingSoonTitle')}</Title>
      <Pill label={pt(language, 'comingSoon')} />

      <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no">
        <Svg
          width={72}
          height={72}
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme.colors.brass}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M3 5.5 9 3l6 2.5L21 3v15.5L15 21l-6-2.5L3 21zM9 3v15.5M15 5.5V21" />
        </Svg>
      </View>

      <Body>{pt(language, 'comingSoonBody')}</Body>
      <View style={styles.qr}>
        <Body>{pt(language, 'comingSoonQr')}</Body>
        <Button
          label={pt(language, 'scanQr')}
          variant="ghost"
          onPress={() => navigation.navigate('Main', { screen: 'Qr' })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    marginVertical: theme.spacing(2.5),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.paper,
  },
  qr: { marginTop: theme.spacing(2) },
});
