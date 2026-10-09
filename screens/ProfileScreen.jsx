import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    FlatList,
    RefreshControl,
    ScrollView,
    Modal,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const showAlert = (title, message, buttons) => {
    if (Platform.OS !== 'web') {
        Alert.alert(title, message, buttons);
        return;
    }
    const text = message ? `${title}\n\n${message}` : title;
    if (buttons && buttons.length > 1) {
        if (window.confirm(text)) {
            const action = buttons.find((b) => b.style !== 'cancel');
            if (action && action.onPress) {
                action.onPress();
            }
        }
        return;
    }
    window.alert(text);
};

const BASE_URL = 'https://webpd411.itstep.click';
const PROFILE_URL = `${BASE_URL}/api/account/profile`;
const USERS_URL = `${BASE_URL}/api/account/users`;

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];

const PRIORITIES = [
    { key: 'high', label: 'Високий', color: '#EF4444' },
    { key: 'medium', label: 'Середній', color: '#F59E0B' },
    { key: 'low', label: 'Низький', color: '#10B981' },
];

const FILTERS = [
    { key: 'all', label: 'Усі' },
    { key: 'active', label: 'Активні' },
    { key: 'done', label: 'Виконані' },
];

const getPriority = (key) => PRIORITIES.find((p) => p.key === key) || PRIORITIES[1];

const EMOJIS = ['✨', '🔥', '💪', '🎯', '📚', '🏃', '🛒', '💡', '🎨', '🎧', '🧘', '🍕'];

const createTask = (title, priority, emoji = '✨') => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    priority,
    emoji,
    done: false,
    createdAt: Date.now(),
});

const starterTasks = () => [
    { ...createTask('Ознайомитися з додатком', 'low', '🎈'), done: true },
    createTask('Додати свою першу задачу', 'medium', '🎯'),
    createTask('Змінити задачу кнопкою ✎', 'high', '💡'),
];

const getCheer = (total, percent) => {
    if (total === 0) {
        return 'Додайте першу задачу і вперед! 🚀';
    }
    if (percent === 100) {
        return 'Ураа! Усе виконано, ви супер! 🎉';
    }
    if (percent >= 50) {
        return 'Більше половини вже позаду! 💪';
    }
    if (percent > 0) {
        return 'Чудовий початок, так тримати! 🌟';
    }
    return 'Кожен великий шлях починається з маленького кроку 🌈';
};

const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

export default function ProfileScreen({ token, onLogout }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [tasksReady, setTasksReady] = useState(false);
    const [filter, setFilter] = useState('all');
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [emoji, setEmoji] = useState('✨');
    const [editing, setEditing] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editPriority, setEditPriority] = useState('medium');
    const [editEmoji, setEditEmoji] = useState('✨');
    const [tab, setTab] = useState('tasks');
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersRefreshing, setUsersRefreshing] = useState(false);
    const [usersError, setUsersError] = useState('');

    const loadProfile = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            };

            const response = await fetch(PROFILE_URL, requestOptions);

            if (response.status === 401) {
                await onLogout();
                showAlert('Сесія завершена', 'Будь ласка, увійдіть знову.');
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
                showAlert('Помилка', (data && (data.title || data.message)) || 'Не вдалося завантажити профіль');
            }
        } catch (error) {
            showAlert('Помилка мережі', 'Не вдалося зєднатися із сервером');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, onLogout]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const loadUsers = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setUsersRefreshing(true);
        } else {
            setUsersLoading(true);
        }
        setUsersError('');

        try {
            const response = await fetch(USERS_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                await onLogout();
                showAlert('Сесія завершена', 'Будь ласка, увійдіть знову.');
                return;
            }

            const responseText = await response.text();
            let data = null;
            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch {
                data = null;
            }

            if (response.ok && Array.isArray(data)) {
                setUsers(data);
            } else {
                setUsersError((data && (data.title || data.message)) || 'Не вдалося завантажити список користувачів');
            }
        } catch (error) {
            setUsersError('Не вдалося зєднатися із сервером');
        } finally {
            setUsersLoading(false);
            setUsersRefreshing(false);
        }
    }, [token, onLogout]);

    useEffect(() => {
        if (tab === 'users') {
            loadUsers();
        }
    }, [tab, loadUsers]);

    const userKey = profile ? `tasks:${profile.userId || profile.email || 'user'}` : null;

    useEffect(() => {
        if (!userKey) {
            return undefined;
        }
        let active = true;
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(userKey);
                if (!active) {
                    return;
                }
                const parsed = saved ? JSON.parse(saved) : null;
                setTasks(Array.isArray(parsed) ? parsed : starterTasks());
            } catch {
                if (active) {
                    setTasks([]);
                }
            } finally {
                if (active) {
                    setTasksReady(true);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [userKey]);

    useEffect(() => {
        if (!userKey || !tasksReady) {
            return;
        }
        AsyncStorage.setItem(userKey, JSON.stringify(tasks)).catch(() => {});
    }, [tasks, tasksReady, userKey]);

    const handleLogout = () => {
        showAlert('Вихід', 'Ви впевнені, що хочете вийти з акаунта?', [
            { text: 'Скасувати', style: 'cancel' },
            { text: 'Вийти', style: 'destructive', onPress: () => onLogout() },
        ]);
    };

    const addTask = () => {
        const trimmed = title.trim();
        if (!trimmed) {
            showAlert('Порожня задача', 'Введіть назву задачі.');
            return;
        }
        setTasks((prev) => [createTask(trimmed, priority, emoji), ...prev]);
        setTitle('');
    };

    const openEdit = (task) => {
        setEditing(task);
        setEditTitle(task.title);
        setEditPriority(task.priority);
        setEditEmoji(task.emoji || '✨');
    };

    const closeEdit = () => {
        setEditing(null);
    };

    const saveEdit = () => {
        const trimmed = editTitle.trim();
        if (!trimmed) {
            showAlert('Порожня задача', 'Назва задачі не може бути порожньою.');
            return;
        }
        setTasks((prev) =>
            prev.map((t) =>
                t.id === editing.id
                    ? { ...t, title: trimmed, priority: editPriority, emoji: editEmoji }
                    : t
            )
        );
        setEditing(null);
    };

    const deleteFromEdit = () => {
        const id = editing.id;
        setEditing(null);
        removeTask(id);
    };

    const toggleTask = (id) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    };

    const removeTask = (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    const clearDone = () => {
        setTasks((prev) => prev.filter((t) => !t.done));
    };

    const total = tasks.length;
    const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
    const activeCount = total - doneCount;
    const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

    const visibleTasks = useMemo(() => {
        if (filter === 'active') {
            return tasks.filter((t) => !t.done);
        }
        if (filter === 'done') {
            return tasks.filter((t) => t.done);
        }
        return tasks;
    }, [tasks, filter]);

    const counts = { all: total, active: activeCount, done: doneCount };
    const cheer = getCheer(total, percent);

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
    const firstName = profile?.firstName || fullName;

    const renderPriorityRow = (selectedKey, onSelect) => (
        <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
                const selected = selectedKey === p.key;
                return (
                    <TouchableOpacity
                        key={p.key}
                        onPress={() => onSelect(p.key)}
                        activeOpacity={0.8}
                        style={[
                            styles.priorityChip,
                            selected && { backgroundColor: p.color, borderColor: p.color },
                        ]}
                    >
                        <View
                            style={[
                                styles.priorityDot,
                                { backgroundColor: selected ? '#FFFFFF' : p.color },
                            ]}
                        />
                        <Text style={[styles.priorityChipText, selected && styles.priorityChipTextActive]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderEmojiRow = (selectedEmoji, onSelect) => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.emojiRow}
        >
            {EMOJIS.map((e) => (
                <TouchableOpacity
                    key={e}
                    onPress={() => onSelect(e)}
                    activeOpacity={0.8}
                    style={[styles.emojiChip, selectedEmoji === e && styles.emojiChipActive]}
                >
                    <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const listHeader = (
        <View>
            <View style={styles.addCard}>
                <View style={styles.addRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Нова задача..."
                        placeholderTextColor="#9CA3AF"
                        value={title}
                        onChangeText={setTitle}
                        onSubmitEditing={addTask}
                        returnKeyType="done"
                        maxLength={120}
                    />
                    <TouchableOpacity style={styles.addButton} onPress={addTask} activeOpacity={0.8}>
                        <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
                {renderPriorityRow(priority, setPriority)}
                {renderEmojiRow(emoji, setEmoji)}
            </View>

            <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                    const selected = filter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            onPress={() => setFilter(f.key)}
                            activeOpacity={0.8}
                            style={[styles.filterChip, selected && styles.filterChipActive]}
                        >
                            <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                            <View style={[styles.filterBadge, selected && styles.filterBadgeActive]}>
                                <Text style={[styles.filterBadgeText, selected && styles.filterBadgeTextActive]}>
                                    {counts[f.key]}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderTask = ({ item }) => {
        const p = getPriority(item.priority);
        return (
            <TouchableOpacity
                style={styles.taskCard}
                onPress={() => toggleTask(item.id)}
                activeOpacity={0.85}
            >
                <View style={[styles.taskStripe, { backgroundColor: p.color }]} />
                <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                    {item.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={[styles.emojiBubble, { backgroundColor: `${p.color}22` }]}>
                    <Text style={styles.emojiBubbleText}>{item.emoji || '✨'}</Text>
                </View>
                <View style={styles.taskBody}>
                    <Text style={[styles.taskTitle, item.done && styles.taskTitleDone]} numberOfLines={3}>
                        {item.title}
                    </Text>
                    <View style={styles.taskMeta}>
                        <View style={[styles.metaBadge, { backgroundColor: `${p.color}22` }]}>
                            <Text style={[styles.metaBadgeText, { color: p.color }]}>{p.label}</Text>
                        </View>
                        <Text style={styles.metaDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEdit(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.editText}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => removeTask(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const getUserImage = (user) => {
        const image = user?.imageUrl;
        if (!image) return null;
        if (image.startsWith('http')) return image;
        if (image.startsWith('/')) return `${BASE_URL}${image}`;
        return `${BASE_URL}/images/${image}`;
    };

    const renderUser = ({ item }) => {
        const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Без імені';
        const photo = getUserImage(item);
        const color = AVATAR_COLORS[Math.abs(Number(item.id) || 0) % AVATAR_COLORS.length];
        const isMe = profile && String(item.id) === String(profile.userId);
        return (
            <View style={[styles.userCard, isMe && styles.userCardMe]}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.userAvatar} />
                ) : (
                    <View style={[styles.userAvatar, { backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={styles.userAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.userBody}>
                    <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.userId}>Користувач №{item.id}</Text>
                </View>
                {isMe && (
                    <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>Це ви 🎈</Text>
                    </View>
                )}
            </View>
        );
    };

    const usersEmpty = usersLoading ? (
        <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loaderText}>Завантаження користувачів...</Text>
        </View>
    ) : usersError ? (
        <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>😕</Text>
            <Text style={styles.emptyTitle}>Щось пішло не так</Text>
            <Text style={styles.emptyText}>{usersError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadUsers()} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>Спробувати ще раз</Text>
            </TouchableOpacity>
        </View>
    ) : (
        <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>Поки нікого немає</Text>
            <Text style={styles.emptyText}>Тут зʼявляться зареєстровані користувачі.</Text>
        </View>
    );

    const emptyTitle = filter === 'done' ? 'Поки немає виконаних' : filter === 'active' ? 'Усе зроблено!' : 'Задач поки немає';
    const emptyText = filter === 'done'
        ? 'Позначте задачу виконаною, і вона зʼявиться тут.'
        : filter === 'active'
            ? 'Ви молодець, активних задач не залишилось.'
            : 'Додайте першу задачу у полі вище.';
    const emptyEmoji = filter === 'active' ? '🎉' : filter === 'done' ? '🏁' : '📝';

    const listFooter = doneCount > 0 ? (
        <TouchableOpacity style={styles.clearButton} onPress={clearDone} activeOpacity={0.8}>
            <Text style={styles.clearButtonText}>Очистити виконані ({doneCount})</Text>
        </TouchableOpacity>
    ) : null;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.headerBg}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            {imageUrl ? (
                                <Image source={{ uri: imageUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarPlaceholderText}>
                                        {fullName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.headerTexts}>
                                <Text style={styles.greeting} numberOfLines={1}>Привіт, {firstName} 👋</Text>
                                <Text style={styles.subGreeting} numberOfLines={1}>
                                    {profile?.email || 'Ваші задачі на сьогодні'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                                <Text style={styles.logoutButtonText}>Вийти</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.progressCard}>
                            <View style={styles.progressTop}>
                                <Text style={styles.progressTitle}>Ваш прогрес</Text>
                                <Text style={styles.progressPercent}>{percent}%</Text>
                            </View>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${percent}%` }]} />
                            </View>
                            <Text style={styles.cheerText}>{cheer}</Text>
                            <Text style={styles.progressSub}>
                                Виконано {doneCount} із {total} · Залишилось {activeCount}
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <View style={styles.tabWrap}>
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabButton, tab === 'tasks' && styles.tabButtonActive]}
                        onPress={() => setTab('tasks')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, tab === 'tasks' && styles.tabTextActive]}>📝 Задачі</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, tab === 'users' && styles.tabButtonActive]}
                        onPress={() => setTab('users')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>👥 Користувачі</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {tab === 'users' ? (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderUser}
                    ListHeaderComponent={
                        users.length > 0 ? (
                            <Text style={styles.usersCount}>Зареєстровано користувачів: {users.length} 🎉</Text>
                        ) : null
                    }
                    ListEmptyComponent={usersEmpty}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={usersRefreshing}
                            onRefresh={() => loadUsers(true)}
                            colors={['#4F46E5']}
                        />
                    }
                />
            ) : loading || !tasksReady ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loaderText}>Завантаження задач...</Text>
                </View>
            ) : (
                <FlatList
                    data={visibleTasks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTask}
                    ListHeaderComponent={listHeader}
                    ListFooterComponent={listFooter}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>{emptyEmoji}</Text>
                            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                            <Text style={styles.emptyText}>{emptyText}</Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadProfile(true)}
                            colors={['#4F46E5']}
                        />
                    }
                />
            )}

            <Modal
                visible={editing !== null}
                transparent
                animationType="fade"
                onRequestClose={closeEdit}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Змінити задачу ✏️</Text>

                        <Text style={styles.modalLabel}>Назва</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            placeholder="Назва задачі"
                            placeholderTextColor="#9CA3AF"
                            maxLength={120}
                            multiline
                        />

                        <Text style={styles.modalLabel}>Пріоритет</Text>
                        {renderPriorityRow(editPriority, setEditPriority)}

                        <Text style={styles.modalLabel}>Настрій задачі</Text>
                        {renderEmojiRow(editEmoji, setEditEmoji)}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={closeEdit} activeOpacity={0.8}>
                                <Text style={styles.modalCancelText}>Скасувати</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={saveEdit} activeOpacity={0.8}>
                                <Text style={styles.modalSaveText}>Зберегти 🎈</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.modalDelete} onPress={deleteFromEdit} activeOpacity={0.8}>
                            <Text style={styles.modalDeleteText}>Видалити задачу</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    headerBg: {
        backgroundColor: '#4F46E5',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
        zIndex: 2,
    },
    headerContent: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    headerTexts: {
        flex: 1,
        marginHorizontal: 12,
    },
    greeting: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    subGreeting: {
        fontSize: 13,
        color: '#C7D2FE',
        marginTop: 2,
    },
    logoutButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    progressCard: {
        marginTop: 20,
        padding: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    progressTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    progressPercent: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    progressTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        marginTop: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
        backgroundColor: '#FDE68A',
    },
    cheerText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    progressSub: {
        marginTop: 4,
        fontSize: 12,
        color: '#E0E7FF',
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
    listContent: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 40,
    },
    addCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        boxShadow: '0 4px 14px rgba(17, 24, 39, 0.08)',
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 48,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#111827',
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '600',
        marginTop: -2,
    },
    priorityRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
    },
    emojiRow: {
        paddingTop: 12,
        paddingRight: 8,
    },
    emojiChip: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    emojiChipActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#4F46E5',
    },
    emojiText: {
        fontSize: 22,
    },
    priorityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginRight: 8,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    priorityChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    priorityChipTextActive: {
        color: '#FFFFFF',
    },
    filterRow: {
        flexDirection: 'row',
        marginTop: 18,
        marginBottom: 14,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#E5E7EB',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#1F2937',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4B5563',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    filterBadge: {
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    filterBadgeActive: {
        backgroundColor: '#4F46E5',
    },
    filterBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#4B5563',
    },
    filterBadgeTextActive: {
        color: '#FFFFFF',
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingVertical: 14,
        paddingRight: 14,
        paddingLeft: 18,
        marginBottom: 10,
        overflow: 'hidden',
        boxShadow: '0 3px 10px rgba(17, 24, 39, 0.06)',
    },
    taskStripe: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#C7D2FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxDone: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    emojiBubble: {
        width: 38,
        height: 38,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    emojiBubbleText: {
        fontSize: 20,
    },
    taskBody: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    taskTitleDone: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    metaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginRight: 8,
    },
    metaBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metaDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    editButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    editText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#4F46E5',
    },
    deleteButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    deleteText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#EF4444',
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyEmoji: {
        fontSize: 52,
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    emptyText: {
        marginTop: 6,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    tabWrap: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 16,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(17, 24, 39, 0.12)',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#4F46E5',
    },
    usersCount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#4B5563',
        marginBottom: 14,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
        boxShadow: '0 3px 10px rgba(17, 24, 39, 0.06)',
    },
    userCardMe: {
        borderColor: '#C7D2FE',
        backgroundColor: '#F5F7FF',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    userBody: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    userId: {
        marginTop: 2,
        fontSize: 12,
        color: '#9CA3AF',
    },
    meBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#E0E7FF',
        marginLeft: 8,
    },
    meBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#4F46E5',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 6,
    },
    modalLabel: {
        marginTop: 14,
        fontSize: 12,
        fontWeight: '800',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalInput: {
        marginTop: 8,
        minHeight: 48,
        maxHeight: 110,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827',
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 22,
    },
    modalCancel: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#4B5563',
    },
    modalSave: {
        flex: 1.4,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    modalDelete: {
        marginTop: 12,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalDeleteText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
    },
    clearButton: {
        marginTop: 8,
        height: 46,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
    },
});