import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  disabled: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String },
  verificationExpires: { type: Date },
  resetTokenHash: { type: String },
  resetExpires: { type: Date },
  refreshTokenHash: { type: String },
  avatarUrl: { type: String },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
