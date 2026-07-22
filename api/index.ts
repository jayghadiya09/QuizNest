import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from '../backend/src/routes/auth';
import subjectRoutes from '../backend/src/routes/subjects';
import questionRoutes from '../backend/src/routes/questions';
import examRoutes from '../backend/src/routes/exams';
import attemptRoutes from '../backend/src/routes/attempts';
import userRoutes from '../backend/src/routes/users';

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiznest';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/auth', authRoutes);
app.use('/subjects', subjectRoutes);
app.use('/questions', questionRoutes);
app.use('/exams', examRoutes);
app.use('/attempts', attemptRoutes);
app.use('/users', userRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to QuizNest Serverless API.' });
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'An unexpected server error occurred.'
  });
});

export default app;
