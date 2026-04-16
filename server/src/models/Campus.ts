import mongoose, { Document, Schema } from 'mongoose';

export interface ICampus extends Document {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  institution: mongoose.Types.ObjectId;
  isActive: boolean;
}

const CampusSchema = new Schema<ICampus>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

CampusSchema.index({ institution: 1, code: 1 }, { unique: true });
export default mongoose.model<ICampus>('Campus', CampusSchema);
