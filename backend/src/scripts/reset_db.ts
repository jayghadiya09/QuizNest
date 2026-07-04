import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subject from '../models/Subject';
import Question from '../models/Question';
import ExamTemplate from '../models/ExamTemplate';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiznest';

async function resetDb() {
  try {
    console.log('Connecting to MongoDB for reset...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Dropping database...');
    await mongoose.connection.db?.dropDatabase();
    console.log('Database dropped successfully.');

    // 1. Seed Subjects
    const subject = new Subject({
      name: 'Computer Science',
      description: 'Core aspects of software, databases, and algorithms.'
    });
    await subject.save();
    console.log('Seeded Subject: Computer Science.');

    // 2. Seed Questions
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
    console.log('Seeded initial questions pool.');

    // 3. Seed Users
    const teacher = new User({
      name: 'Demo Teacher',
      email: 'teacher@quiznest.com',
      password: 'password123',
      role: 'TEACHER'
    });
    await teacher.save();
    console.log('Seeded teacher account: teacher@quiznest.com / password123');

    const student = new User({
      name: 'Demo Student',
      email: 'student@quiznest.com',
      password: 'password123',
      role: 'STUDENT'
    });
    await student.save();
    console.log('Seeded student account: student@quiznest.com / password123');

    // 4. Seed ExamTemplate
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const template = new ExamTemplate({
      title: 'CS101 Term Examination',
      description: 'Midterm test covering CSS, JS, Algorithms, and SQL.',
      subjectId: subject._id,
      duration: 30,
      availabilityStart: new Date(),
      availabilityEnd: nextWeek,
      negativeMarkingRules: { enabled: false, penalty: 0 },
      randomizationSettings: { shuffleQuestions: true, shuffleOptions: true },
      difficultyDistribution: { easyCount: 2, mediumCount: 2, hardCount: 1 },
      maxAttempts: 1,
      passingPercentage: 50,
      selectionMode: 'AUTOMATIC',
      createdBy: teacher._id,
      isActive: true
    });
    await template.save();
    console.log('Seeded ExamTemplate: CS101 Term Examination.');

    console.log('Database reset & seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  }
}

resetDb();
