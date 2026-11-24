import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { MoodTag } from '@/components/MoodTag';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

import { AuthoredThought, getPublicProfile, getPublicThoughtsByAuthor, PublicProfile } from './api';

export function UserProfileScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [thoughts, setThoughts] = useState<AuthoredThought[]>([]);

  useEffect(() => {
    getPublicProfile(userId).then(setProfile).catch(() => {});
    getPublicThoughtsByAuthor(userId).then(setThoughts).catch(() => {});
  }, [userId]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        {profile && (
          <View style={styles.profileRow}>
            <Avatar name={profile.displayName} photoUrl={profile.photoUrl} size={56} />
            <View>
              <Text style={styles.name}>{profile.displayName}</Text>
              {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={thoughts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No public thoughts yet.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.thoughtCard}>
            <MoodTag mood={item.mood} />
            <Text style={styles.thoughtText}>{item.text}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  back: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.accent,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  bio: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    maxWidth: 220,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  thoughtCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  thoughtText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  empty: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
