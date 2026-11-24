import { useLocalSearchParams } from 'expo-router';

import { UserProfileScreen } from '@/features/profile/UserProfileScreen';

export default function UserProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <UserProfileScreen userId={userId} />;
}
