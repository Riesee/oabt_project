import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdBanner from '../components/AdBanner';
import RewardedAdButton from '../components/RewardedAdButton';
import { API_URL } from '../config';
import { SUBJECT_EMOJIS } from '../constants/emojis';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
    border: '#E0E0E0',
    muted: '#7F8C8D',
};

export default function SubjectsScreen() {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'bilgi' | 'egitim'>('bilgi');
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [userTokens, setUserTokens] = useState(0);

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${API_URL}/subjects`);
            if (response.ok) {
                const data = await response.json();
                setSubjects(data || []);
            }
        } catch (error) {
            console.error('Fetch subjects error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
        checkPremiumStatus();
    }, []);

    const checkPremiumStatus = async () => {
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            const token = await AsyncStorage.getItem('AUTH_TOKEN');
            if (!userId) return;
            const res = await fetch(`${API_URL}/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsPremium(data.is_premium || false);
                setUserTokens(data.tokens || 0);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSubjects();
    }, []);

    const navigateToSubject = (title: string) => {
        const subject = subjects.find(s => s.title === title);
        if (subject) {
            setActiveTab(subject.category as any);
            setSelectedSubject(subject);
        }
    };

    const filteredSubjects = subjects.filter(s => s.category === activeTab);

    const renderItem = (item: any, index: number) => (
        <TouchableOpacity
            key={index}
            style={styles.subjectCard}
            onPress={() => setSelectedSubject(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.subjectEmoji}>{SUBJECT_EMOJIS[item.title] || SUBJECT_EMOJIS['default']}</Text>
                    <Text style={styles.subjectTitle}>{item.title}</Text>
                </View>
                <View style={styles.weightBadge}>
                    <Text style={styles.weightText}>{item.weight}</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.readMore}>Konuyu İncele</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.secondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Konu Anlatımı</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'bilgi' && styles.activeTab]}
                    onPress={() => setActiveTab('bilgi')}
                >
                    <Text style={[styles.tabText, activeTab === 'bilgi' && styles.activeTabText]}>Alan Bilgisi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'egitim' && styles.activeTab]}
                    onPress={() => setActiveTab('egitim')}
                >
                    <Text style={[styles.tabText, activeTab === 'egitim' && styles.activeTabText]}>Alan Eğitimi</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                >
                    {filteredSubjects.length > 0 ? (
                        filteredSubjects.map((item, index) => renderItem(item, index))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>Bu kategoride konu bulunamadı.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            <Modal
                visible={!!selectedSubject}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setSelectedSubject(null)}
            >
                <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setSelectedSubject(null)}
                            style={styles.closeButton}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Ionicons name="close-circle" size={32} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalSubTitle} numberOfLines={1}>Konu Detayı</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    >
                        <View style={styles.contentHeader}>
                            <Text style={styles.detailTitle}>{selectedSubject?.title}</Text>
                            <View style={styles.detailWeight}>
                                <Ionicons name="analytics" size={16} color={COLORS.primary} />
                                <Text style={styles.detailWeightText}>Sınav Ağırlığı: {selectedSubject?.weight}</Text>
                            </View>
                        </View>

                        <View style={styles.contentBody}>
                            {selectedSubject?.content ? (
                                <Text style={styles.contentText}>{selectedSubject.content.trim()}</Text>
                            ) : (
                                <View style={styles.emptyContent}>
                                    <Ionicons name="hourglass-outline" size={64} color={COLORS.border} />
                                    <Text style={styles.emptyTextTitle}>İçerik Hazırlanıyor</Text>
                                    <Text style={styles.emptyText}>Bu konu için detaylı anlatım çok yakında burada olacak.</Text>
                                </View>
                            )}
                        </View>

                        {selectedSubject?.related && selectedSubject.related.length > 0 && (
                            <View style={styles.relatedSection}>
                                <Text style={styles.relatedTitle}>İlgili Konular:</Text>
                                {selectedSubject.related.map((title: string, idx: number) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.relatedButton}
                                        onPress={() => navigateToSubject(title)}
                                    >
                                        <Ionicons name="link" size={18} color={COLORS.secondary} />
                                        <Text style={styles.relatedButtonText}>{title}</Text>
                                        <Ionicons name="arrow-forward" size={14} color={COLORS.muted} style={{ marginLeft: 'auto' }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Bottom Ad Banner */}
            {!isPremium && <AdBanner showAd={!isPremium} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: COLORS.white,
        marginBottom: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 16,
        color: '#7F8C8D',
        fontWeight: '500',
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 15,
    },
    subjectCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    subjectTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        lineHeight: 22,
        marginRight: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    subjectEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    weightBadge: {
        backgroundColor: '#FFF5F5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FFE3E3',
    },
    weightText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#F0F2F5',
        paddingTop: 12,
    },
    readMore: {
        fontSize: 14,
        color: COLORS.secondary,
        marginRight: 4,
        fontWeight: '600',
    },
    modalRoot: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeButton: {
        padding: 4,
    },
    modalSubTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.muted,
        textAlign: 'center',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    contentHeader: {
        paddingVertical: 25,
    },
    detailTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 12,
        lineHeight: 32,
    },
    detailWeight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6FFFA',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    detailWeightText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginLeft: 8,
    },
    contentBody: {
        backgroundColor: '#FFFFFF',
        marginBottom: 30,
    },
    contentText: {
        fontSize: 17,
        lineHeight: 28,
        color: COLORS.text,
        letterSpacing: 0.3,
    },
    relatedSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    relatedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    relatedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    relatedButtonText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '600',
        marginLeft: 10,
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        paddingVertical: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        paddingVertical: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTextTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 20,
    },
    emptyText: {
        marginTop: 10,
        textAlign: 'center',
        color: COLORS.muted,
        fontSize: 15,
        lineHeight: 22,
    }
});
