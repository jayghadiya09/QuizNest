import mongoose, { Schema, Document } from 'mongoose';

export interface IResponse {
  questionId: mongoose.Types.ObjectId;
  answers: string[]; // For SINGLE/MULTI MCQ: array of option index strings (in student order). For SHORT_ANSWER: single element text answer.
}

export interface IAttempt extends Document {
  studentId: mongoose.Types.ObjectId;
  examInstanceId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  responses: IResponse[];
  score: number;
  maxScore: number;
  warningsCount: number;
  tabSwitchesCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  cheatingDetected: boolean;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

const AttemptSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examInstanceId: { type: Schema.Types.ObjectId, ref: 'ExamInstance', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ExamTemplate', required: true },
    responses: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
        answers: [{ type: String, trim: true }]
      }
    ],
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    warningsCount: { type: Number, default: 0 },
    tabSwitchesCount: { type: Number, default: 0 },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' },
    cheatingDetected: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true, versionKey: false }
);

AttemptSchema.index({ studentId: 1, templateId: 1 });
AttemptSchema.index({ templateId: 1 });

export default mongoose.model<IAttempt>('Attempt', AttemptSchema);
