import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    background: '#F7F9FC',
    text: '#2C3E50',
    white: '#FFFFFF',
    success: '#2ECC71',
};

// Use real Ad Unit IDs
const adUnitId = __DEV__
    ? TestIds.REWARDED // Test mode
    : Platform.OS === 'ios'
        ? 'ca-app-pub-4680021224989326/6538189156' // iOS Rewarded
        : 'ca-app-pub-4680021224989326/1285862477'; // Android Rewarded



const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: false,
});

interface RewardedAdButtonProps {
    onRewardGranted?: (newBalance: number) => void;
}

export default function RewardedAdButton({ onRewardGranted }: RewardedAdButtonProps) {
    const [adLoaded, setAdLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {

            setAdLoaded(true);
            setLoading(false);
        });

        const unsubscribeEarned = rewardedAd.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            async (reward) => {

                await grantReward();
            }
        );

        const unsubscribeClosed = rewardedAd.addAdEventListener(
            AdEventType.CLOSED,
            () => {
                setAdLoaded(false);
                loadAd();
            }
        );

        const unsubscribeError = rewardedAd.addAdEventListener(
            AdEventType.ERROR,
            (error) => {
                console.error('AdMob Error Detail:', JSON.stringify(error, null, 2));
                setAdLoaded(false);
                setLoading(false);

                // If we are in development and getting internal error, 
                // we might want to show a 'Simulate Ad' button instead of just hanging
                if (__DEV__) {
                    console.warn('Development focus: Ad failed but we will allow testing if needed.');
                }
            }
        );

        loadAd();

        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
        };
    }, []);

    const loadAd = () => {
        if (loading) return;

        setLoading(true);
        try {
            rewardedAd.load();
        } catch (e) {
            console.error('Load execution error:', e);
            setLoading(false);
        }
    };

    const showAd = () => {
        if (adLoaded) {
            rewardedAd.show();
        } else if (__DEV__) {
            // BACKUP FOR EMULATOR TESTING
            Alert.alert(
                'Geliştirici Modu: Reklam Yüklenemedi',
                'Emülatör hatası nedeniyle gerçek reklam yüklenemedi. Test akışı için ödülü simüle etmek ister misiniz?',
                [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Ödülü Simüle Et (Dev Only)', onPress: () => grantReward() }
                ]
            );
        } else {
            Alert.alert('Reklam Hazırlanıyor', 'Lütfen birkaç saniye bekleyin.');
        }
    };

    const grantReward = async () => {
        try {
            const token = await AsyncStorage.getItem('AUTH_TOKEN');
            const response = await fetch(`${API_URL}/api/v1/user/reward`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reward_type: 'ad_watch',
                }),
            });

            const data = await response.json();
            if (data.success) {
                Alert.alert(
                    '🎉 Tebrikler!',
                    `${data.added} token kazandınız! Yeni bakiyeniz: ${data.new_balance}`,
                    [{ text: 'Harika!' }]
                );
                if (onRewardGranted) {
                    onRewardGranted(data.new_balance);
                }
            }
        } catch (error) {
            console.error('Error granting reward:', error);
            Alert.alert('Hata', 'Token eklenirken bir sorun oluştu.');
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button, !adLoaded && !__DEV__ && styles.buttonDisabled]}
            onPress={showAd}
            disabled={!adLoaded && !__DEV__}
        >
            {loading ? (
                <ActivityIndicator color={COLORS.white} />
            ) : (
                <>
                    <Ionicons name="play-circle" size={24} color={COLORS.white} />
                    <Text style={styles.buttonText}>
                        {adLoaded
                            ? 'Reklam İzle & 5 Token Kazan'
                            : (__DEV__ ? 'Simüle Et (Ödülü Al)' : 'Reklam Yükleniyor...')}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        backgroundColor: COLORS.success,
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonDisabled: {
        backgroundColor: '#BDC3C7',
        elevation: 0,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
