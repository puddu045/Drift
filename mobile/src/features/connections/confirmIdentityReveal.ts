import { Alert } from 'react-native';

import { getOwnProfile, Profile } from '@/features/profile/api';
import { getCached } from '@/lib/prefetchCache';

/**
 * Connection requests always reveal the sender's real name/photo to the
 * recipient (ConnectionsService.listIncoming — "you can't meaningfully
 * decide whether to accept a request from a total stranger"), even for a
 * profile that's otherwise anonymous everywhere else. Anonymous senders get
 * a chance to back out before that happens; anyone already public skips the
 * prompt since nothing changes for them.
 */
export async function confirmIdentityReveal(userId: string): Promise<boolean> {
  const cached = getCached<Profile>('profile:' + userId);
  const profile = cached ?? (await getOwnProfile().catch(() => null));
  const isAnonymous = !(profile?.showIdentityOnContent ?? false);
  if (!isAnonymous) return true;

  return new Promise((resolve) => {
    Alert.alert(
      'Send connection request?',
      'Your profile and username will be visible to this person if you send the request.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Send Request', onPress: () => resolve(true) },
      ],
    );
  });
}
