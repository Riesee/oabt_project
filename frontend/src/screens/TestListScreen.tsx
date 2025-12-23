import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

    // ... lines 13 ...

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const baseUrl = API_URL;

                const res = await fetch(`${baseUrl}/tests`);
                if (res.ok) {
                    const data = await res.json();
                    setTests(data || []); // Ensure array
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
    }, []);

    const renderItem = ({ item, index }: any) => (
        <TouchableOpacity
            style={styles.testCard}
            onPress={() => navigation.navigate('TestScreen', { testId: item.id, testTitle: item.title })}
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
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={tests}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>Henüz test bulunmamaktadır.</Text>}
                />
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
});
