import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  subject?: string;
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  subject: { type: String },
}, { timestamps: true });

MessageSchema.index({ receiver: 1, read: 1 });
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
