const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxLength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Task description is required'],
        trim: true,
        maxLength: [1000, 'Description cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'completed', 'cancelled'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['bug', 'feature', 'improvement', 'task', 'research'],
        default: 'task'
    },
    assignedTo: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: false
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        validate: {
            validator: function (value) {
                return !value || value > Date.now();
            },
            message: 'Due date must be in the future'
        }
    },
    estimatedHours: {
        type: Number,
        min: [0, 'Estimated hours cannot be negative'],
        max: [1000, 'Estimated hours cannot exceed 1000']
    },
    actualHours: {
        type: Number,
        min: [0, 'Actual hours cannot be negative'],
        default: 0
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    attachments: [{
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true,
            maxLength: [500, 'Comment cannot exceed 500 characters']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    subtasks: [{
        title: {
            type: String,
            required: true,
            trim: true
        },
        completed: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    progress: {
        type: Number,
        min: [0, 'Progress cannot be less than 0'],
        max: [100, 'Progress cannot exceed 100'],
        default: 0
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for days until due date
taskSchema.virtual('daysUntilDue').get(function () {
    if (!this.dueDate) return null;

    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
});

// Virtual for task completion percentage based on subtasks
taskSchema.virtual('completionPercentage').get(function () {
    if (this.subtasks.length === 0) return this.progress;

    const completedSubtasks = this.subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual to check if task is overdue
taskSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.status === 'completed') return false;
    return new Date() > this.dueDate;
});

// Pre-save middleware to update completion date
taskSchema.pre('save', function (next) {
    // Set completion date when task is marked as completed
    if (this.isModified('status')) {
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
            this.progress = 100;
        } else if (this.status !== 'completed' && this.completedAt) {
            this.completedAt = undefined;
        }
    }

    // Update last activity
    if (this.isModified()) {
        this.lastActivity = new Date();
    }

    next();
});

// Static method to get tasks by status
taskSchema.statics.getTasksByStatus = function (status) {
    return this.find({ status, isArchived: false })
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function () {
    return this.find({
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] },
        isArchived: false
    })
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');
};

// Static method to get tasks by priority
taskSchema.statics.getTasksByPriority = function (priority) {
    return this.find({ priority, isArchived: false })
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1 });
};

// Method to add comment
taskSchema.methods.addComment = function (userId, text) {
    this.comments.push({
        user: userId,
        text: text,
        createdAt: new Date()
    });
    return this.save();
};

// Method to add subtask
taskSchema.methods.addSubtask = function (title) {
    this.subtasks.push({
        title: title,
        completed: false,
        createdAt: new Date()
    });
    return this.save();
};

// Indexes for better performance
taskSchema.index({ status: 1, isArchived: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ lastActivity: -1 });

// Text index for search functionality
taskSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text'
});

module.exports = mongoose.model('Task', taskSchema);
