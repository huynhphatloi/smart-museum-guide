import { Platform } from 'react-native';
import { env } from '../../../shared/config/env';
import { DeviceProfile } from './types';

interface AndroidConstants {
  Manufacturer?: string;
  Brand?: string;
  Model?: string;
}

/**
 * Which radio map this phone should use. In simulation mode the "device" is
 * the simulator, so it only ever sees the synthetic seed fingerprints.
 *
 * Android reports its make and model through React Native itself. iOS does
 * not expose the model without a native module, so every iPhone shares the
 * "iPhone" profile - the same as falling back to the platform, which is what
 * a single-iPhone demo needs anyway.
 */
export function currentDeviceProfile(): DeviceProfile {
  if (env.bleSimulation) return { model: 'simulator', platform: 'simulator' };

  if (Platform.OS === 'ios') {
    return { model: Platform.isPad ? 'iPad' : 'iPhone', platform: 'ios' };
  }

  const constants = Platform.constants as AndroidConstants;
  const make = constants.Manufacturer ?? constants.Brand ?? '';
  const model = constants.Model ?? 'Android device';
  const name = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
  return { model: name.trim(), platform: 'android' };
}
