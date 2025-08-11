const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Task = require('./models/Task');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement');
        console.log('✅ MongoDB Connected for seeding');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    try {
        console.log('🗑️  Clearing existing data...');
        await Task.deleteMany({});
        await User.deleteMany({});

        console.log('👥 Creating sample users...');

        // Create sample users
        const users = [
            {
                name: 'Admin User',
                email: 'admin@example.com',
                password: await bcrypt.hash('admin123', 12),
                role: 'admin',
                department: 'Management',
                phone: '+1-555-0001'
            },
            {
                name: 'John Doe',
                email: 'john@example.com',
                password: await bcrypt.hash('password123', 12),
                role: 'user',
                department: 'Frontend Development',
                phone: '+1-555-0002'
            },
            {
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: await bcrypt.hash('password123', 12),
                role: 'manager',
                department: 'Backend Development',
                phone: '+1-555-0003'
            },
            {
                name: 'Mike Brown',
                email: 'mike@example.com',
                password: await bcrypt.hash('password123', 12),
                role: 'user',
                department: 'Quality Assurance',
                phone: '+1-555-0004'
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log(`✅ Created ${createdUsers.length} users`);

        console.log('📝 Creating sample tasks...');

        // Create sample tasks with various statuses and progress levels
        const tasks = [
            {
                title: 'Design System Implementation',
                description: 'Create a comprehensive design system with reusable components, color schemes, and typography guidelines for the entire application.',
                status: 'in-progress',
                priority: 'high',
                assignedTo: createdUsers[1]._id, // johndoe
                createdBy: createdUsers[0]._id,  // admin
                dueDate: new Date('2025-12-20'),
                tags: ['design', 'frontend', 'ui/ux'],
                progress: 65
            },
            {
                title: 'API Documentation',
                description: 'Write comprehensive API documentation including endpoints, request/response examples, and authentication guides.',
                status: 'completed',
                priority: 'medium',
                assignedTo: createdUsers[2]._id, // janesmith
                createdBy: createdUsers[0]._id,  // admin
                dueDate: new Date('2025-11-15'),
                tags: ['documentation', 'api', 'backend'],
                progress: 100
            },
            {
                title: 'User Authentication System',
                description: 'Implement secure user authentication with JWT tokens, password hashing, and role-based access control.',
                status: 'completed',
                priority: 'high',
                assignedTo: createdUsers[3]._id, // mikebrown
                createdBy: createdUsers[0]._id,  // admin
                dueDate: new Date('2025-10-30'),
                tags: ['authentication', 'security', 'backend'],
                progress: 100
            },
            {
                title: 'Database Migration Scripts',
                description: 'Create migration scripts for database schema updates and data transformations.',
                status: 'todo',
                priority: 'low',
                assignedTo: createdUsers[1]._id, // johndoe
                createdBy: createdUsers[2]._id,  // janesmith
                dueDate: new Date('2025-12-30'),
                tags: ['database', 'migration', 'backend'],
                progress: 0
            },
            {
                title: 'Real-time Notifications',
                description: 'Implement real-time notifications using Socket.IO for task updates, comments, and system alerts.',
                status: 'in-progress',
                priority: 'medium',
                assignedTo: createdUsers[2]._id, // janesmith
                createdBy: createdUsers[1]._id,  // johndoe
                dueDate: new Date('2025-12-10'),
                tags: ['real-time', 'websockets', 'notifications'],
                progress: 30
            },
            {
                title: 'Mobile Responsive Design',
                description: 'Ensure the application is fully responsive and works seamlessly on mobile devices and tablets.',
                status: 'in-progress',
                priority: 'high',
                assignedTo: createdUsers[3]._id, // mikebrown
                createdBy: createdUsers[0]._id,  // admin
                dueDate: new Date('2025-11-25'),
                tags: ['mobile', 'responsive', 'css', 'frontend'],
                progress: 80
            },
            {
                title: 'Performance Optimization',
                description: 'Optimize application performance by implementing caching, code splitting, and database query optimization.',
                status: 'todo',
                priority: 'medium',
                assignedTo: createdUsers[1]._id, // johndoe
                createdBy: createdUsers[3]._id,  // mikebrown
                dueDate: new Date('2026-01-15'),
                tags: ['performance', 'optimization', 'caching'],
                progress: 15
            },
            {
                title: 'Unit Testing Suite',
                description: 'Write comprehensive unit tests for all API endpoints and core functionality.',
                status: 'in-progress',
                priority: 'high',
                assignedTo: createdUsers[2]._id, // janesmith
                createdBy: createdUsers[0]._id,  // admin
                dueDate: new Date('2025-12-05'),
                tags: ['testing', 'quality-assurance', 'backend'],
                progress: 45
            },
            {
                title: 'Email Service Integration',
                description: 'Integrate email service for sending notifications, password resets, and task reminders.',
                status: 'todo',
                priority: 'low',
                assignedTo: createdUsers[3]._id, // mikebrown
                createdBy: createdUsers[2]._id,  // janesmith
                dueDate: new Date('2026-01-20'),
                tags: ['email', 'integration', 'notifications'],
                progress: 0
            },
            {
                title: 'Data Analytics Dashboard',
                description: 'Create an analytics dashboard showing task completion rates, user productivity metrics, and project insights.',
                status: 'todo',
                priority: 'medium',
                assignedTo: createdUsers[1]._id, // johndoe
                createdBy: createdUsers[0]._id,  // admin
                dueDate: new Date('2026-02-10'),
                tags: ['analytics', 'dashboard', 'visualization'],
                progress: 5
            }
        ];

        const createdTasks = await Task.insertMany(tasks);
        console.log(`✅ Created ${createdTasks.length} tasks`);

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`👥 Users: ${createdUsers.length}`);
        console.log(`📝 Tasks: ${createdTasks.length}`);
        console.log('\n🔑 Test Accounts:');
        console.log('Admin: admin@example.com / admin123');
        console.log('User 1: john@example.com / password123');
        console.log('User 2: jane@example.com / password123');
        console.log('User 3: mike@example.com / password123');
        console.log('\n📈 Task Status Distribution:');

        const statusCount = await Task.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        statusCount.forEach(item => {
            console.log(`${item._id}: ${item.count} tasks`);
        });

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
};

const runSeed = async () => {
    await connectDB();
    await seedDatabase();
};

// Run the seeder
if (require.main === module) {
    runSeed();
}

module.exports = { seedDatabase };
