import mongoose, { Document, Schema } from 'mongoose';

export interface IInstitution extends Document {
  name: string;
  slug: string;
  type: 'school' | 'college' | 'institute';
  email: string;
  phone: string;
  address: string;
  logo?: string;
  tagline?: string;
  primaryColor: string;
  plan: 'demo' | 'full';
  isActive: boolean;
  modules: string[];
  createdBy: mongoose.Types.ObjectId;
  // Extended settings
  gstn?: string;
  gstPercentage?: number;
  website?: string;
  bankDetails?: string;
  geminiApiKey?: string;
  invoiceSettings: {
    prefix: string;
    suffix: string;
    separator: string;
    resetYearly: boolean;
    currentSequence: number;
    currentYear: string;
    showGST: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showBankDetails: boolean;
    headerText: string;
    footerText: string;
    terms: string;
    logoPosition: 'left' | 'center' | 'right';
    theme: string;
    showWatermark: boolean;
    watermarkOpacity: number;
  };
}

const InstitutionSchema = new Schema<IInstitution>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ['school', 'college', 'institute'], required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  logo: { type: String },
  tagline: { type: String },
  primaryColor: { type: String, default: '#4F46E5' },
  plan: { type: String, enum: ['demo', 'full'], default: 'demo' },
  isActive: { type: Boolean, default: true },
  modules: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  gstn: { type: String },
  gstPercentage: { type: Number, default: 18 },
  website: { type: String },
  bankDetails: { type: String },
  geminiApiKey: { type: String },
  invoiceSettings: {
    prefix: { type: String, default: 'INV' },
    suffix: { type: String, default: '' },
    separator: { type: String, default: '-' },
    resetYearly: { type: Boolean, default: true },
    currentSequence: { type: Number, default: 0 },
    currentYear: { type: String, default: '2025-26' },
    showGST: { type: Boolean, default: false },
    showAddress: { type: Boolean, default: true },
    showPhone: { type: Boolean, default: true },
    showBankDetails: { type: Boolean, default: false },
    headerText: { type: String, default: '' },
    footerText: { type: String, default: 'Thank you for your payment.' },
    terms: { type: String, default: '' },
    logoPosition: { type: String, enum: ['left','center','right'], default: 'left' },
    theme: { type: String, default: '#4F46E5' },
    showWatermark: { type: Boolean, default: true },
    watermarkOpacity: { type: Number, default: 0.08 },
  },
}, { timestamps: true });

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
