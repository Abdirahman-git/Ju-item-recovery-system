import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

/** Found reporting closed — redirect to Report Lost. */
export default function FoundPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(user)/Lost');
  }, [router]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#1A56DB" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
