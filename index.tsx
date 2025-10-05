import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// Firebase is loaded globally via <script> tags in index.html
declare const firebase: any;

// --- Admin Configuration ---
// This is a test comment to verify the VS Code to GitHub connection.
// If true, anonymous users will be prompted to log in or register to see their results.
const REQUIRE_AUTH_TO_VIEW_RESULTS = true;
// Cooldown in hours before a user can "forget" their profile and create a new one.
const PROFILE_CREATION_COOLDOWN_HOURS = 720; // 30 days


// --- Firebase Initialization ---
// The firebaseConfig object is now loaded from `firebase-config.js` into window.firebaseConfig
// This prevents API keys from being committed to source control.
declare global {
    interface Window {
        firebaseConfig?: {
            apiKey: string;
            authDomain: string;
            projectId: string;
            storageBucket: string;
            messagingSenderId: string;
            appId: string;
            measurementId: string;
        };
    }
}

if (!window.firebaseConfig || window.firebaseConfig.apiKey === "PASTE_YOUR_FIREBASE_WEB_API_KEY_HERE") {
    alert("CRITICAL: Firebase configuration is missing or incomplete. Please create or update 'firebase-config.js' with your Firebase project details.");
    throw new Error("Firebase config not found or API Key not configured in firebase-config.js");
}


// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
}
// CRITICAL: Ensure you have configured Firestore Security Rules in the Firebase console
// to prevent unauthorized access to your data. Your rules should ensure users can
// only read and write their own profile data.
const db = firebase.firestore();
const auth = firebase.auth();
// --- End of Firebase Initialization ---


// --- Logic from questions.ts merged directly into this file ---
const QUESTIONS = [
  { q: "Would your BEST TEAMMATE rather join Green Peace or the White House staff?", a: "Green Peace", b: "White House staff" },
  { q: "Would your BEST TEAMMATE rather fight climate change or compete for the Nobel Prize?", a: "Fight climate change", b: "Nobel Prize" },
  { q: "Would your BEST TEAMMATE rather win the Olympics or coach the local soccer team?", a: "Win the Olympics", b: "Coach local team" },
  { q: "Would your BEST TEAMMATE rather enjoy speeding or respect the posted speed limit?", a: "Enjoy speeding", b: "Respect speed limit" },
  { q: "Would your BEST TEAMMATE rather attend church or go bungee jumping?", a: "Attend church", b: "Bungee jumping" },
  { q: "Would your BEST TEAMMATE rather prefer freelance or a steady 9-to-5 job?", a: "Freelance", b: "Steady 9-to-5" },
  { q: "Would your BEST TEAMMATE rather prefer an adventure or a safe trip?", a: "An adventure", b: "A safe trip" }
];

// The primary order of values, clockwise starting from the top-right.
const VALUE_LABELS = ['UN', 'BE', 'TC', 'SE', 'PO', 'AC', 'HE', 'ST', 'SD'];

// Angles in degrees for each value, corresponding to VALUE_LABELS. 0 degrees is right, counter-clockwise.
const ANGLES_DEG = [70, 30, 350, 310, 270, 230, 190, 110, 150];
const VALUE_ANGLES = ANGLES_DEG.map(deg => deg * (Math.PI / 180)); // Convert to radians

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
      new (context: CanvasRenderingContext2D, config: ChartJsConfig): ChartJsInstance;
    };
  }
}

const calculateProfile = (answers: number[]) => {
  const [q1, q2, q3, q4, q5, q6, q7] = answers;

  // Raw score calculations based on provided formulas
  const rawScores = {
    UN: (101 - q1 + 101 - q2) / 2,
    BE: q3,
    TC: (101 - q5 + q4) / 2,
    SE: (q6 + q7) / 2,
    PO: q1,
    AC: (q2 + 101 - q3) / 2,
    HE: (101 - q4),
    ST: (q5 + 101 - q7) / 2,
    SD: (101 - q6)
  };

  // Build the scores array in the same sequential order as VALUE_LABELS
  const scoresArray = VALUE_LABELS.map(label => rawScores[label as keyof typeof rawScores]);

  // Ranking logic: scale scores from 1 to 10
  const minScore = Math.min(...scoresArray);
  const maxScore = Math.max(...scoresArray);
  
  const rankedScores = scoresArray.map(score => {
    if (maxScore === minScore) return 5.5; // Handle edge case where all scores are equal
    return 1 + 9 * (score - minScore) / (maxScore - minScore);
  });

  // Calculate "vector of vectors" for the star position
  let totalX = 0;
  let totalY = 0;
  
  rankedScores.forEach((magnitude, i) => {
    const angle = VALUE_ANGLES[i];
    totalX += magnitude * Math.cos(angle);
    totalY += magnitude * Math.sin(angle);
  });

  return {
    rankedScores,
    starCoords: { x: totalX, y: totalY }
  };
};

const generateProfileCode = (rankedScores: number[]) => {
    // 1. Combine labels and scores
    const scoresWithLabels = VALUE_LABELS.map((label, index) => ({
        label,
        score: rankedScores[index]
    }));

    // 2. Sort by score in descending order to determine rank
    scoresWithLabels.sort((a, b) => b.score - a.score);

    // 3. Create a map of label to its rank (1-9)
    const rankMap = new Map<string, number>();
    scoresWithLabels.forEach((item, index) => {
        rankMap.set(item.label, index + 1);
    });
    
    // 4. Build the final string based on the primary clockwise order (VALUE_LABELS)
    return VALUE_LABELS.map(label => rankMap.get(label)).join('');
};
// --- End of merged logic ---

type Screen = 'welcome' | 'questionnaire' | 'optionalInfo' | 'results' | 'auth' | 'error';
type OptionalInfo = {
  name: string;
  birthYear: string;
  education: string;
  source: string;
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
    <img src="assets/logo.png" alt="Collectiver Culture Compass Logo" width="40" height="40" />
);

const Header = ({ user, onLogout, onLogin }: { user: User | null; onLogout: () => void; onLogin: () => void; }) => (
    <header className="app-header">
        <div className="header-content">
            <Logo />
            <h1>Collectiver Culture Compass</h1>
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
      <h2>Discover Your Inner Compass</h2>
      <p>This isn't just a quiz—it's a journey of self-discovery. Answer 7 thought-provoking questions to generate your unique values profile, revealing what truly drives you. See where your star lies in the growing collective map of human values.</p>
      <button onClick={onStart} className="cta-button">Begin</button>
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
                <p>{getDescription()}</p>
                <form className="auth-form" onSubmit={handleAuthAction}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                    {mode !== 'forgotPassword' && (
                         <div className="password-input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
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
                    <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); clearState(); }} className="link-button" disabled={isLoading}>
                        {mode === 'register' ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                    </button>
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

const SharedStarMap = ({ userStarCoords }: { userStarCoords: StarCoords }) => {
    const [allStars, setAllStars] = useState<StarCoords[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStars = async () => {
            try {
                // Fetch star coordinates from the publicly accessible 'publicStars' collection.
                // This collection is designed for public read access to avoid security rule violations
                // that would occur when querying the main 'profiles' collection.
                const snapshot = await db.collection('publicStars').orderBy('createdAt', 'desc').limit(500).get();
                const starsData = snapshot.docs.map(doc => doc.data().starCoords as StarCoords);
                setAllStars(starsData.filter(coords => coords && typeof coords.x === 'number' && typeof coords.y === 'number'));
            } catch (err) {
                console.error("Error fetching stars from publicStars:", err);
                setError("Could not load the Shared StarMap. This might be due to a network issue or database permissions.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStars();
    }, []);

    const getMapPosition = (coord: number) => {
        // The vector sum can range from approx -25 to 25.
        // We normalize this to a 0-100 scale for positioning.
        const normalized = (coord + 25) / 50 * 100;
        return Math.max(0, Math.min(100, normalized)); // Clamp between 0% and 100%
    };

    return (
        <div className="shared-starmap-wrapper">
            <h3>The Shared StarMap</h3>
            <p>See where your values align with others. Each star represents an anonymous user's profile.</p>
            <div className="shared-starmap-container">
                {isLoading && <div className="loading-spinner-small"></div>}
                {error && <p className="error-message">{error}</p>}
                {!isLoading && !error && (
                    <>
                        {allStars.map((star, i) => (
                            <div
                                key={i}
                                className="collective-star"
                                style={{
                                    left: `${getMapPosition(star.x)}%`,
                                    top: `${getMapPosition(-star.y)}%`, // Y is inverted for screen coordinates
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            ></div>
                        ))}
                         <div
                            className="collective-user-star"
                            style={{
                                left: `${getMapPosition(userStarCoords.x)}%`,
                                top: `${getMapPosition(-userStarCoords.y)}%`
                            }}
                        ></div>
                    </>
                )}
            </div>
        </div>
    );
};


type ResultsScreenProps = {
    optionalInfo: OptionalInfo;
    profileData: { rankedScores: number[], starCoords: StarCoords } | null;
    profileInfo: ProfileInfo | null;
    onForget: () => void;
};

const ResultsScreen = ({ optionalInfo, profileData, profileInfo, onForget }: ResultsScreenProps) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJsInstance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [isStarMapVisible, setIsStarMapVisible] = useState(false);

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

    const getStarPosition = (x: number, y: number, size: number) => {
        const radius = size / 2 * 0.8; // Estimated radius of the chart's drawing area
        // The starCoords are a vector sum, with an empirical max absolute value around 25.
        // We scale these coordinates to fit within the visual radius of the chart.
        const maxCoordinateValue = 25;
        const scaleFactor = radius / maxCoordinateValue;

        const left = (size / 2) + x * scaleFactor - 15; // 15 is half star width
        const top = (size / 2) - y * scaleFactor - 15; // 15 is half star height, -y for screen coords
        return { top: `${top}px`, left: `${left}px` };
    };
    
    const backgroundStars = useMemo(() => Array.from({ length: 15 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`
    })), []);

    const profileCode = useMemo(() => {
        if (!profileData) return '';
        return generateProfileCode(profileData.rankedScores);
    }, [profileData]);

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
            <div className="chart-container" ref={containerRef}>
                {backgroundStars.map((style, i) => (
                    <div key={i} className="background-star" style={style}></div>
                ))}
                <canvas ref={chartRef} width={containerSize.width} height={containerSize.height}></canvas>
                <div className="user-star" style={userStarPosition}>
                     <div className="star-highlight"></div>
                     &#9733;
                </div>
            </div>
            <p className="profile-code">{profileCode}</p>

            <button onClick={() => setIsStarMapVisible(!isStarMapVisible)} className="starmap-toggle-button">
              {isStarMapVisible ? 'Hide StarMap' : 'View StarMap'}
            </button>
            
            {isStarMapVisible && <SharedStarMap userStarCoords={profileData.starCoords} />}

            {profileInfo && (
                <div className="profile-actions">
                    <button onClick={onForget} className="cta-button forget-button" disabled={!canForget}>Forget me!</button>
                    {!canForget && <p className="cooldown-message">{cooldownMessage}</p>}
                </div>
            )}
        </div>
    );
};

const App = () => {
    const [screen, setScreen] = useState<Screen>('welcome');
    const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(50));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [profileData, setProfileData] = useState<{ rankedScores: number[], starCoords: StarCoords } | null>(null);
    const [optionalInfo, setOptionalInfo] = useState<OptionalInfo>({ name: '', birthYear: '', education: '', source: '' });
    const [isSaving, setIsSaving] = useState(false);

    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [authError, setAuthError] = useState('');
    const [dataError, setDataError] = useState('');
    const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
    
    const pendingProfileRef = useRef<{ answers: number[], optionalInfo: OptionalInfo } | null>(null);
    const isInitialLoad = useRef(true);

    const questionOrder = useMemo(() => shuffleArray(Array.from(Array(QUESTIONS.length).keys())), []);

    const resetQuestionnaire = () => {
        setScreen('welcome');
        setAnswers(Array(QUESTIONS.length).fill(50));
        setCurrentQuestionIndex(0);
        setProfileData(null);
        setProfileInfo(null);
        setOptionalInfo({ name: '', birthYear: '', education: '', source: '' });
        setDataError('');
    };

    const processPendingProfile = async (userForProfile: User) => {
        if (pendingProfileRef.current) {
            const profileToSave = pendingProfileRef.current;
            
            // Clear the pending profile immediately to prevent race conditions or double saves.
            pendingProfileRef.current = null;
            sessionStorage.removeItem('pendingProfile'); 

            await saveProfile(profileToSave.answers, profileToSave.optionalInfo, userForProfile);
        }
    };

    const handleSuccessfulVerifiedLogin = (loggedInUser: User) => {
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
                                const finalProfile = calculateProfile(activeProfile.answers);
                                setProfileData(finalProfile);
                                // Defensively set optionalInfo to prevent crashes if it's missing
                                setOptionalInfo(activeProfile.optionalInfo || { name: '', birthYear: '', education: '', source: '' });
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

    const saveProfile = async (answersToSave: number[], infoToSave: OptionalInfo, userToSave: User | null) => {
        setIsSaving(true);

        // Basic input sanitization
        const sanitizedInfo = {
            ...infoToSave,
            name: infoToSave.name.trim(),
        };

        const finalProfile = calculateProfile(answersToSave);
        const profileCode = generateProfileCode(finalProfile.rankedScores);

        const payload: any = {
            profileCode,
            rankedScores: finalProfile.rankedScores,
            starCoords: finalProfile.starCoords,
            answers: answersToSave,
            optionalInfo: sanitizedInfo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false,
        };
        if (userToSave) {
            payload.userId = userToSave.uid;
            // Defensively set to null if email is missing to ensure the field is created in Firestore
            payload.userEmail = userToSave.email || null;
        }

        let docRef;
        try {
            // --- Step 1: Attempt to save the new profile. This is the critical step. ---
            docRef = await db.collection('profiles').add(payload);
            console.log('Profile saved successfully with ID:', docRef.id);

        } catch (error) {
            console.error('Error saving profile to Firestore:', error);
            alert("There was a problem saving your profile. Please check your internet connection and try again.");
            setIsSaving(false); // Ensure spinner is turned off on failure.
            return; // Halt execution if the primary save fails.
        }

        // --- Step 2: Since save was successful, update the UI immediately. ---
        setProfileData(finalProfile);
        setOptionalInfo(sanitizedInfo);
        if (userToSave) {
            setProfileInfo({ id: docRef.id, createdAt: new Date() }); // Use client date for immediate UI feedback.
        }
        setScreen('results');
        setIsSaving(false);

        // --- Step 3: Trigger background task to save public, anonymous star data. ---
        // This is a client-side "double write". In a production system, this would
        // ideally be a Cloud Function triggered by the creation of the profile document.
        try {
            await db.collection('publicStars').add({
                starCoords: finalProfile.starCoords,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Public star data saved successfully.');
        } catch (error) {
            console.warn('Could not save public star data. The main profile was saved.', error);
        }

        // --- Step 4: Trigger background task to clean up old profiles. ---
        // This is "fire and forget". It won't block the UI or show errors to the user.
        if (userToSave) {
            archiveOldProfiles(userToSave.uid, docRef.id);
        }
    };
    
    const handleSubmitOptionalInfo = async () => {
        if (REQUIRE_AUTH_TO_VIEW_RESULTS && (!user || !user.emailVerified)) {
            const profileToSave = { answers, optionalInfo };
            pendingProfileRef.current = profileToSave;
            try {
                sessionStorage.setItem('pendingProfile', JSON.stringify(profileToSave));
            } catch (e) {
                console.warn("Could not save pending profile to sessionStorage", e);
            }
            setScreen('auth');
            return;
        }
        await saveProfile(answers, optionalInfo, user);
    };

    const handleLogout = () => {
        auth.signOut();
    };

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
            case 'results': return <ResultsScreen optionalInfo={optionalInfo} profileData={profileData} profileInfo={profileInfo} onForget={handleForgetProfile} />;
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