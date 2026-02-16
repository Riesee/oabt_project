import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

interface AdBannerProps {
    showAd: boolean; // Control from parent (e.g., if user is premium, pass false)
}

export default function AdBanner({ showAd }: AdBannerProps) {
    if (!showAd) return null;

    // Use real Ad Unit IDs
    const adUnitId = __DEV__
        ? TestIds.BANNER // Test mode
        : Platform.OS === 'ios'
            ? 'ca-app-pub-4680021224989326/4684285071' // iOS Banner
            : 'ca-app-pub-4680021224989326/8396299371'; // Android Banner

    return (
        <View style={styles.container}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: false,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 10,
    },
});
