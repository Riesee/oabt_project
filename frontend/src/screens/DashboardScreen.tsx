import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
    gold: '#FFD700',
};

export default function DashboardScreen({ navigation, onLogout }: any) {
    const [user, setUser] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            if (!userId) {
                if (onLogout) onLogout();
                return;
            }

            const baseUrl = API_URL;
            // Add timestamp to force fresh data (cache busting)
            const timestamp = Date.now();

            // Fetch User
            const userRes = await fetch(`${baseUrl}/user/${userId}?t=${timestamp}`);
            if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData);
            } else {
                // User not found (probably invalid ID from old session)
                console.log('User not found, logging out...');
                await AsyncStorage.removeItem('USER_ID');
                if (onLogout) onLogout();
                return;
            }

            // Fetch Leaderboard
            const lbRes = await fetch(`${baseUrl}/leaderboard?t=${timestamp}`);
            if (lbRes.ok) {
                const lbData = await lbRes.json();
                setLeaderboard(lbData || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    // ...

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Merhaba,</Text>
                        <Text style={styles.nickname}>{user?.nickname || 'Öğrenci'}</Text>
                    </View>
                    <Text style={styles.emoji}>{user?.emoji || '👋'}</Text>
                </View>

                {/* Streak Card */}
                <View style={[styles.card, styles.streakCard]}>
                    <View style={styles.streakInfo}>
                        <Text style={styles.streakTitle}>Günlük Seri</Text>
                        <Text style={styles.streakCount}>{user?.streak || 0} Gün</Text>
                        <Text style={styles.streakSub}>Her gün gir, alevi söndürme!</Text>
                    </View>
                    <Ionicons name="flame" size={60} color={COLORS.primary} />
                </View>

                {/* Total Score */}
                <View style={styles.statsRow}>
                    <View style={[styles.card, styles.statCard]}>
                        <Ionicons name="trophy" size={24} color={COLORS.gold} />
                        <Text style={styles.statLabel}>Toplam Puan</Text>
                        <Text style={styles.statValue}>{user?.total_score || 0}</Text>
                    </View>
                    <View style={[styles.card, styles.statCard]}>
                        <Ionicons name="star" size={24} color={COLORS.secondary} />
                        <Text style={styles.statLabel}>Seviye</Text>
                        <Text style={styles.statValue}>{Math.floor((user?.total_score || 0) / 100) + 1}</Text>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.playButton} onPress={() => navigation.navigate('Tests')}>
                    <Text style={styles.playButtonText}>Hemen Test Çöz</Text>
                    <Ionicons name="arrow-forward-circle" size={30} color={COLORS.white} />
                </TouchableOpacity>

                {/* Leaderboard */}
                <Text style={styles.sectionTitle}>🏆 Haftanın Liderleri</Text>
                <View style={styles.leaderboardContainer}>
                    {leaderboard.map((item, index) => (
                        <View key={index} style={styles.leaderboardItem}>
                            <Text style={styles.rank}>#{index + 1}</Text>
                            <Text style={styles.lbEmoji}>{item.emoji}</Text>
                            <Text style={styles.lbName}>{item.nickname}</Text>
                            <Text style={styles.lbScore}>{item.score} P</Text>
                        </View>
                    ))}
                    {leaderboard.length === 0 && <Text style={{ textAlign: 'center', color: '#999' }}>Henüz veri yok.</Text>}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 16,
        color: COLORS.text,
        opacity: 0.7,
    },
    nickname: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    emoji: {
        fontSize: 40,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    streakCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF5F5', // Light red bg
    },
    streakInfo: {
        flex: 1,
    },
    streakTitle: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    streakCount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    streakSub: {
        fontSize: 12,
        color: COLORS.text,
        opacity: 0.6,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 15,
    },
    statLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        marginTop: 5,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    playButton: {
        backgroundColor: COLORS.secondary,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    playButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
    },
    leaderboardContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 15,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    rank: {
        width: 30,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    lbEmoji: {
        fontSize: 20,
        marginRight: 10,
    },
    lbName: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    lbScore: {
        fontWeight: 'bold',
        color: COLORS.primary,
    },
});
