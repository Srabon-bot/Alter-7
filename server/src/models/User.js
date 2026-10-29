import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    timezone: { type: String, default: 'Asia/Dhaka' },
    personaMode: { type: String, enum: ['standard', 'severe', 'quiet'], default: 'standard' },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalXp: { type: Number, default: 0 },
    rank: { type: String, default: 'Unranked' },
    shareNotesWithAI: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
