import mongoose, { Schema, Document } from 'mongoose';

export interface IExamTemplate extends Document {
  title: string;
  description?: string;
  subjectId: mongoose.Types.ObjectId;
  duration: number; // in minutes
  availabilityStart: Date;
  availabilityEnd: Date;
  negativeMarkingRules: {
    enabled: boolean;
    penalty: number; // e.g. 0.25
  };
  randomizationSettings: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  difficultyDistribution: {
    easyCount: number;
    mediumCount: number;
    hardCount: number;
  };
  maxAttempts: number;
  passingPercentage: number;
  selectionMode: 'AUTOMATIC' | 'MANUAL';
  manualQuestions: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
}

const ExamTemplateSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    duration: { type: Number, required: true, min: 1 },
    availabilityStart: { type: Date, required: true },
    availabilityEnd: { type: Date, required: true },
    negativeMarkingRules: {
      enabled: { type: Boolean, default: false },
      penalty: { type: Number, default: 0 } // positive value for penalty, e.g. 0.25
    },
    randomizationSettings: {
      shuffleQuestions: { type: Boolean, default: true },
      shuffleOptions: { type: Boolean, default: true }
    },
    difficultyDistribution: {
      easyCount: { type: Number, default: 0, min: 0 },
      mediumCount: { type: Number, default: 0, min: 0 },
      hardCount: { type: Number, default: 0, min: 0 }
    },
    maxAttempts: { type: Number, default: 1, min: 1 },
    passingPercentage: { type: Number, default: 50, min: 0, max: 100 },
    selectionMode: { type: String, enum: ['AUTOMATIC', 'MANUAL'], default: 'AUTOMATIC' },
    manualQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ExamTemplateSchema.index({ subjectId: 1 });

export default mongoose.model<IExamTemplate>('ExamTemplate', ExamTemplateSchema);
