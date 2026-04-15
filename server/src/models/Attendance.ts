import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  student: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  markedBy: mongoose.Types.ObjectId;
  remarks?: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'leave', 'holiday'], required: true },
  markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  remarks: { type: String },
}, { timestamps: true });

AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ class: 1, date: 1 });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
