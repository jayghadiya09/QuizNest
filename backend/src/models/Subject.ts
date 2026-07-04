import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  description?: string;
  createdAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model<ISubject>('Subject', SubjectSchema);
