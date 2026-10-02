import React, { useEffect, useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://webpd411.itstep.click';
const PROFILE_URL = `${BASE_URL}/account/profile`;
const LEGACY_PROFILE_URL = `${BASE_URL}/api/account/profile`;

export default function ProfileScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadProfile = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                Alert.alert('Помилка', 'Ви не авторизовані. Увійдіть у систему.');
                navigation.replace('Login');
                return;
            }

            const requestOptions = {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            };

            let response = await fetch(PROFILE_URL, requestOptions);
            if (response.status === 404) {
                response = await fetch(LEGACY_PROFILE_URL, requestOptions);
            }

            if (response.status === 401) {
                await AsyncStorage.removeItem('userToken');
                Alert.alert('Сесія завершена', 'Будь ласка, увійдіть знову.');
                navigation.replace('Login');
                return;
            }

            const responseText = await response.text();
            let data = null;
            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch {
                data = null;
            }

            if (response.ok && data) {
                setProfile(data);
            } else {
                Alert.alert('Помилка', (data && (data.title || data.message)) || 'Не вдалося завантажити профіль');
            }
        } catch (error) {
            Alert.alert('Помилка мережі', 'Не вдалося зєднатися із сервером');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [navigation]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userToken');
        navigation.replace('Login');
    };

    const getImageUrl = () => {
        const image =
            profile?.imageUrl ||
            profile?.image ||
            profile?.photo ||
            profile?.avatar;
        if (!image) return null;
        if (image.startsWith('http')) return image;
        if (image.startsWith('/')) return `${BASE_URL}${image}`;
        return `${BASE_URL}/images/${image}`;
    };

    const imageUrl = profile ? getImageUrl() : null;
    const fullName = [profile?.firstName, profile?.lastName]
        .filter(Boolean)
        .join(' ') || profile?.name || 'Користувач';

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loaderText}>Завантаження профілю...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadProfile(true)}
                            colors={['#4F46E5']}
                        />
                    }
                >
                    <View style={styles.card}>
                        <View style={styles.avatarWrapper}>
                            {imageUrl ? (
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarPlaceholderText}>
                                        {fullName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.name}>{fullName}</Text>
                        {profile?.email && (
                            <Text style={styles.email}>{profile.email}</Text>
                        )}

                        <View style={styles.divider} />

                        {profile?.phone && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Телефон</Text>
                                <Text style={styles.infoValue}>{profile.phone}</Text>
                            </View>
                        )}
                        {profile?.dateOfBirth && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Дата народження</Text>
                                <Text style={styles.infoValue}>{profile.dateOfBirth}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <Text style={styles.logoutButtonText}>Вихід</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarWrapper: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#4F46E5',
    },
    avatarPlaceholder: {
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 44,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },
    infoRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: '#1F2937',
    },
    logoutButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
