import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import useAuth from '../hooks/useAuth';
import WelcomeScreen from '../screens/WelcomeScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={WelcomeScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
