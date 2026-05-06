import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import logoSrc from './assets/logo.png';
import StarIcon from './assets/icon-star.svg?react';
import ReactMarkdown from 'react-markdown';

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

// --- ChekTus Admin Configuration ---
const CHEKTUS_MAX_PARTICIPANTS = 10;
const CHEKTUS_TTL_MINUTES = 30;


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
    { q: "Would your Best Friend rather eat the cake - or wait for the host to start the meal?", a: "Eat cake", b: "Wait for host" },
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

type Screen = 'welcome' | 'questionnaire' | 'optionalInfo' | 'results' | 'auth' | 'error' | 'anonymousPreview' | 'validationEdgeCase';
type OptionalInfo = {
    name: string;
    birthYear: string;
    education: string;
    source: string;
    teamCode?: string;
    isGuest?: boolean;
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
            Think of your #1 BEST FRIEND.
            <br />
            Whoever comes to mind first, that's the one!
            <br />
            Describe this BEST FRIEND’s choices in 7 clicks
            <br />
            - and unlock your hidden Values Profile and Star.
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
            <p>
                This helps personalize your Truvtus results.<br />
                All data is anonymous.
            </p>
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

                <label htmlFor="teamCode">Shared Code (for Partners)</label>
                <input
                    type="text"
                    name="teamCode"
                    id="teamCode"
                    placeholder="Enter a unique code to see how your Stars align"
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
    onGuestLogin: () => void;
    authOrigin: 'welcome' | 'optionalInfo' | 'anonymousPreview';
};

const AuthScreen = ({ setAuthError, authError, onBack, onSuccessfulVerifiedLogin, onGuestLogin, authOrigin }: AuthScreenProps) => {
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

    const handleGuestSignIn = async () => {
        setIsLoading(true);
        setAuthError('');
        setMessage('');
        try {
            // Wait for anonymous sign in
            await auth.signInAnonymously();
            onGuestLogin();
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
        if (!showEmailAuth) {
            if (authOrigin === 'welcome') return 'Welcome Back';
            if (authOrigin === 'anonymousPreview') return 'Sign in to save your Profile';
            return 'Sign in to see your Results';
        }
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
                        <p style={{ margin: '-1rem 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center' }}>
                            {authOrigin === 'welcome' ? 'Sign in to view your dashboard and the Truvtus MAPP.' :
                                authOrigin === 'anonymousPreview' ? 'and access the Truvtus MAPP.' :
                                    'Sign in to save your results and access the Truvtus MAPP.'}
                        </p>

                        <button
                            onClick={handleGoogleSignIn}
                            className="cta-button"
                            disabled={isLoading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'white', color: '#333', border: '1px solid #ccc' }}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" width="18" height="18" />
                            {isLoading ? 'Processing...' : 'Sign in with Google'}
                        </button>

                        {authError && <p className="error-message" style={{ margin: 0 }}>{authError}</p>}

                        <button
                            onClick={() => { setShowEmailAuth(true); setAuthError(''); }}
                            className="link-button"
                            disabled={isLoading}
                            style={{ alignSelf: 'center', marginTop: '0' }}
                        >
                            Use another email
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
                            <span style={{ padding: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>or</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
                        </div>

                        <button
                            onClick={handleGuestSignIn}
                            className="cta-button"
                            disabled={isLoading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'rgba(71, 167, 221, 0.15)', color: 'var(--havelock-blue)', border: '1px solid rgba(71, 167, 221, 0.4)', width: '100%', padding: '0.9rem' }}
                        >
                            {isLoading ? 'Processing...' : 'Continue as Guest'}
                        </button>

                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0', maxWidth: '90%' }}>
                            Guest profiles are temporary and will not be saved.
                        </p>
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
    profileData: { rankedScores: number[], starCoords: StarCoords, profileCode?: string, aiAnalysis?: string } | null;
    profileInfo: ProfileInfo | null;
    onForget: () => void;
    notification: string | null;
    setNotification: (msg: string | null) => void;
    user: User | null;
};

const getChekTusColor = (alignment: number) => {
    if (alignment > 0.70) return '#FF3366';    // Perfect! (Love Red)
    if (alignment > 0.40) return '#FF668B';    // High (Light Pink-Red)
    if (alignment > 0.10) return '#FF99B0';    // Okay.. (Pastel Pink)
    if (alignment > -0.20) return '#FFCCD8';   // Low (Very Pale Pink)
    return '#FFFFFF';                          // Meh... (Pure White)
};

const ResultsScreen = ({ optionalInfo, profileData, profileInfo, onForget, notification, setNotification, user }: ResultsScreenProps) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJsInstance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [allStars, setAllStars] = useState<(StarCoords & { teamCode?: string | null, userId?: string | null, createdAt?: any, animationDelay: string, animationDuration: string })[]>([]);
    const [isMapLoading, setIsMapLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [localAiAnalysis, setLocalAiAnalysis] = useState<string | null>(profileData?.aiAnalysis || null);

    // Listen to the profile document for changes to aiAnalysis if it's missing
    useEffect(() => {
        if (!localAiAnalysis && profileInfo?.id) {
            const unsubscribe = db.collection('profiles').doc(profileInfo.id).onSnapshot((doc: any) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.aiAnalysis) {
                        setLocalAiAnalysis(data.aiAnalysis);
                    }
                }
            });
            return () => unsubscribe();
        }
    }, [localAiAnalysis, profileInfo?.id]);

    // --- ChekTus State ---
    const [activeSessionCode, setActiveSessionCode] = useState<string | null>(null);
    const [ctSessionData, setCtSessionData] = useState<any | null>(null);
    const [ctModalVisible, setCtModalVisible] = useState(false);
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [ctLoading, setCtLoading] = useState(false);
    const [ctError, setCtError] = useState('');
    const [participantStars, setParticipantStars] = useState<StarCoords[]>([]);

    useEffect(() => {
        if (!ctSessionData || !ctSessionData.participants) return;

        let isMounted = true;
        const fetchParticipantStars = async () => {
            const stars: StarCoords[] = [];
            for (const uid of ctSessionData.participants) {
                if (uid === user?.uid) continue; // we already render ourselves

                try {
                    const snap = await db.collection("profiles").where("userId", "==", uid).get();
                    if (!snap.empty) {
                        const docs = snap.docs.map((d: any) => d.data());
                        docs.sort((a: any, b: any) => {
                            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                            return timeB - timeA;
                        });
                        if (docs[0].starCoords) {
                            stars.push(docs[0].starCoords);
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch participant star", e);
                }
            }
            if (isMounted) setParticipantStars(stars);
        };
        fetchParticipantStars();
        return () => { isMounted = false; };
    }, [ctSessionData?.participants?.length]);

    // Real-time ChekTus Session Listener
    useEffect(() => {
        if (!activeSessionCode) return;
        const unsubscribe = db.collection('CT_Sessions').doc(activeSessionCode).onSnapshot((doc: any) => {
            if (doc.exists) {
                // Check TTL
                const data = doc.data();
                if (data.createdAt) {
                    const createdMs = data.createdAt.toDate ? data.createdAt.toDate().getTime() : data.createdAt;
                    if (Date.now() - createdMs > CHEKTUS_TTL_MINUTES * 60000) {
                        setCtError("Session expired.");
                        setActiveSessionCode(null);
                        setCtSessionData(null);
                        return;
                    }
                }
                setCtSessionData(data);
            } else {
                setCtError("Session no longer exists.");
                setActiveSessionCode(null);
                setCtSessionData(null);
            }
        });
        return () => unsubscribe();
    }, [activeSessionCode]);

    const handleCreateSession = async () => {
        if (!user || !user.uid) { setCtError("Must be logged in."); return; }
        setCtLoading(true); setCtError('');
        try {
            // Generate a 4-digit random numeric code
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            await db.collection("CT_Sessions").doc(code).set({
                hostUid: user.uid,
                participants: [user.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                calculationComplete: false,
                finalScore: 0
            });
            setActiveSessionCode(code);
            setCtModalVisible(false);
        } catch (err: any) {
            setCtError(err.message);
        } finally {
            setCtLoading(false);
        }
    };

    const handleJoinSession = async () => {
        if (!user || !user.uid) { setCtError("Must be logged in."); return; }
        if (!joinCodeInput.trim() || joinCodeInput.length !== 4) {
            setCtError("Please enter a valid 4-digit code.");
            return;
        }
        setCtLoading(true); setCtError('');
        try {
            const code = joinCodeInput.trim();
            const docRef = db.collection("CT_Sessions").doc(code);
            const docSnap = await docRef.get();
            if (!docSnap.exists) throw new Error("Session not found.");

            const data = docSnap.data();

            // Explicitly check TTL before joining to show error in popup instantly
            if (data.createdAt) {
                const createdMs = data.createdAt.toDate ? data.createdAt.toDate().getTime() : data.createdAt;
                if (Date.now() - createdMs > CHEKTUS_TTL_MINUTES * 60000) {
                    throw new Error("Session expired.");
                }
            }

            if (data.participants && data.participants.includes(user.uid)) {
                setActiveSessionCode(code);
                setCtModalVisible(false);
                return;
            }
            if (data.participants && data.participants.length >= CHEKTUS_MAX_PARTICIPANTS) {
                throw new Error(`Session full (Max ${CHEKTUS_MAX_PARTICIPANTS} participants).`);
            }
            await docRef.update({
                participants: firebase.firestore.FieldValue.arrayUnion(user.uid)
            });
            setActiveSessionCode(code);
            setCtModalVisible(false);
        } catch (err: any) {
            setCtError(err.message);
        } finally {
            setCtLoading(false);
        }
    };

    const handleCalculateScore = async () => {
        setCtLoading(true); setCtError('');
        try {
            const calculateChekTusScore = firebase.functions().httpsCallable('calculateChekTusScore');
            await calculateChekTusScore({ sessionCode: activeSessionCode });
        } catch (err: any) {
            setCtError(err.message);
        } finally {
            setCtLoading(false);
        }
    };

    useEffect(() => {
        // Fetch the map data on init
        if (allStars.length === 0 && !isMapLoading) {
            const fetchStars = async () => {
                setIsMapLoading(true);
                setMapError(null);
                try {
                    const snapshot = await db.collection('publicStars').orderBy('createdAt', 'desc').limit(500).get();
                    const starsData = snapshot.docs.map(doc => {
                        const data = doc.data();

                        // Handle both old schema (data.starCoords) and new schema (data.x, data.y)
                        let coords = data.starCoords;
                        if (!coords && typeof data.x === 'number' && typeof data.y === 'number') {
                            coords = { x: data.x, y: data.y };
                        }

                        return {
                            starCoords: coords as StarCoords,
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
    }, []); // This effect runs on mount to fetch stars.

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
                <>
                    {isMapLoading && <div className="loading-spinner-small"></div>}
                    {mapError && <p className="error-message">{mapError}</p>}
                    {/* The anonymous white background dots */}
                    {allStars.map((star, i) => (
                        <div
                            key={i}
                            className="collective-star"
                            style={{
                                ...getStarPosition(star.x, star.y, containerSize.width),
                                animationDelay: star.animationDelay,
                                animationDuration: star.animationDuration,
                            }}
                        ></div>
                    ))}

                    {/* The explicitly targeted ChekTus participants (Golden Stars) */}
                    {participantStars.map((star, i) => (
                        <div key={`p-${i}`} className="team-star-container" style={getStarPosition(star.x, star.y, containerSize.width)}>
                            <StarIcon className="team-star" />
                        </div>
                    ))}
                </>
                {/* --- END: Added StarMap Overlay Logic --- */}

                <div className="user-star-container" style={userStarPosition}>
                    <div className="star-highlight" />
                    <StarIcon className="user-star" />
                </div>
            </div>

            <div style={{ marginTop: '1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>

                {/* --- START: ChekTus UI Logic --- */}
                {activeSessionCode && ctSessionData ? (
                    ctSessionData.calculationComplete ? (
                        <button
                            className="starmap-toggle-button"
                            style={{ backgroundColor: getChekTusColor(ctSessionData.finalScore), color: '#333', fontWeight: 'bold' }}
                            disabled
                        >
                            {Math.round(ctSessionData.finalScore * 100)}% Alignment
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Session: {activeSessionCode}</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>Waiting for calculation... ({ctSessionData.participants?.length || 1}/10 joined)</p>
                            {ctSessionData.hostUid === user?.uid && (
                                <button className="gold-cta-button" onClick={handleCalculateScore} disabled={ctLoading || ctSessionData.participants?.length < 2}>
                                    {ctLoading ? '...' : `Calculate Score`}
                                </button>
                            )}
                            {ctError && <p className="error-message">{ctError}</p>}
                        </div>
                    )
                ) : (
                    <button 
                        className="starmap-toggle-button chektus-trigger-button" 
                        onClick={() => setCtModalVisible(true)}
                        title="Check your fit"
                    >
                        ChekTus
                    </button>
                )}

                {/* The Modal */}
                {ctModalVisible && (
                    <div className="chektus-modal-overlay">
                        <div className="chektus-modal">
                            <h3>ChekTus</h3>
                            <button className="gold-cta-button" onClick={handleCreateSession} disabled={ctLoading} style={{ width: '100%' }}>
                                Start New Session
                            </button>
                            <p style={{ margin: '1rem 0' }}>— OR —</p>
                            <input
                                type="text"
                                placeholder="Enter 4-digit code"
                                maxLength={4}
                                value={joinCodeInput}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, ''); // only allow digits
                                    setJoinCodeInput(val);
                                }}
                                style={{ textAlign: 'center', letterSpacing: '2px', padding: '0.6rem' }}
                            />
                            <button className="link-button" onClick={handleJoinSession} disabled={ctLoading || joinCodeInput.length !== 4} style={{ marginTop: '0.5rem', backgroundColor: '#333', color: 'white', padding: '0.6rem', borderRadius: '4px' }}>
                                Join Session
                            </button>
                            {ctError && <p className="error-message">{ctError}</p>}
                            <button className="link-button" onClick={() => { setCtModalVisible(false); setCtError(''); }} style={{ marginTop: '1rem' }}>Cancel</button>
                        </div>
                    </div>
                )}
                {/* --- END: ChekTus UI Logic --- */}

                <a
                    href="https://map.truvtus.com"
                    className="cta-button"
                    style={{ textDecoration: 'none', width: 'fit-content', padding: '0.6rem 2rem', fontSize: '0.9rem', border: '1px solid transparent' }}
                    title="Venues you'll love"
                >
                    MAPP
                </a>

                <div style={{ width: '100%', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                    <button 
                        onClick={() => setShowAnalysis(true)} 
                        className="cta-button"
                        style={{ backgroundColor: '#6c2bd9', borderColor: '#5b21b6', width: '100%', display: showAnalysis ? 'none' : 'block' }}
                        title="Your profile explained"
                    >
                        Decode Profile
                    </button>
                    {showAnalysis && (
                        <div className="ai-analysis-container" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {localAiAnalysis ? (
                                <div className="prose prose-invert max-w-none ai-report">
                                    <ReactMarkdown>{localAiAnalysis}</ReactMarkdown>
                                </div>
                            ) : (
                                <p style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>Decoding your profile... Please wait.</p>
                            )}
                        </div>
                    )}
                </div>

                {profileInfo && (
                    <div className="profile-actions" style={{ width: '100%', marginTop: '1rem' }}>
                        <button onClick={onForget} className="starmap-toggle-button forget-button" disabled={!canForget}>Forget me!</button>
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

// --- START: Anonymous Preview & Edge Case Screens ---
const ValidationEdgeCaseScreen = () => {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = 'https://app.truvtus.com';
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="screen edge-case-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.5 }}>
                Hmm… Something doesn't add up. To give you a profile you can actually use, I need a clearer picture of what matters to you. Let's try that again.
            </h2>
        </div>
    );
};

const AnonymousPreviewScreen = ({ profileData, onSignIn, optionalInfo }: { profileData: any, onSignIn: () => void, optionalInfo: OptionalInfo }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });

    const [allStars, setAllStars] = useState<(StarCoords & { teamCode?: string | null, userId?: string | null, createdAt?: any, animationDelay: string, animationDuration: string })[]>([]);
    const [isMapLoading, setIsMapLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth;
                setContainerSize({ width, height: width });
            }
        };

        window.addEventListener('resize', updateSize);
        updateSize();

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        // Fetch the map data on init
        if (allStars.length === 0 && !isMapLoading) {
            const fetchStars = async () => {
                setIsMapLoading(true);
                setMapError(null);
                try {
                    const snapshot = await db.collection('publicStars').orderBy('createdAt', 'desc').limit(500).get();
                    const starsData = snapshot.docs.map(doc => {
                        const data = doc.data();

                        // Handle both old schema (data.starCoords) and new schema (data.x, data.y)
                        let coords = data.starCoords;
                        if (!coords && typeof data.x === 'number' && typeof data.y === 'number') {
                            coords = { x: data.x, y: data.y };
                        }

                        return {
                            starCoords: coords as StarCoords,
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
    }, []);

    useEffect(() => {
        if (chartRef.current && profileData) {
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

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
                                pointLabels: { color: 'white', font: { size: 12 } },
                                angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                                ticks: { display: false, stepSize: 2 }
                            }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }
    }, [profileData, containerSize]);

    const getStarPosition = (x: number, y: number, containerSize: number) => {
        const radius = containerSize / 2 * 0.8;
        const maxCoordinateValue = 25;
        const scaleFactor = radius / maxCoordinateValue;
        const left = (containerSize / 2) + x * scaleFactor;
        const top = (containerSize / 2) - y * scaleFactor;
        return { top: `${top}px`, left: `${left}px` };
    };

    const backgroundStars = useMemo(() => Array.from({ length: 15 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`
    })), []);

    const archetype = useMemo(() => {
        const x = profileData.starCoords.x;
        const y = profileData.starCoords.y;
        if (x >= 0 && y >= 0) return { title: 'The Altruist', desc: "As an Altruist, you are motivated by the welfare of others and the protection of the environment. You value social justice, equality, and a world at peace, and you aren't afraid to challenge the status quo to achieve those ends.\nIf I were you, I’d probably excel as a Non-Profit Leader, Sustainability Consultant, or Human Rights Advocate. I would likely avoid roles like Debt Collector or High-Pressure Luxury Sales, where the focus on individual profit might clash with your core values." };
        if (x >= 0 && y < 0) return { title: 'The Neighbor', desc: "As a Neighbour, you are driven by a sense of belonging and the desire to build something that lasts. You value the ‘tried and true’, and the warmth of a stable community. You are the glue that holds groups together, prioritizing the needs of the collective and the preservation of meaningful rituals.\nIf I were you, I’d probably excel as a Community Organizer, Family Physician, or Small Business Owner where continuity and trust are paramount. I would likely avoid roles as a Digital Nomad or Startup Founder, where constant upheaval and lack of roots could feel deeply unsettling." };
        if (x < 0 && y < 0) return { title: 'The Professional', desc: "As a Professional, you are driven by personal success and the competent demonstration of your skills. You value social status, prestige, and efficiency, appreciating the stability and order that allow you to advance in life.\nIf I were you, I’d probably excel as a Sales Executive, Real Estate Broker, or Project Manager, where results are measurable and rewarded. I would likely avoid roles in Social Work or Philosophical Research, where the lack of clear hierarchy or financial benchmarks might feel frustrating." };
        return { title: 'The Enthusiast', desc: "As an Enthusiast, you are driven by the \"new\"—new ideas, new flavors, and new perspectives. You value your independence and the freedom to choose your own path over following the crowd.\nIf I were you, I’d probably excel as an Entrepreneur, Creative Director, or Investigative Journalist, where your need for autonomy and novelty is an asset. I would likely avoid roles like Quality Compliance or Traditional Accounting, where rigid rules and repetitive routines might feel like a cage." };
    }, [profileData]);

    if (!profileData) return null;
    const userStarPosition = getStarPosition(profileData.starCoords.x, profileData.starCoords.y, containerSize.width);

    return (
        <div className="screen results-screen anonymous-preview-screen">
            <h2>Your Profile Preview</h2>

            <div className="chart-container" ref={containerRef} style={{ pointerEvents: 'none', position: 'relative' }}>
                {backgroundStars.map((style, i) => <div key={i} className="background-star" style={style}></div>)}
                <canvas ref={chartRef} width={containerSize.width} height={containerSize.height} className="blur-profile"></canvas>

                {/* --- START: Added StarMap Overlay Logic --- */}
                <>
                    {isMapLoading && <div className="loading-spinner-small"></div>}
                    {mapError && <p className="error-message">{mapError}</p>}
                    {allStars.map((star, i) => (
                        <div
                            key={i}
                            className="collective-star"
                            style={{
                                ...getStarPosition(star.x, star.y, containerSize.width),
                                animationDelay: star.animationDelay,
                                animationDuration: star.animationDuration,
                            }}
                        ></div>
                    ))}
                </>
                {/* --- END: Added StarMap Overlay Logic --- */}

                <div className="user-star-container" style={userStarPosition} title="Your Archetype">
                    <div className="star-highlight" />
                    <StarIcon className="user-star" />
                </div>
            </div>

            <div className="archetype-info" style={{ marginTop: '0', textAlign: 'center', padding: '0 1rem' }}>
                <h3 style={{ color: '#F0C419', marginBottom: '1rem', fontSize: '1.4rem' }}>{archetype.title}</h3>
                {archetype.desc.split('\n').map((para, i) => (
                    <p key={i} style={{ marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.9 }}>{para}</p>
                ))}
            </div>

            <div style={{ marginTop: '2rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: '#F0C419', textAlign: 'center', margin: 0, opacity: 0.9 }}>
                    Your Guest Profile is temporary and anonymous. To lock in your Star and unlock the full power of Truvtus, you’ll need to sign in and reconfirm your inputs so we can calculate your permanent, encrypted profile.
                </p>
                <button onClick={onSignIn} className="cta-button" style={{ width: '100%' }}>
                    OK, let me sign in now
                </button>
            </div>
        </div>
    );
};
// --- END: Anonymous Preview & Edge Case Screens ---

const App = () => {
    const [screen, setScreen] = useState<Screen>('welcome');
    const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(50));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [profileData, setProfileData] = useState<{ rankedScores: number[], starCoords: StarCoords, profileCode?: string, aiAnalysis?: string } | null>(null);
    const [optionalInfo, setOptionalInfo] = useState<OptionalInfo>({ name: '', birthYear: '', education: '', source: '', teamCode: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [authOrigin, setAuthOrigin] = useState<'welcome' | 'optionalInfo' | 'anonymousPreview'>('welcome');

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
                        profileCode: activeProfileData.profileCode,
                        aiAnalysis: activeProfileData.aiAnalysis
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
                if (currentUser && (currentUser.emailVerified || currentUser.isAnonymous)) {
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

                                if (currentUser.isAnonymous) {
                                    setScreen('anonymousPreview');
                                } else {
                                    setScreen('results');
                                }
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
            ...(userToSave?.isAnonymous && { isGuest: true }),
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
            if (userToSave && !userToSave.isAnonymous) {
                setProfileInfo({ id: docRef.id, createdAt: new Date() });
            }
            if (userToSave && userToSave.isAnonymous) {
                setScreen('anonymousPreview');
            } else {
                setScreen('results');
            }
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

        const isStraightLining = answers.every(val => val === 50);
        if (isStraightLining) {
            setIsSaving(false);
            setScreen('validationEdgeCase');
            return;
        }

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

        if (REQUIRE_AUTH_TO_VIEW_RESULTS && (!user || !(user.emailVerified || user.isAnonymous))) {
            const profileToSave = { answers, optionalInfo: finalOptionalInfo };
            pendingProfileRef.current = profileToSave;
            try {
                sessionStorage.setItem('pendingProfile', JSON.stringify(profileToSave));
            } catch (e) {
                console.warn("Could not save pending profile to sessionStorage", e);
            }
            setIsSaving(false);
            setAuthOrigin('optionalInfo');
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
        const showAuthWarning = REQUIRE_AUTH_TO_VIEW_RESULTS && (!user || !(user.emailVerified || user.isAnonymous));
        switch (screen) {
            case 'welcome': return <WelcomeScreen onStart={handleStart} />;
            case 'questionnaire': return <QuestionnaireScreen currentQuestionIndex={currentQuestionIndex} questionOrder={questionOrder} answers={answers} onAnswerChange={handleAnswerChange} onNextQuestion={handleNextQuestion} />;
            case 'optionalInfo': return <OptionalInfoScreen optionalInfo={optionalInfo} isSaving={isSaving} onInfoChange={handleOptionalInfoChange} onSubmit={handleSubmitOptionalInfo} showAuthWarning={showAuthWarning} />;
            case 'auth': return <AuthScreen setAuthError={setAuthError} authError={authError} onBack={() => setScreen(authOrigin)} onSuccessfulVerifiedLogin={handleSuccessfulVerifiedLogin} onGuestLogin={() => {
                const currentUser = auth.currentUser;
                if (currentUser && currentUser.isAnonymous) {
                    handleSuccessfulVerifiedLogin(currentUser);
                }
            }} authOrigin={authOrigin} />;
            case 'anonymousPreview': return <AnonymousPreviewScreen profileData={profileData} onSignIn={() => {
                pendingProfileRef.current = { answers: [...answers], optionalInfo: { ...optionalInfo } };
                setAuthOrigin('anonymousPreview');
                setScreen('auth');
            }} optionalInfo={optionalInfo} />;
            case 'validationEdgeCase': return <ValidationEdgeCaseScreen />;
            case 'results': return <ResultsScreen optionalInfo={optionalInfo} profileData={profileData} profileInfo={profileInfo} onForget={handleForgetProfile} notification={notification} setNotification={setNotification} user={user} />;
            case 'error': return <ErrorScreen message={dataError} onLogout={handleLogout} />;
            default: return <WelcomeScreen onStart={handleStart} />;
        }
    };

    return (
        <div className="app-container">
            <Header user={user} onLogout={handleLogout} onLogin={() => { setDataError(''); setAuthOrigin('welcome'); setScreen('auth'); }} />
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