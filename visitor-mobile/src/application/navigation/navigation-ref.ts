import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

/**
 * Lets code outside any screen navigate - e.g. opening the exhibit when the
 * visitor taps a "you are near ..." notification.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
