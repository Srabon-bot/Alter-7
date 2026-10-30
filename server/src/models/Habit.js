import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['boolean', 'numeric'], default: 'boolean' },
    target: { type: Number, default: 1 },
    unit: { type: String, default: '' },
    weight: { type: Number, min: 1, max: 5, default: 5 },
    targetTime: { type: String, default: '' },
    window: { type: String, enum: ['morning', 'evening'], default: 'evening' },
    core: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('Habit', habitSchema);
