import mongoose, { Document, Schema } from 'mongoose';

export interface INotice extends Document {
  title: string;
  content: string;
  type: 'general' | 'exam' | 'event' | 'holiday' | 'urgent';
  institution: mongoose.Types.ObjectId;
  postedBy: mongoose.Types.ObjectId;
  targetRoles: string[];    // ['student','parent','teacher'] or ['all']
  targetClasses?: mongoose.Types.ObjectId[];
  expiresAt?: Date;
}

const NoticeSchema = new Schema<INotice>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['general', 'exam', 'event', 'holiday', 'urgent'], default: 'general' },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetRoles: [{ type: String }],
  targetClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
  expiresAt: { type: Date },
}, { timestamps: true });

NoticeSchema.index({ institution: 1, createdAt: -1 });

export default mongoose.model<INotice>('Notice', NoticeSchema);
