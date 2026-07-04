import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Subject from '../models/Subject';

// @desc    Get all subjects
// @route   GET /subjects
// @access  Private
export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await Subject.find({}).sort({ name: 1 });
    return res.json(subjects);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Create a new subject
// @route   POST /subjects
// @access  Private (Teacher/Admin)
export const createSubject = async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    const existing = await Subject.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Subject with this name already exists' });
    }

    const newSubject = new Subject({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    await newSubject.save();
    return res.status(201).json(newSubject);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update a subject
// @route   PUT /subjects/:id
// @access  Private (Teacher/Admin)
export const updateSubject = async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  const { id } = req.params;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if name is taken by another subject
    const existing = await Subject.findOne({ name: name.trim(), _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ message: 'Subject with this name already exists' });
    }

    subject.name = name.trim();
    if (description !== undefined) {
      subject.description = description.trim();
    }

    await subject.save();
    return res.json(subject);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
