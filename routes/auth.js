const express = require('express');
const {
    register,
    login,
    getMe,
    updateProfile,
    updatePreferences,
    changePassword,
    logout,
    getUserStats
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUser.register, register);
router.post('/login', validateUser.login, login);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.put('/me', validateUser.updateProfile, updateProfile);
router.put('/preferences', updatePreferences);
router.put('/change-password', changePassword);
router.post('/logout', logout);
router.get('/stats', getUserStats);

module.exports = router;
