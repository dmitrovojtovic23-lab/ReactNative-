import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://webpd411.itstep.click/account/register';
const LEGACY_API_URL = 'https://webpd411.itstep.click/api/account/register';

function getServerErrorMessage(data, responseText, status) {
    const messages = [];
    const getMessages = (value) => {
        if (typeof value === 'string' && value.trim()) {
            return [value.trim()];
        }
        if (Array.isArray(value)) {
            return value.flatMap(getMessages);
        }
        if (value && typeof value === 'object') {
            return getMessages(value.description || value.message || value.title || value.error);
        }
        return [];
    };

    if (data && typeof data === 'object') {
        if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
            Object.entries(data.errors).forEach(([field, errors]) => {
                getMessages(errors).forEach((message) => messages.push(`${field}: ${message}`));
            });
        } else {
            messages.push(...getMessages(data.errors));
        }
        messages.push(...getMessages(data.message));
        messages.push(...getMessages(data.detail));
        messages.push(...getMessages(data.title));
        messages.push(...getMessages(data.error));
    } else {
        messages.push(...getMessages(data));
    }

    if (messages.length === 0 && responseText.trim() && !responseText.trim().startsWith('<')) {
        messages.push(responseText.trim());
    }

    return [...new Set(messages)].join('\n') || `Помилка сервера (код ${status})`;
}

export default function RegisterScreen({ navigation }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Помилка', 'Потрібен дозвіл на доступ до галереї');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImage(result.assets[0]);
        }
    };

    const handleRegister = async () => {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword || !image) {
            Alert.alert('Помилка', 'Заповніть усі поля та виберіть фото');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Помилка', 'Пароль має містити щонайменше 6 символів');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Помилка', 'Паролі не співпадають');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('FirstName', firstName.trim());
            formData.append('LastName', lastName.trim());
            formData.append('Email', email.trim());
            formData.append('Password', password);
            formData.append('ConfirmPassword', confirmPassword);
            formData.append('Image', {
                uri: image.uri,
                name: image.fileName || 'photo.jpg',
                type: image.mimeType || 'image/jpeg',
            });

            const requestOptions = {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            };
            let response = await fetch(API_URL, requestOptions);
            if (response.status === 404) {
                response = await fetch(LEGACY_API_URL, requestOptions);
            }

            const responseText = await response.text();
            let data = null;
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    data = null;
                }
            }

            if (response.ok && data && data.token) {
                await AsyncStorage.setItem('userToken', data.token);
                Alert.alert('Успіх', 'Реєстрація виконана успішно!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (navigation && typeof navigation.navigate === 'function') {
                                navigation.navigate('Login');
                            }
                        },
                    },
                ]);
            } else {
                const errorMessage = response.ok
                    ? 'Сервер не повернув токен авторизації'
                    : getServerErrorMessage(data, responseText, response.status);
                Alert.alert('Помилка реєстрації', errorMessage);
            }
        } catch (error) {
            Alert.alert('Помилка мережі', "Не вдалося з'єднатися із сервером. Перевірте підключення до інтернету.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.innerContainer}
            >
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Реєстрація</Text>
                        <Text style={styles.subtitle}>Створіть свій акаунт</Text>

                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image.uri }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarText}>+</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Додайте своє фото</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Ім'я</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Іван"
                                placeholderTextColor="#999"
                                value={firstName}
                                onChangeText={setFirstName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Прізвище</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Шевченко"
                                placeholderTextColor="#999"
                                value={lastName}
                                onChangeText={setLastName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="example@mail.com"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Пароль</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Мінімум 6 символів"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Підтвердження пароля</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="#999"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Зареєструватися</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => {
                                if (navigation && typeof navigation.navigate === 'function') {
                                    navigation.navigate('Login');
                                }
                            }}
                        >
                            <Text style={styles.linkText}>Вже маєте акаунт? Увійти</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    innerContainer: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 20,
    },
    avatarContainer: {
        alignSelf: 'center',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarPlaceholder: {
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#4F46E5',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 40,
        color: '#4F46E5',
        fontWeight: '300',
        marginTop: -4,
    },
    avatarHint: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
    },
    button: {
        height: 48,
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#A5B4FC',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#4F46E5',
        fontSize: 14,
        fontWeight: '600',
    },
});
