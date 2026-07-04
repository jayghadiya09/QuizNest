import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// @desc    Get all users (excluding passwords)
// @route   GET /users
// @access  Private (Admin only)
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update a user's role
// @route   PUT /users/:id/role
// @access  Private (Admin only)
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { role } = req.body;
  const targetUserId = req.params.id;

  try {
    if (!role || !['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    if (targetUserId === req.user?.id) {
      return res.status(400).json({ message: 'Cannot modify your own administration role' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Delete a user profile entirely
// @route   DELETE /users/:id
// @access  Private (Admin only)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;

  try {
    if (targetUserId === req.user?.id) {
      return res.status(400).json({ message: 'Cannot delete your own admin profile' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(targetUserId);
    return res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
