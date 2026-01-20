import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomUUID } from 'crypto';

import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resume.js';
import aiRoutes from './routes/ai.js';
import templateRoutes from './routes/templates.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));
app.use('/avatars', express.static('avatars'));
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176'
  ].filter(Boolean),
  credentials: true
}));
app.use(cookieParser());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use(limiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

app.use((req, res, next) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Server error';
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI;
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'hardcoded_secret_key_fix_restart_logout_issue_999';
  console.log('Using fallback FIXED JWT_SECRET');
} else {
  console.log('Using ENV JWT_SECRET');
}

function isPlaceholder(uri) {
  return typeof uri === 'string' && uri.includes('<');
}

async function start() {
  try {
    if (!MONGODB_URI || isPlaceholder(MONGODB_URI)) {
      const mem = await MongoMemoryServer.create();
      MONGODB_URI = mem.getUri();
      console.warn('MONGODB_URI missing or placeholder. Started in-memory MongoDB for development.');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Startup error', err);
    process.exit(1);
  }
}

start();
