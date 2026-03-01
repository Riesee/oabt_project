import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AdBanner from '../components/AdBanner';
import RewardedAdButton from '../components/RewardedAdButton';
import { API_URL } from '../config';
import { getEmojiById } from '../constants/emojis';

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
    const [isPremium, setIsPremium] = useState(false);
    const [userTokens, setUserTokens] = useState(0);
    const [categoryProgress, setCategoryProgress] = useState<any[]>([]);

    const [isStartingTest, setIsStartingTest] = useState(false);

    const startRandomTest = async () => {
        try {
            setIsStartingTest(true);
            const userId = await AsyncStorage.getItem('USER_ID');
            if (!userId) return;

            const res = await fetch(`${API_URL}/api/v1/test/random-unsolved?userId=${userId}`);
            if (res.ok) {
                const test = await res.json();
                navigation.navigate('TestScreen', {
                    testId: test.id,
                    testTitle: test.title
                });
            } else {
                // If error, just go to test list
                navigation.navigate('Tests');
            }
        } catch (e) {
            console.error('Error starting random test:', e);
            navigation.navigate('Tests');
        } finally {
            setIsStartingTest(false);
        }
    };

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

            const token = await AsyncStorage.getItem('AUTH_TOKEN');

            const userRes = await fetch(`${baseUrl}/user/${userId}?t=${timestamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData);
                setIsPremium(userData.is_premium || false);
                setUserTokens(userData.tokens || 0);
            } else {
                // User not found or Auth error

                await AsyncStorage.multiRemove(['USER_ID', 'AUTH_TOKEN']);
                if (onLogout) onLogout();
                return;
            }

            // Fetch Leaderboard
            const lbRes = await fetch(`${baseUrl}/leaderboard?t=${timestamp}`);
            if (lbRes.ok) {
                const lbData = await lbRes.json();
                setLeaderboard(lbData || []);
            }

            // Fetch Category Progress
            const cpRes = await fetch(`${baseUrl}/tests/categories?userId=${userId}&t=${timestamp}`);
            if (cpRes.ok) {
                const cpData = await cpRes.json();
                setCategoryProgress(cpData || []);
            }
        } catch (e) {
            console.error('Fetch error:', e);
            // If we get an error here, especially a network error while switching backends,
            // it's safer to logout to clear old session data.
            await AsyncStorage.multiRemove(['USER_ID', 'AUTH_TOKEN']);
            if (onLogout) onLogout();
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
                    <Text style={styles.emoji}>{getEmojiById(user?.emoji)}</Text>
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
                        <Text style={styles.statValue}>{user?.level || 1}</Text>
                        <Text style={styles.statSub}>{user?.xp || 0}/100 XP</Text>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={[styles.playButton, isStartingTest && { opacity: 0.8 }]}
                    onPress={startRandomTest}
                    disabled={isStartingTest}
                >
                    <Text style={styles.playButtonText}>
                        {isStartingTest ? 'Test Hazırlanıyor...' : 'Hemen Test Çöz'}
                    </Text>
                    {isStartingTest ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Ionicons name="arrow-forward-circle" size={30} color={COLORS.white} />
                    )}
                </TouchableOpacity>

                {/* Category Progress Overview */}
                {categoryProgress.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>📚 Konu İlerlemen</Text>
                        <View style={styles.progressOverview}>
                            {categoryProgress.slice(0, 3).map((category, index) => {
                                const progressPercentage = category.total_tests > 0 ? 
                                    (category.completed_tests / category.total_tests) * 100 : 0;
                                return (
                                    <View key={index} style={styles.progressItem}>
                                        <Text style={styles.progressCategoryName} numberOfLines={1}>
                                            {category.category}
                                        </Text>
                                        <View style={styles.progressBarSmall}>
                                            <View 
                                                style={[
                                                    styles.progressFillSmall, 
                                                    { width: `${progressPercentage}%` }
                                                ]} 
                                            />
                                        </View>
                                        <Text style={styles.progressPercentageSmall}>
                                            {category.completed_tests}/{category.total_tests}
                                        </Text>
                                    </View>
                                );
                            })}
                            <TouchableOpacity 
                                style={styles.viewAllButton}
                                onPress={() => navigation.navigate('Tests')}
                            >
                                <Text style={styles.viewAllText}>Tümünü Gör</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* Leaderboard */}
                <Text style={styles.sectionTitle}>🏆 Haftanın Liderleri</Text>
                <View style={styles.leaderboardContainer}>
                    {leaderboard.map((item, index) => (
                        <View key={index} style={styles.leaderboardItem}>
                            <Text style={styles.rank}>#{index + 1}</Text>
                            <Text style={styles.lbEmoji}>{getEmojiById(item.emoji)}</Text>
                            <Text style={styles.lbName}>{item.nickname}</Text>
                            <Text style={styles.lbScore}>{item.score} P</Text>
                        </View>
                    ))}
                    {leaderboard.length === 0 && <Text style={{ textAlign: 'center', color: '#999' }}>Henüz veri yok.</Text>}
                </View>

                {/* Token Section hidden for now
                {!isPremium && (
                    <View style={styles.adSection}>
                        <View style={styles.tokenDisplay}>
                            <Ionicons name="diamond" size={20} color={COLORS.primary} />
                            <Text style={styles.tokenText}>{userTokens} Token</Text>
                        </View>
                        <RewardedAdButton onRewardGranted={(newBalance) => setUserTokens(newBalance)} />
                    </View>
                )}
                */}

            </ScrollView>

            {/* Banner Ad at the bottom */}
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
    statSub: {
        fontSize: 10,
        color: '#999',
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
    adSection: {
        marginTop: 20,
        marginBottom: 10,
        alignItems: 'center',
    },
    tokenDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
        marginBottom: 10,
    },
    tokenText: {
        marginLeft: 8,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    bannerContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: COLORS.white,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    progressOverview: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
    },
    progressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    progressCategoryName: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        flex: 1,
    },
    progressBarSmall: {
        flex: 2,
        height: 6,
        backgroundColor: '#E8E8E8',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFillSmall: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    progressPercentageSmall: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
        minWidth: 40,
        textAlign: 'right',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F2F5',
        gap: 5,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
