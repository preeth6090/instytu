import mongoose, { Document, Schema } from 'mongoose';

export interface ILeave extends Document {
  student: mongoose.Types.ObjectId;
  appliedBy: mongoose.Types.ObjectId;   // User (student or parent)
  institution: mongoose.Types.ObjectId;
  type: 'sick' | 'family' | 'personal' | 'other';
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
}

const LeaveSchema = new Schema<ILeave>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  appliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  type: { type: String, enum: ['sick', 'family', 'personal', 'other'], required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
}, { timestamps: true });

LeaveSchema.index({ student: 1, fromDate: -1 });
LeaveSchema.index({ institution: 1, status: 1 });

export default mongoose.model<ILeave>('Leave', LeaveSchema);
