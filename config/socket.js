const jwt = require('jsonwebtoken');
const User = require('../models/User');

const configureSocket = (io) => {
    // Middleware for socket authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`👤 User ${socket.user.name} connected (${socket.id})`);

        // Join user to their personal room
        socket.join(`user_${socket.userId}`);

        // Join user to team rooms if they're part of teams
        socket.user.teams?.forEach(teamId => {
            socket.join(`team_${teamId}`);
        });

        // Broadcast user online status
        socket.broadcast.emit('user:online', {
            userId: socket.userId,
            name: socket.user.name,
            email: socket.user.email
        });

        // Handle joining task rooms
        socket.on('join:task', (taskId) => {
            socket.join(`task_${taskId}`);
            console.log(`👤 User ${socket.user.name} joined task ${taskId}`);
        });

        // Handle leaving task rooms
        socket.on('leave:task', (taskId) => {
            socket.leave(`task_${taskId}`);
            console.log(`👤 User ${socket.user.name} left task ${taskId}`);
        });

        // Handle task updates
        socket.on('task:update', (data) => {
            // Broadcast to all users in the task room
            socket.to(`task_${data.taskId}`).emit('task:updated', data);
        });

        // Handle task comments
        socket.on('task:comment', (data) => {
            socket.to(`task_${data.taskId}`).emit('task:new_comment', {
                ...data,
                user: {
                    id: socket.userId,
                    name: socket.user.name,
                    email: socket.user.email
                },
                timestamp: new Date()
            });
        });

        // Handle typing indicators
        socket.on('task:typing', (data) => {
            socket.to(`task_${data.taskId}`).emit('task:user_typing', {
                userId: socket.userId,
                userName: socket.user.name,
                isTyping: data.isTyping
            });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`👤 User ${socket.user.name} disconnected`);

            // Broadcast user offline status
            socket.broadcast.emit('user:offline', {
                userId: socket.userId,
                name: socket.user.name,
                email: socket.user.email
            });
        });
    });

    // Helper functions to emit events from controllers
    io.emitTaskCreated = (task) => {
        io.emit('task:created', task);
    };

    io.emitTaskUpdated = (task) => {
        io.to(`task_${task._id}`).emit('task:updated', task);
    };

    io.emitTaskDeleted = (taskId) => {
        io.to(`task_${taskId}`).emit('task:deleted', { taskId });
    };

    io.emitTaskAssigned = (task, assignedUser) => {
        io.to(`user_${assignedUser._id}`).emit('task:assigned', {
            task,
            message: `You have been assigned to task: ${task.title}`
        });
    };

    return io;
};

module.exports = configureSocket;
