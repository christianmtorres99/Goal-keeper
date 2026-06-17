import { signInAnonymously } from '@firebase/auth';
import type { User } from '@firebase/auth';
import { auth } from './firebase';

export async function ensureAuth(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const { user } = await signInAnonymously(auth);
  return user;
}

export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}
