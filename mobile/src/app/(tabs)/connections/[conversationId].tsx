import { useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@/features/messages/ChatScreen';

export default function ConversationRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  return <ChatScreen conversationId={conversationId} />;
}
