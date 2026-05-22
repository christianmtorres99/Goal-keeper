import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';

export async function shareViewAsImage(viewRef: RefObject<View | null>): Promise<void> {
  if (!viewRef.current) throw new Error('View ref is null');
  const uri = await captureRef(viewRef.current, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your streak' });
}
