import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
  student: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;
  answers: (number | null)[]; // Index of options chosen, or null if unanswered
  score: number;
  maxScore: number;
  warningsCount: number;
  tabSwitchesCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: Date;
  completedAt?: Date;
}

const SubmissionSchema: Schema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    answers: { type: [Schema.Types.Mixed], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    warningsCount: { type: Number, default: 0 },
    tabSwitchesCount: { type: Number, default: 0 },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'COMPLETED' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
