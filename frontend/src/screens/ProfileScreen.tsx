import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
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
    purple: '#9B59B6',
    softBlue: '#D6EAF8',
    gray: '#7F8C8D',
};

const EMOJIS = ['👨‍🏫', '👩‍🏫', '🎓', '📚', '✏️', '🧠', '🚀', '⭐', '🦉', '🦁', '🦊', '🦄'];

export default function ProfileScreen({ navigation, onLogout }: any) {
    const [user, setUser] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editNickname, setEditNickname] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            if (!userId) {
                if (onLogout) onLogout();
                return;
            }

            const baseUrl = API_URL;
            const timestamp = Date.now();
            const token = await AsyncStorage.getItem('AUTH_TOKEN');

            // Fetch User
            const userRes = await fetch(`${baseUrl}/user/${userId}?t=${timestamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userRes.ok) {
                setUser(await userRes.json());
            } else if (userRes.status === 401) {
                // Token invalid or expired
                await AsyncStorage.multiRemove(['USER_ID', 'AUTH_TOKEN']);
                if (onLogout) onLogout();
                return;
            }

            // Fetch History
            const histRes = await fetch(`${baseUrl}/user/history/${userId}?t=${timestamp}`);
            if (histRes.ok) {
                const histData = await histRes.json();
                setHistory(histData || []);
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

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleUpdateProfile = async () => {
        if (!editNickname.trim()) {
            Alert.alert('Hata', 'İsim boş olamaz.');
            return;
        }

        setIsSaving(true);
        try {
            const token = await AsyncStorage.getItem('AUTH_TOKEN');
            const res = await fetch(`${API_URL}/user/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nickname: editNickname, emoji: editEmoji })
            });

            if (res.ok) {
                setIsEditModalVisible(false);
                fetchData();
            } else {
                const errorData = await res.text();
                if (res.status === 401) {
                    Alert.alert('Hata', 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
                    await AsyncStorage.multiRemove(['USER_ID', 'AUTH_TOKEN']);
                    if (onLogout) onLogout();
                } else if (res.status === 409) {
                    Alert.alert('Hata', 'Bu takma ad başka bir kullanıcı tarafından kullanılıyor.');
                } else {
                    Alert.alert('Hata', `Güncelleme başarısız: ${errorData || res.status}`);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const openEditModal = () => {
        setEditNickname(user?.nickname || '');
        setEditEmoji(user?.emoji || '👤');
        setIsEditModalVisible(true);
    };

    // Level Progress from Backend
    const currentLevel = user?.level || 1;
    const progress = user?.xp || 0;
    const pointsNeeded = 100 - progress;

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Chart Data (Last 5 tests)
    const chartData = history.slice(0, 5).reverse(); // Show oldest to newest of the last 5
    const maxScore = 100; // Assuming tests are out of 100 mostly

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Profile Card */}
                <View style={styles.profileHeader}>
                    <Text style={styles.emoji}>{user?.emoji || '👤'}</Text>
                    <Text style={styles.nickname}>{user?.nickname || 'Öğrenci'}</Text>
                    <View style={styles.headerButtons}>
                        <View style={styles.levelBadge}>
                            <Ionicons name="star" size={12} color={COLORS.white} />
                            <Text style={styles.levelText}>Seviye {currentLevel}</Text>
                        </View>
                        <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
                            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.editButtonText}>Düzenle</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Level Progress */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>Seviye İlerlemesi</Text>
                        <Text style={styles.progressText}>{progress} / 100 Puan</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.nextLevelText}>
                        <Ionicons name="arrow-up-circle-outline" size={14} /> Bir sonraki seviyeye {pointsNeeded} puan kaldı!
                    </Text>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
                        <Text style={styles.infoText}>
                            Her 100 puan topladığında seviye atlarsın. Günlük serini koruyarak ekstra motive olabilirsin! 🔥
                        </Text>
                    </View>
                </View>

                {/* Performance Chart */}
                {history.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Son Performansım</Text>
                        <View style={styles.chartContainer}>
                            {chartData.map((item, index) => (
                                <View key={index} style={styles.chartBarWrapper}>
                                    <Text style={styles.barLabelTop}>{item.score}</Text>
                                    <View style={[styles.chartBar, { height: (item.score / maxScore) * 100 }]} />
                                    <Text style={styles.barLabelBottom} numberOfLines={1}>{index + 1}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.chartCaption}>Son {chartData.length} Test</Text>
                    </View>
                )}

                {/* Recent History */}
                <Text style={styles.sectionTitle}>📝 Test Geçmişi</Text>
                <View style={styles.historyList}>
                    {history.map((item, index) => (
                        <View key={index} style={styles.historyItem}>
                            <View style={styles.historyIcon}>
                                <Ionicons name="checkmark-circle" size={24} color={COLORS.secondary} />
                            </View>
                            <View style={styles.historyInfo}>
                                <Text style={styles.historyTitle}>{item.title || 'Genel Test'}</Text>
                                <Text style={styles.historyDate}>{item.date}</Text>
                            </View>
                            <Text style={styles.historyScore}>{item.score} P</Text>
                        </View>
                    ))}
                    {history.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Henüz hiç test çözmedin.</Text>
                            <TouchableOpacity style={styles.letsGoButton} onPress={() => navigation.navigate('Tests')}>
                                <Text style={styles.letsGoText}>İlk Testini Çöz</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Edit Modal */}
                <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Profili Düzenle</Text>

                            <Text style={styles.label}>Yeni Takma Ad</Text>
                            <TextInput
                                style={styles.input}
                                value={editNickname}
                                onChangeText={setEditNickname}
                                placeholder="Takma adınızı girin"
                            />

                            <Text style={styles.label}>Emoji Seç</Text>
                            <View style={styles.emojiGrid}>
                                {EMOJIS.map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[styles.modalEmojiItem, editEmoji === emoji && styles.modalEmojiSelected]}
                                        onPress={() => setEditEmoji(emoji)}
                                    >
                                        <Text style={styles.modalEmojiText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setIsEditModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Vazgeç</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleUpdateProfile}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.saveButtonText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 10,
    },
    nickname: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 5,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.purple,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    levelText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    progressText: {
        fontSize: 14,
        color: COLORS.text,
        opacity: 0.6,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#F0F2F5',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 5,
    },
    nextLevelText: {
        fontSize: 13,
        color: COLORS.text,
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: 15,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.softBlue,
        padding: 10,
        borderRadius: 10,
        gap: 10,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.text,
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 120,
        marginTop: 10,
    },
    chartBarWrapper: {
        alignItems: 'center',
        width: 30,
    },
    chartBar: {
        width: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 5,
        minHeight: 5,
    },
    barLabelTop: {
        fontSize: 10,
        color: COLORS.text,
        marginBottom: 2,
    },
    barLabelBottom: {
        fontSize: 10,
        color: '#999',
        marginTop: 5,
    },
    chartCaption: {
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    historyList: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 5,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    historyIcon: {
        marginRight: 15,
        opacity: 0.8,
    },
    historyInfo: {
        flex: 1,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    historyDate: {
        fontSize: 12,
        color: '#999',
    },
    historyScore: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    emptyState: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        marginBottom: 15,
    },
    letsGoButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    letsGoText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEAEA',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    editButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 30,
        paddingBottom: 50,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F7F9FC',
        padding: 15,
        borderRadius: 15,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    modalEmojiItem: {
        width: '18%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modalEmojiSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF5F5',
    },
    modalEmojiText: {
        fontSize: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F0F2F5',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    cancelButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
});
