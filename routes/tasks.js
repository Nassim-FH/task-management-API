const express = require('express');
const {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    addSubtask,
    updateSubtask,
    getTaskStats
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');
const { validateTask, validateId, validateQuery } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Task CRUD operations
router.route('/')
    .get(validateQuery.pagination, validateQuery.taskFilters, getTasks)
    .post(validateTask.create, createTask);

router.route('/stats')
    .get(getTaskStats);

router.route('/:id')
    .get(validateId, getTask)
    .put(validateTask.update, updateTask)
    .delete(validateId, deleteTask);

// Task comments
router.route('/:id/comments')
    .post(validateTask.addComment, addComment);

// Task subtasks
router.route('/:id/subtasks')
    .post(validateTask.addSubtask, addSubtask);

router.route('/:id/subtasks/:subtaskId')
    .put(validateId, updateSubtask);

module.exports = router;
