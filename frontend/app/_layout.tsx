import { Stack } from 'expo-router';
import { useEffect } from 'react';
import databaseService from '../services/databaseService';
import { ConfigProvider } from '../contexts/ConfigContext';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app start
    databaseService.init().catch(console.error);
  }, []);

  return (
    <ConfigProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'AI Chat',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="conversations" 
          options={{ 
            title: 'Conversations',
          }} 
        />
        <Stack.Screen 
          name="skills" 
          options={{ 
            title: 'Skills & Tools',
          }} 
        />
      </Stack>
    </ConfigProvider>
  );
}