import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import logoSrc from './assets/logo.png';
import StarIcon from './assets/icon-star.svg?react';

// Firebase is loaded globally via <script> tags in index.html
declare const firebase: any;

// --- Admin Configuration ---
// This is a test comment to verify the VS Code to GitHub connection.
// If true, anonymous users will be prompted to log in or register to see their results.
const REQUIRE_AUTH_TO_VIEW_RESULTS = true;
// Cooldown in hours before a user can "forget" their profile and create a new one.
const PROFILE_CREATION_COOLDOWN_HOURS = 720; // 30 days
// TEST MODE: Set to true to bypass cooldown for testing (SET TO FALSE IN PRODUCTION!)
const TEST_MODE_BYPASS_COOLDOWN = false;


// --- Firebase Initialization ---
// The firebaseConfig object is now loaded from `firebase-config.js` into window.firebaseConfig
// This prevents API keys from being committed to source control.

// --- PASTE THIS NEW BLOCK ---

// Fix for missing types when vite/client reference fails
declare global {
    interface ImportMetaEnv {
        readonly VITE_FIREBASE_API_KEY: string;
        readonly VITE_FIREBASE_AUTH_DOMAIN: string;
        readonly VITE_FIREBASE_PROJECT_ID: string;
        readonly VITE_FIREBASE_STORAGE_BUCKET: string;
        readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
        readonly VITE_FIREBASE_APP_ID: string;
        readonly VITE_FIREBASE_MEASUREMENT_ID: string;
        [key: string]: any;
    }
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

// Construct the Firebase config object from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// --- END OF NEW BLOCK ---


// CRITICAL: Ensure you have configured Firestore Security Rules in the Firebase console
// to prevent unauthorized access to your data. Your rules should ensure users can
// only read and write their own profile data.
const db = firebase.firestore();
const auth = firebase.auth();
// --- End of Firebase Initialization ---


// --- Logic from questions.ts merged directly into this file ---
const QUESTIONS = [
    { q: "Would your Best Friend rather work for a charity - or lead a successful company?", a: "Work for charity", b: "Lead a company" },
    { q: "Would your Best Friend rather end world poverty - or receive the Nobel Prize?", a: "End poverty", b: "Receive the Nobel" },
    { q: "Would your Best Friend rather win Gold at the Olympics - or coach the local soccer team?", a: "Win Gold", b: "Coach local team" },
    { q: "Would your Best Friend rather dress for comfort - or dress appropriately?", a: "Dress for comfort", b: "Dress appropriately" },
    { q: "Would your Best Friend rather attend a religious service - or go bungee jumping?", a: "Attend church", b: "Bungee jumping" },
    { q: "Would your Best Friend rather freelance - or work a steady 9-to-5 job?", a: "Freelance", b: "Steady 9-to-5" },
    { q: "Would your Best Friend rather go on an adventure - or enjoy a safe trip?", a: "Adventure", b: "Safe trip" }
];

// VALUE_LABELS kept for chart display only (no calculations)
const VALUE_LABELS = ['UN', 'BE', 'TC', 'SE', 'PO', 'AC', 'HE', 'ST', 'SD'];

// Define basic interfaces for Chart.js to improve type safety
interface ChartJsInstance {
    destroy: () => void;
}
interface ChartJsConfig {
    type: 'radar';
    data: any;
    options: any;
}
declare global {
    interface Window {
        Chart: {
            new(context: CanvasRenderingContext2D, config: ChartJsConfig): ChartJsInstance;
        };
    }
}

// ============================================================================
// PROPRIETARY CALCULATIONS REMOVED - NOW HANDLED BY CLOUD FUNCTIONS
// ============================================================================
// The following functions have been migrated to Firebase Cloud Functions:
// - calculateProfile() -> processQ7Assessment Cloud Function
// - generateProfileCode() -> processQ7Assessment Cloud Function
// - calculateProfileDistortion() -> processQ7Assessment Cloud Function
//
// This protects intellectual property from browser-based reverse engineering.

type Screen = 'welcome' | 'questionnaire' | 'optionalInfo' | 'results' | 'auth' | 'error';
type OptionalInfo = {
    name: string;
    birthYear: string;
    education: string;
    source: string;
    teamCode?: string;
};
// Use a generic 'any' type for the user object as we are not importing Firebase types directly.
type User = any;
type ProfileInfo = { id: string; createdAt: any };
type StarCoords = { x: number; y: number };


// Utility function to shuffle an array
const shuffleArray = (array: number[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const Logo = () => (
    <img src={logoSrc} alt="Collectiver Culture Compass Logo" width="40" height="40" />
);

const Header = ({ user, onLogout, onLogin }: { user: User | null; onLogout: () => void; onLogin: () => void; }) => (
    <header className="app-header">
        <div className="header-content">
            <Logo />
            <h1>Q7-Lite by Collectiver</h1>
        </div>
        <div className="auth-controls">
            {user && user.emailVerified ? (
                <>
                    <span className="user-email">{user.email}</span>
                    <button onClick={onLogout} className="auth-button">Logout</button>
                </>
            ) : (
                <button onClick={onLogin} className="auth-button">Login / Sign Up</button>
            )}
        </div>
    </header>
);

const WelcomeScreen = ({ onStart }: { onStart: () => void }) => (
    <div className="screen welcome-screen">
        <h2 style={{ marginBottom: '0.25rem' }}>Find Where You Belong</h2>
        <p style={{ fontWeight: 'normal', marginTop: '0', fontSize: '1.4rem', color: 'white' }}>(in 60 seconds)</p>
        <p>
            Think of the one person who really gets you.
            <br />
            Whoever comes to mind first, that's the one.
            <br />
            Hold that image and answer 7 quick questions
            <br />
            for this BEST FRIEND.
        </p>
        <button onClick={onStart} className="cta-button">I am ready to answer for my Best Friend</button>
        <p style={{ fontSize: '0.9em' }}>
            In a minute, Q7 will map your values and shows where your Star ⭐ fits in the bigger human picture.
            <br />
            {' '}
            <a href="https://truvtus.com/truvtus-science-1/" target="_blank" rel="noopener noreferrer">
                Why 7 questions? (The Science)
            </a>
        </p>
    </div>
);

type QuestionnaireScreenProps = {
    currentQuestionIndex: number;
    questionOrder: number[];
    answers: number[];
    onAnswerChange: (value: number) => void;
    onNextQuestion: () => void;
};

const QuestionnaireScreen = ({ currentQuestionIndex, questionOrder, answers, onAnswerChange, onNextQuestion }: QuestionnaireScreenProps) => {
    const realQuestionIndex = questionOrder[currentQuestionIndex];
    const question = QUESTIONS[realQuestionIndex];
    const value = answers[realQuestionIndex];

    return (
        <div className="screen questionnaire-screen">
            <div className="content-card">
                <p className="progress-indicator">Question {currentQuestionIndex + 1} of {QUESTIONS.length}</p>
                <h2 className="question-text">{question.q}</h2>
                <div className="slider-container">
                    <div className="slider-labels">
                        <span className="label-a">{question.a}</span>
                        <span className="label-b">{question.b}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={value}
                        onChange={(e) => onAnswerChange(parseInt(e.target.value))}
                        className="slider"
                        aria-label="Answer slider"
                    />
                </div>
                <button onClick={onNextQuestion} className="cta-button">
                    {currentQuestionIndex < QUESTIONS.length - 1 ? 'Continue' : 'Finish Questions'}
                </button>
            </div>
        </div>
    );
};

type OptionalInfoScreenProps = {
    optionalInfo: OptionalInfo;
    isSaving: boolean;
    onInfoChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onSubmit: () => void;
    showAuthWarning: boolean;
};

const OptionalInfoScreen = ({ optionalInfo, isSaving, onInfoChange, onSubmit, showAuthWarning }: OptionalInfoScreenProps) => (
    <div className="screen optional-info-screen">
        <div className="content-card">
            <h2>Optional Information</h2>
            <p>This helps us build a more accurate collective map. All data is anonymous.</p>
            <form className="optional-form">
                <label htmlFor="name">Your Name (Optional)</label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    placeholder="Enter your name or a nickname"
                    value={optionalInfo.name}
                    onChange={onInfoChange}
                    disabled={isSaving}
                />

                <label htmlFor="birthYear">Birth Year Range</label>
                <select name="birthYear" id="birthYear" value={optionalInfo.birthYear} onChange={onInfoChange} disabled={isSaving}>
                    <option value="">Select...</option>
                    <option value="<1960">&lt;1960</option>
                    <option value="1960-1979">1960-1979</option>
                    <option value="1980-1999">1980-1999</option>
                    <option value="2000+">2000+</option>
                </select>

                <label htmlFor="education">Education Level</label>
                <select name="education" id="education" value={optionalInfo.education} onChange={onInfoChange} disabled={isSaving}>
                    <option value="">Select...</option>
                    <option value="high-school">High School</option>
                    <option value="bachelors">Bachelor's Degree</option>
                    <option value="masters">Master's Degree</option>
                    <option value="doctorate">Doctorate</option>
                    <option value="other">Other</option>
                </select>

                <label htmlFor="source">How did you hear about us?</label>
                <select name="source" id="source" value={optionalInfo.source} onChange={onInfoChange} disabled={isSaving}>
                    <option value="">Select...</option>
                    <option value="social-media">Social Media</option>
                    <option value="friend">Friend/Colleague</option>
                    <option value="search-engine">Search Engine</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="other">Other</option>
                </select>

                <label htmlFor="teamCode">Ref.Code (if provided)</label>
                <input
                    type="text"
                    name="teamCode"
                    id="teamCode"
                    placeholder="e.g. ProjectAlpha2024"
                    value={optionalInfo.teamCode || ''}
                    onChange={onInfoChange}
                    disabled={isSaving}
                />
            </form>
            <div className="button-group">
                <button onClick={onSubmit} className="cta-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Go to my Profile'}
                </button>
                <button onClick={onSubmit} className="skip-button" disabled={isSaving}>
                    Skip for now
                </button>
            </div>
            {showAuthWarning && (
                <p className="auth-warning">You’ll be prompted to register or login on the next page.</p>
            )}
        </div>
    </div>
);

type AuthScreenProps = {
    setAuthError: (msg: string) => void;
    authError: string;
    onBack: () => void;
    onSuccessfulVerifiedLogin: (user: User) => void;
};

const AuthScreen = ({ setAuthError, authError, onBack, onSuccessfulVerifiedLogin }: AuthScreenProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [mode, setMode] = useState<'register' | 'login' | 'forgotPassword'>('register');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
    const [showEmailAuth, setShowEmailAuth] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setAuthError('');
        setMessage('');
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const { user } = await auth.signInWithPopup(provider);
            if (user) {
                // Google users are automatically verified
                onSuccessfulVerifiedLogin(user);
            }
        } catch (error: any) {
            setAuthError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        setMessage('');
        setUnverifiedUser(null);

        try {
            if (mode === 'register') {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user?.sendEmailVerification();
                setMessage('Account created! A verification link has been sent to your email. Please verify before logging in.');
                setMode('login'); // Switch to login view after successful registration
            } else if (mode === 'login') {
                const { user } = await auth.signInWithEmailAndPassword(email, password);
                if (user) {
                    await user.reload(); // Get latest emailVerified status from Firebase server
                    if (user.emailVerified) {
                        // User is verified. Directly notify the parent component to proceed.
                        onSuccessfulVerifiedLogin(user);
                    } else {
                        // User is not verified, show the resend verification option.
                        setUnverifiedUser(user);
                        setAuthError('Please verify your email. Check your inbox or resend the verification link.');
                    }
                }
            } else if (mode === 'forgotPassword') {
                await auth.sendPasswordResetEmail(email);
                setMessage('If an account exists for this email, a password reset link has been sent.');
            }
        } catch (error: any) {
            setAuthError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!unverifiedUser) return;
        setIsLoading(true);
        setAuthError('');
        setMessage('');
        try {
            await unverifiedUser.sendEmailVerification();
            setMessage('A new verification email has been sent.');
            setUnverifiedUser(null);
        } catch (error: any) {
            setAuthError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const clearState = () => {
        setAuthError('');
        setMessage('');
        setEmail('');
        setPassword('');
        setUnverifiedUser(null);
    };

    const getTitle = () => {
        if (!showEmailAuth) return 'Welcome';
        if (mode === 'register') return 'Create Your Account';
        if (mode === 'login') return 'Welcome Back';
        return 'Reset Your Password';
    };

    const getDescription = () => {
        if (mode === 'register') return 'Sign up to save your profile. Your data is kept anonymous.';
        if (mode === 'login') return 'Log in to view your profile.';
        return 'Enter your email to receive a password reset link.';
    };

    return (
        <div className="screen auth-screen">
            <div className="content-card">
                <button onClick={onBack} className="back-button" disabled={isLoading}>&larr; Back</button>
                <h2>{getTitle()}</h2>

                {!showEmailAuth ? (
                    <div className="google-auth-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            onClick={handleGoogleSignIn}
                            className="cta-button"
                            disabled={isLoading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'white', color: '#333', border: '1px solid #ccc' }}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" width="18" height="18" />
                            {isLoading ? 'Processing...' : 'Continue with Google'}
                        </button>

                        {authError && <p className="error-message" style={{ margin: 0 }}>{authError}</p>}

                        <button
                            onClick={() => { setShowEmailAuth(true); setAuthError(''); }}
                            className="link-button"
                            disabled={isLoading}
                            style={{ alignSelf: 'center', marginTop: '0.5rem' }}
                        >
                            Or continue with Email
                        </button>
                    </div>
                ) : (
                    <>
                        <p>{getDescription()}</p>
                        <form className="auth-form" onSubmit={handleAuthAction}>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {mode !== 'forgotPassword' && (
                                <div className="password-input-container">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Password"
                                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="password-toggle-button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            )}

                            {authError && <p className="error-message">{authError}</p>}
                            {message && <p className="success-message">{message}</p>}

                            {mode === 'login' && unverifiedUser ? (
                                <button type="button" onClick={handleResendVerification} className="cta-button" disabled={isLoading}>
                                    {isLoading ? 'Sending...' : 'Resend Verification Email'}
                                </button>
                            ) : (
                                <button type="submit" className="cta-button" disabled={isLoading}>
                                    {isLoading ? 'Processing...' :
                                        mode === 'register' ? 'Sign Up' :
                                            mode === 'login' ? 'Log In' : 'Send Reset Link'}
                                </button>
                            )}
                        </form>

                        {mode === 'login' && (
                            <button onClick={() => { setMode('forgotPassword'); clearState(); }} className="link-button" disabled={isLoading}>
                                Forgot Password?
                            </button>
                        )}

                        {mode === 'forgotPassword' ? (
                            <button onClick={() => { setMode('login'); clearState(); }} className="link-button" disabled={isLoading}>
                                Back to Login
                            </button>
                        ) : (
                            <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); clearState(); }} className={`link-button ${mode === 'register' ? 'highlight' : ''}`} disabled={isLoading}>
                                {mode === 'register' ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                            </button>
                        )}

                        <div style={{ width: '100%', textAlign: 'center', marginTop: '1rem' }}>
                            <button
                                onClick={() => { setShowEmailAuth(false); clearState(); }}
                                className="link-button"
                                disabled={isLoading}
                            >
                                &larr; Back to Google Sign-in
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ErrorScreen = ({ message, onLogout }: { message: string; onLogout: () => void; }) => (
    <div className="screen error-screen">
        <div className="content-card">
            <h2>Something Went Wrong</h2>
            <p className="data-error-message">{message}</p>
            <button onClick={onLogout} className="cta-button">Logout and Start Over</button>
        </div>
    </div>
);




type ResultsScreenProps = {
    optionalInfo: OptionalInfo;
    profileData: { rankedScores: number[], starCoords: StarCoords, profileCode?: string } | null;
    profileInfo: ProfileInfo | null;
    onForget: () => void;
    notification: string | null;
    setNotification: (msg: string | null) => void;
};

const ResultsScreen = ({ optionalInfo, profileData, profileInfo, onForget, notification, setNotification }: ResultsScreenProps) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJsInstance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [isStarMapVisible, setIsStarMapVisible] = useState(false);
    const [allStars, setAllStars] = useState<(StarCoords & { teamCode?: string | null, userId?: string | null, createdAt?: any, animationDelay: string, animationDuration: string })[]>([]);
    const [isMapLoading, setIsMapLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    useEffect(() => {
        // Only fetch the map data if the user wants to see it.
        if (isStarMapVisible && allStars.length === 0 && !isMapLoading) {
            const fetchStars = async () => {
                setIsMapLoading(true);
                setMapError(null);
                try {
                    const snapshot = await db.collection('publicStars').orderBy('createdAt', 'desc').limit(500).get();
                    const starsData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            starCoords: data.starCoords as StarCoords,
                            teamCode: data.teamCode || null,
                            userId: data.userId || null,
                            createdAt: data.createdAt
                        };
                    });
                    const starsWithAnimation = starsData
                        .filter(star => star.starCoords && typeof star.starCoords.x === 'number' && typeof star.starCoords.y === 'number')
                        .map(star => ({
                            x: star.starCoords.x,
                            y: star.starCoords.y,
                            teamCode: star.teamCode,
                            userId: star.userId,
                            createdAt: star.createdAt,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }));
                    setAllStars(starsWithAnimation);
                } catch (err) {
                    console.error("Error fetching stars from publicStars:", err);
                    setMapError("Could not load the StarMap data.");
                } finally {
                    setIsMapLoading(false);
                }
            };
            fetchStars();
        }
    }, [isStarMapVisible]); // This effect runs whenever isStarMapVisible changes.

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                const size = Math.min(width, height);
                setContainerSize({ width: size, height: size });
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (chartRef.current && profileData) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new window.Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: VALUE_LABELS,
                        datasets: [{
                            data: profileData.rankedScores,
                            backgroundColor: 'rgba(240, 196, 25, 0.4)',
                            borderColor: 'rgb(240, 196, 25)',
                            borderWidth: 2,
                            pointBackgroundColor: 'rgb(240, 196, 25)',
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            r: {
                                startAngle: 20,
                                beginAtZero: true,
                                max: 10,
                                grid: { color: 'rgba(255, 255, 255, 0.2)' },
                                pointLabels: {
                                    color: 'white',
                                    font: { size: 12 }
                                },
                                angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                                ticks: {
                                    display: false,
                                    stepSize: 2
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
        }
    }, [profileData, containerSize]);
    // --- START: New Notification Hook ---
    useEffect(() => {
        if (notification) {
            alert(notification);
            // Clear the notification after showing it so it doesn't reappear
            setNotification(null);
        }
    }, [notification, setNotification]); // <-- This now runs WHENEVER the 'notification' prop changes.
    // --- END: New Notification Hook ---

    const getStarPosition = (x: number, y: number, containerSize: number) => {
        const radius = containerSize / 2 * 0.8; // Scale within 80% of the chart area
        const maxCoordinateValue = 25; // Empirical max value for the coordinate system
        const scaleFactor = radius / maxCoordinateValue;

        const left = (containerSize / 2) + x * scaleFactor;
        const top = (containerSize / 2) - y * scaleFactor; // -y for screen coordinates
        return { top: `${top}px`, left: `${left}px` };
    };

    const backgroundStars = useMemo(() => Array.from({ length: 15 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`
    })), []);

    // Directly use the profileCode from profileData. No fallback calculation.
    const profileCode = profileData?.profileCode;

    const { canForget, cooldownMessage } = useMemo(() => {
        if (!profileInfo || !profileInfo.createdAt) {
            // This can happen for anonymous profiles if REQUIRE_AUTH_TO_VIEW_RESULTS is false
            return { canForget: false, cooldownMessage: '' };
        }
        // createdAt could be a Firebase Timestamp object or an ISO string
        const createdAtDate = profileInfo.createdAt.toDate ? profileInfo.createdAt.toDate() : new Date(profileInfo.createdAt);
        const cooldownEndDate = new Date(createdAtDate.getTime());
        cooldownEndDate.setHours(cooldownEndDate.getHours() + PROFILE_CREATION_COOLDOWN_HOURS);

        if (new Date() > cooldownEndDate) {
            return { canForget: true, cooldownMessage: '' };
        } else {
            return { canForget: false, cooldownMessage: `You can create a new profile after ${cooldownEndDate.toLocaleString()}.` };
        }
    }, [profileInfo]);


    if (!profileData) return null;

    const userStarPosition = getStarPosition(profileData.starCoords.x, profileData.starCoords.y, containerSize.width);
    const userName = optionalInfo && optionalInfo.name && optionalInfo.name.trim() ? optionalInfo.name : "Your";

    return (
        <div className="screen results-screen">
            <h2>{userName}'s Values Profile</h2>
            <p className="profile-code">{profileCode}</p>

            <div className="chart-container" ref={containerRef}>
                {backgroundStars.map((style, i) => (
                    <div key={i} className="background-star" style={style}></div>
                ))}
                <canvas ref={chartRef} width={containerSize.width} height={containerSize.height}></canvas>

                {/* --- START: Added StarMap Overlay Logic --- */}
                {isStarMapVisible && (
                    <>
                        {isMapLoading && <div className="loading-spinner-small"></div>}
                        {mapError && <p className="error-message">{mapError}</p>}
                        {(() => {
                            const userTeamCode = optionalInfo.teamCode?.trim().toUpperCase();

                            // Deduplicate team members: keep only most recent star per userId
                            const deduplicatedStars = userTeamCode ? allStars.reduce((acc, star) => {
                                const isTeamMember = star.teamCode?.trim().toUpperCase() === userTeamCode;

                                if (!isTeamMember) {
                                    // Not a team member, keep as-is
                                    return [...acc, { ...star, isTeamMember: false }];
                                }

                                if (!star.userId) {
                                    // Team member but no userId (legacy data), keep it
                                    return [...acc, { ...star, isTeamMember: true }];
                                }

                                // Team member with userId - check for duplicates
                                const existingIndex = acc.findIndex(s => s.userId === star.userId && s.isTeamMember);
                                if (existingIndex === -1) {
                                    // First occurrence of this userId
                                    return [...acc, { ...star, isTeamMember: true }];
                                }

                                // Duplicate found - keep the most recent one
                                const existing = acc[existingIndex];
                                const starTime = star.createdAt?.toDate ? star.createdAt.toDate().getTime() : 0;
                                const existingTime = existing.createdAt?.toDate ? existing.createdAt.toDate().getTime() : 0;

                                if (starTime > existingTime) {
                                    // Current star is newer, replace existing
                                    return [...acc.slice(0, existingIndex), { ...star, isTeamMember: true }, ...acc.slice(existingIndex + 1)];
                                }

                                // Existing star is newer, keep it
                                return acc;
                            }, [] as (typeof allStars[0] & { isTeamMember: boolean })[]) : allStars.map(star => ({ ...star, isTeamMember: false }));

                            return deduplicatedStars.map((star, i) => {
                                if (star.isTeamMember) {
                                    // Team member: render as full-size gold star (no pulsing)
                                    return (
                                        <div key={i} className="team-star-container" style={getStarPosition(star.x, star.y, containerSize.width)}>
                                            <StarIcon className="team-star" />
                                        </div>
                                    );
                                } else {
                                    // Non-team member: render as white dot
                                    return (
                                        <div
                                            key={i}
                                            className="collective-star"
                                            style={{
                                                ...getStarPosition(star.x, star.y, containerSize.width),
                                                animationDelay: star.animationDelay,
                                                animationDuration: star.animationDuration,
                                            }}
                                        ></div>
                                    );
                                }
                            });
                        })()}
                    </>
                )}
                {/* --- END: Added StarMap Overlay Logic --- */}

                <div className="user-star-container" style={userStarPosition}>
                    <div className="star-highlight" />
                    <StarIcon className="user-star" />
                </div>
            </div>

            <button onClick={() => setIsStarMapVisible(!isStarMapVisible)} className="starmap-toggle-button">
                {isStarMapVisible ? 'Hide StarMap' : 'View StarMap'}
            </button>

            <div style={{ marginTop: '1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <a
                    href="https://map.truvtus.com"
                    className="cta-button"
                    style={{ textDecoration: 'none', width: 'fit-content', padding: '0.8rem 2rem' }}
                >
                    Go to TRUVTUS Map
                </a>

                {profileInfo && (
                    <div className="profile-actions" style={{ width: '100%', marginTop: '1rem' }}>
                        <button onClick={onForget} className="cta-button forget-button" disabled={!canForget}>Forget me!</button>
                        {!canForget && (
                            <p className="cooldown-message" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                You can update your profile after {cooldownMessage.split('after ')[1]}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [screen, setScreen] = useState<Screen>('welcome');
    const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(50));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [profileData, setProfileData] = useState<{ rankedScores: number[], starCoords: StarCoords, profileCode?: string } | null>(null);
    const [optionalInfo, setOptionalInfo] = useState<OptionalInfo>({ name: '', birthYear: '', education: '', source: '', teamCode: '' });
    const [isSaving, setIsSaving] = useState(false);

    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [authError, setAuthError] = useState('');
    const [dataError, setDataError] = useState('');
    const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const pendingProfileRef = useRef<{ answers: number[], optionalInfo: OptionalInfo } | null>(null);
    const isInitialLoad = useRef(true);

    const questionOrder = useMemo(() => shuffleArray(Array.from(Array(QUESTIONS.length).keys())), []);

    const resetQuestionnaire = () => {
        setScreen('welcome');
        setAnswers(Array(QUESTIONS.length).fill(50));
        setCurrentQuestionIndex(0);
        setProfileData(null);
        setProfileInfo(null);
        setOptionalInfo({ name: '', birthYear: '', education: '', source: '', teamCode: '' });
        setDataError('');
    };

    const processPendingProfile = async (userForProfile: User) => {
        if (!pendingProfileRef.current) return;

        const profileToSave = pendingProfileRef.current;
        // Clear the pending profile immediately to prevent race conditions or double saves.
        pendingProfileRef.current = null;
        sessionStorage.removeItem('pendingProfile');

        // --- START: New Cooldown Logic ---

        // Step 1: Check if the user has an existing active profile.
        const activeProfile = await getActiveProfileInfo(userForProfile.uid);

        if (activeProfile && activeProfile.createdAt) {
            // Step 2: If they do, check if it's on cooldown.
            const createdAtDate = activeProfile.createdAt.toDate ? activeProfile.createdAt.toDate() : new Date(activeProfile.createdAt);
            const cooldownEndDate = new Date(createdAtDate.getTime());
            cooldownEndDate.setHours(cooldownEndDate.getHours() + PROFILE_CREATION_COOLDOWN_HOURS);

            const isStillOnCooldown = new Date() < cooldownEndDate;

            if (isStillOnCooldown) {
                // Step 3A: User is on cooldown. Save the new attempt as ALREADY ARCHIVED.
                console.log("User is on cooldown. Saving new profile as archived.");
                await saveProfile(profileToSave.answers, profileToSave.optionalInfo, userForProfile, { forceArchive: true });

                setNotification('Your new attempt has been saved to your history. Your current profile will remain active until the cooldown period ends.');

                // --- FIX for Prob #2 ---
                // Since the saveProfile function skipped the UI update, we must now manually load
                // the user's OLD, still-active profile and show the results screen.
                console.log("Loading existing active profile to display.");
                const profileDoc = await db.collection('profiles').doc(activeProfile.id).get();
                if (profileDoc.exists) {
                    const activeProfileData = profileDoc.data();
                    // Use stored values from database (no recalculation needed)
                    setProfileData({
                        rankedScores: activeProfileData.rankedScores,
                        starCoords: activeProfileData.starCoords,
                        profileCode: activeProfileData.profileCode
                    });
                    setOptionalInfo(activeProfileData.optionalInfo || { name: '', birthYear: '', education: '', source: '', teamCode: '' });
                    setProfileInfo({ id: activeProfile.id, createdAt: activeProfile.createdAt });
                    setScreen('results');
                } else {
                    // This is an unlikely edge case, but good to handle.
                    // If the active profile was deleted, just reset the questionnaire.
                    setDataError("Your active profile could not be loaded. Please start over.");
                    setScreen('error');
                }
                // --- END FIX ---

                return; // Stop execution here.
            }
        }

        // Step 3B: User is NOT on cooldown (or has no active profile). Proceed with a normal save.
        console.log("User is not on cooldown. Saving new profile normally.");
        await saveProfile(profileToSave.answers, profileToSave.optionalInfo, userForProfile);

        // --- END: New Cooldown Logic ---
    };

    const handleSuccessfulVerifiedLogin = (loggedInUser: User) => {
        // --- FIX for Prob #1 ---
        // Set the user state immediately to prevent a race condition and ensure the header updates.
        setUser(loggedInUser);
        // --- END FIX ---

        processPendingProfile(loggedInUser);
    };

    // Hydrate pending profile from sessionStorage on initial load to prevent data loss on reload.
    useEffect(() => {
        try {
            const savedProfile = sessionStorage.getItem('pendingProfile');
            if (savedProfile) {
                pendingProfileRef.current = JSON.parse(savedProfile);
            }
        } catch (e) {
            console.error("Failed to parse pending profile from sessionStorage.", e);
            sessionStorage.removeItem('pendingProfile'); // Clear corrupted data
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser: User | null) => {
            try {
                setUser(currentUser);
                if (currentUser && currentUser.emailVerified) {
                    if (pendingProfileRef.current) {
                        await processPendingProfile(currentUser);
                    } else {
                        // Use a simple query that doesn't require a composite index.
                        const profilesRef = db.collection('profiles');
                        const snapshot = await profilesRef.where('userId', '==', currentUser.uid).get();

                        if (!snapshot.empty) {
                            const userProfiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

                            // Sort client-side to find the most recent profile.
                            userProfiles.sort((a, b) => {
                                const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                                const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                                return timeB - timeA;
                            });

                            // Find the most recent, non-archived profile.
                            // `isArchived !== true` correctly handles both `false` and `undefined`.
                            const activeProfile = userProfiles.find(p => p.isArchived !== true);

                            if (activeProfile) {
                                // Use stored values from database (no recalculation needed)
                                setProfileData({
                                    rankedScores: activeProfile.rankedScores,
                                    starCoords: activeProfile.starCoords,
                                    profileCode: activeProfile.profileCode
                                });
                                // Defensively set optionalInfo to prevent crashes if it's missing
                                setOptionalInfo(activeProfile.optionalInfo || { name: '', birthYear: '', education: '', source: '', teamCode: '' });
                                setProfileInfo({ id: activeProfile.id, createdAt: activeProfile.createdAt });
                                setScreen('results');
                            } else {
                                // User has profiles, but all are archived.
                                resetQuestionnaire();
                            }
                        } else {
                            // User is logged in but has no profiles at all.
                            resetQuestionnaire();
                        }
                    }
                } else if (!currentUser) {
                    // User is null (logged out). Only reset if it's a logout, not the initial app load.
                    if (!isInitialLoad.current) {
                        resetQuestionnaire();
                    }
                }
                // If currentUser exists but is not verified, do nothing.
                // The user remains on the auth screen to see the verification prompt.
            } catch (error) {
                console.error("Error loading user profile:", error);
                setDataError("We couldn't load your profile. This might be a connection issue or a problem with your account data. Please try logging out and back in.");
                setScreen('error');
            } finally {
                // This is critical: ensure the loading spinner is always removed.
                setIsAuthLoading(false);
                isInitialLoad.current = false;
            }
        });
        return () => unsubscribe();
    }, []);

    // Hidden feature: Press Ctrl+Shift+E to export all profiles data as JSON.
    useEffect(() => {
        const handleExport = async (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'E') {
                event.preventDefault();
                if (!user) {
                    alert('You must be logged in to export data.');
                    return;
                }

                alert('Starting data export. This may take a moment...');
                try {
                    const snapshot = await db.collection('profiles').get();
                    const profiles = snapshot.docs.map(doc => {
                        const data = doc.data();
                        // Convert Firestore Timestamps to ISO strings for easier analysis
                        if (data.createdAt && data.createdAt.toDate) {
                            data.createdAt = data.createdAt.toDate().toISOString();
                        }
                        if (data.archivedAt && data.archivedAt.toDate) {
                            data.archivedAt = data.archivedAt.toDate().toISOString();
                        }
                        return { id: doc.id, ...data };
                    });

                    const jsonString = JSON.stringify(profiles, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'profiles.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                } catch (error) {
                    console.error("Error exporting data:", error);
                    alert('An error occurred during export. Check the console for details.');
                }
            }
        };

        document.addEventListener('keydown', handleExport);
        return () => {
            document.removeEventListener('keydown', handleExport);
        };
    }, [user]); // Rerun effect if user logs in/out, to capture the correct user state.

    const handleStart = () => {
        setScreen('questionnaire');
    };

    const handleAnswerChange = (value: number) => {
        const realQuestionIndex = questionOrder[currentQuestionIndex];
        const newAnswers = [...answers];
        newAnswers[realQuestionIndex] = value;
        setAnswers(newAnswers);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setScreen('optionalInfo');
        }
    };

    const handleOptionalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOptionalInfo(prev => ({ ...prev, [name]: value }));
    };

    const archiveOldProfiles = async (userId: string, newProfileId: string) => {
        try {
            const profilesRef = db.collection('profiles');
            const snapshot = await profilesRef.where('userId', '==', userId).get();

            if (snapshot.empty) return;

            const batch = db.batch();
            snapshot.forEach(doc => {
                if (doc.id !== newProfileId && doc.data().isArchived !== true) {
                    batch.update(doc.ref, {
                        isArchived: true,
                        archivedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            await batch.commit();
            console.log('Successfully archived old profiles in the background.');
        } catch (error) {
            console.error('Background task failed: Could not archive old profiles.', error);
            console.warn('This might be due to missing Firestore security rules or a missing index on the `userId` field.');
        }
    };

    const saveProfile = async (answersToSave: number[], infoToSave: OptionalInfo, userToSave: User | null, options: { forceArchive?: boolean } = {}) => {
        setIsSaving(true);

        // Basic input sanitization
        const sanitizedInfo = {
            ...infoToSave,
            name: infoToSave.name.trim(),
            teamCode: infoToSave.teamCode ? infoToSave.teamCode.trim().toUpperCase() : '',
        };

        // ============================================================================
        // CALL CLOUD FUNCTION INSTEAD OF LOCAL CALCULATION
        // ============================================================================
        let profileCode, profileId, rankedScores, starCoords, docRef;

        try {
            // Call processQ7Assessment Cloud Function
            console.log('Calling processQ7Assessment Cloud Function with:', {
                answersLength: answersToSave.length,
                userId: userToSave?.uid,
                hasOptionalInfo: !!sanitizedInfo
            });

            const processQ7 = firebase.functions().httpsCallable('processQ7Assessment');
            const result = await processQ7({
                answers: answersToSave,
                optionalInfo: sanitizedInfo,
                userId: userToSave?.uid || null,
            });

            console.log('Cloud Function response:', result);
            ({ profileCode, profileId, rankedScores, starCoords } = result.data);

            // Set docRef for compatibility with existing code
            docRef = { id: profileId };
            console.log('Profile saved successfully with ID:', docRef.id);

        } catch (error) {
            console.error('Error saving profile to Firestore:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                stack: error.stack
            });
            alert(`There was a problem saving your profile. Error: ${error.message || 'Unknown error'}. Please check the console for details.`);
            setIsSaving(false); // Ensure spinner is turned off on failure.
            return; // Halt execution if the primary save fails.
        }

        // --- Step 2: If the profile was NOT force-archived, update the UI. ---
        if (!options.forceArchive) {
            setProfileData({ rankedScores, starCoords, profileCode });
            setOptionalInfo(sanitizedInfo);
            if (userToSave) {
                setProfileInfo({ id: docRef.id, createdAt: new Date() });
            }
            setScreen('results');
        }
        setIsSaving(false);

        // --- Step 3: Public star data is now handled by Cloud Function ---
        // The processQ7Assessment Cloud Function writes to publicStars collection
        // No client-side double write needed

        // --- Step 4: Archive old profiles (background task) ---
        if (userToSave && !options.forceArchive) {
            archiveOldProfiles(userToSave.uid, docRef.id);
        }
    };

    const handleSubmitOptionalInfo = async () => {
        setIsSaving(true);
        let locationData = null;

        try {
            // Silently fetch location data with a 3-second timeout to prevent hangups
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                locationData = {
                    city: data.city,
                    region: data.region,
                    country: data.country_name,
                    ip: data.ip
                };
            }
        } catch (error) {
            console.warn("Could not determine user location silently", error);
            // Fail silently
        }

        const finalOptionalInfo = {
            ...optionalInfo,
            ...(locationData && { location: locationData })
        };

        if (REQUIRE_AUTH_TO_VIEW_RESULTS && (!user || !user.emailVerified)) {
            const profileToSave = { answers, optionalInfo: finalOptionalInfo };
            pendingProfileRef.current = profileToSave;
            try {
                sessionStorage.setItem('pendingProfile', JSON.stringify(profileToSave));
            } catch (e) {
                console.warn("Could not save pending profile to sessionStorage", e);
            }
            setIsSaving(false);
            setScreen('auth');
            return;
        }
        await saveProfile(answers, finalOptionalInfo, user);
        setIsSaving(false);
    };

    const handleLogout = () => {
        auth.signOut();
    };

    // --- START: New Helper Function ---
    const getActiveProfileInfo = async (userId: string): Promise<ProfileInfo | null> => {
        try {
            const profilesRef = db.collection('profiles');
            // Query for all profiles for this user that are NOT archived.
            // isArchived !== true handles both `false` and cases where the field is missing.
            const snapshot = await profilesRef
                .where('userId', '==', userId)
                .where('isArchived', '==', false) // <-- THE FIX: Use an equality check instead
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null; // The user has no active profiles.
            }

            const doc = snapshot.docs[0];
            const data = doc.data();

            // Return just the essential info: the profile's ID and when it was created.
            return {
                id: doc.id,
                createdAt: data.createdAt
            };
        } catch (error) {
            console.error("Error fetching active profile info:", error);
            // In case of an error, we assume no active profile was found.
            return null;
        }
    };

    // --- END: New Helper Function ---
    const handleForgetProfile = async () => {
        if (profileInfo && profileInfo.id) {
            try {
                await db.collection('profiles').doc(profileInfo.id).update({
                    isArchived: true,
                    archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                resetQuestionnaire();
            } catch (error) {
                console.error("Error archiving profile:", error);
            }
        }
    };

    if (isAuthLoading) {
        return <div className="loading-spinner"></div>;
    }

    const renderScreen = () => {
        const showAuthWarning = REQUIRE_AUTH_TO_VIEW_RESULTS && (!user || !user.emailVerified);
        switch (screen) {
            case 'welcome': return <WelcomeScreen onStart={handleStart} />;
            case 'questionnaire': return <QuestionnaireScreen currentQuestionIndex={currentQuestionIndex} questionOrder={questionOrder} answers={answers} onAnswerChange={handleAnswerChange} onNextQuestion={handleNextQuestion} />;
            case 'optionalInfo': return <OptionalInfoScreen optionalInfo={optionalInfo} isSaving={isSaving} onInfoChange={handleOptionalInfoChange} onSubmit={handleSubmitOptionalInfo} showAuthWarning={showAuthWarning} />;
            case 'auth': return <AuthScreen setAuthError={setAuthError} authError={authError} onBack={() => setScreen('optionalInfo')} onSuccessfulVerifiedLogin={handleSuccessfulVerifiedLogin} />;
            case 'results': return <ResultsScreen optionalInfo={optionalInfo} profileData={profileData} profileInfo={profileInfo} onForget={handleForgetProfile} notification={notification} setNotification={setNotification} />;
            case 'error': return <ErrorScreen message={dataError} onLogout={handleLogout} />;
            default: return <WelcomeScreen onStart={handleStart} />;
        }
    };

    return (
        <div className="app-container">
            <Header user={user} onLogout={handleLogout} onLogin={() => { setDataError(''); setScreen('auth'); }} />
            <main>
                {renderScreen()}
            </main>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}