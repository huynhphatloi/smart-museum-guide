import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Explore: undefined;
  Map: undefined;
  Qr: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Permission: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ExhibitDetail: { autoPlay?: boolean } | undefined;
  /** Staff tool: record fingerprints for indoor positioning. */
  Calibration: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
