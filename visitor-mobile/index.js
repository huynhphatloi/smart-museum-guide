import { registerRootComponent } from 'expo';
import App from './src/application/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and sets up the environment for both Expo Go and native development builds.
registerRootComponent(App);
