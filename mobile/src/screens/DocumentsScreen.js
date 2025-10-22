import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
export default function DocumentsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Documents</Text>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
});
