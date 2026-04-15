import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent';
  institution?: mongoose.Types.ObjectId;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String },
  googleId: { type: String },
  password: { type: String, required: false, select: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'teacher', 'student', 'parent'],
    default: 'student'
  },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution' },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);