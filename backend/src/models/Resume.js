import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const versionSchema = new mongoose.Schema({
  title: String,
  template: String,
  sections: [sectionSchema],
  order: [String],
  language: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'My Resume' },
  template: { type: String, default: 'modern' },
  sections: { type: [sectionSchema], default: [] },
  order: { type: [String], default: [] },
  language: { type: String, default: 'en' },
  // Analytics
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  // Sharing
  shareId: { type: String, index: true },
  isPublic: { type: Boolean, default: false },
  sharePasswordHash: { type: String },
  shareExpiresAt: { type: Date },
  // Versioning
  versions: { type: [versionSchema], default: [] },
  // Saved AI suggestions
  suggestions: {
    type: [{ type: { type: String }, text: String, createdAt: { type: Date, default: Date.now } }],
    default: []
  }
}, { timestamps: true });

export default mongoose.model('Resume', resumeSchema);
