const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get all tasks with filtering, sorting, and pagination
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            assignedTo,
            search,
            sort = '-createdAt',
            category
        } = req.query;

        // Build filter object
        const filter = { isArchived: false };

        // Add user-specific filtering (user can see tasks they created or are assigned to)
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            filter.$or = [
                { createdBy: req.user.id },
                { assignedTo: req.user.id }
            ];
        }

        // Add filters
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (category) filter.category = category;

        // Add search functionality
        if (search) {
            filter.$text = { $search: search };
        }

        // Calculate pagination
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        // Execute query
        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('comments.user', 'name email avatar')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber);

        // Get total count for pagination
        const total = await Task.countDocuments(filter);

        res.json({
            success: true,
            data: {
                tasks,
                pagination: {
                    current: pageNumber,
                    total: Math.ceil(total / limitNumber),
                    count: tasks.length,
                    totalTasks: total
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email avatar department')
            .populate('createdBy', 'name email avatar')
            .populate('comments.user', 'name email avatar');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if user has permission to view this task
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (task.createdBy._id.toString() !== req.user.id &&
                (!task.assignedTo || task.assignedTo._id.toString() !== req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        res.json({
            success: true,
            data: { task }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
    try {
        // Add user as creator
        req.body.createdBy = req.user.id;

        // Validate assigned user exists if provided
        if (req.body.assignedTo) {
            const assignedUser = await User.findById(req.body.assignedTo);
            if (!assignedUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Assigned user not found'
                });
            }
        }

        const task = await Task.create(req.body);

        // Populate the task before returning
        await task.populate('assignedTo', 'name email avatar');
        await task.populate('createdBy', 'name email');

        // Emit real-time event
        if (req.io) {
            req.io.emitTaskCreated(task);

            // Notify assigned user
            if (task.assignedTo) {
                req.io.emitTaskAssigned(task, task.assignedTo);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: { task }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (task.createdBy.toString() !== req.user.id &&
                (!task.assignedTo || task.assignedTo.toString() !== req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        // Validate assigned user exists if being updated
        if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
            const assignedUser = await User.findById(req.body.assignedTo);
            if (!assignedUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Assigned user not found'
                });
            }
        }

        // Store old assignedTo for notification
        const oldAssignedTo = task.assignedTo;

        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('comments.user', 'name email avatar');

        // Emit real-time event
        if (req.io) {
            req.io.emitTaskUpdated(task);

            // Notify if task was reassigned
            if (req.body.assignedTo && req.body.assignedTo !== oldAssignedTo?.toString()) {
                const newAssignedUser = await User.findById(req.body.assignedTo);
                req.io.emitTaskAssigned(task, newAssignedUser);
            }
        }

        res.json({
            success: true,
            message: 'Task updated successfully',
            data: { task }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (task.createdBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Only task creator, managers, or admins can delete tasks'
                });
            }
        }

        await Task.findByIdAndDelete(req.params.id);

        // Emit real-time event
        if (req.io) {
            req.io.emitTaskDeleted(req.params.id);
        }

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (task.createdBy.toString() !== req.user.id &&
                (!task.assignedTo || task.assignedTo.toString() !== req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        await task.addComment(req.user.id, req.body.text);

        // Populate the updated task
        await task.populate('comments.user', 'name email avatar');

        // Emit real-time event
        if (req.io) {
            req.io.to(`task_${task._id}`).emit('task:new_comment', {
                taskId: task._id,
                comment: task.comments[task.comments.length - 1]
            });
        }

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: {
                comment: task.comments[task.comments.length - 1]
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add subtask to task
// @route   POST /api/tasks/:id/subtasks
// @access  Private
const addSubtask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (task.createdBy.toString() !== req.user.id &&
                (!task.assignedTo || task.assignedTo.toString() !== req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        await task.addSubtask(req.body.title);

        // Emit real-time event
        if (req.io) {
            req.io.emitTaskUpdated(task);
        }

        res.status(201).json({
            success: true,
            message: 'Subtask added successfully',
            data: {
                subtask: task.subtasks[task.subtasks.length - 1]
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update subtask
// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @access  Private
const updateSubtask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const subtask = task.subtasks.id(req.params.subtaskId);

        if (!subtask) {
            return res.status(404).json({
                success: false,
                message: 'Subtask not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            if (task.createdBy.toString() !== req.user.id &&
                (!task.assignedTo || task.assignedTo.toString() !== req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        // Update subtask
        if (req.body.title !== undefined) subtask.title = req.body.title;
        if (req.body.completed !== undefined) subtask.completed = req.body.completed;

        await task.save();

        // Emit real-time event
        if (req.io) {
            req.io.emitTaskUpdated(task);
        }

        res.json({
            success: true,
            message: 'Subtask updated successfully',
            data: { subtask }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
const getTaskStats = async (req, res, next) => {
    try {
        const { timeframe = '30' } = req.query; // days
        const daysAgo = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

        // Build base filter
        const baseFilter = req.user.role === 'admin' || req.user.role === 'manager'
            ? {}
            : {
                $or: [
                    { createdBy: req.user.id },
                    { assignedTo: req.user.id }
                ]
            };

        // Get various statistics
        const [
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            tasksByPriority,
            tasksByStatus,
            recentTasks
        ] = await Promise.all([
            Task.countDocuments({ ...baseFilter, isArchived: false }),
            Task.countDocuments({ ...baseFilter, status: 'completed', isArchived: false }),
            Task.countDocuments({ ...baseFilter, status: 'in-progress', isArchived: false }),
            Task.countDocuments({
                ...baseFilter,
                dueDate: { $lt: new Date() },
                status: { $nin: ['completed', 'cancelled'] },
                isArchived: false
            }),

            // Group by priority
            Task.aggregate([
                { $match: { ...baseFilter, isArchived: false } },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),

            // Group by status
            Task.aggregate([
                { $match: { ...baseFilter, isArchived: false } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),

            // Recent task activity
            Task.countDocuments({
                ...baseFilter,
                createdAt: { $gte: daysAgo },
                isArchived: false
            })
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    total: totalTasks,
                    completed: completedTasks,
                    inProgress: inProgressTasks,
                    overdue: overdueTasks,
                    recent: recentTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                    byPriority: tasksByPriority.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    byStatus: tasksByStatus.reduce((acc, item) => {
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

module.exports = {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    addSubtask,
    updateSubtask,
    getTaskStats
};
