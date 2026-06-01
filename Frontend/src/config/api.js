import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 5000;

function getDevHost() {
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return '127.0.0.1';
}

export const BACKEND_URL = `http://${getDevHost()}:${BACKEND_PORT}`;
