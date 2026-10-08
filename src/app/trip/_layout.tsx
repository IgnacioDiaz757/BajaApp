import { Stack } from 'expo-router';
import { colors } from '../../components/ui/primitives';

export default function TripLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}