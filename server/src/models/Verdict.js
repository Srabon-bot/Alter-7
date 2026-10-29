import mongoose from 'mongoose';

const verdictSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    verdict: { type: String, default: '' },
    evidence: { type: [String], default: [] },
    question: { type: String, default: '' },
    modelUsed: { type: String, default: 'canned' },
  },
  { timestamps: true },
);

verdictSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Verdict', verdictSchema);
