import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
};

const EMOJIS = ['👨‍🏫', '👩‍🏫', '🎓', '📚', '✏️', '🧠', '🚀', '⭐', '🦉', '🦁', '🦊', '🦄'];

import { API_URL } from '../config';

export default function OnboardingScreen({ navigation, route }: any) {
    const [nickname, setNickname] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
    const [loading, setLoading] = useState(false);

    // ...

    const handleStart = async () => {
        if (!nickname.trim()) {
            Alert.alert('Hata', 'Lütfen bir takma ad giriniz.');
            return;
        }
        setLoading(true);

        try {
            console.log('Using API URL:', API_URL); // Debug

            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, emoji: selectedEmoji })
            });

            console.log('Response Status:', res.status);

            if (res.ok) {
                const data = await res.json();
                await AsyncStorage.setItem('USER_ID', data.id);
                if (route.params?.onLogin) {
                    route.params.onLogin();
                }
            } else {
                const text = await res.text();
                console.log('Error Response:', text);
                Alert.alert('Hata', `Kayıt başarısız: ${res.status}`);
            }

        } catch (e) {
            console.error('Network Error:', e);
            Alert.alert('Hata', 'Sunucuya bağlanılamadı. İnternet bağlantınızı ve IP ayarını kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Hoş Geldiniz! 👋</Text>
                <Text style={styles.subtitle}>Sınav yolculuğuna başlamadan önce kendini tanıt.</Text>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Takma Adın</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: ÇalışkanÖğrenci"
                        value={nickname}
                        onChangeText={setNickname}
                    />

                    <Text style={styles.label}>Avatarını Seç</Text>
                    <View style={styles.emojiGrid}>
                        {EMOJIS.map((emoji, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.emojiItem, selectedEmoji === emoji && styles.emojiSelected]}
                                onPress={() => setSelectedEmoji(emoji)}
                            >
                                <Text style={styles.emojiText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleStart} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Başla 🚀'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    content: {
        padding: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#7F8C8D',
        textAlign: 'center',
        marginBottom: 40,
    },
    formContainer: {
        width: '100%',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
        marginLeft: 5,
    },
    input: {
        backgroundColor: '#F7F9FC',
        padding: 15,
        borderRadius: 15,
        fontSize: 16,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    emojiItem: {
        width: '22%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    emojiSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF5F5',
    },
    emojiText: {
        fontSize: 30,
    },
    button: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
