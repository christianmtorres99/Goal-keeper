import { collection, query, orderBy, limit, getDocs } from '@firebase/firestore';
import { db } from './firebase';
import type { PublicProfile } from './profileService';

export async function getTopLeaderboard(count = 100): Promise<PublicProfile[]> {
  const q = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PublicProfile);
}
