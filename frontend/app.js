// =========================================
// STATE & CONFIGURATION
// =========================================
const API_BASE = 'http://127.0.0.1:8000';
let activeUserId = localStorage.getItem('loggedInUserId');
let activeUserName = localStorage.getItem('loggedInUserName');
let activeProjectId = null;
let currentTasks = [];
let currentFilter = 'all'; // 'all', 'active', 'completed'
let currentSort = ''; // '', 'priority', 'due_date'

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
const sortPriorityBtn = document.getElementById('sort-priority-btn');

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
        projectSelect.value = projects[0].id;
        activeProjectId = projects[0].id;
        loadTasks();
        loadProjectStats();
    }
}

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
// TASK LOGIC, CACHING & SORTING ALGORITHM
// =========================================
async function loadTasks() {
    if (!activeProjectId) return;

    let url = `${API_BASE}/tasks?project_id=${activeProjectId}`;
    if (currentSort) {
        url += `&sort_by=${currentSort}`;
    }

    const response = await fetch(url);
    currentTasks = await response.json();
    
    const cacheKey = `tasks_project_${activeProjectId}`;
    localStorage.setItem(cacheKey, JSON.stringify(currentTasks));
    renderTasks();
}

// =========================================
// STRICT DOM RENDERING WITH TAB FILTERING & INLINE EDITING
// =========================================
function renderTasks() {
    taskListContainer.innerHTML = '';

    // Filter tasks based on selected tab filter
    let filteredTasks = currentTasks;
    if (currentFilter === 'active') {
        filteredTasks = currentTasks.filter(t => t.status !== 'done');
    } else if (currentFilter === 'completed') {
        filteredTasks = currentTasks.filter(t => t.status === 'done');
    }

    if (filteredTasks.length === 0) {
        const emptyEl = document.createElement('p');
        emptyEl.textContent = `No ${currentFilter} tasks found for this project.`;
        emptyEl.style.color = '#64748B';
        emptyEl.style.fontSize = '14px';
        taskListContainer.appendChild(emptyEl);
        return;
    }

    filteredTasks.forEach(task => {
        const taskEl = document.createElement('div');
        const statusClass = task.status === 'done' ? 'status-done' : '';
        taskEl.className = `task-item priority-${task.priority} ${statusClass}`;

        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';

        // Check if this specific task is currently in inline edit mode
        if (task.isEditing) {
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'task-edit-input';
            editInput.value = task.title;
            contentDiv.appendChild(editInput);

            const editDateInput = document.createElement('input');
            editDateInput.type = 'date';
            editDateInput.className = 'task-edit-date';
            editDateInput.value = task.due_date || '';
            contentDiv.appendChild(editDateInput);

            const metaEl = document.createElement('p');
            const formattedStatus = task.status === 'in_progress' ? 'In Progress' : task.status.toUpperCase();
            metaEl.textContent = `Status: ${formattedStatus}`;
            contentDiv.appendChild(metaEl);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn btn-primary';
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', () => saveTaskEdit(task.id, editInput.value, editDateInput.value));

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-outline';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                task.isEditing = false;
                renderTasks();
            });

            actionsDiv.appendChild(saveBtn);
            actionsDiv.appendChild(cancelBtn);

            taskEl.appendChild(contentDiv);
            taskEl.appendChild(actionsDiv);
            taskListContainer.appendChild(taskEl);
            return; // Skip standard render for this item
        }

        // Standard Display Mode
        const titleEl = document.createElement('h4');
        titleEl.textContent = task.title;

        const metaEl = document.createElement('p');
        const formattedStatus = task.status === 'in_progress' ? 'In Progress' : task.status.toUpperCase();
        metaEl.textContent = `Due: ${task.due_date || 'No date'} | Status: ${formattedStatus}`;

        contentDiv.appendChild(titleEl);
        contentDiv.appendChild(metaEl);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        if (task.status !== 'done') {
            const doneBtn = document.createElement('button');
            doneBtn.className = 'btn btn-secondary';
            doneBtn.textContent = '✓ Done';
            doneBtn.addEventListener('click', () => markTaskDone(task));
            actionsDiv.appendChild(doneBtn);
        } else {
            const reopenBtn = document.createElement('button');
            reopenBtn.className = 'btn btn-outline';
            reopenBtn.textContent = '↺ Reopen';
            reopenBtn.addEventListener('click', () => markTaskReopened(task));
            actionsDiv.appendChild(reopenBtn);
        }

        // Only allow editing active tasks
        if (task.status !== 'done') {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-outline';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                task.isEditing = true;
                renderTasks();
            });
            actionsDiv.appendChild(editBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteTask(task.id)); 

        actionsDiv.appendChild(delBtn);

        taskEl.appendChild(contentDiv);
        taskEl.appendChild(actionsDiv);

        taskListContainer.appendChild(taskEl);
    });
}

// =========================================
// TASK CRUD & ACTIONS
// =========================================
addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    
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

// =========================================
// AI QUICK-ADD LOGIC (Commit #2)
// =========================================
const quickAddForm = document.getElementById('quick-add-form');
const quickAddInput = document.getElementById('quick-add-input');

if (quickAddForm) {
    quickAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = quickAddInput.value.trim();
        
        if (!text) {
            alert("Please type something for Magic Add.");
            return;
        }
        
        if (!activeProjectId) {
            alert("Please select or create a project first.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/tasks/quick-add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    project_id: parseInt(activeProjectId)
                })
            });

            if (!response.ok) throw new Error("Failed to quick-add task");

            quickAddInput.value = '';
            loadTasks();
            loadProjectStats();
        } catch (err) {
            alert(err.message);
        }
    });
}

async function markTaskDone(task) {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
    });
    loadTasks();
    loadProjectStats();
}

async function markTaskReopened(task) {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'todo' })
    });
    loadTasks();
    loadProjectStats();
}

async function saveTaskEdit(taskId, newTitle, newDueDate) {
    const trimmed = newTitle.trim();
    if (!trimmed) {
        alert("Task title cannot be empty.");
        return;
    }

    await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: trimmed,
            due_date: newDueDate || null 
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

// =========================================
// EVENT LISTENERS (Tabs & Sorting)
// =========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        renderTasks();
    });
});

if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener('click', () => {
        if (currentSort === '') {
            currentSort = 'priority';
            sortPriorityBtn.textContent = 'Sorted: Priority (O(N log N))';
            sortPriorityBtn.style.borderColor = 'var(--secondary)';
        } else if (currentSort === 'priority') {
            currentSort = 'due_date';
            sortPriorityBtn.textContent = 'Sorted: Due Date';
        } else {
            currentSort = '';
            sortPriorityBtn.textContent = 'Sort by Priority';
            sortPriorityBtn.style.borderColor = 'var(--border-color)';
        }
        loadTasks();
    });
}

// Start Application
init();