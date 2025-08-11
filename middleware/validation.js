const { validationResult, body, param, query } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }

    next();
};

// User validation rules
const validateUser = {
    register: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),

        body('email')
            .trim()
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

        body('role')
            .optional()
            .isIn(['user', 'admin', 'manager'])
            .withMessage('Invalid role'),

        handleValidationErrors
    ],

    login: [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('password')
            .notEmpty()
            .withMessage('Password is required'),

        handleValidationErrors
    ],

    updateProfile: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),

        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('phone')
            .optional()
            .isMobilePhone()
            .withMessage('Please provide a valid phone number'),

        body('department')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Department cannot exceed 100 characters'),

        handleValidationErrors
    ]
};

// Task validation rules
const validateTask = {
    create: [
        body('title')
            .trim()
            .notEmpty()
            .withMessage('Task title is required')
            .isLength({ min: 3, max: 100 })
            .withMessage('Title must be between 3 and 100 characters'),

        body('description')
            .trim()
            .notEmpty()
            .withMessage('Task description is required')
            .isLength({ min: 10, max: 1000 })
            .withMessage('Description must be between 10 and 1000 characters'),

        body('priority')
            .optional()
            .isIn(['low', 'medium', 'high', 'urgent'])
            .withMessage('Invalid priority level'),

        body('status')
            .optional()
            .isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled'])
            .withMessage('Invalid status'),

        body('category')
            .optional()
            .isIn(['bug', 'feature', 'improvement', 'task', 'research'])
            .withMessage('Invalid category'),

        body('dueDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid due date format')
            .custom((value) => {
                if (new Date(value) <= new Date()) {
                    throw new Error('Due date must be in the future');
                }
                return true;
            }),

        body('estimatedHours')
            .optional()
            .isNumeric()
            .withMessage('Estimated hours must be a number')
            .custom((value) => {
                if (value < 0 || value > 1000) {
                    throw new Error('Estimated hours must be between 0 and 1000');
                }
                return true;
            }),

        body('assignedTo')
            .optional()
            .isMongoId()
            .withMessage('Invalid user ID for assignment'),

        body('tags')
            .optional()
            .isArray()
            .withMessage('Tags must be an array'),

        body('tags.*')
            .optional()
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('Each tag must be between 1 and 20 characters'),

        handleValidationErrors
    ],

    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid task ID'),

        body('title')
            .optional()
            .trim()
            .isLength({ min: 3, max: 100 })
            .withMessage('Title must be between 3 and 100 characters'),

        body('description')
            .optional()
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('Description must be between 10 and 1000 characters'),

        body('status')
            .optional()
            .isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled'])
            .withMessage('Invalid status'),

        body('priority')
            .optional()
            .isIn(['low', 'medium', 'high', 'urgent'])
            .withMessage('Invalid priority level'),

        body('progress')
            .optional()
            .isNumeric()
            .withMessage('Progress must be a number')
            .custom((value) => {
                if (value < 0 || value > 100) {
                    throw new Error('Progress must be between 0 and 100');
                }
                return true;
            }),

        body('dueDate')
            .optional()
            .isISO8601()
            .withMessage('Invalid due date format'),

        body('estimatedHours')
            .optional()
            .isNumeric()
            .withMessage('Estimated hours must be a number')
            .custom((value) => {
                if (value < 0 || value > 1000) {
                    throw new Error('Estimated hours must be between 0 and 1000');
                }
                return true;
            }),

        body('actualHours')
            .optional()
            .isNumeric()
            .withMessage('Actual hours must be a number')
            .custom((value) => {
                if (value < 0) {
                    throw new Error('Actual hours cannot be negative');
                }
                return true;
            }),

        handleValidationErrors
    ],

    addComment: [
        param('id')
            .isMongoId()
            .withMessage('Invalid task ID'),

        body('text')
            .trim()
            .notEmpty()
            .withMessage('Comment text is required')
            .isLength({ min: 1, max: 500 })
            .withMessage('Comment must be between 1 and 500 characters'),

        handleValidationErrors
    ],

    addSubtask: [
        param('id')
            .isMongoId()
            .withMessage('Invalid task ID'),

        body('title')
            .trim()
            .notEmpty()
            .withMessage('Subtask title is required')
            .isLength({ min: 3, max: 100 })
            .withMessage('Subtask title must be between 3 and 100 characters'),

        handleValidationErrors
    ]
};

// Query validation
const validateQuery = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),

        query('sort')
            .optional()
            .isIn(['createdAt', '-createdAt', 'dueDate', '-dueDate', 'priority', '-priority', 'title', '-title'])
            .withMessage('Invalid sort parameter'),

        handleValidationErrors
    ],

    taskFilters: [
        query('status')
            .optional()
            .isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled'])
            .withMessage('Invalid status filter'),

        query('priority')
            .optional()
            .isIn(['low', 'medium', 'high', 'urgent'])
            .withMessage('Invalid priority filter'),

        query('assignedTo')
            .optional()
            .isMongoId()
            .withMessage('Invalid user ID for assignedTo filter'),

        query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Search query must be between 1 and 100 characters'),

        handleValidationErrors
    ]
};

// Generic ID validation
const validateId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid ID parameter'),

    handleValidationErrors
];

module.exports = {
    validateUser,
    validateTask,
    validateQuery,
    validateId,
    handleValidationErrors
};
