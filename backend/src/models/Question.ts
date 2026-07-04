import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  type: 'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER';
  subjectId: mongoose.Types.ObjectId;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  questionText: string;
  options: string[]; // empty for SHORT_ANSWER
  correctAnswers: string[]; // MCQ: index strings e.g. ["1"] or ["0", "2"], SHORT_ANSWER: accepted texts (lowercase)
  marks: number;
  isActive: boolean;
  createdAt: Date;
}

const QuestionSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['SINGLE_MCQ', 'MULTI_MCQ', 'SHORT_ANSWER'],
      required: true
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM'
    },
    tags: [{ type: String, trim: true }],
    questionText: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],
    correctAnswers: [{ type: String, trim: true, required: true }],
    marks: { type: Number, default: 1, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Indexes for query speed
QuestionSchema.index({ subjectId: 1, difficulty: 1 });
QuestionSchema.index({ tags: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
