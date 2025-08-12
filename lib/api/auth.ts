import AsyncStorage from '@react-native-async-storage/async-storage';
import { getResource } from '@/lib/api/fetch';

export async function fetchMe() {
  const raw = await AsyncStorage.getItem('auth_token');
  if (!raw) throw new Error('Not authenticated');
  const token = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;

  return getResource('me', token);
}
