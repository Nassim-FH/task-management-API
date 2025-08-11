const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
    try {
        const { name, email, password, role, department, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user',
            department,
            phone
        });

        // Generate token
        const token = generateToken(user._id);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.getPublicProfile(),
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check for user and include password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.getPublicProfile(),
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('assignedTasks', 'title status priority dueDate')
            .populate('createdTasks', 'title status priority dueDate');

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

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
            department: req.body.department,
            phone: req.body.phone,
            avatar: req.body.avatar
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key => {
            if (fieldsToUpdate[key] === undefined) {
                delete fieldsToUpdate[key];
            }
        });

        // Check if email is being changed and if it's already taken
        if (fieldsToUpdate.email && fieldsToUpdate.email !== req.user.email) {
            const existingUser = await User.findOne({ email: fieldsToUpdate.email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.getPublicProfile()
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
    try {
        const { preferences } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { preferences },
            {
                new: true,
                runValidators: true
            }
        );

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: {
                preferences: user.preferences
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isCurrentPasswordMatch = await user.comparePassword(currentPassword);

        if (!isCurrentPasswordMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
    try {
        // In a more complex app, you might want to blacklist the token
        // For now, we'll just send a success response
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user stats
// @route   GET /api/auth/stats
// @access  Private
const getUserStats = async (req, res, next) => {
    try {
        const Task = require('../models/Task');

        const userId = req.user.id;

        // Get task statistics
        const totalTasks = await Task.countDocuments({
            $or: [
                { createdBy: userId },
                { assignedTo: userId }
            ]
        });

        const completedTasks = await Task.countDocuments({
            $or: [
                { createdBy: userId },
                { assignedTo: userId }
            ],
            status: 'completed'
        });

        const assignedTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: 'completed' }
        });

        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            dueDate: { $lt: new Date() },
            status: { $nin: ['completed', 'cancelled'] }
        });

        res.json({
            success: true,
            data: {
                stats: {
                    totalTasks,
                    completedTasks,
                    assignedTasks,
                    overdueTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    updatePreferences,
    changePassword,
    logout,
    getUserStats
};
