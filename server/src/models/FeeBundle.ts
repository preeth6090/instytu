import mongoose, { Document, Schema } from 'mongoose';

export interface IFeeComponent {
  name: string;
  amount: number;
  taxable: boolean;
  taxType?: 'CGST+SGST' | 'IGST' | 'none';
  taxRate?: number;
}

export interface IFeeBundle extends Document {
  name: string;
  institution: mongoose.Types.ObjectId;
  academicYear: string;
  components: IFeeComponent[];
  totalAmount: number;
  isActive: boolean;
}

const ComponentSchema = new Schema<IFeeComponent>({
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  taxable: { type: Boolean, default: false },
  taxType: { type: String, enum: ['CGST+SGST', 'IGST', 'none'], default: 'none' },
  taxRate: { type: Number, default: 0 },
}, { _id: false });

const FeeBundleSchema = new Schema<IFeeBundle>({
  name: { type: String, required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  academicYear: { type: String, default: '2025-26' },
  components: [ComponentSchema],
  totalAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

FeeBundleSchema.pre('save', function () {
  this.totalAmount = this.components.reduce((sum, c) => {
    const tax = c.taxable ? (c.amount * (c.taxRate || 0)) / 100 : 0;
    return sum + c.amount + tax;
  }, 0);
});

export default mongoose.model<IFeeBundle>('FeeBundle', FeeBundleSchema);
