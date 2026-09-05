import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Explore: undefined;
  Qr: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Permission: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ExhibitDetail: { autoPlay?: boolean } | undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
