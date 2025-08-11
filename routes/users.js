const express = require('express');
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getActiveUsers,
    searchUsers
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateUser, validateId, validateQuery } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Search users (public to authenticated users)
router.get('/search', searchUsers);

// Get active users for task assignment
router.get('/active', getActiveUsers);

// User CRUD operations
router.route('/')
    .get(validateQuery.pagination, getUsers);

router.route('/:id')
    .get(validateId, getUser)
    .put(validateId, validateUser.updateProfile, updateUser)
    .delete(validateId, authorize('admin'), deleteUser);

// User statistics
router.get('/:id/stats', validateId, getUserStats);

module.exports = router;
