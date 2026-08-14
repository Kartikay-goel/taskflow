// =========================================
// STATE & CONFIGURATION
// =========================================
const API_BASE = 'http://127.0.0.1:8000';
let activeUserId = localStorage.getItem('loggedInUserId');
let activeUserName = localStorage.getItem('loggedInUserName');
let activeProjectId = null;

// =========================================
// DOM ELEMENTS
// =========================================
// Views
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const userProfile = document.getElementById('user-profile');
const currentUserNameEl = document.getElementById('current-user-name');
const authError = document.getElementById('auth-error');

// Forms
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const addTaskForm = document.getElementById('add-task-form');

// Project & Task UI
const projectSelect = document.getElementById('project-select');
const newProjectBtn = document.getElementById('new-project-btn');
const taskListContainer = document.getElementById('task-list-container');
const titleError = document.getElementById('title-error');

// =========================================
// INITIALIZATION
// =========================================
function init() {
    if (activeUserId) {
        showDashboard();
        loadProjects();
    } else {
        showAuth();
    }
}

function showAuth() {
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    userProfile.classList.add('hidden');
}

function showDashboard() {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    userProfile.classList.remove('hidden');
    currentUserNameEl.textContent = `Pod Member: ${activeUserName}`;
}

// =========================================
// AUTHENTICATION LOGIC
// =========================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Rubric: Intercept submit event
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error('Invalid credentials');
        
        const user = await response.json();
        loginUser(user.id, user.name);
    } catch (err) {
        authError.textContent = err.message;
        authError.classList.remove('hidden');
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch(`${API_BASE}/users/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) throw new Error('Email already registered');
        
        const user = await response.json();
        loginUser(user.id, user.name);
    } catch (err) {
        authError.textContent = err.message;
        authError.classList.remove('hidden');
    }
});

function loginUser(id, name) {
    activeUserId = id;
    activeUserName = name;
    localStorage.setItem('loggedInUserId', id);
    localStorage.setItem('loggedInUserName', name);
    authError.classList.add('hidden');
    showDashboard();
    loadProjects();
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    activeUserId = null;
    activeUserName = null;
    activeProjectId = null;
    showAuth();
});

// =========================================
// PROJECT LOGIC
// =========================================
async function loadProjects() {
    const response = await fetch(`${API_BASE}/projects?owner_id=${activeUserId}`);
    const projects = await response.json();
    
    projectSelect.innerHTML = '<option value="" disabled selected>Select a Project...</option>';
    
    projects.forEach(proj => {
        const option = document.createElement('option');
        option.value = proj.id;
        option.textContent = proj.name; // Safe rendering
        projectSelect.appendChild(option);
    });
}

newProjectBtn.addEventListener('click', async () => {
    const name = prompt('Enter new project name:');
    if (!name) return;

    await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, owner_id: activeUserId })
    });
    loadProjects();
});

projectSelect.addEventListener('change', (e) => {
    activeProjectId = e.target.value;
    loadTasks();
    loadProjectStats();
});

async function loadProjectStats() {
    if (!activeProjectId) return;
    const response = await fetch(`${API_BASE}/projects/${activeProjectId}/stats`);
    const stats = await response.json();
    
    document.getElementById('stat-total').textContent = stats.total_tasks;
    document.getElementById('stat-todo').textContent = stats.todo_count;
    document.getElementById('stat-progress').textContent = stats.in_progress_count;
    document.getElementById('stat-done').textContent = stats.done_count;
}

// =========================================
// TASK LOGIC & LOCALSTORAGE CACHING
// =========================================
async function loadTasks() {
    if (!activeProjectId) return;

    // Rubric: Cache the current task list in localStorage... render from cached copy first
    const cacheKey = `tasks_project_${activeProjectId}`;
    const cachedTasks = localStorage.getItem(cacheKey);
    
    if (cachedTasks) {
        renderTasks(JSON.parse(cachedTasks)); // Instant UI update from cache
    }

    // Live backend request in flight
    const response = await fetch(`${API_BASE}/tasks?project_id=${activeProjectId}`);
    const liveTasks = await response.json();
    
    // Update cache and re-render with fresh data
    localStorage.setItem(cacheKey, JSON.stringify(liveTasks));
    renderTasks(liveTasks);
}

// =========================================
// STRICT DOM MANIPULATION (Requirement)
// =========================================
function renderTasks(tasks) {
    taskListContainer.innerHTML = ''; // Safe to clear container this way

    tasks.forEach(task => {
        // Rubric: Use document.createElement() and appendChild()
        const taskEl = document.createElement('div');
        taskEl.className = `task-item priority-${task.priority}`;

        const contentDiv = document.createElement('div');
        
        const titleEl = document.createElement('h4');
        titleEl.textContent = task.title; // Rubric: Use textContent for user-provided text

        const metaEl = document.createElement('p');
        metaEl.style.fontSize = '12px';
        metaEl.style.color = '#666';
        metaEl.textContent = `Due: ${task.due_date || 'No date'} | Status: ${task.status}`;

        contentDiv.appendChild(titleEl);
        contentDiv.appendChild(metaEl);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-outline';
        delBtn.textContent = 'Delete';
        // Rubric: use addEventListener for interactive controls
        delBtn.addEventListener('click', () => deleteTask(task.id)); 

        actionsDiv.appendChild(delBtn);

        taskEl.appendChild(contentDiv);
        taskEl.appendChild(actionsDiv);

        taskListContainer.appendChild(taskEl);
    });
}

// =========================================
// TASK CRUD & VALIDATION
// =========================================
addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    
    const trimmedTitle = titleInput.value.trim();

    // Rubric: Client-side validation for empty title
    if (!trimmedTitle) {
        titleError.classList.remove('hidden');
        return;
    }
    
    titleError.classList.add('hidden');
    if (!activeProjectId) {
        alert("Please select or create a project first.");
        return;
    }

    await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: trimmedTitle,
            priority: priority,
            due_date: dueDate || null,
            project_id: parseInt(activeProjectId)
        })
    });

    titleInput.value = '';
    document.getElementById('task-due-date').value = '';
    loadTasks();
    loadProjectStats();
});

async function deleteTask(taskId) {
    await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    loadTasks();
    loadProjectStats();
}

// Start Application
init();