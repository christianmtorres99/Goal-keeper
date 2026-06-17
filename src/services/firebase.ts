import { initializeApp } from '@firebase/app';
// @ts-ignore – TS resolves browser types; Metro resolves the RN build at runtime which exports getReactNativePersistence
import { initializeAuth, getReactNativePersistence } from '@firebase/auth';
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

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
