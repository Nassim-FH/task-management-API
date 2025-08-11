const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Make sure token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Token is valid but user no longer exists'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'User account is deactivated'
                });
            }

            // Add user to request
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);

                if (user && user.isActive) {
                    req.user = user;
                }
            } catch (error) {
                // Invalid token, but we continue without user
                console.log('Optional auth: Invalid token provided');
            }
        }

        next();
    } catch (error) {
        next();
    }
};

// Check if user owns resource or is admin
const ownershipOrAdmin = (resourceField = 'createdBy') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin can access everything
            if (req.user.role === 'admin') {
                return next();
            }

            // For creation endpoints, user automatically owns
            if (req.method === 'POST') {
                return next();
            }

            // For other methods, check ownership
            // This will be used with resource-specific middleware
            req.ownershipField = resourceField;
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error during authorization',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };
};

module.exports = {
    protect,
    authorize,
    optionalAuth,
    ownershipOrAdmin
};
