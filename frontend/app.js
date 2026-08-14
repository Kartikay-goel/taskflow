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
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const userProfile = document.getElementById('user-profile');
const currentUserNameEl = document.getElementById('current-user-name');
const authError = document.getElementById('auth-error');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const addTaskForm = document.getElementById('add-task-form');

const projectSelect = document.getElementById('project-select');
const newProjectInput = document.getElementById('new-project-input');
const createProjectBtn = document.getElementById('create-project-btn');

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
    e.preventDefault();
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
// PROJECT LOGIC & AUTO-OPEN
// =========================================
async function loadProjects(selectNewId = null) {
    const response = await fetch(`${API_BASE}/projects?owner_id=${activeUserId}`);
    const projects = await response.json();
    
    projectSelect.innerHTML = '<option value="" disabled selected>Select a Project...</option>';
    
    projects.forEach(proj => {
        const option = document.createElement('option');
        option.value = proj.id;
        option.textContent = proj.name;
        projectSelect.appendChild(option);
    });

    if (selectNewId) {
        projectSelect.value = selectNewId;
        activeProjectId = selectNewId;
        loadTasks();
        loadProjectStats();
    } else if (projects.length > 0 && !activeProjectId) {
        // Default to first project if none selected
        projectSelect.value = projects[0].id;
        activeProjectId = projects[0].id;
        loadTasks();
        loadProjectStats();
    }
}

// Inline Project Creation Handler (Requirement 1)
createProjectBtn.addEventListener('click', async () => {
    const name = newProjectInput.value.trim();
    if (!name) {
        alert("Please enter a project name.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, owner_id: parseInt(activeUserId) })
        });
        
        if (!response.ok) throw new Error("Failed to create project");
        const newProject = await response.json();
        
        newProjectInput.value = '';
        // Reload projects and automatically jump inside the newly created project
        await loadProjects(newProject.id);
    } catch (err) {
        alert(err.message);
    }
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
// TASK LOGIC & CACHING
// =========================================
async function loadTasks() {
    if (!activeProjectId) return;

    const cacheKey = `tasks_project_${activeProjectId}`;
    const cachedTasks = localStorage.getItem(cacheKey);
    if (cachedTasks) {
        renderTasks(JSON.parse(cachedTasks));
    }

    const response = await fetch(`${API_BASE}/tasks?project_id=${activeProjectId}`);
    const liveTasks = await response.json();
    
    localStorage.setItem(cacheKey, JSON.stringify(liveTasks));
    renderTasks(liveTasks);
}

// =========================================
// STRICT DOM RENDERING (With Edit & Delete)
// =========================================
function renderTasks(tasks) {
    taskListContainer.innerHTML = '';

    if (tasks.length === 0) {
        const emptyEl = document.createElement('p');
        emptyEl.textContent = 'No tasks found for this project. Add one using the form!';
        emptyEl.style.color = '#64748B';
        emptyEl.style.fontSize = '14px';
        taskListContainer.appendChild(emptyEl);
        return;
    }

    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item priority-${task.priority}`;

        const contentDiv = document.createElement('div');
        
        const titleEl = document.createElement('h4');
        titleEl.textContent = task.title;

        const metaEl = document.createElement('p');
        metaEl.textContent = `Due: ${task.due_date || 'No date'} | Status: ${task.status}`;

        contentDiv.appendChild(titleEl);
        contentDiv.appendChild(metaEl);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        // Edit Button (Requirement 4)
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editTask(task));

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteTask(task.id)); 

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);

        taskEl.appendChild(contentDiv);
        taskEl.appendChild(actionsDiv);

        taskListContainer.appendChild(taskEl);
    });
}

// =========================================
// TASK CRUD & CALENDAR DATE PICKER
// =========================================
addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value; // HTML5 Date Picker
    
    const trimmedTitle = titleInput.value.trim();

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
            status: "todo",
            project_id: parseInt(activeProjectId)
        })
    });

    titleInput.value = '';
    document.getElementById('task-due-date').value = '';
    loadTasks();
    loadProjectStats();
});

// Edit Task Handler
async function editTask(task) {
    const newTitle = prompt("Edit task title:", task.title);
    if (newTitle === null) return; // Cancelled
    
    const trimmed = newTitle.trim();
    if (!trimmed) {
        alert("Task title cannot be empty.");
        return;
    }

    const newStatus = prompt("Update status (todo, in_progress, done):", task.status);
    if (newStatus === null) return;

    await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: trimmed,
            status: newStatus.trim()
        })
    });

    loadTasks();
    loadProjectStats();
}

async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    loadTasks();
    loadProjectStats();
}

// Start Application
init();