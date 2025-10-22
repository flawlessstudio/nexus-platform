import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

export default function WelcomeScreen() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', countryOfOrigin: '' });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, formData);
      const { user, accessToken, refreshToken } = response.data;
      await login(user, { accessToken, refreshToken });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🌍 NEXUS</Text>
          <Text style={styles.subtitle}>Your Immigration Journey Made Simple</Text>
        </View>
        {!isLogin && (
          <>
            <TextInput style={styles.input} placeholder="First Name" onChangeText={v => handleChange('firstName', v)} />
            <TextInput style={styles.input} placeholder="Last Name" onChangeText={v => handleChange('lastName', v)} />
            <TextInput style={styles.input} placeholder="Country of Origin" onChangeText={v => handleChange('countryOfOrigin', v)} />
          </>
        )}
        <TextInput style={styles.input} placeholder="Email Address" onChangeText={v => handleChange('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" onChangeText={v => handleChange('password', v)} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>{isLogin ? 'Need an account? Sign up' : 'Have an account? Sign in'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e40af' },
  subtitle: { fontSize: 16, color: '#64748b' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  switchButton: { alignItems: 'center', marginTop: 20 },
  switchText: { color: '#2563eb' },
});
