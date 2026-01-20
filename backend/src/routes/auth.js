import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

const ACCESS_TTL = '15m';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d

function signAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('rt', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: REFRESH_TTL_SECONDS * 1000,
    path: '/api/auth',
  });
}

const router = Router();

// Google OAuth client
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await User.create({ name, email, passwordHash, role, emailVerified: true, verificationTokenHash, verificationExpires });

    const accessToken = signAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setRefreshCookie(res, refreshToken);

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
      verification: { url: verifyUrl }
    });
  } catch (err) { next(err); }
});

// LinkedIn OAuth login/signup
router.post('/linkedin', async (req, res, next) => {
  try {
    const { code, redirectUri } = req.body;
    const clientId = process.env.LI_CLIENT_ID;
    const clientSecret = process.env.LI_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).json({ message: 'LinkedIn OAuth not configured' });
    // Exchange authorization code for access token
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const accessToken = tokenRes.data.access_token;
    if (!accessToken) return res.status(400).json({ message: 'Invalid LinkedIn code' });
    // Fetch user email and profile
    const [emailRes, profileRes] = await Promise.all([
      axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', { headers: { Authorization: `Bearer ${accessToken}` } }),
      axios.get('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    const email = emailRes?.data?.elements?.[0]?.["handle~"]?.emailAddress;
    const name = profileRes?.data?.localizedFirstName ? `${profileRes.data.localizedFirstName} ${profileRes.data.localizedLastName || ''}`.trim() : 'LinkedIn User';
    if (!email) return res.status(400).json({ message: 'Unable to fetch LinkedIn email' });
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
      user = await User.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), role, emailVerified: true });
    } else if (user.disabled) {
      return res.status(403).json({ message: 'Account disabled' });
    }
    user.emailVerified = true;
    const at = signAccessToken(user);
    const rt = crypto.randomBytes(48).toString('hex');
    user.refreshTokenHash = hashToken(rt);
    await user.save();
    setRefreshCookie(res, rt);
    res.json({ accessToken: at, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    if (user.disabled) return res.status(403).json({ message: 'Account disabled' });
    // if (!user.emailVerified) return res.status(403).json({ message: 'Email not verified' });

    const accessToken = signAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.rt;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const tokenHash = hashToken(token);
    const user = await User.findOne({ refreshTokenHash: tokenHash });
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    // rotate refresh
    const newRefresh = crypto.randomBytes(48).toString('hex');
    user.refreshTokenHash = hashToken(newRefresh);
    await user.save();
    setRefreshCookie(res, newRefresh);
    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.rt;
    if (token) {
      const tokenHash = hashToken(token);
      await User.updateOne({ refreshTokenHash: tokenHash }, { $unset: { refreshTokenHash: 1 } });
    }
    res.clearCookie('rt', { path: '/api/auth' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Google OAuth login/signup
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!googleClient) return res.status(500).json({ message: 'Google OAuth not configured' });
    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ message: 'Invalid Google token' });
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
      user = await User.create({ name: payload.name || email.split('@')[0], email, passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), role, emailVerified: true });
    } else if (user.disabled) {
      return res.status(403).json({ message: 'Account disabled' });
    }
    user.emailVerified = true;
    const accessToken = signAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } });
  } catch (err) { next(err); }
});

router.get('/verify', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Missing token' });
    const tokenHash = hashToken(String(token));
    const user = await User.findOne({ verificationTokenHash: tokenHash, verificationExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationExpires = undefined;
    await user.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/forgot', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = hashToken(resetToken);
      user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      // In production, send email. For now, return URL for integration.
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      return res.json({ ok: true, reset: { url: resetUrl } });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Invalid request' });
    const tokenHash = hashToken(token);
    const user = await User.findOne({ resetTokenHash: tokenHash, resetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetTokenHash = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
