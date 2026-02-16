import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdBanner from '../components/AdBanner';
import RewardedAdButton from '../components/RewardedAdButton';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
};

import { API_URL } from '../config';

export default function TestListScreen({ navigation }: any) {
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [userTokens, setUserTokens] = useState(0);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const baseUrl = API_URL;

                const res = await fetch(`${baseUrl}/tests`);
                if (res.ok) {
                    const data = await res.json();
                    setTests(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            const token = await AsyncStorage.getItem('AUTH_TOKEN');
            if (!userId) return;

            const res = await fetch(`${API_URL}/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setIsPremium(userData.is_premium || userData.role === 'pro');
                setUserTokens(userData.tokens || 0);
            }
        } catch (e) {
            console.error('Error fetching user data:', e);
        }
    };

    const handleTestPress = (test: any) => {
        navigation.navigate('TestScreen', { testId: test.id, testTitle: test.title });
    };

    const renderItem = ({ item, index }: any) => (
        <TouchableOpacity
            style={styles.testCard}
            onPress={() => handleTestPress(item)}
        >
            <View style={[styles.iconBox, { backgroundColor: index % 2 === 0 ? '#E8F6F3' : '#FFF5F5' }]}>
                <Ionicons
                    name="document-text"
                    size={24}
                    color={index % 2 === 0 ? COLORS.secondary : COLORS.primary}
                />
            </View>
            <View style={styles.testInfo}>
                <Text style={styles.testTitle}>{item.title}</Text>
                <Text style={styles.testDesc}>{item.description || '20 Soru • Genel Yetenek'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#BDC3C7" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Konu Tarama Testleri</Text>
                {/* Token info hidden for now
                {!isPremium && (
                    <View style={styles.tokenInfo}>
                        <Ionicons name="diamond" size={16} color={COLORS.accent} />
                        <Text style={styles.tokenText}>{userTokens} Token</Text>
                    </View>
                )}
                */}
            </View>

            {/* Token section hidden for now
            {!isPremium && (
                <View style={styles.adSection}>
                    <RewardedAdButton onRewardGranted={(newBalance) => setUserTokens(newBalance)} />
                </View>
            )}
            */}

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={tests}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, !isPremium && { paddingBottom: 80 }]}
                    ListEmptyComponent={<Text style={styles.emptyText}>Henüz test bulunmamaktadır.</Text>}
                />
            )}

            {!isPremium && (
                <View style={styles.bannerContainer}>
                    <AdBanner showAd={!isPremium} />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    header: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    tokenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 5,
    },
    tokenText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    adSection: {
        padding: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    listContent: {
        padding: 20,
    },
    testCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    testInfo: {
        flex: 1,
    },
    testTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    testDesc: {
        fontSize: 12,
        color: '#7F8C8D',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#999',
    },
    bannerContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: COLORS.white,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
});
