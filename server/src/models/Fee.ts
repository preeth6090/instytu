import mongoose, { Document, Schema } from 'mongoose';

export type FeePaymentMode = 'cash' | 'cheque' | 'dd' | 'online_transfer' | 'card' | 'cash_deposit' | 'upi' | 'scholarship' | 'concession' | 'fee_reduction';

export interface IFee extends Document {
  student: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  campus?: mongoose.Types.ObjectId;
  bundle?: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  amountPaid?: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'waived';
  paidAt?: Date;
  paymentMode?: FeePaymentMode;
  transactionId?: string;
  invoiceId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  collectedBy?: mongoose.Types.ObjectId;
  academicYear: string;
  notes?: string;
}

const FeeSchema = new Schema<IFee>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  campus: { type: Schema.Types.ObjectId, ref: 'Campus' },
  bundle: { type: Schema.Types.ObjectId, ref: 'FeeBundle' },
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'paid', 'partial', 'overdue', 'waived'], default: 'pending' },
  paidAt: { type: Date },
  paymentMode: { type: String, enum: ['cash','cheque','dd','online_transfer','card','cash_deposit','upi','scholarship','concession','fee_reduction'] },
  transactionId: { type: String },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  academicYear: { type: String, default: '2025-26' },
  notes: { type: String },
}, { timestamps: true });

FeeSchema.index({ student: 1, academicYear: 1 });
FeeSchema.index({ institution: 1, dueDate: 1 });
FeeSchema.index({ institution: 1, paidAt: 1 });

export default mongoose.model<IFee>('Fee', FeeSchema);
