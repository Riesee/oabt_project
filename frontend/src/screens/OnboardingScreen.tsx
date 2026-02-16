import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
};

import { API_URL } from '../config';
import { AVATAR_EMOJIS } from '../constants/emojis';

export default function OnboardingScreen({ navigation, route }: any) {
    const [nickname, setNickname] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState(AVATAR_EMOJIS[0]);
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const [step, setStep] = useState<'social' | 'nickname'>('social');
    const [tempUserId, setTempUserId] = useState<string | null>(null);
    const [tempToken, setTempToken] = useState<string | null>(null);

    // ...

    const handleSocialLogin = async (provider: string) => {
        setSocialLoading(provider);
        try {
            let userData: any = null;

            if (provider === 'apple') {
                const credential = await AppleAuthentication.signInAsync({
                    requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                    ],
                });
                userData = {
                    email: credential.email,
                    nickname: credential.fullName?.givenName || '',
                    oauth_id: credential.user,
                    provider: 'apple',
                    emoji: 'apple'
                };
            } else if (provider === 'google') {
                // FIXED TEST ACCOUNT for consistent testing
                userData = {
                    nickname: 'Test Kullanıcı',
                    oauth_id: 'google-fixed-test-id-123456', // Always the same
                    provider: 'google',
                    emoji: 'rocket'
                };
            }

            if (userData) {


                // Add a timeout to prevent infinite loading
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                try {
                    const res = await fetch(`${API_URL}/auth/social-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        const data = await res.json();
                        if (data.is_new_user) {
                            setTempUserId(data.id);
                            setTempToken(data.token);
                            setStep('nickname');
                        } else {
                            await AsyncStorage.multiSet([
                                ['USER_ID', data.id],
                                ['AUTH_TOKEN', data.token || '']
                            ]);
                            if (route.params?.onLogin) {
                                route.params.onLogin();
                            }
                        }
                    } else {
                        const text = await res.text();
                        console.error('Login Server Error:', text);
                        Alert.alert('Hata', `Giriş başarısız (Backend): ${res.status} - ${text.substring(0, 50)}`);
                    }
                } catch (fetchErr: any) {
                    clearTimeout(timeoutId);
                    console.error('Fetch Error Details:', fetchErr);
                    throw fetchErr; // Pass to outer catch
                }
            }
        } catch (e: any) {
            console.error('Social Login Catch Error:', e);
            if (e.name === 'AbortError') {
                Alert.alert('Zaman Aşımı', `Sunucu 10 saniye içinde yanıt vermedi. Lütfen internetinizi ve backend ayarlarını kontrol edin. Adres: ${API_URL}`);
            } else {
                Alert.alert('Bağlantı Hatası', `Sunucuya erişilemedi: ${e.message}\n\nAdres: ${API_URL}`);
            }
        } finally {
            setSocialLoading(null);
        }
    };

    const handleSetNickname = async () => {
        if (!nickname.trim()) {
            Alert.alert('Hata', 'Lütfen bir takma ad giriniz.');
            return;
        }
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/user/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}`
                },
                body: JSON.stringify({ nickname, emoji: selectedEmoji.id })
            });

            if (res.ok) {
                await AsyncStorage.multiSet([
                    ['USER_ID', tempUserId!],
                    ['AUTH_TOKEN', tempToken!]
                ]);
                if (route.params?.onLogin) {
                    route.params.onLogin();
                }
            } else {
                Alert.alert('Hata', 'Bu takma ad zaten kullanılıyor.');
            }
        } catch (e) {
            Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>
                    {step === 'social' ? 'Hoş Geldiniz! 👋' : 'Profilini Oluştur ✍️'}
                </Text>
                <Text style={styles.subtitle}>
                    {step === 'social'
                        ? 'Sınav yolculuğunda gelişiminizi takip etmek için giriş yapın.'
                        : 'Seni diğer öğrencilerden ayıracak bir takma ad seç.'}
                </Text>

                {step === 'social' ? (
                    <View style={styles.socialAuthContainer}>
                        {Platform.OS === 'ios' ? (
                            <AppleAuthentication.AppleAuthenticationButton
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                cornerRadius={15}
                                style={styles.appleButton}
                                onPress={() => handleSocialLogin('apple')}
                            />
                        ) : (
                            <TouchableOpacity
                                style={[styles.socialButton, styles.googleButton]}
                                onPress={() => handleSocialLogin('google')}
                                disabled={!!socialLoading}
                            >
                                {socialLoading === 'google' ? (
                                    <ActivityIndicator color={COLORS.text} size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="logo-google" size={20} color={COLORS.text} style={{ marginRight: 10 }} />
                                        <Text style={styles.socialButtonText}>Google ile Devam Et</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        <Text style={styles.footerNote}>Devam ederek kullanım koşullarımızı kabul etmiş olursunuz.</Text>
                    </View>
                ) : (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Takma Adın</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: ÇalışkanÖğrenci"
                            value={nickname}
                            onChangeText={setNickname}
                            autoFocus
                        />

                        <Text style={styles.label}>Avatarını Seç</Text>
                        <View style={styles.emojiGrid}>
                            {AVATAR_EMOJIS.map((emoji, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.emojiItem, selectedEmoji.id === emoji.id && styles.emojiSelected]}
                                    onPress={() => setSelectedEmoji(emoji)}
                                >
                                    <Text style={styles.emojiText}>{emoji.char}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleSetNickname} disabled={loading}>
                            <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Hadi Başlayalım! 🚀'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
    footerNote: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
    socialAuthContainer: {
        width: '100%',
        marginBottom: 20,
    },
    appleButton: {
        width: '100%',
        height: 55,
        marginBottom: 15,
    },
    socialButton: {
        width: '100%',
        height: 55,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: COLORS.white,
    },
    googleButton: {
        marginBottom: 20,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
});
