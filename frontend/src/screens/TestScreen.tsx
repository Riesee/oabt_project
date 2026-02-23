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

interface QuestionOption {
    option_text: string;
    is_correct: boolean;
}

interface Question {
    id: string;
    question_text: string;
    category: string;
    options: QuestionOption[];
    difficulty: string;
    solution?: {
        explanation_text: string;
        video_solution_url?: string;
    };
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
        const apiUrl = testId ? `${baseUrl}/test/${testId}` : `${baseUrl}/questions`;



        fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    // Shuffle Options for each question
                    const processedQuestions = data.map((q: any) => ({
                        ...q,
                        options: shuffleArray([...q.options])
                    }));
                    setQuestions(shuffleArray(processedQuestions));
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

    const handleAnswer = (option: QuestionOption) => {
        const currentQuestion = questions[currentIndex];
        if (selectedAnswers[currentQuestion.id]) return;

        if (option.is_correct) {
            setScore(score + 2);

            // Auto-advance to next question after a short delay
            if (currentIndex < questions.length - 1) {
                setTimeout(() => {
                    setCurrentIndex(prev => prev + 1);
                }, 250);
            }
        }

        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestion.id]: option.option_text,
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

    const getOptionStyle = (option: QuestionOption) => {
        const currentQuestion = questions[currentIndex];
        const selectedText = selectedAnswers[currentQuestion.id];

        if (!selectedText) return styles.optionButton;

        if (option.option_text === selectedText) {
            return option.is_correct
                ? [styles.optionButton, styles.optionCorrect]
                : [styles.optionButton, styles.optionWrong];
        }

        if (selectedText && option.is_correct) {
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

    const [submitResult, setSubmitResult] = useState<any>(null);

    const submitExam = async () => {
        try {
            const token = await AsyncStorage.getItem('AUTH_TOKEN');

            const res = await fetch(`${API_URL}/submit-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    test_id: testId,
                    score: score
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSubmitResult(data);
                if (data.leveled_up) {
                    Alert.alert('TEBRİKLER! 🎉', `Seviye Atladın! Yeni Seviyen: ${data.new_level}`);
                }
            }
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
            const selectedOptionText = selectedAnswers[key];
            const correctOption = question?.options.find(opt => opt.is_correct);
            return correctOption && correctOption.option_text === selectedOptionText;
        }).length;

        const wrongCount = Object.keys(selectedAnswers).length - correctCount;
        const emptyCount = questions.length - (correctCount + wrongCount);

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: COLORS.white }]}>
                <ScrollView contentContainerStyle={[styles.centerContent, { padding: 30 }]}>
                    <Ionicons
                        name={correctCount > questions.length / 2 ? "trophy" : "ribbon"}
                        size={80}
                        color={COLORS.accent}
                    />

                    <Text style={styles.timeUpText}>
                        {isTimeUp ? "Süra Doldu!" : "Tebrikler!"}
                    </Text>

                    <View style={styles.resultCard}>
                        <Text style={styles.finalScoreLabel}>Toplam Puan</Text>
                        <Text style={styles.finalScoreValue}>{score}</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={[styles.statBox, { borderLeftColor: COLORS.success }]}>
                            <Text style={styles.statLabel}>Doğru</Text>
                            <Text style={[styles.statValueShort, { color: COLORS.success }]}>{correctCount}</Text>
                        </View>
                        <View style={[styles.statBox, { borderLeftColor: COLORS.error }]}>
                            <Text style={styles.statLabel}>Yanlış</Text>
                            <Text style={[styles.statValueShort, { color: COLORS.error }]}>{wrongCount}</Text>
                        </View>
                        <View style={[styles.statBox, { borderLeftColor: COLORS.disabled }]}>
                            <Text style={styles.statLabel}>Boş</Text>
                            <Text style={[styles.statValueShort, { color: COLORS.text }]}>{emptyCount}</Text>
                        </View>
                    </View>

                    {submitResult && (
                        <View style={styles.xpInfo}>
                            <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                            <Text style={styles.xpText}>+{submitResult.score_added || 0} XP Kazanıldı</Text>
                        </View>
                    )}

                    <View style={styles.resultActions}>
                        <TouchableOpacity style={styles.primaryActionButton} onPress={handleTryAgain}>
                            <Ionicons name="refresh" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Tekrar Çöz</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryActionButton} onPress={handleGoHome}>
                            <Ionicons name="home" size={20} color={COLORS.primary} />
                            <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Ana Sayfa</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
                        <Text style={styles.questionBadgeText}>{currentQuestion.category || testTitle || 'GENEL TARAMA'}</Text>
                    </View>
                    <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

                    <View style={styles.optionsContainer}>
                        {(currentQuestion.options || []).map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={getOptionStyle(option)}
                                onPress={() => handleAnswer(option)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.optionText}>{option.option_text}</Text>
                                {selectedAnswers[currentQuestion.id] === option.option_text && (
                                    <Ionicons
                                        name={option.is_correct ? "checkmark-circle" : "close-circle"}
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
    resultCard: {
        backgroundColor: COLORS.background,
        padding: 20,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        marginVertical: 20,
    },
    finalScoreLabel: {
        fontSize: 14,
        color: '#7F8C8D',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    finalScoreValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 12,
        marginHorizontal: 5,
        borderLeftWidth: 4,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        fontWeight: 'bold',
    },
    statValueShort: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    xpInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        marginBottom: 30,
    },
    xpText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    resultActions: {
        width: '100%',
        gap: 15,
    },
    primaryActionButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    secondaryActionButton: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: COLORS.primary,
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
