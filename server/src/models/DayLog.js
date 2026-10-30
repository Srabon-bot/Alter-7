import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
  {
    habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
    done: { type: Boolean, default: false },
    value: { type: Number, default: null },
  },
  { _id: false },
);

const habitSnapshotSchema = new mongoose.Schema(
  {
    habitId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['boolean', 'numeric'], required: true },
    target: { type: Number, default: 1 },
    unit: { type: String, default: '' },
    weight: { type: Number, min: 1, max: 5, required: true },
    window: { type: String, enum: ['morning', 'evening'], required: true },
    core: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const dayLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    entries: { type: [entrySchema], default: [] },
    habitSnapshot: { type: [habitSnapshotSchema], default: [] },
    mood: { type: Number, min: 1, max: 5, default: null },
    energy: { type: Number, min: 1, max: 5, default: null },
    note: { type: String, default: '' },
    eveningAt: { type: Date, default: null },
    morningAt: { type: Date, default: null },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    closedBy: { type: String, enum: ['morning', 'evening', 'auto', null], default: null },
    score: { type: Number, default: null },
    won: { type: Boolean, default: null },
    backfilled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

dayLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('DayLog', dayLogSchema);
