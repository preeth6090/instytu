import mongoose, { Document, Schema } from 'mongoose';

export interface IPTMSlot extends Document {
  teacher: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  duration: number;         // minutes
  bookedBy?: mongoose.Types.ObjectId;   // parent User ref
  student?: mongoose.Types.ObjectId;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  notes?: string;
}

const PTMSlotSchema = new Schema<IPTMSlot>({
  teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 15 },
  bookedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  student: { type: Schema.Types.ObjectId, ref: 'Student' },
  status: { type: String, enum: ['available', 'booked', 'completed', 'cancelled'], default: 'available' },
  notes: { type: String },
}, { timestamps: true });

PTMSlotSchema.index({ teacher: 1, date: 1 });
PTMSlotSchema.index({ institution: 1, date: 1 });

export default mongoose.model<IPTMSlot>('PTMSlot', PTMSlotSchema);
