import mongoose, { Document, Schema } from 'mongoose';

export type DiscountType = 'scholarship' | 'concession' | 'sibling' | 'merit' | 'fee_reduction' | 'staff_ward' | 'other';

export interface IStudentDiscount extends Document {
  student: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  type: DiscountType;
  description: string;
  amount: number;
  isPercentage: boolean;
  applicableTo: 'all' | mongoose.Types.ObjectId;
  validFrom?: Date;
  validTo?: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const StudentDiscountSchema = new Schema<IStudentDiscount>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  type: { type: String, enum: ['scholarship','concession','sibling','merit','fee_reduction','staff_ward','other'], required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  isPercentage: { type: Boolean, default: false },
  applicableTo: { type: Schema.Types.Mixed, default: 'all' },
  validFrom: { type: Date },
  validTo: { type: Date },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<IStudentDiscount>('StudentDiscount', StudentDiscountSchema);
