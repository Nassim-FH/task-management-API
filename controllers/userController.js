const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            isActive,
            sort = 'name'
        } = req.query;

        // Build filter object
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        // Calculate pagination
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        // Execute query
        const users = await User.find(filter)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber)
            .populate('assignedTasks', 'title status priority dueDate')
            .populate('createdTasks', 'title status priority dueDate');

        // Get total count for pagination
        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: {
                users: users.map(user => user.getPublicProfile()),
                pagination: {
                    current: pageNumber,
                    total: Math.ceil(total / limitNumber),
                    count: users.length,
                    totalUsers: total
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('assignedTasks', 'title status priority dueDate createdAt')
            .populate('createdTasks', 'title status priority dueDate createdAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.getPublicProfile()
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin/Manager only)
const updateUser = async (req, res, next) => {
    try {
        // Check if user is trying to update themselves or has proper permissions
        if (req.params.id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const allowedFields = ['name', 'email', 'department', 'phone', 'avatar'];

        // Only admins can change roles and active status
        if (req.user.role === 'admin') {
            allowedFields.push('role', 'isActive');
        }

        // Filter the request body to only include allowed fields
        const fieldsToUpdate = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                fieldsToUpdate[field] = req.body[field];
            }
        });

        // Check if email is being changed and if it's already taken
        if (fieldsToUpdate.email) {
            const existingUser = await User.findOne({
                email: fieldsToUpdate.email,
                _id: { $ne: req.params.id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: user.getPublicProfile()
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
    try {
        // Only admins can delete users
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        // Prevent self-deletion
        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Instead of hard delete, deactivate the user
        user.isActive = false;
        await user.save();

        // Optional: You could also reassign their tasks or archive them
        const Task = require('../models/Task');
        await Task.updateMany(
            { assignedTo: req.params.id, status: { $ne: 'completed' } },
            { assignedTo: null }
        );

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res, next) => {
    try {
        // Users can only view their own stats unless they're admin/manager
        if (req.params.id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const Task = require('../models/Task');
        const userId = req.params.id;

        const [
            user,
            totalAssigned,
            completedTasks,
            overdueTasks,
            inProgressTasks,
            createdTasks,
            tasksByPriority
        ] = await Promise.all([
            User.findById(userId).select('-password'),
            Task.countDocuments({ assignedTo: userId, isArchived: false }),
            Task.countDocuments({ assignedTo: userId, status: 'completed', isArchived: false }),
            Task.countDocuments({
                assignedTo: userId,
                dueDate: { $lt: new Date() },
                status: { $nin: ['completed', 'cancelled'] },
                isArchived: false
            }),
            Task.countDocuments({
                assignedTo: userId,
                status: 'in-progress',
                isArchived: false
            }),
            Task.countDocuments({ createdBy: userId, isArchived: false }),

            // Tasks by priority for assigned tasks
            Task.aggregate([
                {
                    $match: {
                        assignedTo: mongoose.Types.ObjectId(userId),
                        isArchived: false
                    }
                },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ])
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.getPublicProfile(),
                stats: {
                    tasksAssigned: totalAssigned,
                    tasksCompleted: completedTasks,
                    tasksOverdue: overdueTasks,
                    tasksInProgress: inProgressTasks,
                    tasksCreated: createdTasks,
                    completionRate: totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0,
                    tasksByPriority: tasksByPriority.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {})
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get active users for task assignment
// @route   GET /api/users/active
// @access  Private
const getActiveUsers = async (req, res, next) => {
    try {
        const users = await User.findActive()
            .select('name email avatar department role')
            .sort('name');

        res.json({
            success: true,
            data: {
                users: users.map(user => user.getPublicProfile())
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res, next) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const users = await User.find({
            $and: [
                { isActive: true },
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } },
                        { department: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        })
            .select('name email avatar department role')
            .limit(parseInt(limit, 10))
            .sort('name');

        res.json({
            success: true,
            data: {
                users: users.map(user => user.getPublicProfile())
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getActiveUsers,
    searchUsers
};
