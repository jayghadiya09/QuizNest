import mongoose, { Schema, Document } from 'mongoose';
import { IQuestion } from './Question';

export interface IExam extends Document {
  title: string;
  description?: string;
  duration: number; // in minutes
  questions: mongoose.Types.ObjectId[] | IQuestion[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
}

const ExamSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    duration: { type: Number, required: true, min: 1 }, // in minutes
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IExam>('Exam', ExamSchema);
