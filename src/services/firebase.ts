import { initializeApp } from '@firebase/app';
import { initializeAuth } from '@firebase/auth';
import type { Persistence } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCf-WEBxr3HOBFd0pizytZDmBABAljCm0k',
  authDomain: 'goalie-dfb0b.firebaseapp.com',
  projectId: 'goalie-dfb0b',
  storageBucket: 'goalie-dfb0b.firebasestorage.app',
  messagingSenderId: '4529977651',
  appId: '1:4529977651:web:1b7b3a11c42126dfbce646',
};

const app = initializeApp(firebaseConfig);

// Firebase's getReactNativePersistence lives in the Metro-resolved RN platform build
// but TypeScript resolves firebase/auth to the browser types. We replicate it inline.
const asyncStoragePersistence = {
  type: 'LOCAL',
  _isAvailable: async () => true,
  _set: async (key: string, value: unknown) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  _get: async <T>(key: string): Promise<T | null> => {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : null;
  },
  _remove: async (key: string) => { await AsyncStorage.removeItem(key); },
  _addListener: (_key: string, _listener: unknown) => {},
  _removeListener: (_key: string, _listener: unknown) => {},
} as unknown as Persistence;

export const auth = initializeAuth(app, { persistence: asyncStoragePersistence });

export const db = getFirestore(app);
