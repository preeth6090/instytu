import mongoose, { Document, Schema } from 'mongoose';

export interface IClass extends Document {
  name: string;           // e.g. "10-A"
  grade: string;          // e.g. "10"
  section: string;        // e.g. "A"
  institution: mongoose.Types.ObjectId;
  classTeacher?: mongoose.Types.ObjectId;
  subjects: string[];
  academicYear: string;   // e.g. "2025-26"
}

const ClassSchema = new Schema<IClass>({
  name: { type: String, required: true },
  grade: { type: String, required: true },
  section: { type: String, required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  classTeacher: { type: Schema.Types.ObjectId, ref: 'User' },
  subjects: [{ type: String }],
  academicYear: { type: String, default: '2025-26' },
}, { timestamps: true });

ClassSchema.index({ institution: 1, grade: 1, section: 1, academicYear: 1 }, { unique: true });

export default mongoose.model<IClass>('Class', ClassSchema);
