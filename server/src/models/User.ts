import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent' | 'staff';
  customRole?: mongoose.Types.ObjectId;
  institution?: mongoose.Types.ObjectId;
  campus?: mongoose.Types.ObjectId;
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
    enum: ['superadmin', 'admin', 'teacher', 'student', 'parent', 'staff'],
    default: 'student'
  },
  customRole: { type: Schema.Types.ObjectId, ref: 'CustomRole' },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution' },
  campus: { type: Schema.Types.ObjectId, ref: 'Campus' },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
