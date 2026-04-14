/**
 * Truvtus Q7 Cloud Functions
 * 
 * This file contains the secure backend implementation of proprietary Q7 algorithms.
 * These functions replace client-side calculations to protect intellectual property.
 * 
 * Functions:
 * 1. processQ7Assessment - Creates user profile from 7-question assessment
 * 2. updateVenueProfile - Updates venue profile after user check-in
 * 3. calculateVenueAlignment - Calculates user-venue compatibility
 */

const { onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({
    maxInstances: 10,
    region: "us-central1",
});

// ============================================================================
// PROPRIETARY Q7 ALGORITHMS (Migrated from client-side)
// ============================================================================

// The primary order of values, clockwise starting from the top-right.
const VALUE_LABELS = ["UN", "BE", "TC", "SE", "PO", "AC", "HE", "ST", "SD"];

// Angles in degrees for each value, corresponding to VALUE_LABELS.
// 0 degrees is right, counter-clockwise.
const ANGLES_DEG = [70, 30, 350, 310, 270, 230, 190, 150, 110];
const VALUE_ANGLES = ANGLES_DEG.map((deg) => deg * (Math.PI / 180));

/**
 * Calculates Q7 profile from 7 raw answers
 * @param {number[]} answers - Array of 7 slider values (0-100)
 * @return {Object} { rankedScores, starCoords }
 */
function calculateProfile(answers) {
    const [q1, q2, q3, q4, q5, q6, q7] = answers;

    // Raw score calculations based on provided formulas
    const rawScores = {
        UN: (100 - q1 + 100 - q2) / 2,
        BE: q3,
        TC: (100 - q5 + q4) / 2,
        SE: (q6 + q7) / 2,
        PO: q1,
        AC: (q2 + 100 - q3) / 2,
        HE: (100 - q4),
        ST: (q5 + 100 - q7) / 2,
        SD: (100 - q6),
    };

    // Build the scores array in the same sequential order as VALUE_LABELS
    const scoresArray = VALUE_LABELS.map(
        (label) => rawScores[label]
    );

    // Ranking logic: scale scores from 1 to 10
    const minScore = Math.min(...scoresArray);
    const maxScore = Math.max(...scoresArray);

    const rankedScores = scoresArray.map((score) => {
        if (maxScore === minScore) return 5.5;
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
        starCoords: { x: totalX, y: totalY },
    };
}

/**
 * Generates 9-digit profile code from ranked scores
 * @param {number[]} rankedScores - Array of 9 ranked values (1-10)
 * @return {string} 9-digit profile code
 */
function generateProfileCode(rankedScores) {
    // 1. Combine labels and scores
    const scoresWithLabels = VALUE_LABELS.map((label, index) => ({
        label,
        score: rankedScores[index],
    }));

    // 2. Sort by score in descending order to determine rank
    scoresWithLabels.sort((a, b) => b.score - a.score);

    // 3. Create a map of label to its rank (1-9)
    const rankMap = new Map();
    scoresWithLabels.forEach((item, index) => {
        rankMap.set(item.label, index + 1);
    });

    // 4. Build the final string based on the primary clockwise order
    return VALUE_LABELS.map((label) => rankMap.get(label)).join("");
}

/**
 * Calculates Profile Distortion Index
 * @param {number[]} rankedScores - Array of 9 ranked values (1-10)
 * @return {number} Profile Distortion Index (typically 2-6)
 */
function calculateProfileDistortion(rankedScores) {
    // Calculate absolute differences between consecutive values
    const differences = [];
    for (let i = 0; i < rankedScores.length; i++) {
        const current = rankedScores[i];
        const next = rankedScores[(i + 1) % rankedScores.length];
        differences.push(Math.abs(current - next));
    }

    // Return the average of all differences
    const sum = differences.reduce((acc, val) => acc + val, 0);
    const average = sum / differences.length;

    return Number(average.toFixed(2));
}

/**
 * Calculates Pearson Correlation Coefficient
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @return {number} Correlation (-1 to 1)
 */
function calculatePearsonCorrelation(x, y) {
    const n = x.length;
    if (y.length !== n || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
        (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * Cloud Function: processQ7Assessment
 * 
 * Creates a user profile from 7-question assessment answers.
 * Replaces client-side profile creation in Q7-PWA.
 * 
 * @param {Object} data - Request data
 * @param {number[]} data.answers - Array of 7 slider values (0-100)
 * @param {Object} data.optionalInfo - User metadata (name, birthYear, etc.)
 * @param {string} data.userId - Firebase Auth UID
 * @return {Object} { success, profileCode, profileId, rankedScores, starCoords }
 */
exports.processQ7Assessment = onCall(async (request) => {
    const { answers, optionalInfo, userId } = request.data;

    // Validate inputs
    if (!answers || answers.length !== 7) {
        throw new Error("Invalid input: answers must be an array of 7 numbers");
    }

    if (!userId) {
        throw new Error("Invalid input: userId is required");
    }

    try {
        // Calculate profile using proprietary algorithm
        const { rankedScores, starCoords } = calculateProfile(answers);
        const profileCode = generateProfileCode(rankedScores);
        const profileDistor = calculateProfileDistortion(rankedScores);

        // Prepare profile document
        const profileData = {
            userId,
            userEmail: request.auth?.token?.email || "",
            answers,
            rankedScores,
            starCoords,
            profileCode,
            profileDistor,
            optionalInfo: optionalInfo || {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isArchived: false,
        };

        // Write to Firestore using Admin SDK (bypasses security rules)
        const db = admin.firestore();
        const profileRef = await db.collection("profiles").add(profileData);

        // Also write to publicStars for StarMap feature
        await db.collection("publicStars").add({
            userId,
            x: starCoords.x,
            y: starCoords.y,
            teamCode: optionalInfo?.teamCode || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("Profile created successfully", {
            profileId: profileRef.id,
            userId,
            profileCode,
        });

        return {
            success: true,
            profileCode,
            profileId: profileRef.id,
            rankedScores,
            starCoords,
        };
    } catch (error) {
        logger.error("Error processing Q7 assessment", { error, userId });
        throw new Error(`Failed to process assessment: ${error.message}`);
    }
});

/**
 * Cloud Function: updateVenueProfile
 * 
 * Updates a venue's profile after a user check-in.
 * Averages all visitor profiles to create venue profile.
 * Replaces client-side venue profiling in Q7-FIKA.
 * 
 * @param {Object} data - Request data
 * @param {string} data.venueId - Firestore venue document ID
 * @param {string} data.userId - Firebase Auth UID of checking-in user
 * @return {Object} { success, profileCode, averageScores }
 */
exports.updateVenueProfile = onCall(async (request) => {
    const { venueId, userId } = request.data;

    // Validate inputs
    if (!venueId || !userId) {
        throw new Error("Invalid input: venueId and userId are required");
    }

    try {
        const db = admin.firestore();

        // Fetch all visits for this venue
        const visitsSnapshot = await db
            .collection("visits")
            .where("venueId", "==", venueId)
            .get();

        // Collect user profiles for all visitors
        const scoreSums = Array(9).fill(0);
        let validProfileCount = 0;

        for (const visitDoc of visitsSnapshot.docs) {
            const visitData = visitDoc.data();
            const visitorId = visitData.userId;

            try {
                // Fetch visitor's profile
                const profileSnapshot = await db
                    .collection("profiles")
                    .where("userId", "==", visitorId)
                    .limit(1)
                    .get();

                if (!profileSnapshot.empty) {
                    const profileData = profileSnapshot.docs[0].data();
                    if (profileData.rankedScores &&
                        profileData.rankedScores.length === 9) {
                        profileData.rankedScores.forEach((score, i) => {
                            scoreSums[i] += score;
                        });
                        validProfileCount++;
                    }
                }
            } catch (err) {
                logger.warn("Could not fetch profile for visitor", {
                    visitorId,
                    error: err.message,
                });
            }
        }

        // Calculate average scores
        if (validProfileCount > 0) {
            const averageScores = scoreSums.map((sum) => sum / validProfileCount);
            const profileCode = generateProfileCode(averageScores);

            // Update venue document
            await db.collection("venues").doc(venueId).update({
                rankedScores: averageScores,
                profileCode,
                visitCount: admin.firestore.FieldValue.increment(1),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info("Venue profile updated", {
                venueId,
                profileCode,
                visitCount: validProfileCount,
            });

            return {
                success: true,
                profileCode,
                averageScores,
            };
        } else {
            // No valid profiles found, just increment visit count
            await db.collection("venues").doc(venueId).update({
                visitCount: admin.firestore.FieldValue.increment(1),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                success: true,
                profileCode: null,
                averageScores: null,
            };
        }
    } catch (error) {
        logger.error("Error updating venue profile", { error, venueId, userId });
        throw new Error(`Failed to update venue profile: ${error.message}`);
    }
});

/**
 * Cloud Function: calculateVenueAlignment
 * 
 * Calculates compatibility between a user and a venue.
 * Uses Pearson correlation to measure alignment.
 * Replaces client-side alignment calculation in Q7-FIKA.
 * 
 * @param {Object} data - Request data
 * @param {string} data.userId - Firebase Auth UID
 * @param {string} data.venueId - Firestore venue document ID
 * @return {Object} { alignment }
 */
exports.calculateVenueAlignment = onCall(async (request) => {
    const { userId, venueId } = request.data;

    // Validate inputs
    if (!userId || !venueId) {
        throw new Error("Invalid input: userId and venueId are required");
    }

    try {
        const db = admin.firestore();

        // Fetch user profile
        const userProfileSnapshot = await db
            .collection("profiles")
            .where("userId", "==", userId)
            .limit(1)
            .get();

        if (userProfileSnapshot.empty) {
            throw new Error("User profile not found");
        }

        const userProfile = userProfileSnapshot.docs[0].data();

        // Fetch venue profile
        const venueDoc = await db.collection("venues").doc(venueId).get();

        if (!venueDoc.exists) {
            throw new Error("Venue not found");
        }

        const venueData = venueDoc.data();

        // Calculate alignment if both have valid rankedScores
        if (userProfile.rankedScores &&
            venueData.rankedScores &&
            venueData.visitCount > 0) {
            const alignment = calculatePearsonCorrelation(
                userProfile.rankedScores,
                venueData.rankedScores
            );

            logger.info("Venue alignment calculated", {
                userId,
                venueId,
                alignment,
            });

            return { alignment };
        } else {
            // Venue not yet profiled or user profile incomplete
            return { alignment: 0 };
        }
    } catch (error) {
        logger.error("Error calculating venue alignment", {
            error,
            userId,
            venueId,
        });
        throw new Error(`Failed to calculate alignment: ${error.message}`);
    }
});

/**
 * Cloud Function: calculateChekTusScore
 * 
 * Calculates team alignment score for a ChekTus session.
 * Replaces any client-side calculations and enforces security.
 * 
 * @param {Object} data - Request data
 * @param {string} data.sessionCode - The 5-digit ChekTus code
 * @return {Object} { success, alignment }
 */
exports.calculateChekTusScore = onCall(async (request) => {
    const { sessionCode } = request.data;
    const uid = request.auth?.uid;

    if (!sessionCode || !uid) {
        throw new Error("Invalid input: sessionCode and authenticated user required");
    }

    try {
        const db = admin.firestore();
        
        // Fetch session
        const sessionDoc = await db.collection("CT_Sessions").doc(sessionCode).get();
        if (!sessionDoc.exists) {
            throw new Error("Session not found");
        }
        
        const sessionData = sessionDoc.data();
        
        // Verify host
        if (sessionData.hostUid !== uid) {
            throw new Error("Only the host can calculate the score");
        }

        const participants = sessionData.participants || [];
        if (participants.length < 2) {
            throw new Error("Need at least 2 participants for a calculation");
        }

        // Fetch all participant profiles
        let profilesData = [];
        
        // Sequential query because participant array is small (<= 10)
        for (const participantUid of participants) {
            const profileSnapshot = await db
                .collection("profiles")
                .where("userId", "==", participantUid)
                .get();
                
            if (!profileSnapshot.empty) {
                // Sort in memory to bypass the Firebase Composite Index requirement
                const docs = profileSnapshot.docs.map(d => d.data());
                docs.sort((a,b) => {
                    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return timeB - timeA;
                });
                
                const pd = docs[0];
                if (pd.rankedScores && pd.rankedScores.length === 9) {
                    profilesData.push(pd.rankedScores);
                }
            }
        }

        if (profilesData.length < 2) {
            throw new Error("Not enough valid profiles found among participants");
        }

        // Calculate Team Alignment (Average Pearson Correlation)
        let totalCorrelation = 0;
        let pairCount = 0;

        for (let i = 0; i < profilesData.length; i++) {
            for (let j = i + 1; j < profilesData.length; j++) {
                const correlation = calculatePearsonCorrelation(profilesData[i], profilesData[j]);
                totalCorrelation += correlation;
                pairCount++;
            }
        }

        const alignment = pairCount === 0 ? 0 : totalCorrelation / pairCount;

        // Write the definitive final percentage and unlock flag directly to the session doc
        await db.collection("CT_Sessions").doc(sessionCode).update({
            finalScore: alignment,
            calculationComplete: true
        });

        logger.info("ChekTus score calculated securely", {
            sessionCode,
            alignment,
            participantCount: profilesData.length,
            pairCount
        });

        return { success: true, alignment, participantCount: profilesData.length };

    } catch (error) {
        logger.error("Error calculating ChekTus score", { error, sessionCode });
        throw new Error(`Failed to calculate ChekTus score: ${error.message}`);
    }
});
