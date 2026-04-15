import mongoose, { Document, Schema } from 'mongoose';

export interface IFee extends Document {
  student: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
  paymentMode?: 'online' | 'cash' | 'cheque' | 'upi';
  transactionId?: string;
  createdBy: mongoose.Types.ObjectId;
  academicYear: string;
}

const FeeSchema = new Schema<IFee>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  paidAt: { type: Date },
  paymentMode: { type: String, enum: ['online', 'cash', 'cheque', 'upi'] },
  transactionId: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  academicYear: { type: String, default: '2025-26' },
}, { timestamps: true });

FeeSchema.index({ student: 1, academicYear: 1 });
FeeSchema.index({ institution: 1, dueDate: 1 });

export default mongoose.model<IFee>('Fee', FeeSchema);
