import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Layered Route imports
import authRoutes from './routes/auth';
import subjectRoutes from './routes/subjects';
import questionRoutes from './routes/questions';
import examRoutes from './routes/exams';
import attemptRoutes from './routes/attempts';
import userRoutes from './routes/users';

// Model imports for database seeding & socket operations
import Subject from './models/Subject';
import Question from './models/Question';
import ExamTemplate from './models/ExamTemplate';
import User from './models/User';
import SessionEvent from './models/SessionEvent';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiznest';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    seedDatabase();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// API Routes mapping
app.use('/auth', authRoutes);
app.use('/subjects', subjectRoutes);
app.use('/questions', questionRoutes);
app.use('/exams', examRoutes);
app.use('/attempts', attemptRoutes);
app.use('/users', userRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to QuizNest Production API.' });
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Automatic Seed Function
async function seedDatabase() {
  try {
    // 1. Seed Subjects if none exist
    let subject = await Subject.findOne({ name: 'Computer Science' });
    if (!subject) {
      subject = new Subject({
        name: 'Computer Science',
        description: 'Core aspects of software, databases, and algorithms.'
      });
      await subject.save();
      console.log('Seeded Subject: Computer Science.');
    }

    // 2. Seed Questions if pool is empty
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('Seeding initial questions pool...');
      
      const sampleQuestions = [
        {
          type: 'SINGLE_MCQ',
          subjectId: subject._id,
          difficulty: 'EASY',
          tags: ['js', 'basics'],
          questionText: 'Which of the following is NOT a JavaScript primitive data type?',
          options: ['String', 'Number', 'Float', 'Boolean'],
          correctAnswers: ['2'], // Float is not a JS primitive type
          marks: 1
        },
        {
          type: 'MULTI_MCQ',
          subjectId: subject._id,
          difficulty: 'MEDIUM',
          tags: ['web', 'html'],
          questionText: 'Which of the following are valid HTML5 block-level semantic elements? (Select all that apply)',
          options: ['article', 'span', 'section', 'strong'],
          correctAnswers: ['0', '2'], // article and section are block-level
          marks: 2
        },
        {
          type: 'SHORT_ANSWER',
          subjectId: subject._id,
          difficulty: 'MEDIUM',
          tags: ['algorithms', 'bst'],
          questionText: 'What is the average-case time complexity of searching in a balanced Binary Search Tree (BST)? (Write in Big-O notation, e.g. O(log n))',
          options: [],
          correctAnswers: ['o(log n)', 'o(logn)', 'o(log(n))'],
          marks: 2
        },
        {
          type: 'SINGLE_MCQ',
          subjectId: subject._id,
          difficulty: 'MEDIUM',
          tags: ['db', 'sql'],
          questionText: 'Which SQL constraint is used to uniquely identify each record in a database table?',
          options: ['FOREIGN KEY', 'UNIQUE', 'PRIMARY KEY', 'CHECK'],
          correctAnswers: ['2'], // PRIMARY KEY
          marks: 1
        },
        {
          type: 'SINGLE_MCQ',
          subjectId: subject._id,
          difficulty: 'HARD',
          tags: ['algorithms', 'sorting'],
          questionText: 'What is the worst-case time complexity of standard QuickSort?',
          options: ['O(n log n)', 'O(n)', 'O(n^2)', 'O(2^n)'],
          correctAnswers: ['2'], // O(n^2)
          marks: 2
        }
      ];

      await Question.insertMany(sampleQuestions);
      console.log('Seeded 5 sample questions with MCQ & short-answer types.');
    }

    // 3. Seed Users
    let teacher = await User.findOne({ email: 'teacher@quiznest.com' });
    if (!teacher) {
      teacher = new User({
        name: 'Demo Teacher',
        email: 'teacher@quiznest.com',
        password: 'password123',
        role: 'TEACHER'
      });
      await teacher.save();
      console.log('Seeded teacher account: teacher@quiznest.com / password123');
    }

    let student = await User.findOne({ email: 'student@quiznest.com' });
    if (!student) {
      student = new User({
        name: 'Demo Student',
        email: 'student@quiznest.com',
        password: 'password123',
        role: 'STUDENT'
      });
      await student.save();
      console.log('Seeded student account: student@quiznest.com / password123');
    }

    // 4. Seed ExamTemplate if none exist
    const templateCount = await ExamTemplate.countDocuments();
    if (templateCount === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const examTemplate = new ExamTemplate({
        title: 'Midterm General CS & Web Engineering Assessment',
        description: 'Comprehensive test covering JavaScript data structures, HTML block elements, algorithms, database primary keys, and sorting complexities.',
        subjectId: subject._id,
        duration: 30, // 30 minutes
        availabilityStart: new Date(Date.now() - 3600000), // available now
        availabilityEnd: nextWeek,
        negativeMarkingRules: {
          enabled: true,
          penalty: 0.25
        },
        randomizationSettings: {
          shuffleQuestions: true,
          shuffleOptions: true
        },
        difficultyDistribution: {
          easyCount: 1,
          mediumCount: 2,
          hardCount: 1
        },
        maxAttempts: 2,
        createdBy: teacher._id,
        isActive: true
      });

      await examTemplate.save();
      console.log('Seeded initial exam template.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// In-memory store for proctor socket connections mapping
// Map<socketId, { studentId, studentName, examId }>
const proctorClients = new Map<string, { studentId: string; studentName: string; examId: string }>();

// WebSockets (Socket.IO) Telemetry & proctoring server setup
io.on('connection', (socket: Socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // 1. Teacher proctor channel join
  socket.on('join-proctor', async ({ examId }) => {
    socket.join(`proctor_${examId}`);
    console.log(`Examiner joined proctoring channel: proctor_${examId}`);

    // Aggregate currently active sessions mapping from proctorClients
    const activeList = Array.from(proctorClients.values())
      .filter((session) => session.examId === examId)
      .map((session) => ({
        studentId: session.studentId,
        studentName: session.studentName,
        status: 'ACTIVE'
      }));

    socket.emit('active-students-list', activeList);
  });

  // 2. Student starts exam
  socket.on('join-exam', ({ studentId, studentName, examId }) => {
    socket.join(`exam_${examId}`);
    proctorClients.set(socket.id, { studentId, studentName, examId });
    console.log(`Student ${studentName} joined examination: exam_${examId}`);

    // Broadcast joining update to teacher
    io.to(`proctor_${examId}`).emit('student-status-changed', {
      studentId,
      studentName,
      status: 'ACTIVE',
      warningsCount: 0,
      tabSwitchesCount: 0
    });
  });

  // 3. Session Warden event alert
  socket.on('cheat-alert', async ({ studentId, studentName, examId, alertType }) => {
    try {
      const typeMapping: Record<string, 'TAB_HIDDEN' | 'WINDOW_BLUR'> = {
        TAB_SWITCH: 'TAB_HIDDEN',
        WINDOW_BLUR: 'WINDOW_BLUR'
      };

      const eventType = typeMapping[alertType] || 'WINDOW_BLUR';

      // Log telemetry event in database for proctor audit logs
      const event = new SessionEvent({
        userId: new mongoose.Types.ObjectId(studentId),
        examId: new mongoose.Types.ObjectId(examId),
        eventType,
        timestamp: new Date()
      });
      await event.save();

      // Retrieve updated session logs counts from DB
      const warningsCount = await SessionEvent.countDocuments({
        userId: studentId,
        examId
      });

      const tabSwitchesCount = await SessionEvent.countDocuments({
        userId: studentId,
        examId,
        eventType: 'TAB_HIDDEN'
      });

      console.log(`Session Warden Alert Logged: Student ${studentName} triggered ${eventType}. Total Warnings: ${warningsCount}`);

      // Broadcast warning details to proctors in real-time
      io.to(`proctor_${examId}`).emit('student-alert', {
        studentId,
        studentName,
        alertType,
        timestamp: new Date(),
        sessionInfo: {
          studentId,
          studentName,
          status: 'AWAY',
          warningsCount,
          tabSwitchesCount
        }
      });
    } catch (err) {
      console.error('Socket cheat-alert error:', err);
    }
  });

  // 4. Student resumes focus
  socket.on('resume-focus', async ({ studentId, studentName, examId }) => {
    try {
      const warningsCount = await SessionEvent.countDocuments({ userId: studentId, examId });
      const tabSwitchesCount = await SessionEvent.countDocuments({ userId: studentId, examId, eventType: 'TAB_HIDDEN' });

      io.to(`proctor_${examId}`).emit('student-status-changed', {
        studentId,
        studentName,
        status: 'ACTIVE',
        warningsCount,
        tabSwitchesCount
      });
    } catch (err) {
      console.error('Socket resume-focus error:', err);
    }
  });

  // 5. Student submits exam
  socket.on('submit-exam', ({ studentId, studentName, examId }) => {
    console.log(`Student ${studentName} completed and submitted exam: ${examId}`);
    
    io.to(`proctor_${examId}`).emit('student-status-changed', {
      studentId,
      studentName,
      status: 'SUBMITTED',
      warningsCount: 0,
      tabSwitchesCount: 0
    });

    proctorClients.delete(socket.id);
    socket.leave(`exam_${examId}`);
  });

  // 6. Socket disconnect
  socket.on('disconnect', () => {
    const session = proctorClients.get(socket.id);
    if (session) {
      console.log(`Student ${session.studentName} disconnected from active socket.`);
      io.to(`proctor_${session.examId}`).emit('student-offline', {
        studentId: session.studentId,
        studentName: session.studentName,
        status: 'OFFLINE'
      });
      proctorClients.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Production examination server running on port ${PORT}`);
});
