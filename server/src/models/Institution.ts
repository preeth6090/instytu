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
}, { timestamps: true });

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);