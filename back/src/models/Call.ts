import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;   // الطالب أو الشركة (البادئ)
  receiver: mongoose.Types.ObjectId; // الطرف المستلم
  type: 'voice' | 'video';           // نوع المكالمة
  status: 'missed' | 'rejected' | 'accepted' | 'ended';
  duration: number;                  // المدة بالثواني
  startedAt: Date;
}

const callSchema = new Schema<ICall>({
  caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['voice', 'video'], default: 'video' },
  status: { type: String, enum: ['missed', 'rejected', 'accepted', 'ended'], default: 'missed' },
  duration: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<ICall>('Call', callSchema);