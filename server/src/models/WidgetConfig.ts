import mongoose, { Document, Schema } from 'mongoose';

export interface IWidgetConfig extends Document {
  user: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  name: string;
  isDefault: boolean;
  widgets: any[];  // Free-form JSON configs from AI
}

const WidgetConfigSchema = new Schema<IWidgetConfig>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  name: { type: String, default: 'My Dashboard' },
  isDefault: { type: Boolean, default: false },
  widgets: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

export default mongoose.model<IWidgetConfig>('WidgetConfig', WidgetConfigSchema);
