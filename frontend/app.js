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
let searchQuery = ''; // Tracks real-time keyword search filter

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
const sortSelect = document.getElementById('sort-select');
const taskSearchInput = document.getElementById('task-search-input');

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

// Helper function to check if due date is within the next 2 days (anchored to 2026-08-15)
function checkDueSoon(dueDateStr) {
    if (!dueDateStr) return false;
    const today = new Date('2026-08-15');
    const due = new Date(dueDateStr);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
}

// =========================================
// STRICT DOM RENDERING
// =========================================
function renderTasks() {
    taskListContainer.innerHTML = '';

    let filteredTasks = currentTasks;
    if (currentFilter === 'active') {
        filteredTasks = currentTasks.filter(t => t.status !== 'done');
    } else if (currentFilter === 'completed') {
        filteredTasks = currentTasks.filter(t => t.status === 'done');
    }

    if (searchQuery) {
        filteredTasks = filteredTasks.filter(t => t.title.toLowerCase().includes(searchQuery));
    }

    if (filteredTasks.length === 0) {
        const emptyEl = document.createElement('p');
        emptyEl.textContent = searchQuery ? `No tasks matching "${searchQuery}" found.` : `No ${currentFilter} tasks found for this project.`;
        emptyEl.style.color = 'var(--text-muted)';
        emptyEl.style.fontSize = '13px';
        taskListContainer.appendChild(emptyEl);
        return;
    }

    filteredTasks.forEach(task => {
        const taskEl = document.createElement('div');
        const statusClass = task.status === 'done' ? 'status-done' : '';
        const priorityClass = `priority-${task.priority || 'medium'}`;
        taskEl.className = `task-item ${priorityClass} ${statusClass}`;

        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';

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
            return;
        }

        // Title Row with Priority Badge Bubble placed right next to title
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.flexWrap = 'wrap';
        titleRow.style.gap = '8px';
        titleRow.style.marginBottom = '4px';

        const titleEl = document.createElement('h4');
        titleEl.textContent = task.title;
        titleEl.style.margin = '0';

        const priorityBadge = document.createElement('span');
        const priorityVal = task.priority ? task.priority.toLowerCase() : 'medium';
        priorityBadge.textContent = priorityVal.toUpperCase();
        priorityBadge.className = `priority-badge badge-${priorityVal}`;

        titleRow.appendChild(titleEl);
        titleRow.appendChild(priorityBadge);

        // Metadata Row with Due Soon Tag
        const metaEl = document.createElement('p');
        const isDueSoon = checkDueSoon(task.due_date);
        
        let metaHtml = `<span class="due-tag">Due: ${task.due_date || 'No date'}</span>`;
        if (isDueSoon) {
            metaHtml += `<span class="due-tag urgent">⚠️ Due Soon!</span>`;
        }
        const formattedStatus = task.status === 'in_progress' ? 'In Progress' : task.status.toUpperCase();
        metaHtml += ` | Status: ${formattedStatus}`;
        metaEl.innerHTML = metaHtml;

        contentDiv.appendChild(titleRow);
        contentDiv.appendChild(metaEl);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        if (task.status !== 'done') {
            const doneBtn = document.createElement('button');
            doneBtn.className = 'btn btn-secondary';
            doneBtn.textContent = 'Mark as Done';
            doneBtn.addEventListener('click', () => markTaskDone(task));
            actionsDiv.appendChild(doneBtn);
        } else {
            const reopenBtn = document.createElement('button');
            reopenBtn.className = 'btn btn-outline';
            reopenBtn.textContent = 'Reopen';
            reopenBtn.addEventListener('click', () => markTaskReopened(task));
            actionsDiv.appendChild(reopenBtn);
        }

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
// EVENT LISTENERS
// =========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        renderTasks();
    });
});

if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadTasks();
    });
}

if (taskSearchInput) {
    taskSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTasks();
    });
}

// Start Application
init();