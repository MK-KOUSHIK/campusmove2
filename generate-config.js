/**
 * generate-config.js
 * 
 * Generates 'firebase-config.js' from environment variables (.env file or system/CI env).
 * Zero external dependencies required - runs natively with Node.js.
 */

const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    
    // Remove surrounding single or double quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    
    env[key] = val;
  }
  return env;
}

const envPath = path.join(__dirname, '.env');
const fileEnv = parseEnvFile(envPath);

// Merge: process.env takes precedence over .env file
const get = (key, fallback = '') => process.env[key] || fileEnv[key] || fallback;

const config = {
  firebase: {
    apiKey: get('FIREBASE_API_KEY'),
    authDomain: get('FIREBASE_AUTH_DOMAIN'),
    databaseURL: get('FIREBASE_DATABASE_URL'),
    projectId: get('FIREBASE_PROJECT_ID'),
    storageBucket: get('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: get('FIREBASE_MESSAGING_SENDER_ID'),
    appId: get('FIREBASE_APP_ID')
  },
  geofenceRadiusMeters: Number(get('GEOFENCE_RADIUS_METERS', '20')) || 20,
  campusCenter: {
    lat: Number(get('CAMPUS_CENTER_LAT', '12.9716')) || 12.9716,
    lng: Number(get('CAMPUS_CENTER_LNG', '77.5946')) || 77.5946
  }
};

const outputContent = `// Auto-generated configuration - do not commit sensitive keys to public repositories
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};
`;

const outputPath = path.join(__dirname, 'firebase-config.js');
fs.writeFileSync(outputPath, outputContent, 'utf-8');

console.log('✓ Successfully generated firebase-config.js');
if (!config.firebase.apiKey || config.firebase.apiKey.startsWith('AIzaSyYourApiKey')) {
  console.warn('⚠ Note: Firebase API Key is empty or still placeholder. Fill in .env or edit firebase-config.js directly.');
} else {
  console.log(`✓ Project ID configured: ${config.firebase.projectId || '(none)'}`);
}

