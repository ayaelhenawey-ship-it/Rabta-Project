import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiverModel?: 'User' | 'Group';
  receiver?: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  type: 'voice' | 'video';
  status: 'missed' | 'rejected' | 'accepted' | 'ended';
  duration: number;
  startedAt: Date;
}

const callSchema = new Schema<ICall>({
  caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverModel: { type: String, enum: ['User', 'Group'], default: 'User' },
  receiver: { type: Schema.Types.ObjectId, refPath: 'receiverModel' },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  type: { type: String, enum: ['voice', 'video'], default: 'video' },
  status: { type: String, enum: ['missed', 'rejected', 'accepted', 'ended'], default: 'missed' },
  duration: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<ICall>('Call', callSchema);