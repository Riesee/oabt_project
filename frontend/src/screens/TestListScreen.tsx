import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdBanner from '../components/AdBanner';
import RewardedAdButton from '../components/RewardedAdButton';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
    success: '#27AE60',
    successLight: '#E8F5E9',
};

import { API_URL } from '../config';

export default function TestListScreen({ navigation }: any) {
    const [categories, setCategories] = useState<any[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [userTokens, setUserTokens] = useState(0);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('USER_ID');
            const res = await fetch(`${API_URL}/tests/categories?userId=${userId || ''}`);
            if (res.ok) {
                const data = await res.json();
                setCategories(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Error fetching categories:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTests = async (category: string) => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('USER_ID');
            const res = await fetch(`${API_URL}/tests?userId=${userId || ''}&category=${encodeURIComponent(category)}`);
            if (res.ok) {
                const data = await res.json();
                setTests(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Error fetching tests:', e);
        } finally {
            setLoading(false);
        }
    };

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

    useFocusEffect(
        useCallback(() => {
            if (selectedCategory) {
                fetchTests(selectedCategory);
            } else {
                fetchCategories();
            }
            fetchUserData();
        }, [selectedCategory])
    );

    const handleTestPress = (test: any) => {
        navigation.navigate('TestScreen', { testId: test.id, testTitle: test.title });
    };

    const handleCategoryPress = (category: any) => {
        setSelectedCategory(category.name || category);
    };

    const renderCategoryItem = ({ item, index }: any) => {
        const isAllRead = item.completedTests !== undefined && item.completedTests === item.totalTests && item.totalTests > 0;

        return (
            <TouchableOpacity
                style={[
                    styles.testCard,
                    isAllRead && styles.testCardCompleted
                ]}
                onPress={() => handleCategoryPress(item)}
            >
                <View style={[
                    styles.iconBox,
                    { backgroundColor: isAllRead ? '#C8E6C9' : (index % 2 === 0 ? '#E8F6F3' : '#FFF5F5') }
                ]}>
                    <Ionicons
                        name={isAllRead ? "checkmark-circle" : "folder-open"}
                        size={24}
                        color={isAllRead ? COLORS.success : (index % 2 === 0 ? COLORS.secondary : COLORS.primary)}
                    />
                </View>
                <View style={styles.testInfo}>
                    <Text style={styles.testTitle}>{item.name || item}</Text>
                    <View style={styles.descRow}>
                        <Text style={styles.testDesc}>Alan Bilgisi Denemeleri</Text>
                        {item.completedTests !== undefined && (
                            <View style={isAllRead ? styles.completedBadge : styles.progressBadge}>
                                <Text style={isAllRead ? styles.completedText : styles.progressText}>{item.completedTests}/{item.totalTests} Okundu</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Ionicons
                    name={isAllRead ? "checkmark-done" : "chevron-forward"}
                    size={24}
                    color={isAllRead ? COLORS.success : "#BDC3C7"}
                />
            </TouchableOpacity>
        );
    };

    const renderTestItem = ({ item, index }: any) => {
        const isCompleted = item.completed;

        return (
            <TouchableOpacity
                style={[
                    styles.testCard,
                    isCompleted && styles.testCardCompleted
                ]}
                onPress={() => handleTestPress(item)}
            >
                <View style={[
                    styles.iconBox,
                    { backgroundColor: isCompleted ? '#C8E6C9' : (index % 2 === 0 ? '#E8F6F3' : '#FFF5F5') }
                ]}>
                    <Ionicons
                        name={isCompleted ? "checkmark-circle" : "document-text"}
                        size={24}
                        color={isCompleted ? COLORS.success : (index % 2 === 0 ? COLORS.secondary : COLORS.primary)}
                    />
                </View>
                <View style={styles.testInfo}>
                    <Text style={styles.testTitle}>{item.title}</Text>
                    <View style={styles.descRow}>
                        <Text style={styles.testDesc}>{item.description || '20 Soru • Alan Bilgisi'}</Text>
                        {isCompleted && (
                            <View style={styles.completedBadge}>
                                <Text style={styles.completedText}>Okundu</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Ionicons
                    name={isCompleted ? "checkmark-done" : "chevron-forward"}
                    size={24}
                    color={isCompleted ? COLORS.success : "#BDC3C7"}
                />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    {selectedCategory && (
                        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedCategory(null)}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>
                        {selectedCategory ? selectedCategory : 'Konu Kategorileri'}
                    </Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={selectedCategory ? tests : categories}
                    renderItem={selectedCategory ? renderTestItem : renderCategoryItem}
                    keyExtractor={(item, index) => selectedCategory ? (item.id || index.toString()) : `cat-${index}`}
                    contentContainerStyle={[styles.listContent, !isPremium && { paddingBottom: 80 }]}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {selectedCategory ? 'Bu kategoride test bulunmamaktadır.' : 'Henüz kategori bulunmamaktadır.'}
                        </Text>
                    }
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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
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
        borderWidth: 1,
        borderColor: 'transparent',
    },
    testCardCompleted: {
        backgroundColor: COLORS.successLight,
        borderColor: '#C8E6C9',
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
    descRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    testDesc: {
        fontSize: 12,
        color: '#7F8C8D',
    },
    completedBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    completedText: {
        fontSize: 10,
        color: COLORS.white,
        fontWeight: 'bold',
    },
    progressBadge: {
        backgroundColor: '#F0F2F5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    progressText: {
        fontSize: 10,
        color: '#7F8C8D',
        fontWeight: 'bold',
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
