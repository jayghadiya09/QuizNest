import mongoose, { Schema, Document } from 'mongoose';

export interface IInstanceQuestion {
  questionId: mongoose.Types.ObjectId;
  shuffledOptionIndices: number[]; // e.g. [3, 0, 2, 1] representing the order presented to the student
}

export interface IExamInstance extends Document {
  studentId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  questions: IInstanceQuestion[];
  expiresAt: Date;
  createdAt: Date;
}

const ExamInstanceSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ExamTemplate', required: true },
    questions: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
        shuffledOptionIndices: [{ type: Number }]
      }
    ],
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

ExamInstanceSchema.index({ studentId: 1, templateId: 1 });

export default mongoose.model<IExamInstance>('ExamInstance', ExamInstanceSchema);
