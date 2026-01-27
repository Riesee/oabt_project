import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import TestListScreen from './src/screens/TestListScreen';
import TestScreen from './src/screens/TestScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';

// Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
};

// Main Tab Navigator
function MainTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tests') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Subjects') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        children={(props) => <DashboardScreen {...props} onLogout={onLogout} />}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen name="Tests" component={TestListScreen} options={{ title: 'Testler' }} />
      <Tab.Screen name="Subjects" component={SubjectsScreen} options={{ title: 'Konu Anlatımı' }} />
      <Tab.Screen
        name="Profile"
        children={(props) => <ProfileScreen {...props} onLogout={onLogout} />}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack for Onboarding
function AuthStack({ onLogin }: { onLogin: () => void }) {
  // We wrap OnboardingScreen to pass onLogin prop via a wrapper or context. 
  // Simplified: Onboarding saves to storage, then we trigger refresh here.
  // Actually, simple hack: Pass setAuth as prop to screen? No, React Navigation doesn't like that easily.
  // Custom component inside Stack.Screen works.

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding">
        {(props) => {
          // Check if Onboarding saves and then calls onLogin
          // We intercept the handleStart in Onboarding to call this.
          // But Onboarding logic is inside the component.
          // Let's modify OnboardingScreen to accept a prop?
          // Or easier: Onboarding saves ID. App polls or Onboarding uses a global context?
          // Let's use a dirty trick for prototype: Pass callback via initialParams? 
          // Or just make App check storage on interval? No.
          // Let's use simple prop passing pattern.

          // Modifying on the fly: OnboardingScreen logic needs to update parent.
          // I will update OnboardingScreen code to verify `route.params.onLogin`.
          return <OnboardingScreen {...props} route={{ ...props.route, params: { onLogin } }} />
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = async () => {
    try {
      const userId = await AsyncStorage.getItem('USER_ID');
      setIsAuthenticated(!!userId);
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth">
              {() => <AuthStack onLogin={() => setIsAuthenticated(true)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Main">
                {() => <MainTabs onLogout={() => setIsAuthenticated(false)} />}
              </Stack.Screen>
              <Stack.Screen name="TestScreen" component={TestScreen} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style="dark" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
