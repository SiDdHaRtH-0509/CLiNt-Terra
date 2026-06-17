import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, 'users.json');

// Helper to load users from file
function loadUsers() {
  let users = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      users = JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading users.json:', e);
  }
  
  // Default seeds
  const seeds = [
    {
      name: 'CLiNt-Tech Administrator',
      email: 'CLiNtech0515@gmail.com',
      password: 'admin1234567',
      region: 'Asia-Pacific (India)',
      profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      joinedAt: new Date().toISOString()
    },
    {
      name: 'Siddharth Gopal Dubey',
      email: 'siddharth@dubey.me',
      password: 'password',
      region: 'Asia-Pacific (India)',
      profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder',
      joinedAt: new Date().toISOString()
    }
  ];

  let modified = false;
  if (users.length === 0) {
    users = seeds;
    modified = true;
  } else {
    for (const seed of seeds) {
      const exists = users.some(u => u.email.toLowerCase() === seed.email.toLowerCase());
      if (!exists) {
        users.push(seed);
        modified = true;
      }
    }
  }

  if (modified) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving users.json:', e);
    }
  }

  return users;
}

// Helper to save users to file
function saveUsers(usersList) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersList, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving users.json:', e);
  }
}

let serverUsers = loadUsers();

// MongoDB Database Integration
const MONGODB_URI = process.env.MONGODB_URI || '';
let isMongoConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Successfully linked to MongoDB Atlas database node.');
      isMongoConnected = true;
    })
    .catch((err) => {
      console.error('Failed to establish MongoDB link, running filesystem fallback:', err);
    });
} else {
  console.log('No MONGODB_URI specified. Operating with filesystem JSON fallback.');
}

// MongoDB Schemas & Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  region: { type: String, default: 'Asia-Pacific (India)' },
  profilePic: { type: String },
  joinedAt: { type: Date, default: Date.now }
});
const MongoUser = mongoose.models.User || mongoose.model('User', userSchema);

const settingsSchema = new mongoose.Schema({
  geminiApiKey: { type: String, default: '' },
  gmailUser: { type: String, default: '' },
  gmailAppPassword: { type: String, default: '' },
  resendApiKey: { type: String, default: '' }
});
const MongoSettings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Database Layer Helper Functions
async function getStoredUsers() {
  if (isMongoConnected) {
    try {
      const users = await MongoUser.find({});
      return users.map(u => u.toObject());
    } catch (e) {
      console.error('Failed to get MongoDB users:', e);
    }
  }
  return loadUsers();
}

async function registerNewUser(userObj) {
  if (isMongoConnected) {
    try {
      const newUser = new MongoUser(userObj);
      await newUser.save();
      return newUser.toObject();
    } catch (e) {
      console.error('Failed to save user in MongoDB:', e);
      throw e;
    }
  } else {
    serverUsers = loadUsers();
    serverUsers.push(userObj);
    saveUsers(serverUsers);
    return userObj;
  }
}

// Security Helper Functions
function cleanStringInput(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[\x00-\x1F\x7F]/g, '').trim();
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Native JWT Authentication (Zero-dependency custom implementation)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signToken(payload, expiresIn = '2h') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 2 * 3600; // 2 hours
  
  const fullPayload = {
    ...payload,
    iat: now,
    exp: exp
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    
    return payload;
  } catch (e) {
    return null;
  }
}

// Authentication Middlewares
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Authentication token is required.' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Session Expired or Invalid Token.' });
  }
  
  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.email || req.user.email.toLowerCase() !== 'clintech0515@gmail.com') {
    return res.status(403).json({ error: 'Access Denied: Requester is not an authorized administrator.' });
  }
  next();
}

async function deleteStoredUser(email) {
  const cleanEmail = cleanStringInput(email).toLowerCase();
  if (isMongoConnected) {
    try {
      await MongoUser.deleteOne({ email: cleanEmail });
      return true;
    } catch (e) {
      console.error('Failed to delete MongoDB user:', e);
      throw e;
    }
  } else {
    serverUsers = loadUsers().filter(u => u.email.toLowerCase() !== cleanEmail);
    saveUsers(serverUsers);
    return true;
  }
}

async function updateStoredUser(email, updateFields) {
  const cleanEmail = cleanStringInput(email).toLowerCase();
  const cleanUpdates = {};
  if (updateFields.name) cleanUpdates.name = cleanStringInput(updateFields.name);
  if (updateFields.email) {
    const newEmail = cleanStringInput(updateFields.email).toLowerCase();
    if (!validateEmail(newEmail)) {
      throw new Error('Invalid email address format');
    }
    cleanUpdates.email = newEmail;
  }
  if (updateFields.password) cleanUpdates.password = cleanStringInput(updateFields.password);
  if (updateFields.region) cleanUpdates.region = cleanStringInput(updateFields.region);
  if (updateFields.profilePic) cleanUpdates.profilePic = cleanStringInput(updateFields.profilePic);

  if (isMongoConnected) {
    try {
      const updated = await MongoUser.findOneAndUpdate(
        { email: cleanEmail },
        { $set: cleanUpdates },
        { new: true }
      );
      return updated ? updated.toObject() : null;
    } catch (e) {
      console.error('Failed to update MongoDB user:', e);
      throw e;
    }
  } else {
    serverUsers = loadUsers();
    const idx = serverUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (idx === -1) return null;
    
    if (cleanUpdates.email) serverUsers[idx].email = cleanUpdates.email;
    if (cleanUpdates.name) serverUsers[idx].name = cleanUpdates.name;
    if (cleanUpdates.password) serverUsers[idx].password = cleanUpdates.password;
    if (cleanUpdates.region) serverUsers[idx].region = cleanUpdates.region;
    if (cleanUpdates.profilePic) serverUsers[idx].profilePic = cleanUpdates.profilePic;
    
    saveUsers(serverUsers);
    return serverUsers[idx];
  }
}

async function getStoredSettings() {
  if (isMongoConnected) {
    try {
      const settingsObj = await MongoSettings.findOne({});
      return settingsObj ? settingsObj.toObject() : {};
    } catch (e) {
      console.error('Failed to get MongoDB settings:', e);
    }
  }
  return loadSettings();
}

async function saveStoredSettings(settingsObj) {
  if (isMongoConnected) {
    try {
      await MongoSettings.deleteMany({});
      const newSettings = new MongoSettings(settingsObj);
      await newSettings.save();
      return newSettings.toObject();
    } catch (e) {
      console.error('Failed to save settings in MongoDB:', e);
      throw e;
    }
  } else {
    const SETTINGS_FILE = path.join(__dirname, 'settings.json');
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsObj, null, 2), 'utf8');
    return settingsObj;
  }
}

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-requester-email']
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ limit: '20kb', extended: true }));

// Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'CLiNt Terra backend API is running successfully.',
    founder: 'Siddharth Gopal Dubey',
    geminiActive: !!process.env.GEMINI_API_KEY,
    emailActive: !!(process.env.RESEND_API_KEY || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD))
  });
});

// User Registration Route
app.post('/api/auth/register', async (req, res) => {
  const name = cleanStringInput(req.body.name);
  const email = cleanStringInput(req.body.email).toLowerCase();
  const password = cleanStringInput(req.body.password);
  const region = cleanStringInput(req.body.region);
  const profilePic = cleanStringInput(req.body.profilePic);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: 'Name must be between 2 and 50 characters.' });
  }

  if (email.length > 254 || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address format or length exceeded (maximum 254 characters).' });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Passphrase must be between 8 and 128 characters.' });
  }

  try {
    const users = await getStoredUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = {
      name,
      email,
      password,
      region: region || 'Global',
      profilePic: profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      joinedAt: new Date().toISOString()
    };

    const savedUser = await registerNewUser(newUser);
    const token = signToken({ name: savedUser.name, email: savedUser.email });
    res.json({ 
      success: true, 
      token,
      user: { 
        name: savedUser.name, 
        email: savedUser.email, 
        region: savedUser.region, 
        profilePic: savedUser.profilePic 
      } 
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to write operator node registry: ' + e.message });
  }
});

// User Login Route
app.post('/api/auth/login', async (req, res) => {
  const email = cleanStringInput(req.body.email).toLowerCase();
  const password = cleanStringInput(req.body.password);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const users = await getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      return res.status(400).json({ error: 'Account not found' });
    }

    if (user.password !== password) {
      return res.status(400).json({ error: 'Invalid passphrase' });
    }

    const token = signToken({ name: user.name, email: user.email });
    res.json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        region: user.region,
        profilePic: user.profilePic
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Database handshake error: ' + e.message });
  }
});

// Profile Update Route
app.post('/api/user/update', authenticateToken, async (req, res) => {
  const email = req.user.email; // From JWT payload
  const name = cleanStringInput(req.body.name);
  const newEmail = cleanStringInput(req.body.newEmail).toLowerCase();
  const password = cleanStringInput(req.body.password);
  const region = cleanStringInput(req.body.region);
  const profilePic = cleanStringInput(req.body.profilePic);

  if (name && (name.length < 2 || name.length > 50)) {
    return res.status(400).json({ error: 'Name must be between 2 and 50 characters.' });
  }

  if (newEmail && (newEmail.length > 254 || !validateEmail(newEmail))) {
    return res.status(400).json({ error: 'Invalid new email address format or length exceeded (maximum 254 characters).' });
  }

  if (password && (password.length < 8 || password.length > 128)) {
    return res.status(400).json({ error: 'Passphrase must be between 8 and 128 characters.' });
  }

  try {
    const users = await getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (newEmail && newEmail !== email) {
      const emailTaken = users.find(u => u.email.toLowerCase() === newEmail);
      if (emailTaken) {
        return res.status(400).json({ error: 'New email address is already taken' });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (newEmail) updates.email = newEmail;
    if (password) updates.password = password;
    if (region) updates.region = region;
    if (profilePic) updates.profilePic = profilePic;

    const updatedUser = await updateStoredUser(email, updates);
    const token = signToken({ name: updatedUser.name, email: updatedUser.email });

    res.json({
      success: true,
      token,
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        region: updatedUser.region,
        profilePic: updatedUser.profilePic
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update operator profile: ' + e.message });
  }
});

// Admin Users List Route
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getStoredUsers();
    const cleanUsers = users.map(({ password, ...u }) => u);
    res.json({ success: true, users: cleanUsers });
  } catch (e) {
    res.status(500).json({ error: 'Failed to query operator database: ' + e.message });
  }
});

// Admin User Revocation Route
app.post('/api/admin/user/delete', authenticateToken, requireAdmin, async (req, res) => {
  const emailToDelete = cleanStringInput(req.body.emailToDelete).toLowerCase();
  if (!emailToDelete) {
    return res.status(400).json({ error: 'Email to delete is required' });
  }

  if (emailToDelete === 'clintech0515@gmail.com') {
    return res.status(400).json({ error: 'Cannot revoke master administrator credentials' });
  }

  try {
    await deleteStoredUser(emailToDelete);
    res.json({ success: true, message: 'Operator registry record revoked successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete operator from database node: ' + e.message });
  }
});

// Copilot Chat Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message, stats, ledgerSummary, apiKey: bodyApiKey } = req.body;
    
    // Retrieve key from env, body, or header fallback
    const headerApiKey = req.get('x-api-key') || '';
    const serverSettings = await getStoredSettings();
    const apiKey = process.env.GEMINI_API_KEY || serverSettings.geminiApiKey || bodyApiKey || headerApiKey || '';
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const systemPrompt = `You are CLiNt-Saver, the dedicated personal sustainability AI copilot for the CLiNt Terra platform.
CLiNt Terra is a passive, zero-input carbon event-sourcing network that converts everyday human activity into an active carbon ledger.
The platform was founded and envisioned by Siddharth Gopal Dubey.

TECHNICAL ARCHITECTURE DETAILS:
1. Ingestion: Exposes secure webhook endpoints for Plaid (financial transactions) and Google Maps (localized transit telemetry), and HomeAssistant (household grid energy consumption webhooks).
2. Processing: Telemetry data packets flow through an Apache Kafka/GCP Pub/Sub queue to buffer ingestion spikes. A stateless Go-based worker pulls transaction packets, uses Redis semantic cache for matching merchant emission coefficients, and falls back to a high-speed Gemini Flash parser to calculate precise GHG impacts.
3. Storage: Final parsed carbon entries are stored in TimescaleDB (time-series) and MongoDB Atlas (user profiles and gamification).

USER RUNTIME STATE INFORMATION:
- Weekly Carbon footprint: ${stats.totalCarbon} kg CO2e
- Target Weekly Budget: ${stats.carbonBudget || 400} kg CO2e
- Budget Delta: ${stats.weeklySavingRate > 0 ? `${stats.weeklySavingRate}% saved (under budget)` : `${Math.abs(stats.weeklySavingRate)}% over budget`}
- Current Twin Biome State: ${stats.isNormal ? 'STABLE BIOME (Green flourishing particle mesh)' : 'DECAYING GRID (Smoky orange-grey grid)'}
- Category Emissions: ${JSON.stringify(stats.carbonByCategory)}

RECENT LEDGER TRANSACTIONS:
${JSON.stringify(ledgerSummary, null, 2)}

INSTRUCTIONS:
1. When asked about who founded, made, or envisioned CLiNt Terra, explicitly attribute it to Siddharth Gopal Dubey.
2. Maintain a highly professional, technically precise, and concise terminal-style conversational tone.
3. Answer questions about carbon calculations using standard science principles and refer to our Go worker/Redis/Gemini pipeline where applicable.
4. Keep answers under 120 words unless a detailed explanation of formulas is requested.
5. You MUST answer all questions asked by the user, regardless of whether they are related to sustainability or CLiNt Terra. Do not refuse to answer general knowledge, programming, or other queries.
6. If the user requests you to reply in, translate to, or write in any other language, you must provide your complete answer in that requested language.`;

    if (!genAI) {
      // Offline fallback processing logic
      const reply = getOfflineReply(message, stats, ledgerSummary);
      return res.json({ reply });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(`System context: ${systemPrompt}\n\nUser query: ${message}`);

    const responseText = result.response.text();
    return res.json({ reply: responseText.trim() });

  } catch (error) {
    console.error('CLiNt-Saver backend chat route failed:', error);
    return res.status(500).json({
      reply: 'System Error: Ingestion stream connection lost. Reverting to local terminal cache.'
    });
  }
});

// Email Dispatch Route
app.post('/api/send-email', authenticateToken, async (req, res) => {
  try {
    const recipient = cleanStringInput(req.body.recipient).toLowerCase();
    const subject = cleanStringInput(req.body.subject);
    const html = req.body.html;
    const credentials = req.body.credentials || {};

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    if (!validateEmail(recipient)) {
      return res.status(400).json({ error: 'Invalid recipient email format' });
    }

    const serverSettings = await getStoredSettings();
    const resendApiKey = process.env.RESEND_API_KEY || serverSettings.resendApiKey || credentials?.resendApiKey || '';
    const gmailUser = process.env.GMAIL_USER || serverSettings.gmailUser || credentials?.gmailUser || '';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || serverSettings.gmailAppPassword || credentials?.gmailAppPassword || '';

    let emailSent = false;
    let methodUsed = '';

    // 1. Deliver via Resend if API Key provided
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'CLiNt Terra <onboarding@resend.dev>',
            to: recipient,
            subject: subject,
            html: html
          })
        });

        if (response.ok) {
          emailSent = true;
          methodUsed = 'resend';
        } else {
          const errorText = await response.text();
          console.warn(`Resend API failed: ${errorText}. Attempting SMTP fallback...`);
        }
      } catch (e) {
        console.warn(`Resend API delivery failed: ${e.message}. Attempting SMTP fallback...`);
      }
    }

    // 2. Deliver via Nodemailer Gmail SMTP if Gmail credentials provided
    if (!emailSent && gmailUser && gmailAppPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: gmailUser,
            pass: gmailAppPassword
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        await transporter.sendMail({
          from: `"CLiNt Terra" <${gmailUser}>`,
          to: recipient,
          subject: subject,
          html: html
        });

        emailSent = true;
        methodUsed = 'gmail_smtp';
      } catch (e) {
        console.error(`Gmail SMTP delivery failed: ${e.message}`);
        throw e;
      }
    }

    if (emailSent) {
      return res.json({ success: true, method: methodUsed });
    }

    // 3. Fallback: Return simulated success if no credentials entered
    return res.json({ 
      success: false, 
      warning: 'No SMTP or Resend API credentials provided. Simulated delivery logs generated locally.' 
    });

  } catch (error) {
    console.error('Mail delivery worker failed:', error);
    
    // Write detailed error to mail_errors.log
    const logFile = path.join(__dirname, 'mail_errors.log');
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] Recipient: ${recipient} | Error: ${error.message}\nStack: ${error.stack}\n\n`;
    try {
      fs.appendFileSync(logFile, logMsg, 'utf8');
    } catch (e) {
      console.error('Failed to write to mail_errors.log:', e);
    }

    return res.status(500).json({ error: error.message || 'SMTP Handshake failed' });
  }
});

// Offline fallback helper function
function getOfflineReply(message, stats, ledger) {
  const query = message.toLowerCase();

  if (query.includes('founder') || query.includes('found') || query.includes('siddharth') || query.includes('dubey') || query.includes('who made') || query.includes('creator') || query.includes('owner') || query.includes('envisioned')) {
    return `CLiNt Terra was founded and envisioned by Siddharth Gopal Dubey.
    
Siddharth conceived the platform as a next-generation personal sustainability ecosystem. Instead of relying on manual data entry, the platform acts as a passive, zero-input carbon event-sourcing network, securely ingesting telemetry from user-authorized touchpoints (Plaid, Google Maps, HomeAssistant) and converting it into an immutable carbon ledger.`;
  }

  if (query.includes('architecture') || query.includes('pipeline') || query.includes('kafka') || query.includes('go') || query.includes('worker') || query.includes('redis') || query.includes('timescaledb') || query.includes('mongodb') || query.includes('how does it work') || query.includes('technology') || query.includes('tech stack')) {
    return `CLiNt Terra is built on a high-throughput passive ingestion pipeline:
1. **Ingest Gateway**: Receives webhooks from Plaid (financial), Google Maps (transit), and HomeAssistant (power grid).
2. **Event Broker**: Decoupled Kafka queues buffer transaction packets to handle ingestion spikes.
3. **Go Worker**: A stateless worker pulls packets, uses Redis semantic cache for matching merchant coefficients, and falls back to a high-speed Gemini Flash parser to calculate precise GHG impacts.
4. **Ledger Store**: Immutably commits processed carbon events into a TimescaleDB time-series database.
5. **Frontend UI**: Renders a dark-mode dashboard with a React Three Fiber particle biosphere representing your Digital Carbon Twin.`;
  }

  if (query.includes('budget') || query.includes('saving') || query.includes('limit') || query.includes('status') || query.includes('biome') || query.includes('twin') || query.includes('health') || query.includes('rate') || query.includes('green') || query.includes('orange') || query.includes('grey')) {
    const rateText = stats.weeklySavingRate > 0 
      ? `saving rate is **${stats.weeklySavingRate}% under** your weekly budget`
      : `footprint is **${Math.abs(stats.weeklySavingRate)}% over** your weekly budget limit`;
    return `Your aggregate weekly carbon footprint is **${stats.totalCarbon} kg CO2e**, against a target weekly budget of **${stats.carbonBudget || 400} kg CO2e**.
    
Currently, your ${rateText}.
As a result, your WebGL Digital Carbon Twin has loaded the **${stats.isNormal ? 'STABLE GREEN BIOSPHERE' : 'DECAYING SMOKY ORANGE GRID'}** shader context.`;
  }

  if (query.includes('travel') || query.includes('transit') || query.includes('flight') || query.includes('uber') || query.includes('commute') || query.includes('drive') || query.includes('train') || query.includes('bus') || query.includes('km') || query.includes('spike')) {
    const transitEmissions = stats.carbonByCategory['Transit'] || 0;
    const travelEntries = ledger.filter((e) => e.source === 'maps' || e.title?.toLowerCase().includes('flight') || e.title?.toLowerCase().includes('uber') || e.title?.toLowerCase().includes('commute'));
    
    let highestDetail = '';
    if (travelEntries.length > 0) {
      const highest = [...travelEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest registered travel event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Captured from Maps timeline telemetry.'}`;
    }

    return `Your weekly Transit emissions total **${transitEmissions} kg CO2e**. This includes aviation, rideshares, and rail commutes.${highestDetail}
    
*Recommendation*: To lower your travel footprint, consider opting for electric rail transit (which has a low coefficient of 0.035 kg/km) or selecting EV options on rideshares (0.04 kg/km) instead of standard combustion vehicles (0.22 kg/km).`;
  }

  if (query.includes('energy') || query.includes('electricity') || query.includes('utility') || query.includes('solar') || query.includes('power') || query.includes('homeassistant') || query.includes('kwh')) {
    const energyEmissions = stats.carbonByCategory['Energy'] || 0;
    const energyEntries = ledger.filter((e) => e.source === 'homeassistant' || e.title?.toLowerCase().includes('energy') || e.title?.toLowerCase().includes('solar') || e.title?.toLowerCase().includes('grid'));
    
    let highestDetail = '';
    if (energyEntries.length > 0) {
      const highest = [...energyEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest energy event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Parsed from HomeAssistant webhook draw.'}`;
    }

    return `Your weekly Energy emissions total **${energyEmissions} kg CO2e**. This telemetry is passively pulled from your HomeAssistant regional grid intensity sensor.${highestDetail}
    
*Recommendation*: Emitting coal grid energy consumes 0.95 kg/kWh, while renewable solar offset drops consumption to 0.03 kg/kWh. Conserving power during peak dirty grid hours will lower emissions.`;
  }

  if (query.includes('dining') || query.includes('food') || query.includes('coffee') || query.includes('starbucks') || query.includes('mcdonald') || query.includes('sweetgreen') || query.includes('groceries') || query.includes('restaurant') || query.includes('eat') || query.includes('meal')) {
    const diningEmissions = (stats.carbonByCategory['Dining'] || 0) + (stats.carbonByCategory['Groceries'] || 0);
    const foodEntries = ledger.filter((e) => e.category === 'Dining' || e.category === 'Groceries' || e.title?.toLowerCase().includes('starbucks') || e.title?.toLowerCase().includes('mcdonald') || e.title?.toLowerCase().includes('salad') || e.title?.toLowerCase().includes('sweetgreen'));
    
    let highestDetail = '';
    if (foodEntries.length > 0) {
      const highest = [...foodEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest dining/grocery event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Parsed from Plaid merchant category.'}`;
    }

    return `Your weekly Food and Dining emissions total **${diningEmissions} kg CO2e**. This includes restaurant dining, fast food, and groceries.${highestDetail}
    
*Recommendation*: Fast food supply chains have a higher emission coefficient (2.1 kg per $ spent) due to high meat content and retail packaging, whereas organic/vegan meals (0.45 kg per $) significantly decrease your twin footprint.`;
  }

  if (query.includes('buy') || query.includes('purchase') || query.includes('recent') || query.includes('transactions') || query.includes('history') || query.includes('ledger') || query.includes('list') || query.includes('what did i')) {
    if (!ledger || ledger.length === 0) {
      return `Your active carbon ledger database is currently empty. Simulate telemetry inputs using the Webhook Gateway on your dashboard to populate data!`;
    }
    const list = ledger.map(e => `• **${e.title}**: ${e.carbonFootprint} kg CO2e (${e.source.toUpperCase()})`).join('\n');
    return `Here are your most recent carbon ledger events:
${list}

You can view full details in the Financial-Grade Carbon Ledger table at the bottom of the dashboard.`;
  }

  if (query.includes('calculate') || query.includes('formula') || query.includes('coefficient') || query.includes('how do you') || query.includes('math') || query.includes('co2')) {
    return `Carbon emissions ($GHG$) are calculated using category coefficients:
$$GHG = Activity \\times Coefficient$$
    
Coefficients depend on telemetry source units:
• **Plaid**: kg CO2e per USD ($) spent (e.g. Fast Food = 2.1, Vegan = 0.45, Electronic Shopping = 1.9, SaaS = 0.15)
• **Maps**: kg CO2e per kilometer (KM) traveled (e.g. Flight = 0.25, Combustion Rideshare = 0.22, EV Rideshare = 0.04, Subway = 0.035)
• **HomeAssistant**: kg CO2e per kilowatt-hour (kWh) consumed (e.g. Coal grid = 0.95, Mixed grid = 0.42, Solar = 0.03)

If the merchant is new, the Go parser forwards the transaction string to Gemini Flash to determine the closest matching carbon category.`;
  }

  if (query.includes('hello') || query.includes('hi ') || query.includes('hey') || query.includes('greetings') || query.includes('help')) {
    return `Hello! I am CLiNt-Saver, your personal carbon ledger copilot.
    
I can resolve calculations for your active twin biome:
• Current Footprint: **${stats.totalCarbon} kg CO2e**
• Weekly Allowance: **${stats.carbonBudget} kg CO2e**
    
Ask me details about your travel spikes, food consumption, regional grid power draws, the Kafka pipeline architecture, or corporate origins regarding founder Siddharth Gopal Dubey.`;
  }

  return `Thank you for your question. As CLiNt-Saver, I have parsed your query against your live telemetry state.
  
Here is your summary:
• Weekly aggregate emissions: **${stats.totalCarbon} kg CO2e**
• Biome health status: **${stats.isNormal ? 'Stable Green' : 'Decaying Orange'}**
• Top category source: **${Object.keys(stats.carbonByCategory || {}).reduce((a, b) => stats.carbonByCategory[a] > stats.carbonByCategory[b] ? a : b, 'Transit')}**

To learn more, ask me about your recent transactions, travel spikes, calculations, or founder Siddharth Gopal Dubey.`;
}

// Helper to load settings from file
function loadSettings() {
  const SETTINGS_FILE = path.join(__dirname, 'settings.json');
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading settings.json:', e);
  }
  return {};
}

// GET Route to fetch integration settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  const settings = loadSettings();
  res.json({ success: true, settings });
});

// POST Route to save integration settings
app.post('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  const geminiApiKey = cleanStringInput(req.body.geminiApiKey);
  const gmailUser = cleanStringInput(req.body.gmailUser);
  const gmailAppPassword = cleanStringInput(req.body.gmailAppPassword);
  const resendApiKey = cleanStringInput(req.body.resendApiKey);

  const SETTINGS_FILE = path.join(__dirname, 'settings.json');
  const settings = { geminiApiKey, gmailUser, gmailAppPassword, resendApiKey };

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    
    // Log sync success to mail_errors.log
    const logFile = path.join(__dirname, 'mail_errors.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] Settings synchronized successfully on the server. gmailUser: ${gmailUser || 'none'}\n`, 'utf8');

    res.json({ success: true, message: 'System integration settings updated successfully on the server.' });
  } catch (e) {
    console.error('Error saving settings.json:', e);
    res.status(500).json({ error: 'Failed to write settings to database node.' });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CLiNt Terra Express backend server running on port ${PORT}`);
});
