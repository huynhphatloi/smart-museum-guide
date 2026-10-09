import { Audio } from 'expo-av';
import { NarrationPlayer } from './narration-player';

export const narrationPlayer = new NarrationPlayer(async (url) => {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
  const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: false });
  return sound;
});
