import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Dimensions, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Colors
const COLORS = {
    primary: '#FF6B6B',    // Coral Red
    secondary: '#4ECDC4',  // Teal
    accent: '#FFE66D',     // Yellow
    background: '#F7F9FC', // Light Blue-Grey
    text: '#2C3E50',       // Dark Blue-Grey
    white: '#FFFFFF',
    success: '#2ECC71',
    error: '#E74C3C',
    disabled: '#BDC3C7',
    timer: '#34495E',
};

// Configuration
const EXAM_DURATION_MINUTES = 2; // Increased slightly

interface Question {
    id: string; // Changed to string for UUID
    text: string;
    options: string[];
    correct_answer: string;
}

export default function TestScreen({ route, navigation }: any) {
    const { testId, testTitle } = route.params || {};

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({}); // Key is string UUID
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isExamFinished, setIsExamFinished] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    const shuffleArray = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const initTimer = async () => {
            try {
                const timerKey = `TIMER_END_TIME_${testId || 'default'}`;
                const storedEndTime = await AsyncStorage.getItem(timerKey);
                let endTime = 0;

                if (storedEndTime && parseInt(storedEndTime, 10) > Date.now()) {
                    endTime = parseInt(storedEndTime, 10);
                } else {
                    // Start fresh if no time or time expired
                    endTime = Date.now() + EXAM_DURATION_MINUTES * 60 * 1000;
                    await AsyncStorage.setItem(timerKey, endTime.toString());
                }

                const updateTimer = () => {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
                    setTimeLeft(remaining);
                    if (remaining === 0) {
                        setIsTimeUp(true);
                        AsyncStorage.removeItem(timerKey);
                        if (interval) clearInterval(interval);
                        submitExam(); // Call submit on timeout
                    }
                };

                updateTimer();
                interval = setInterval(updateTimer, 1000);
            } catch (error) {
                console.error('Timer initialization error:', error);
            }
        };

        initTimer();

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [resetKey, testId]);

    useEffect(() => {
        const baseUrl = API_URL;
        const apiUrl = testId ? `${baseUrl}/test/${testId}/questions` : `${baseUrl}/questions`;

        console.log('Fetching from:', apiUrl);

        fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setQuestions(shuffleArray(data));
                } else {
                    console.error("Data is not array:", data);
                    setQuestions([]);
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching questions:', error);
                setLoading(false);
            });
    }, [resetKey, testId]);

    const handleAnswer = (option: string) => {
        const currentQuestion = questions[currentIndex];
        if (selectedAnswers[currentQuestion.id]) return;

        const isCorrect = option === currentQuestion.correct_answer;
        if (isCorrect) {
            setScore(score + 2);
        }

        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestion.id]: option,
        });
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const getOptionStyle = (option: string) => {
        const currentQuestion = questions[currentIndex];
        const selected = selectedAnswers[currentQuestion.id];
        const isCorrect = option === currentQuestion.correct_answer;

        if (!selected) return styles.optionButton;

        if (option === selected) {
            return isCorrect
                ? [styles.optionButton, styles.optionCorrect]
                : [styles.optionButton, styles.optionWrong];
        }

        if (selected && isCorrect) {
            return [styles.optionButton, styles.optionCorrect];
        }

        return [styles.optionButton, styles.optionDisabled];
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinishExam = () => {
        setIsExamFinished(true);
        const timerKey = `TIMER_END_TIME_${testId || 'default'}`;
        AsyncStorage.removeItem(timerKey);
        submitExam();
    };

    const submitExam = async () => {
        try {
            const userId = await AsyncStorage.getItem('USER_ID');
            if (!userId) return;

            console.log('Submitting Exam:', { userId, testId, score });

            await fetch(`${API_URL}/submit-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    test_id: testId,
                    score: score
                })
            });
        } catch (e) {
            console.error('Error submitting exam:', e);
        }
    };

    const handleTryAgain = async () => {
        setIsTimeUp(false);
        setIsExamFinished(false);
        setScore(0);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setQuestions(shuffleArray([...questions]));

        const timerKey = `TIMER_END_TIME_${testId || 'default'}`;
        const newEndTime = Date.now() + EXAM_DURATION_MINUTES * 60 * 1000;
        await AsyncStorage.setItem(timerKey, newEndTime.toString());

        // Force immediate update
        setTimeLeft(EXAM_DURATION_MINUTES * 60);
        setResetKey(prev => prev + 1);
    };

    const handleGoHome = () => {
        navigation.navigate('Main', { screen: 'Dashboard' });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Sorular Yükleniyor...</Text>
            </View>
        );
    }

    if (isTimeUp || isExamFinished) {
        const correctCount = Object.keys(selectedAnswers).filter((key) => {
            const question = questions.find(q => q.id === key);
            return question && selectedAnswers[key] === question.correct_answer;
        }).length;

        const wrongCount = Object.keys(selectedAnswers).length - correctCount;
        const emptyCount = questions.length - (correctCount + wrongCount);

        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <Text style={styles.timeUpText}>
                    {isTimeUp ? "Süreniz Dolmuştur" : "Sınav Tamamlandı"}
                </Text>
                <Text style={styles.finalScoreText}>Puanınız: {score}</Text>

                <View style={styles.statsContainer}>
                    <Text style={[styles.statText, { color: COLORS.success }]}>Doğru Sayısı: {correctCount}</Text>
                    <Text style={[styles.statText, { color: COLORS.error }]}>Yanlış Sayısı: {wrongCount}</Text>
                    <Text style={[styles.statText, { color: COLORS.text }]}>Boş Sayısı: {emptyCount}</Text>
                </View>

                <View style={{ gap: 10 }}>
                    <TouchableOpacity style={styles.retryButton} onPress={handleTryAgain}>
                        <Text style={styles.retryButtonText}>Tekrar Deneyiniz</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.retryButton, { backgroundColor: COLORS.secondary }]} onPress={handleGoHome}>
                        <Text style={styles.retryButtonText}>Ana Sayfaya Dön</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (questions.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Bu testte soru bulunamadı.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentQuestion = questions[currentIndex];
    // Calculate progress based on constant width or percentage?
    // Let's use percentage for simplicity in `width` style.
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header / Progress */}
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={styles.timerContainer}>
                        <Ionicons name="time-outline" size={20} color={COLORS.timer} />
                        <Text style={styles.timerText}>
                            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                        </Text>
                    </View>
                    <Text style={styles.progressText}>
                        Soru {currentIndex + 1} / {questions.length}
                    </Text>
                </View>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            {/* Question Card */}
            <View style={styles.card}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 0 }}>
                    <View style={styles.questionBadge}>
                        <Text style={styles.questionBadgeText}>{testTitle || 'GENEL TARAMA'}</Text>
                    </View>
                    <Text style={styles.questionText}>{currentQuestion.text}</Text>

                    <View style={styles.optionsContainer}>
                        {(currentQuestion.options || []).map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={getOptionStyle(option)}
                                onPress={() => handleAnswer(option)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.optionText}>{option}</Text>
                                {selectedAnswers[currentQuestion.id] === option && (
                                    <Ionicons
                                        name={option === currentQuestion.correct_answer ? "checkmark-circle" : "close-circle"}
                                        size={24}
                                        color="white"
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Navigation */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                    onPress={handlePrev}
                    disabled={currentIndex === 0}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                    <Text style={styles.navButtonText}>Geri</Text>
                </TouchableOpacity>

                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreLabel}>Puan</Text>
                    <Text style={styles.scoreValue}>{score}</Text>
                </View>

                {currentIndex === questions.length - 1 ? (
                    <TouchableOpacity
                        style={[styles.navButton, { backgroundColor: COLORS.success }]}
                        onPress={handleFinishExam}
                    >
                        <Text style={styles.navButtonText}>Sınavı Bitir</Text>
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={handleNext}
                    >
                        <Text style={styles.navButtonText}>İleri</Text>
                        <Ionicons name="arrow-forward" size={24} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView >
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.text,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.error,
        textAlign: 'center',
        padding: 20,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F6F3',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        gap: 5,
    },
    timerText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.timer,
        fontVariant: ['tabular-nums'],
    },
    progressBarContainer: {
        height: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 5,
    },
    progressText: {
        fontSize: 14,
        color: '#7F8C8D',
        fontWeight: '600',
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.white,
        margin: 20,
        marginTop: 5,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    questionBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accent,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 15,
    },
    questionBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    questionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
        lineHeight: 26,
    },
    optionsContainer: {
        gap: 10,
    },
    optionButton: {
        flexDirection: 'row',
        backgroundColor: '#F0F2F5',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCorrect: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    optionWrong: {
        backgroundColor: COLORS.error,
        borderColor: COLORS.error,
    },
    optionDisabled: {
        opacity: 0.6,
    },
    optionText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 30,
    },
    navButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        gap: 8,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    navButtonDisabled: {
        backgroundColor: COLORS.disabled,
        shadowOpacity: 0,
        elevation: 0,
    },
    navButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    scoreContainer: {
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        fontWeight: 'bold',
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeUpText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.error,
        marginBottom: 20,
    },
    finalScoreText: {
        fontSize: 24,
        color: COLORS.text,
        marginBottom: 40,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsContainer: {
        marginBottom: 30,
        alignItems: 'center',
        gap: 10,
    },
    statText: {
        fontSize: 18,
        fontWeight: '600',
    },
});
