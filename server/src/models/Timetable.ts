import mongoose, { Document, Schema } from 'mongoose';

export interface IPeriod {
  period: number;
  subject: string;
  teacher?: string;
  time?: string;
}

export interface IDaySchedule {
  day: string;
  periods: IPeriod[];
}

export interface ITimetable extends Document {
  class: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  academicYear: string;
  schedule: IDaySchedule[];
  updatedBy: mongoose.Types.ObjectId;
}

const TimetableSchema = new Schema<ITimetable>({
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  academicYear: { type: String, default: '2025-26' },
  schedule: [{
    day: { type: String, required: true },
    periods: [{
      period: { type: Number, required: true },
      subject: { type: String, required: true },
      teacher: { type: String },
      time: { type: String },
    }],
  }],
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

TimetableSchema.index({ class: 1, academicYear: 1 }, { unique: true });

export default mongoose.model<ITimetable>('Timetable', TimetableSchema);
