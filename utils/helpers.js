const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Format error message
const formatError = (error) => {
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return errors.join(', ');
    }

    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return `${field} already exists`;
    }

    return error.message;
};

// Pagination helper
const paginate = (page = 1, limit = 10) => {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    return {
        skip,
        limit: limitNumber,
        page: pageNumber
    };
};

// Sort helper
const parseSort = (sortQuery) => {
    if (!sortQuery) return { createdAt: -1 };

    const sort = {};
    const fields = sortQuery.split(',');

    fields.forEach(field => {
        if (field.startsWith('-')) {
            sort[field.substring(1)] = -1;
        } else {
            sort[field] = 1;
        }
    });

    return sort;
};

// Filter helper for tasks
const buildTaskFilter = (query, userId, userRole) => {
    const filter = { isArchived: false };

    // Add user-specific filtering
    if (userRole !== 'admin' && userRole !== 'manager') {
        filter.$or = [
            { createdBy: userId },
            { assignedTo: userId }
        ];
    }

    // Add other filters
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.category) filter.category = query.category;

    // Add date filters
    if (query.dueDate) {
        filter.dueDate = { $lte: new Date(query.dueDate) };
    }

    // Add search
    if (query.search) {
        filter.$text = { $search: query.search };
    }

    return filter;
};

// Response helper
const sendResponse = (res, statusCode, success, message, data = null) => {
    const response = {
        success,
        message
    };

    if (data) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

// Date helpers
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    return new Date() > new Date(dueDate);
};

// Priority and status helpers
const getPriorityColor = (priority) => {
    const colors = {
        low: '#28a745',
        medium: '#ffc107',
        high: '#fd7e14',
        urgent: '#dc3545'
    };
    return colors[priority] || colors.medium;
};

const getStatusColor = (status) => {
    const colors = {
        todo: '#6c757d',
        'in-progress': '#007bff',
        review: '#17a2b8',
        completed: '#28a745',
        cancelled: '#dc3545'
    };
    return colors[status] || colors.todo;
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

// Generate random string
const generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Calculate completion percentage
const calculateProgress = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completed = subtasks.filter(task => task.completed).length;
    return Math.round((completed / subtasks.length) * 100);
};

// Clean object (remove undefined values)
const cleanObject = (obj) => {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined && obj[key] !== null) {
            cleaned[key] = obj[key];
        }
    });
    return cleaned;
};

module.exports = {
    generateToken,
    formatError,
    paginate,
    parseSort,
    buildTaskFilter,
    sendResponse,
    formatDate,
    formatDateTime,
    isOverdue,
    getPriorityColor,
    getStatusColor,
    isValidObjectId,
    generateRandomString,
    calculateProgress,
    cleanObject
};
