import mongoose from 'mongoose';

const downloadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
  type: { type: String, enum: ['pdf', 'print'], default: 'pdf' }
}, { timestamps: true });

export default mongoose.model('Download', downloadSchema);
