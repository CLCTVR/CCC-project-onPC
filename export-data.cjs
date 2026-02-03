// export-data.cjs

// --- SETUP ---
const admin = require('firebase-admin');
const { Parser } = require('json2csv');
const fs = require('fs');

// --- CONFIGURATION ---
// Use the same service account key you used for the set-admin script
const serviceAccount = require('./service-account-key.json');

// --- INITIALIZE FIREBASE ADMIN ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('Successfully connected to Firebase.');

// --- MAIN EXPORT FUNCTION ---
async function exportProfiles() {
  try {
    console.log('Fetching profiles from Firestore...');
    const profilesSnapshot = await db.collection('profiles').get();
    const profilesData = [];

    if (profilesSnapshot.empty) {
      console.log('No profiles found.');
      return;
    }

    console.log(`Found ${profilesSnapshot.size} profiles. Processing...`);

    // Loop through each profile and flatten the data
    profilesSnapshot.forEach(doc => {
      const data = doc.data();

      // Convert Firestore Timestamps to a readable ISO string (like 2024-11-15T20:30:00.000Z)
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
      const archivedAt = data.archivedAt?.toDate ? data.archivedAt.toDate().toISOString() : null;
      
      const flattenedProfile = {
        profileId: doc.id,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        createdAt: createdAt,
        isArchived: data.isArchived || false,
        archivedAt: archivedAt,
        profileCode: data.profileCode,
        // Optional Info
        name: data.optionalInfo?.name || null,
        birthYear: data.optionalInfo?.birthYear || null,
        education: data.optionalInfo?.education || null,
        source: data.optionalInfo?.source || null,
        // Star Coordinates
        starCoords_x: data.starCoords?.x || null,
        starCoords_y: data.starCoords?.y || null,
        // Raw Answers
        answer_1: data.answers?.[0] || null,
        answer_2: data.answers?.[1] || null,
        answer_3: data.answers?.[2] || null,
        answer_4: data.answers?.[3] || null,
        answer_5: data.answers?.[4] || null,
        answer_6: data.answers?.[5] || null,
        answer_7: data.answers?.[6] || null,
        // Ranked Scores
        rankedScore_UN: data.rankedScores?.[0] || null,
        rankedScore_BE: data.rankedScores?.[1] || null,
        rankedScore_TC: data.rankedScores?.[2] || null,
        rankedScore_SE: data.rankedScores?.[3] || null,
        rankedScore_PO: data.rankedScores?.[4] || null,
        rankedScore_AC: data.rankedScores?.[5] || null,
        rankedScore_HE: data.rankedScores?.[6] || null,
        rankedScore_ST: data.rankedScores?.[7] || null,
        rankedScore_SD: data.rankedScores?.[8] || null,
      };
      profilesData.push(flattenedProfile);
    });

    // Convert the flattened data to a CSV string
    const parser = new Parser();
    const csv = parser.parse(profilesData);
    
    // Create a filename with today's date
    const date = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const filename = `profiles_export_${date}.csv`;

    // Save the CSV string to a file
    fs.writeFileSync(filename, csv);
    
    console.log('--- SCRIPT SUCCESS ---');
    console.log(`Successfully exported ${profilesData.length} profiles to ${filename}`);

  } catch (error) {
    console.error('--- SCRIPT FAILED ---');
    console.error('An error occurred:', error);
  }
}

// --- RUN THE SCRIPT ---
exportProfiles();