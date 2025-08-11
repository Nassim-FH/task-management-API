// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// Application State
let currentUser = null;
let currentSection = 'overview';
let socket = null;
let authToken = localStorage.getItem('token');

// DOM Elements
const authContainer = document.getElementById('authContainer');
const dashboard = document.getElementById('dashboard');
const navUser = document.getElementById('navUser');
const userName = document.getElementById('userName');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Initialize Application
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    initializeKeyboardShortcuts();
    initializeEasterEggs();

    if (authToken) {
        validateToken();
    } else {
        showAuthContainer();
    }
});

// Keyboard Shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        // Ctrl/Cmd + N = New Task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && currentUser) {
            e.preventDefault();
            openCreateTaskModal();
            showNotification('🚀 Ready to create something awesome!', 'info');
        }

        // Ctrl/Cmd + / = Help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showKeyboardShortcuts();
        }

        // Escape = Close modals
        if (e.key === 'Escape') {
            closeModal();
        }

        // Ctrl/Cmd + K = Quick search (future feature)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            showNotification('🔍 Quick search coming soon!', 'info');
        }
    });
}

// Easter Eggs
function initializeEasterEggs() {
    let konamiCode = [];
    const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up Up Down Down Left Right Left Right B A

    document.addEventListener('keydown', function (e) {
        konamiCode.push(e.keyCode);
        if (konamiCode.length > 10) konamiCode.shift();

        if (konamiCode.join('') === konami.join('')) {
            activateEasterEgg();
        }
    });

    // Click counter for logo
    let clickCount = 0;
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function () {
            clickCount++;
            if (clickCount === 7) {
                showNotification('🎉 You found the secret! Have some confetti!', 'success');
                createConfetti();
                clickCount = 0;
            }
        });
    }
}

function activateEasterEgg() {
    showNotification('🎮 Konami Code activated! You are now a Task Master!', 'success');
    document.body.style.filter = 'hue-rotate(180deg)';
    setTimeout(() => {
        document.body.style.filter = '';
    }, 3000);
}

function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                pointer-events: none;
                z-index: 10000;
                border-radius: 50%;
                animation: fall 3s linear forwards;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }, i * 50);
    }
}

function showKeyboardShortcuts() {
    showNotification(`
        🎯 Keyboard Shortcuts:<br>
        • Ctrl+N: New Task<br>
        • Ctrl+/: Show this help<br>
        • Escape: Close modals<br>
        • Ctrl+K: Quick search (soon!)<br>
        • Click logo 7 times for surprise 🎉
    `, 'info', 8000);
}

// Event Listeners
function initializeEventListeners() {
    // Auth form handlers
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('authSwitchBtn').addEventListener('click', toggleAuthMode);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation handlers
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Task form handler
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);

    // Filter handlers
    document.getElementById('statusFilter').addEventListener('change', filterTasks);
    document.getElementById('priorityFilter').addEventListener('change', filterTasks);

    // Modal handlers
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('taskModal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            authToken = result.data.token;
            localStorage.setItem('token', authToken);
            currentUser = result.data.user;
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            authToken = result.data.token;
            localStorage.setItem('token', authToken);
            currentUser = result.data.user;
            showToast('Account created successfully!', 'success');
            showDashboard();
        } else {
            if (result.errors) {
                const errorMessages = result.errors.map(err => err.message).join(', ');
                showToast(errorMessages, 'error');
            } else {
                showToast(result.message, 'error');
            }
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function validateToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.data.user;
            showDashboard();
        } else {
            localStorage.removeItem('token');
            authToken = null;
            showAuthContainer();
        }
    } catch (error) {
        localStorage.removeItem('token');
        authToken = null;
        showAuthContainer();
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    authToken = null;
    currentUser = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    showAuthContainer();
    showToast('Logged out successfully!', 'success');
}

function toggleAuthMode() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitchBtn = document.getElementById('authSwitchBtn');

    if (loginForm.style.display === 'none') {
        // Switch to login
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        authTitle.textContent = 'Sign In';
        authSubtitle.textContent = 'Welcome back! Please sign in to your account.';
        authSwitchText.innerHTML = 'Don\'t have an account? ';
        authSwitchBtn.textContent = 'Sign up';
    } else {
        // Switch to register
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Join us! Please fill in the information below.';
        authSwitchText.innerHTML = 'Already have an account? ';
        authSwitchBtn.textContent = 'Sign in';
    }
}

// UI State Functions
function showAuthContainer() {
    authContainer.style.display = 'flex';
    dashboard.style.display = 'none';
    navUser.style.display = 'none';
}

function showDashboard() {
    authContainer.style.display = 'none';
    dashboard.style.display = 'flex';
    navUser.style.display = 'flex';
    userName.textContent = currentUser.name;

    initializeSocket();
    loadUserData();
    loadDashboardData();
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Socket.IO Integration
function initializeSocket() {
    if (!authToken) return;

    socket = io({
        auth: {
            token: authToken
        }
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        showToast('Connected to real-time updates', 'success');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('task:created', (task) => {
        showToast(`New task created: ${task.title}`, 'info');
        if (currentSection === 'tasks' || currentSection === 'overview') {
            loadDashboardData();
        }
    });

    socket.on('task:updated', (task) => {
        showToast(`Task updated: ${task.title}`, 'info');
        if (currentSection === 'tasks' || currentSection === 'overview') {
            loadDashboardData();
        }
    });

    socket.on('task:deleted', (data) => {
        showToast('Task deleted', 'info');
        if (currentSection === 'tasks' || currentSection === 'overview') {
            loadDashboardData();
        }
    });

    socket.on('task:assigned', (data) => {
        showToast(data.message, 'info');
        if (currentSection === 'tasks' || currentSection === 'overview') {
            loadDashboardData();
        }
    });

    socket.on('user:online', (user) => {
        console.log(`${user.name} came online`);
    });

    socket.on('user:offline', (user) => {
        console.log(`${user.name} went offline`);
    });
}

// Navigation
function handleNavigation(e) {
    e.preventDefault();

    const section = e.currentTarget.dataset.section;
    if (section === currentSection) return;

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // Show corresponding section
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    const sectionElement = document.getElementById(`${section}Section`);
    if (sectionElement) {
        sectionElement.style.display = 'block';
        currentSection = section;

        // Load section-specific data
        loadSectionData(section);
    }
}

function loadSectionData(section) {
    switch (section) {
        case 'overview':
            loadDashboardData();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'create':
            loadActiveUsers();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Data Loading Functions
async function loadUserData() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();
        if (result.success) {
            updateUserStats(result.data.stats);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadDashboardData() {
    try {
        showWelcomeMessage();

        const [statsResponse, tasksResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/tasks/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE_URL}/tasks?limit=5&sort=-createdAt`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);

        const [statsResult, tasksResult] = await Promise.all([
            statsResponse.json(),
            tasksResponse.json()
        ]);

        if (statsResult.success) {
            updateDashboardStats(statsResult.data.stats);
        }

        if (tasksResult.success) {
            updateRecentTasks(tasksResult.data.tasks);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function showWelcomeMessage() {
    const currentHour = new Date().getHours();
    let greeting, emoji;

    if (currentHour < 12) {
        greeting = "Good morning";
        emoji = "🌅";
    } else if (currentHour < 17) {
        greeting = "Good afternoon";
        emoji = "☀️";
    } else {
        greeting = "Good evening";
        emoji = "🌆";
    }

    const messages = [
        `${greeting}, ${currentUser?.name}! Ready to crush some tasks? ${emoji}`,
        `Hey there, productivity champion! ${emoji}`,
        `Welcome back, task master! Time to get things done! ${emoji}`,
        `${greeting}! Let's make today awesome! ${emoji}`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Only show welcome message once per session
    if (!sessionStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            showNotification(randomMessage, 'info', 4000);
        }, 1000);
        sessionStorage.setItem('welcomeShown', 'true');
    }
}

async function loadTasks() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;

    let url = `${API_BASE_URL}/tasks?`;
    const params = new URLSearchParams();

    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);

    url += params.toString();

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();
        if (result.success) {
            displayTasks(result.data.tasks);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks', 'error');
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();
        if (result.success) {
            displayUsers(result.data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

async function loadActiveUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/active`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();
        if (result.success) {
            populateAssigneeSelect(result.data.users);
        }
    } catch (error) {
        console.error('Error loading active users:', error);
    }
}

// Task Management
async function handleCreateTask(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Clean up empty values
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            delete data[key];
        }
    });

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Task created successfully!', 'success');
            e.target.reset();

            // Switch to tasks view
            document.querySelector('[data-section="tasks"]').click();
        } else {
            if (result.errors) {
                const errorMessages = result.errors.map(err => err.message).join(', ');
                showToast(errorMessages, 'error');
            } else {
                showToast(result.message, 'error');
            }
        }
    } catch (error) {
        showToast('Error creating task', 'error');
    } finally {
        showLoading(false);
    }
}

async function viewTaskDetails(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const result = await response.json();
        if (result.success) {
            displayTaskModal(result.data.task);
        }
    } catch (error) {
        console.error('Error loading task details:', error);
        showToast('Error loading task details', 'error');
    }
}

// UI Update Functions
function updateDashboardStats(stats) {
    document.getElementById('totalTasks').textContent = stats.total || 0;
    document.getElementById('completedTasks').textContent = stats.completed || 0;
    document.getElementById('inProgressTasks').textContent = stats.inProgress || 0;
    document.getElementById('overdueTasks').textContent = stats.overdue || 0;
}

function updateRecentTasks(tasks) {
    const container = document.getElementById('recentTasksList');
    container.innerHTML = '';

    if (tasks.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent tasks found.</p>';
        return;
    }

    tasks.forEach(task => {
        const taskElement = createTaskCard(task, true);
        container.appendChild(taskElement);
    });
}

function displayTasks(tasks) {
    const container = document.getElementById('tasksList');
    container.innerHTML = '';

    if (tasks.length === 0) {
        container.innerHTML = '<p class="text-muted">No tasks found.</p>';
        return;
    }

    tasks.forEach(task => {
        const taskElement = createTaskCard(task);
        container.appendChild(taskElement);
    });
}

function displayUsers(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p class="text-muted">No users found.</p>';
        return;
    }

    users.forEach(user => {
        const userElement = createUserCard(user);
        container.appendChild(userElement);
    });
}

function createTaskCard(task, compact = false) {
    const div = document.createElement('div');
    div.className = compact ? 'task-card compact' : 'task-card';
    div.onclick = () => viewTaskDetails(task._id);

    const priorityClass = getPriorityBadgeClass(task.priority);
    const statusClass = getStatusBadgeClass(task.status);
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    const assignedTo = task.assignedTo ? task.assignedTo.name : 'Unassigned';

    div.innerHTML = `
        <div class="task-header">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="badge ${priorityClass}">${task.priority}</span>
                <span class="badge ${statusClass}">${task.status.replace('-', ' ')}</span>
                <span><i class="fas fa-calendar"></i> ${dueDate}</span>
            </div>
        </div>
        <div class="task-body">
            <p class="task-description">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</p>
            ${task.tags && task.tags.length > 0 ? `
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        <div class="task-footer">
            <div class="task-assignee">
                <i class="fas fa-user"></i>
                ${assignedTo}
            </div>
            <div class="task-progress">
                <div class="task-progress-bar">
                    <div class="task-progress-fill" style="width: ${task.progress || 0}%"></div>
                </div>
                <div class="progress-text">${task.progress || 0}% Complete</div>
                ${!compact ? `
                    <div class="progress-quick-actions" style="margin-top: 0.5rem;">
                        <button class="btn-quick-progress" onclick="event.stopPropagation(); quickUpdateProgress('${task._id}', 25)" title="25%">25%</button>
                        <button class="btn-quick-progress" onclick="event.stopPropagation(); quickUpdateProgress('${task._id}', 50)" title="50%">50%</button>
                        <button class="btn-quick-progress" onclick="event.stopPropagation(); quickUpdateProgress('${task._id}', 75)" title="75%">75%</button>
                        <button class="btn-quick-progress" onclick="event.stopPropagation(); quickUpdateProgress('${task._id}', 100)" title="Complete">✓</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    return div;
}

function createUserCard(user) {
    const div = document.createElement('div');
    div.className = 'user-card';

    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    div.innerHTML = `
        <div class="user-avatar">${initials}</div>
        <div class="user-name">${user.name}</div>
        <div class="user-role">${user.role}</div>
        <div class="user-stats">
            <div class="user-stat">
                <strong>0</strong>
                <span>Tasks</span>
            </div>
            <div class="user-stat">
                <strong>${user.department || 'N/A'}</strong>
                <span>Department</span>
            </div>
            <div class="user-stat">
                <strong>${user.isActive ? 'Active' : 'Inactive'}</strong>
                <span>Status</span>
            </div>
        </div>
    `;

    return div;
}

function displayTaskModal(task) {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = task.title;

    const priorityClass = getPriorityBadgeClass(task.priority);
    const statusClass = getStatusBadgeClass(task.status);
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    const assignedTo = task.assignedTo ? task.assignedTo.name : 'Unassigned';
    const createdBy = task.createdBy ? task.createdBy.name : 'Unknown';
    const createdAt = new Date(task.createdAt).toLocaleDateString();

    modalBody.innerHTML = `
        <div class="task-details">
            <div class="task-meta mb-3">
                <span class="badge ${priorityClass}">${task.priority}</span>
                <span class="badge ${statusClass}">${task.status.replace('-', ' ')}</span>
            </div>
            
            <div class="task-info mb-4">
                <p><strong>Description:</strong></p>
                <p>${task.description}</p>
            </div>
            
            <div class="task-metadata">
                <div class="row mb-2">
                    <div class="col"><strong>Assigned To:</strong> ${assignedTo}</div>
                    <div class="col"><strong>Created By:</strong> ${createdBy}</div>
                </div>
                <div class="row mb-2">
                    <div class="col"><strong>Due Date:</strong> ${dueDate}</div>
                    <div class="col"><strong>Created:</strong> ${createdAt}</div>
                </div>
                <div class="row mb-2">
                    <div class="col"><strong>Category:</strong> ${task.category}</div>
                    <div class="col">
                        <strong>Progress:</strong> 
                        <span id="progressValue">${task.progress || 0}%</span>
                    </div>
                </div>
                
                <!-- Progress Update Section -->
                <div class="progress-update-section mb-3" style="border: 1px solid #dee2e6; padding: 1rem; border-radius: 0.375rem; background: #f8f9fa;">
                    <label for="progressSlider"><strong>Update Progress:</strong></label>
                    <input type="range" 
                           id="progressSlider" 
                           min="0" 
                           max="100" 
                           value="${task.progress || 0}" 
                           class="form-range" 
                           style="width: 100%; margin: 0.5rem 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #6c757d;">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                    <button class="btn btn-outline btn-sm mt-2" id="markCompleteBtn">
                        <i class="fas fa-check"></i> Mark as Complete
                    </button>
                </div>
            </div>
            
            ${task.tags && task.tags.length > 0 ? `
                <div class="task-tags mb-3">
                    <strong>Tags:</strong>
                    ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            ${task.subtasks && task.subtasks.length > 0 ? `
                <div class="subtasks mb-3">
                    <strong>Subtasks:</strong>
                    <ul>
                        ${task.subtasks.map(subtask => `
                            <li>${subtask.completed ? '✅' : '⭕'} ${subtask.title}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${task.comments && task.comments.length > 0 ? `
                <div class="comments">
                    <strong>Comments:</strong>
                    ${task.comments.map(comment => `
                        <div class="comment mb-2">
                            <strong>${comment.user.name}:</strong>
                            <p>${comment.text}</p>
                            <small class="text-muted">${new Date(comment.createdAt).toLocaleString()}</small>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    modal.style.display = 'flex';

    // Add event listeners after modal content is created
    const progressSlider = document.getElementById('progressSlider');
    const markCompleteBtn = document.getElementById('markCompleteBtn');

    if (progressSlider) {
        console.log('Progress slider found, attaching events'); // Debug log

        progressSlider.addEventListener('input', function () {
            console.log('Slider input event:', this.value); // Debug log
            // Update display in real-time as user drags
            const progressValue = document.getElementById('progressValue');
            if (progressValue) {
                progressValue.textContent = `${this.value}%`;
            }
        });

        progressSlider.addEventListener('change', function () {
            console.log('Slider change event:', this.value); // Debug log
            updateTaskProgress(task._id, this.value);
        });
    } else {
        console.log('Progress slider not found!'); // Debug log
    }

    if (markCompleteBtn) {
        console.log('Mark complete button found, attaching event'); // Debug log
        markCompleteBtn.addEventListener('click', function () {
            console.log('Mark complete button clicked'); // Debug log
            quickSetProgress(task._id, 100);
        });
    } else {
        console.log('Mark complete button not found!'); // Debug log
    }
}

function openCreateTaskModal() {
    // Focus on the create task section
    handleNavigation({ target: { dataset: { section: 'create' } } });

    // Add a fun animation to the form
    const createTaskForm = document.getElementById('createTaskForm');
    if (createTaskForm) {
        createTaskForm.style.transform = 'scale(1.02)';
        createTaskForm.style.transition = 'transform 0.2s ease';
        setTimeout(() => {
            createTaskForm.style.transform = 'scale(1)';
        }, 200);
    }

    // Focus on the title field
    const titleField = document.getElementById('taskTitle');
    if (titleField) {
        titleField.focus();
    }
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function populateAssigneeSelect(users) {
    const select = document.getElementById('taskAssignee');
    select.innerHTML = '<option value="">Unassigned</option>';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id;
        option.textContent = `${user.name} (${user.role})`;
        select.appendChild(option);
    });
}

// Helper Functions
function getPriorityBadgeClass(priority) {
    const classes = {
        low: 'badge-success',
        medium: 'badge-warning',
        high: 'badge-info',
        urgent: 'badge-danger'
    };
    return classes[priority] || 'badge-secondary';
}

function getStatusBadgeClass(status) {
    const classes = {
        'todo': 'badge-secondary',
        'in-progress': 'badge-primary',
        'review': 'badge-info',
        'completed': 'badge-success',
        'cancelled': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
}

function filterTasks() {
    loadTasks();
}

// Progress Update Functions
async function updateTaskProgress(taskId, newProgress) {
    const progressValue = parseInt(newProgress);

    console.log('Updating task progress:', taskId, progressValue); // Debug log

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                progress: progressValue
            })
        });

        const result = await response.json();

        console.log('Progress update response:', result); // Debug log

        if (result.success) {
            // Update the progress display
            const progressValueElement = document.getElementById('progressValue');
            if (progressValueElement) {
                progressValueElement.textContent = `${progressValue}%`;
            }

            // Show toast notification
            showToast(`Progress updated to ${progressValue}%`, 'success');

            // Refresh tasks if we're on the tasks page
            if (currentSection === 'tasks' || currentSection === 'overview') {
                setTimeout(() => {
                    loadDashboardData();
                }, 500);
            }
        } else {
            showToast(result.message || 'Failed to update progress', 'error');
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        showToast('Error updating progress', 'error');
    }
} async function quickSetProgress(taskId, progress) {
    console.log('Quick setting progress:', taskId, progress); // Debug log

    const slider = document.getElementById('progressSlider');
    if (slider) {
        slider.value = progress;
        // Update the visual display immediately
        const progressValueElement = document.getElementById('progressValue');
        if (progressValueElement) {
            progressValueElement.textContent = `${progress}%`;
        }
    }

    await updateTaskProgress(taskId, progress);
}

// Simple progress update function for task cards
window.quickUpdateProgress = async (taskId, progress) => {
    console.log('Quick updating progress for task:', taskId, 'to', progress);
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ progress: progress })
        });

        if (response.ok) {
            const updatedTask = await response.json();
            console.log('Task progress updated successfully:', updatedTask);

            // Update the task card immediately
            const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskCard) {
                const progressFill = taskCard.querySelector('.task-progress-fill');
                const progressText = taskCard.querySelector('.progress-text');

                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${progress}% Complete`;
            }

            showNotification(`Progress updated to ${progress}%`, 'success');
        } else {
            throw new Error('Failed to update progress');
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        showNotification('Failed to update progress', 'error');
    }
};

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <p>${message}</p>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}
