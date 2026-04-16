import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentBundle extends Document {
  student: mongoose.Types.ObjectId;
  bundle: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  academicYear: string;
  assignedAt: Date;
  isActive: boolean;
}

const StudentBundleSchema = new Schema<IStudentBundle>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  bundle: { type: Schema.Types.ObjectId, ref: 'FeeBundle', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  academicYear: { type: String, default: '2025-26' },
  assignedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

StudentBundleSchema.index({ student: 1, bundle: 1, academicYear: 1 }, { unique: true });
export default mongoose.model<IStudentBundle>('StudentBundle', StudentBundleSchema);
