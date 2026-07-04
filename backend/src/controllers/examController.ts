import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ExamTemplate from '../models/ExamTemplate';
import Subject from '../models/Subject';

// @desc    Get all exam templates (students only see active templates within availability windows)
// @route   GET /exams
// @access  Private
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const isStudent = req.user?.role === 'STUDENT';
    const filter: any = { isActive: true };

    if (isStudent) {
      const now = new Date();
      // Student can only see templates where availability range encompasses the current time
      filter.availabilityStart = { $lte: now };
      filter.availabilityEnd = { $gte: now };
    }

    const templates = await ExamTemplate.find(filter)
      .populate('subjectId', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json(templates);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Create a new exam template
// @route   POST /exams
// @access  Private (Teacher/Admin)
export const createTemplate = async (req: AuthRequest, res: Response) => {
  const {
    title,
    description,
    subjectId,
    duration,
    availabilityStart,
    availabilityEnd,
    negativeMarkingRules,
    randomizationSettings,
    difficultyDistribution,
    maxAttempts,
    passingPercentage,
    selectionMode,
    manualQuestions
  } = req.body;

  try {
    if (!title || !subjectId || !duration || !availabilityStart || !availabilityEnd) {
      return res.status(400).json({ message: 'Missing required exam template fields' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const newTemplate = new ExamTemplate({
      title,
      description: description || '',
      subjectId,
      duration,
      availabilityStart: new Date(availabilityStart),
      availabilityEnd: new Date(availabilityEnd),
      negativeMarkingRules: negativeMarkingRules || { enabled: false, penalty: 0 },
      randomizationSettings: randomizationSettings || { shuffleQuestions: true, shuffleOptions: true },
      difficultyDistribution: difficultyDistribution || { easyCount: 0, mediumCount: 0, hardCount: 0 },
      maxAttempts: maxAttempts || 1,
      passingPercentage: passingPercentage || 50,
      selectionMode: selectionMode || 'AUTOMATIC',
      manualQuestions: manualQuestions || [],
      createdBy: req.user?.id,
      isActive: true
    });

    await newTemplate.save();
    return res.status(201).json(newTemplate);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Hard Delete an exam template
// @route   DELETE /exams/:id
// @access  Private (Teacher/Admin)
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const template = await ExamTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Exam template not found' });
    }

    return res.json({ message: 'Exam template deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update an exam template
// @route   PUT /exams/:id
// @access  Private (Teacher/Admin)
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    subjectId,
    duration,
    availabilityStart,
    availabilityEnd,
    negativeMarkingRules,
    randomizationSettings,
    difficultyDistribution,
    maxAttempts,
    passingPercentage,
    selectionMode,
    manualQuestions
  } = req.body;

  try {
    const template = await ExamTemplate.findById(id);
    if (!template || !template.isActive) {
      return res.status(404).json({ message: 'Exam template not found' });
    }

    if (title !== undefined) template.title = title;
    if (description !== undefined) template.description = description;
    if (subjectId !== undefined) {
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }
      template.subjectId = subjectId;
    }
    if (duration !== undefined) template.duration = duration;
    if (availabilityStart !== undefined) template.availabilityStart = new Date(availabilityStart);
    if (availabilityEnd !== undefined) template.availabilityEnd = new Date(availabilityEnd);
    if (negativeMarkingRules !== undefined) template.negativeMarkingRules = negativeMarkingRules;
    if (randomizationSettings !== undefined) template.randomizationSettings = randomizationSettings;
    if (difficultyDistribution !== undefined) template.difficultyDistribution = difficultyDistribution;
    if (maxAttempts !== undefined) template.maxAttempts = maxAttempts;
    if (passingPercentage !== undefined) template.passingPercentage = passingPercentage;
    if (selectionMode !== undefined) template.selectionMode = selectionMode;
    if (manualQuestions !== undefined) template.manualQuestions = manualQuestions;

    await template.save();
    return res.json(template);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
