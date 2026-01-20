import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['IT', 'Business', 'Freshers', 'Executives', 'General'], default: 'General', index: true },
  previewUrl: { type: String },
  fonts: { type: [String], default: ['Inter', 'Georgia', 'Arial'] },
  colors: { type: [String], default: ['#111827', '#2563EB', '#16A34A', '#DC2626'] },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Template', templateSchema);
