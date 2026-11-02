/**
 * generate-config.js
 * 
 * Generates 'firebase-config.js' from environment variables (.env file or system/CI env)
 * and prepares the 'public/' directory required by Vercel for static deployments.
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

// Helper to retrieve env var
const get = (key, fallback = '') => process.env[key] || fileEnv[key] || fallback;

// Load existing config so we never erase valid credentials during builds
const outputPath = path.join(__dirname, 'firebase-config.js');
let existingConfig = {};
if (fs.existsSync(outputPath)) {
  try {
    const raw = fs.readFileSync(outputPath, 'utf-8');
    const match = raw.match(/window\.APP_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      existingConfig = JSON.parse(match[1]);
    }
  } catch (e) {
    // ignore parse error if file was corrupted
  }
}

const existingFirebase = existingConfig.firebase || {};

const config = {
  firebase: {
    apiKey: get('FIREBASE_API_KEY', existingFirebase.apiKey || ''),
    authDomain: get('FIREBASE_AUTH_DOMAIN', existingFirebase.authDomain || ''),
    databaseURL: get('FIREBASE_DATABASE_URL', existingFirebase.databaseURL || ''),
    projectId: get('FIREBASE_PROJECT_ID', existingFirebase.projectId || ''),
    storageBucket: get('FIREBASE_STORAGE_BUCKET', existingFirebase.storageBucket || ''),
    messagingSenderId: get('FIREBASE_MESSAGING_SENDER_ID', existingFirebase.messagingSenderId || ''),
    appId: get('FIREBASE_APP_ID', existingFirebase.appId || '')
  },
  geofenceRadiusMeters: Number(get('GEOFENCE_RADIUS_METERS', existingConfig.geofenceRadiusMeters || 20)) || 20,
  campusCenter: {
    lat: Number(get('CAMPUS_CENTER_LAT', existingConfig.campusCenter?.lat || 12.9716)) || 12.9716,
    lng: Number(get('CAMPUS_CENTER_LNG', existingConfig.campusCenter?.lng || 77.5946)) || 77.5946
  }
};

const outputContent = `// Auto-generated configuration - do not commit sensitive keys to public repositories
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(outputPath, outputContent, 'utf-8');
console.log('✓ Successfully prepared firebase-config.js');

if (!config.firebase.apiKey || config.firebase.apiKey.startsWith('AIzaSyYourApiKey')) {
  console.warn('⚠ Note: Firebase API Key is empty or placeholder.');
} else {
  console.log(`✓ Configured Firebase Project ID: ${config.firebase.projectId || '(none)'}`);
}

// --------------------------------------------------------------------
// Prepare the 'public/' directory required by Vercel static build
// --------------------------------------------------------------------
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write firebase-config.js directly into public/
fs.writeFileSync(path.join(publicDir, 'firebase-config.js'), outputContent, 'utf-8');

// Copy static assets into public/
const staticFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'driver-stops-patch.js',
  'vercel.json'
];

for (const file of staticFiles) {
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

console.log('✓ Successfully synchronized build output to public/ for Vercel');
