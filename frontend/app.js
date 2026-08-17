// =========================================
// STATE & CONFIGURATION
// =========================================
const API_BASE = 'https://taskflow-backend-rdcd.onrender.com';
let activeUserId = localStorage.getItem('loggedInUserId');
let activeUserName = localStorage.getItem('loggedInUserName');
let activeProjectId = null;
let currentTasks = [];
let currentFilter = 'all'; 
let currentSort = ''; 
let searchQuery = ''; 
let currentPage = 1;
const pageSize = 8; // Exactly 8 tasks per page

// =========================================
// BULLETPROOF EVENT BINDER
// =========================================
function bindEvent(id, eventType, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(eventType, callback);
    }
}

// =========================================
// FOOLPROOF AUTH TOGGLE (Called by HTML)
// =========================================
window.toggleAuth = function(view) {
    const loginBox = document.getElementById('login-container');
    const signupBox = document.getElementById('signup-container');
    const loginErr = document.getElementById('login-error');
    const signupErr = document.getElementById('signup-error');
    
    if (loginErr) loginErr.classList.add('hidden');
    if (signupErr) signupErr.classList.add('hidden');

    if (view === 'signup') {
        if (loginBox) loginBox.classList.add('hidden');
        if (signupBox) signupBox.classList.remove('hidden');
    } else {
        if (signupBox) signupBox.classList.add('hidden');
        if (loginBox) loginBox.classList.remove('hidden');
    }
};

function showAuth() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('user-profile').classList.add('hidden');
    toggleAuth('login');
}

function showDashboard() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('user-profile').classList.remove('hidden');
    document.getElementById('current-user-name').textContent = `Pod Member: ${activeUserName}`;
}

function logout() {
    localStorage.clear();
    activeUserId = null;
    activeUserName = null;
    activeProjectId = null;
    showAuth();
}

bindEvent('logout-btn', 'click', logout);

// =========================================
// AUTHENTICATION LOGIC (With Red Errors)
// =========================================
bindEvent('login-form', 'submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const loginError = document.getElementById('login-error');

    if (!email || !password) {
        loginError.innerHTML = "Both Email and Password are required!";
        loginError.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) throw new Error('Invalid Email or Password.');
        
        const user = await response.json();
        loginError.classList.add('hidden');
        
        activeUserId = user.id;
        activeUserName = user.name;
        localStorage.setItem('loggedInUserId', user.id);
        localStorage.setItem('loggedInUserName', user.name);
        
        showDashboard();
        await loadProjects();
        document.getElementById('login-form').reset();
    } catch (err) {
        loginError.innerHTML = err.message;
        loginError.classList.remove('hidden');
    }
});

bindEvent('signup-form', 'submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const signupError = document.getElementById('signup-error');

    if (!name || !email || !password) {
        signupError.innerHTML = "All fields are required to Register!";
        signupError.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        if (!response.ok) throw new Error('Email is already registered. Please Login.');
        
        const user = await response.json();
        signupError.classList.add('hidden');
        
        activeUserId = user.id;
        activeUserName = user.name;
        localStorage.setItem('loggedInUserId', user.id);
        localStorage.setItem('loggedInUserName', user.name);
        
        showDashboard();
        await loadProjects();
        document.getElementById('signup-form').reset();
    } catch (err) {
        signupError.innerHTML = err.message;
        signupError.classList.remove('hidden');
    }
});

// =========================================
// PROJECT LOGIC & DYNAMIC DELETE BUTTON
// =========================================
function updateDeleteButtonLabel() {
    const projectSelect = document.getElementById('project-select');
    const deleteBtn = document.getElementById('delete-project-btn');
    if (!projectSelect || !deleteBtn) return;

    if (projectSelect.selectedIndex >= 0 && activeProjectId) {
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        if (selectedOption && selectedOption.value !== "") {
            deleteBtn.textContent = `Delete "${selectedOption.text}"`;
            deleteBtn.style.display = 'inline-block'; // Show if project exists
            return;
        }
    }
    // Hide entirely if no valid project is selected or list is empty
    deleteBtn.style.display = 'none'; 
}

async function loadProjects(selectNewId = null) {
    try {
        const response = await fetch(`${API_BASE}/projects?owner_id=${activeUserId}`);
        
        if (!response.ok && (response.status === 404 || response.status === 401)) {
            logout();
            return;
        }

        const projects = await response.json();
        const projectSelect = document.getElementById('project-select');
        
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
        } else if (projects.length > 0 && !activeProjectId) {
            projectSelect.value = projects[0].id;
            activeProjectId = projects[0].id;
        } else if (projects.length === 0) {
            activeProjectId = null;
            currentTasks = [];
            document.getElementById('stat-total').textContent = 0;
            document.getElementById('stat-todo').textContent = 0;
            document.getElementById('stat-progress').textContent = 0;
            document.getElementById('stat-done').textContent = 0;
            renderTasks();
        }

        if (activeProjectId) {
            await loadTasks();
            await loadProjectStats();
        }
        updateDeleteButtonLabel();
    } catch (err) {
        console.error("Error loading projects:", err);
    }
}

bindEvent('create-project-btn', 'click', async () => {
    const input = document.getElementById('new-project-input');
    const name = input.value.trim();
    if (!name) { alert("Please enter a project name."); return; }

    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, owner_id: parseInt(activeUserId) })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.detail && errorData.detail.includes('not found')) {
                logout();
                return;
            }
            throw new Error("Failed to create project");
        }
        
        const newProject = await response.json();
        input.value = '';
        await loadProjects(newProject.id);
    } catch (err) {
        alert(err.message);
    }
});

// SAFE PROJECT DELETION
bindEvent('delete-project-btn', 'click', async () => {
    if (!activeProjectId) {
        alert("No active project selected to delete.");
        return;
    }
    const projectSelect = document.getElementById('project-select');
    const selectedOption = projectSelect.options[projectSelect.selectedIndex];
    const projName = selectedOption ? selectedOption.text : "this project";
    
    if (!confirm(`WARNING: Are you sure you want to completely delete "${projName}"? All tasks inside will be destroyed forever.`)) return;

    try {
        const response = await fetch(`${API_BASE}/projects/${activeProjectId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Backend could not delete project");
        
        activeProjectId = null;
        await loadProjects();
    } catch (err) {
        alert(err.message);
    }
});

bindEvent('project-select', 'change', (e) => {
    activeProjectId = e.target.value;
    currentPage = 1; 
    updateDeleteButtonLabel();
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
// TASK LOGIC & LISTING
// =========================================
async function loadTasks() {
    if (!activeProjectId) return;
    let url = `${API_BASE}/tasks?project_id=${activeProjectId}`;
    if (currentSort) { url += `&sort_by=${currentSort}`; }
    
    const response = await fetch(url);
    currentTasks = await response.json();
    renderTasks();
}

function checkDueSoon(dueDateStr) {
    if (!dueDateStr) return false;
    
    // Extract real date if the AI appended brackets: "next friday (2026-08-21)"
    let dateToParse = dueDateStr;
    const match = dueDateStr.match(/\((\d{4}-\d{2}-\d{2})\)/);
    if (match) dateToParse = match[1];
    
    const today = new Date();
    const due = new Date(dateToParse);
    
    // Fallback if raw text isn't a parsable date format
    if (isNaN(due)) return false; 
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
}

// =========================================
// STRICT DOM RENDERING WITH PAGINATION & EDIT BTN
// =========================================
function renderTasks() {
    const taskListContainer = document.getElementById('task-list-container');
    const paginationControls = document.getElementById('pagination-controls');
    taskListContainer.innerHTML = '';

    let filteredTasks = currentTasks;
    if (currentFilter === 'active') filteredTasks = currentTasks.filter(t => t.status !== 'done');
    else if (currentFilter === 'completed') filteredTasks = currentTasks.filter(t => t.status === 'done');

    if (searchQuery) filteredTasks = filteredTasks.filter(t => t.title.toLowerCase().includes(searchQuery));

    if (filteredTasks.length === 0) {
        const emptyEl = document.createElement('p');
        emptyEl.textContent = "No tasks found.";
        emptyEl.style.color = 'var(--text-muted)';
        taskListContainer.appendChild(emptyEl);
        if(paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    // Dynamic Pagination Logic (8 items per page)
    const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedTasks = filteredTasks.slice(startIndex, startIndex + pageSize);

    paginatedTasks.forEach(task => {
        const taskEl = document.createElement('div');
        const statusClass = task.status === 'done' ? 'status-done' : '';
        const priorityClass = `priority-${task.priority || 'medium'}`;
        taskEl.className = `task-item ${priorityClass} ${statusClass}`;

        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';

        // =========================================
        // INLINE EDITING MODE
        // =========================================
        if (task.isEditing) {
            const editContainer = document.createElement('div');
            editContainer.className = 'edit-form-container';

            // 1. Title Input Group
            const titleGroup = document.createElement('div');
            titleGroup.className = 'edit-group';
            titleGroup.innerHTML = '<label class="field-label">Task Title</label>';
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.value = task.title;
            titleGroup.appendChild(editInput);

            // Row for Priority and Date
            const rowDiv = document.createElement('div');
            rowDiv.className = 'edit-row';

            // 2. Priority Dropdown Group
            const priorityGroup = document.createElement('div');
            priorityGroup.className = 'edit-group';
            priorityGroup.innerHTML = '<label class="field-label">Priority</label>';
            const prioritySelect = document.createElement('select');
            prioritySelect.innerHTML = `
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High Priority</option>
            `;
            priorityGroup.appendChild(prioritySelect);

            // 3. Due Date Input Group
            const dateGroup = document.createElement('div');
            dateGroup.className = 'edit-group';
            dateGroup.innerHTML = '<label class="field-label">Due Date</label>';
            const editDateInput = document.createElement('input');
            editDateInput.type = 'date';
            
            // Extract pure YYYY-MM-DD if AI added bracket formatting
            let rawDate = task.due_date || '';
            const match = rawDate.match(/\((\d{4}-\d{2}-\d{2})\)/);
            if (match) rawDate = match[1];
            editDateInput.value = rawDate;
            
            dateGroup.appendChild(editDateInput);

            // Assemble layout
            rowDiv.appendChild(priorityGroup);
            rowDiv.appendChild(dateGroup);
            editContainer.appendChild(titleGroup);
            editContainer.appendChild(rowDiv);
            
            contentDiv.appendChild(editContainer);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';
            actionsDiv.style.alignItems = 'flex-end'; // Align buttons with the bottom inputs
            actionsDiv.style.paddingBottom = '4px';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn btn-primary';
            saveBtn.textContent = 'Save';
            // Pass the new priority parameter to the save function
            saveBtn.addEventListener('click', () => saveTaskEdit(task.id, editInput.value, editDateInput.value, prioritySelect.value));

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

        // =========================================
        // STANDARD DISPLAY MODE
        // =========================================
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
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

        const metaEl = document.createElement('p');
        const isDueSoon = task.status !== 'done' && checkDueSoon(task.due_date);
        
        // Removed hardcoded emoji so it doesn't double up with CSS
        let metaHtml = `<span class="due-tag">${task.due_date || 'No date'}</span>`;
        if (isDueSoon) metaHtml += `<span class="due-tag urgent">Due Soon!</span>`;
        
        let displayStatus = 'To Do';
        if (task.status === 'in_progress') displayStatus = 'In Progress';
        if (task.status === 'done') displayStatus = 'DONE';
        
        metaHtml += ` | Status: ${displayStatus}`;
        metaEl.innerHTML = metaHtml;

        contentDiv.appendChild(titleRow);
        contentDiv.appendChild(metaEl);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        if (task.status === 'todo') {
            const startBtn = document.createElement('button');
            startBtn.className = 'btn btn-primary';
            startBtn.textContent = 'Start';
            startBtn.addEventListener('click', () => markTaskInProgress(task));
            actionsDiv.appendChild(startBtn);
        } else if (task.status === 'in_progress') {
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

    if (filteredTasks.length > pageSize) {
        if (paginationControls) {
            paginationControls.classList.remove('hidden');
            document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
            const prevPageBtn = document.getElementById('prev-page-btn');
            const nextPageBtn = document.getElementById('next-page-btn');
            
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
            prevPageBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
            nextPageBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        }
    } else {
        if (paginationControls) paginationControls.classList.add('hidden');
    }
}

bindEvent('prev-page-btn', 'click', () => { if (currentPage > 1) { currentPage--; renderTasks(); }});
bindEvent('next-page-btn', 'click', () => { currentPage++; renderTasks(); });

// =========================================
// STRICT RED TEXT ADD TASK VALIDATION
// =========================================
bindEvent('add-task-form', 'submit', async (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const prioritySelect = document.getElementById('task-priority');
    const dueDateInput = document.getElementById('task-due-date');
    const taskFormError = document.getElementById('task-form-error');
    
    const title = titleInput.value.trim();
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;

    let errors = [];
    if (!title) errors.push("Task Title is missing.");
    if (!priority || priority === "Select Priority" || priority === "") errors.push("Priority is missing.");
    if (!dueDate) errors.push("Due Date is missing.");

    if (errors.length > 0) {
        if(taskFormError) {
            taskFormError.innerHTML = "❌ " + errors.join("<br>❌ ");
            taskFormError.classList.remove('hidden');
        }
        return; 
    }
    
    if(taskFormError) taskFormError.classList.add('hidden');
    
    if (!activeProjectId) {
        if(taskFormError) {
            taskFormError.innerHTML = "❌ Please select or create an Active Project first.";
            taskFormError.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                priority: priority,
                due_date: dueDate,
                status: "todo",
                project_id: parseInt(activeProjectId)
            })
        });

        if (!response.ok) throw new Error("Failed to add task to Database.");

        titleInput.value = '';
        prioritySelect.value = '';
        dueDateInput.value = '';
        await loadTasks();
        await loadProjectStats();
    } catch (err) {
        if(taskFormError) {
            taskFormError.innerHTML = `❌ System Error: ${err.message}`;
            taskFormError.classList.remove('hidden');
        }
    }
});

const quickAddForm = document.getElementById('quick-add-form');
if (quickAddForm) {
    quickAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('quick-add-input');
        const text = input.value.trim();
        if (!text || !activeProjectId) return;
        await fetch(`${API_BASE}/tasks/quick-add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, project_id: parseInt(activeProjectId) })
        });
        input.value = '';
        loadTasks();
        loadProjectStats();
    });
}

async function markTaskInProgress(task) { await fetch(`${API_BASE}/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' })}); loadTasks(); loadProjectStats(); }
async function markTaskDone(task) { await fetch(`${API_BASE}/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' })}); loadTasks(); loadProjectStats(); }
async function markTaskReopened(task) { await fetch(`${API_BASE}/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'todo' })}); loadTasks(); loadProjectStats(); }

async function saveTaskEdit(taskId, newTitle, newDueDate, newPriority) {
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
            due_date: newDueDate || null,
            priority: newPriority // Newly added field sent to the backend
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

// Filters & Sorting Triggers
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        currentPage = 1;
        renderTasks();
    });
});
bindEvent('sort-select', 'change', (e) => { currentSort = e.target.value; loadTasks(); });
bindEvent('task-search-input', 'input', (e) => { searchQuery = e.target.value.toLowerCase().trim(); currentPage = 1; renderTasks(); });

// Application Boot
if (activeUserId) {
    init();
} else {
    showAuth();
}