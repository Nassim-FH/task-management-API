# Task Management API

A modern, real-time task management API built with Node.js, Express, Socket.IO, and MongoDB. Perfect for portfolio demonstration.

## 🚀 Features

- **Real-time Updates**: Live task updates using Socket.IO
- **User Authentication**: JWT-based authentication system
- **Task Management**: Complete CRUD operations for tasks
- **User Management**: User registration and profile management
- **Team Collaboration**: Assign tasks to team members
- **Priority Levels**: Set task priorities (low, medium, high, urgent)
- **Status Tracking**: Track task progress (todo, in-progress, completed)
- **API Documentation**: Well-documented REST endpoints
- **Security**: Rate limiting, input validation, and security headers
- **Modern Architecture**: Clean code structure with separation of concerns

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for live updates
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: Express-validator
- **Development**: Nodemon for hot reloading

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🚀 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/taskmanager
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```

4. Start MongoDB service on your machine

5. Run the development server:
   ```bash
   npm run dev
   ```

## 📖 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Tasks
- `GET /api/tasks` - Get all tasks for authenticated user
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Users
- `GET /api/users` - Get all users (for task assignment)
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user profile

## 🔄 Real-time Events

- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `task:assigned` - Task assigned to user
- `user:online` - User came online
- `user:offline` - User went offline

## 📁 Project Structure

```
├── config/
│   ├── database.js      # Database configuration
│   └── socket.js        # Socket.IO configuration
├── controllers/
│   ├── authController.js
│   ├── taskController.js
│   └── userController.js
├── middleware/
│   ├── auth.js          # Authentication middleware
│   ├── validation.js    # Input validation
│   └── errorHandler.js  # Error handling
├── models/
│   ├── User.js          # User model
│   └── Task.js          # Task model
├── routes/
│   ├── auth.js          # Auth routes
│   ├── tasks.js         # Task routes
│   └── users.js         # User routes
├── utils/
│   └── helpers.js       # Utility functions
├── public/
│   ├── index.html       # Simple frontend demo
│   ├── style.css        # Styles
│   └── script.js        # Frontend JavaScript
├── .env                 # Environment variables
├── .gitignore          # Git ignore file
├── server.js           # Main server file
└── package.json        # Dependencies
```

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 🚀 Production Deployment

1. Set NODE_ENV to production
2. Use MongoDB Atlas for database
3. Set secure JWT secret
4. Configure proper CORS origins
5. Enable rate limiting
6. Use process manager like PM2

## 🤝 Contributing

This is a portfolio project, but feel free to suggest improvements!

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️**
