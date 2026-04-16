import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  user: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  campus?: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  rollNumber: string;
  admissionNo: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  parents: mongoose.Types.ObjectId[];
  bloodGroup?: string;
  busRoute?: string;
  isActive: boolean;
}

const StudentSchema = new Schema<IStudent>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  campus: { type: Schema.Types.ObjectId, ref: 'Campus' },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  rollNumber: { type: String, required: true },
  admissionNo: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  phone: { type: String },
  address: { type: String },
  parents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  bloodGroup: { type: String },
  busRoute: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

StudentSchema.index({ institution: 1, isActive: 1 });
StudentSchema.index({ institution: 1, class: 1 });

export default mongoose.model<IStudent>('Student', StudentSchema);
