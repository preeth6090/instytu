import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmission {
  student: mongoose.Types.ObjectId;
  submittedAt: Date;
  note?: string;
}

export interface IHomework extends Document {
  title: string;
  description?: string;
  subject: string;
  class: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  dueDate: Date;
  submissions: ISubmission[];
}

const HomeworkSchema = new Schema<IHomework>({
  title: { type: String, required: true },
  description: { type: String },
  subject: { type: String, required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date, required: true },
  submissions: [{
    student: { type: Schema.Types.ObjectId, ref: 'Student' },
    submittedAt: { type: Date, default: Date.now },
    note: { type: String },
  }],
}, { timestamps: true });

HomeworkSchema.index({ class: 1, dueDate: -1 });

export default mongoose.model<IHomework>('Homework', HomeworkSchema);
