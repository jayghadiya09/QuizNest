import mongoose from 'mongoose';
import Question from '../models/Question';
import ExamTemplate from '../models/ExamTemplate';
import ExamInstance, { IInstanceQuestion } from '../models/ExamInstance';

// Utility helper to shuffle array in-place (Fisher-Yates)
function shuffleArray<T>(arr: T[]): T[] {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export const generateExamInstance = async (
  studentId: string,
  templateId: string
) => {
  const template = await ExamTemplate.findById(templateId);
  if (!template || !template.isActive) {
    throw new Error('Exam template not found or inactive');
  }

  let selectedQuestions: any[] = [];

  if (template.selectionMode === 'MANUAL') {
    selectedQuestions = await Question.find({
      _id: { $in: template.manualQuestions },
      isActive: true
    });
    if (selectedQuestions.length === 0) {
      throw new Error('This manual exam has no active questions assigned.');
    }
  } else {
    // 1. Fetch difficulty distribution settings
    const { easyCount, mediumCount, hardCount } = template.difficultyDistribution;

    // 2. Query pools for active questions matching this subject
    const [easyPool, mediumPool, hardPool] = await Promise.all([
      Question.find({ subjectId: template.subjectId, difficulty: 'EASY', isActive: true }),
      Question.find({ subjectId: template.subjectId, difficulty: 'MEDIUM', isActive: true }),
      Question.find({ subjectId: template.subjectId, difficulty: 'HARD', isActive: true })
    ]);

    if (easyPool.length < easyCount) {
      throw new Error(`Insufficient EASY questions in database. Requested: ${easyCount}, Available: ${easyPool.length}`);
    }
    if (mediumPool.length < mediumCount) {
      throw new Error(`Insufficient MEDIUM questions in database. Requested: ${mediumCount}, Available: ${mediumPool.length}`);
    }
    if (hardPool.length < hardCount) {
      throw new Error(`Insufficient HARD questions in database. Requested: ${hardCount}, Available: ${hardPool.length}`);
    }

    // 3. Randomly pull questions from pools
    const shuffledEasy = shuffleArray(easyPool);
    selectedQuestions.push(...shuffledEasy.slice(0, easyCount));

    const shuffledMedium = shuffleArray(mediumPool);
    selectedQuestions.push(...shuffledMedium.slice(0, mediumCount));

    const shuffledHard = shuffleArray(hardPool);
    selectedQuestions.push(...shuffledHard.slice(0, hardCount));
  }

  // 4. Shuffling questions order
  let finalQuestions = selectedQuestions;
  if (template.randomizationSettings.shuffleQuestions) {
    finalQuestions = shuffleArray(selectedQuestions);
  }

  // 5. Shuffling options order for MCQs
  const questionsData: IInstanceQuestion[] = finalQuestions.map((q) => {
    let optionMapping: number[] = [];
    if (q.type !== 'SHORT_ANSWER' && q.options && q.options.length > 0) {
      // Create options indices [0, 1, 2, ...]
      const indices = Array.from({ length: q.options.length }, (_, k) => k);
      if (template.randomizationSettings.shuffleOptions) {
        optionMapping = shuffleArray(indices);
      } else {
        optionMapping = indices;
      }
    }

    return {
      questionId: q._id as mongoose.Types.ObjectId,
      shuffledOptionIndices: optionMapping
    };
  });

  // Calculate expiration time (extra grace window of 30 seconds for network submit time)
  const expiresAt = new Date(Date.now() + (template.duration * 60 * 1000) + 30000);

  const instance = new ExamInstance({
    studentId: new mongoose.Types.ObjectId(studentId),
    templateId: new mongoose.Types.ObjectId(templateId),
    questions: questionsData,
    expiresAt
  });

  await instance.save();
  return instance;
};
