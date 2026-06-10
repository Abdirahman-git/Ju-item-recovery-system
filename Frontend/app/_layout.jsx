import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../src/services/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/constants/colors';
import AppAlertProvider from '../src/components/AppAlertProvider';

// Loading fonts
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold,
  });

  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);
  }, []);

  return (
    <AppAlertProvider>
      {!fontsLoaded || !initialized ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
          <ActivityIndicator size="large" color="#94A3B8" />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(user)" />
          <Stack.Screen name="(admin)" />
        </Stack>
      )}
    </AppAlertProvider>
  );
}
