import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionEvent extends Document {
  userId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId; // ExamTemplate ID
  eventType: 'TAB_HIDDEN' | 'TAB_VISIBLE' | 'WINDOW_BLUR' | 'WINDOW_FOCUS';
  timestamp: Date;
}

const SessionEventSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'ExamTemplate', required: true },
    eventType: {
      type: String,
      enum: ['TAB_HIDDEN', 'TAB_VISIBLE', 'WINDOW_BLUR', 'WINDOW_FOCUS'],
      required: true
    },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

SessionEventSchema.index({ userId: 1, examId: 1 });

export default mongoose.model<ISessionEvent>('SessionEvent', SessionEventSchema);
