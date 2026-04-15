import mongoose, { Document, Schema } from 'mongoose';

export interface IGrade extends Document {
  student: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  subject: string;
  term: string;           // e.g. "Term 1", "Term 2", "Final"
  marks: number;
  maxMarks: number;
  examType?: string;      // e.g. "Unit Test", "Midterm", "Final"
  recordedBy: mongoose.Types.ObjectId;
  academicYear: string;
}

const GradeSchema = new Schema<IGrade>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: String, required: true },
  term: { type: String, required: true },
  marks: { type: Number, required: true, min: 0 },
  maxMarks: { type: Number, required: true, default: 100 },
  examType: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  academicYear: { type: String, default: '2025-26' },
}, { timestamps: true });

GradeSchema.index({ student: 1, subject: 1, term: 1, academicYear: 1 }, { unique: true });

export default mongoose.model<IGrade>('Grade', GradeSchema);
