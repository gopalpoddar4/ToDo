import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, off } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// ==========================================================================
// FIREBASE CONFIGURATION
// ==========================================================================
// IMPORTANT: Replace the empty strings in this object with your actual 
// Firebase Project configuration details. Do not alter the variable name.
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyD-jblMMWozVO7O6lx-e3KmmbxOnv_mvGI",
    authDomain: "to-do-gopal.firebaseapp.com",
    databaseURL: "https://to-do-gopal-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "to-do-gopal",
    storageBucket: "to-do-gopal.firebasestorage.app",
    messagingSenderId: "945629673294",
    appId: "1:945629673294:web:3e3893c06624779e9b901f",
    measurementId: "G-XXN63WBKFZ"
};

// Initialize Firebase
let app, auth, db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getDatabase(app);
} catch (error) {
    console.error("Firebase Initialization Error:", error);
    alert("Firebase failed to initialize. Please check your firebaseConfig inside script.js.");
}

// ==========================================================================
// APPLICATION STATE
// ==========================================================================
let currentUser = null;
let selectedDateKey = getLocalDateKey(new Date()); // Format: YYYY-MM-DD
let currentDbListenerRef = null;
let tasksData = {};
let taskToDeleteId = null;

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const els = {
    // Views
    appLoading: document.getElementById('app-loading'),
    authView: document.getElementById('auth-view'),
    dashboardView: document.getElementById('dashboard-view'),

    // Auth UI
    authForm: document.getElementById('auth-form'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    btnLogin: document.getElementById('btn-login'),
    btnSignup: document.getElementById('btn-signup'),
    linkForgotPass: document.getElementById('link-forgot-password'),
    userEmail: document.getElementById('user-email'),
    btnLogout: document.getElementById('btn-logout'),

    // Theme
    btnTheme: document.getElementById('btn-theme'),

    // Date UI
    dateStrip: document.getElementById('date-strip'),
    displayDate: document.getElementById('display-date'),
    displayDateBadge: document.getElementById('display-date-badge'),
    btnCalendar: document.getElementById('btn-calendar'),
    calendarInput: document.getElementById('calendar-input'),

    // Progress UI
    progressText: document.getElementById('progress-text'),
    progressPercentText: document.getElementById('progress-percent-text'),
    progressBarFill: document.getElementById('progress-bar-fill'),

    // Tasks UI
    taskList: document.getElementById('task-list'),
    tasksLoading: document.getElementById('tasks-loading'),
    tasksEmpty: document.getElementById('tasks-empty'),
    btnAddTaskFab: document.getElementById('btn-add-task-fab'),

    // Task Modal
    taskModal: document.getElementById('task-modal'),
    taskForm: document.getElementById('task-form'),
    modalTitle: document.getElementById('modal-title'),
    taskIdInput: document.getElementById('task-id'),
    taskTitleInput: document.getElementById('task-title-input'),
    taskDescInput: document.getElementById('task-desc-input'),
    taskTimeInput: document.getElementById('task-time-input'),
    taskPriorityInput: document.getElementById('task-priority-input'),
    btnSaveTask: document.getElementById('btn-save-task'),
    btnClosesModal: document.querySelectorAll('.btn-close-modal'),

    // Confirm Delete Modal
    confirmModal: document.getElementById('confirm-modal'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),

    // Global
    toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// UTILITIES (DATE / TIME)
// ==========================================================================

/**
 * Gets a reliable local date key (YYYY-MM-DD) avoiding UTC conversion bugs.
 * @param {Date} dateObj
 * @returns {string}
 */
function getLocalDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD safely into a local Date object.
 * @param {string} dateString 
 * @returns {Date}
 */
function parseLocalDateKey(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function isToday(dateKey) {
    return dateKey === getLocalDateKey(new Date());
}

function formatDateDisplay(dateKey) {
    const dateObj = parseLocalDateKey(dateKey);
    return dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = 'ri-information-line';
    if (type === 'success') icon = 'ri-check-line';
    if (type === 'error') icon = 'ri-error-warning-line';

    toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHTML(message)}</span>`;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function init() {
    initTheme();
    setupEventListeners();
    generateDateStrip();
    updateDateHeader();

    // Firebase Auth Observer
    onAuthStateChanged(auth, (user) => {
        els.appLoading.classList.add('hidden');
        if (user) {
            currentUser = user;
            els.userEmail.textContent = user.email;
            els.authView.classList.add('hidden');
            els.dashboardView.classList.remove('hidden');

            // Automatically select today on fresh login if not already set
            loadTasksForDate(selectedDateKey);
        } else {
            currentUser = null;
            els.authView.classList.remove('hidden');
            els.dashboardView.classList.add('hidden');

            // Cleanup on logout
            detachCurrentListener();
            tasksData = {};
            els.taskList.innerHTML = '';
            els.passwordInput.value = '';
        }
    });
}

// ==========================================================================
// THEME
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = els.btnTheme.querySelector('i');
    icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Theme
    els.btnTheme.addEventListener('click', toggleTheme);

    // Auth
    els.btnLogin.addEventListener('click', handleLogin);
    els.btnSignup.addEventListener('click', handleSignup);
    els.btnLogout.addEventListener('click', handleLogout);
    els.linkForgotPass.addEventListener('click', handleForgotPassword);
    els.authForm.addEventListener('submit', (e) => e.preventDefault());

    // Date & Calendar
    els.calendarInput.addEventListener('change', (e) => {
        if (e.target.value) {
            changeSelectedDate(e.target.value);
            generateDateStrip();
        }
    });

    // Modal Interactions
    els.btnAddTaskFab.addEventListener('click', () => openTaskModal());
    els.btnClosesModal.forEach(btn => btn.addEventListener('click', closeModals));
    els.taskForm.addEventListener('submit', handleSaveTask);

    // Delete Confirmation
    els.btnCancelDelete.addEventListener('click', closeModals);
    els.btnConfirmDelete.addEventListener('click', confirmDeleteTask);
}

// ==========================================================================
// AUTHENTICATION LOGIC
// ==========================================================================
async function handleLogin(e) {
    e.preventDefault();
    const email = els.emailInput.value.trim();
    const password = els.passwordInput.value;
    if (!email || !password) return showToast('Please enter email and password', 'error');

    try {
        setAuthLoading(true);
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showToast(getAuthErrorMessage(error.code), 'error');
    } finally {
        setAuthLoading(false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = els.emailInput.value.trim();
    const password = els.passwordInput.value;
    if (!email || !password) return showToast('Please enter email and password', 'error');

    try {
        setAuthLoading(true);
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('Account created successfully', 'success');
    } catch (error) {
        showToast(getAuthErrorMessage(error.code), 'error');
    } finally {
        setAuthLoading(false);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        showToast('Error logging out', 'error');
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = els.emailInput.value.trim();
    if (!email) return showToast('Please enter your email first to reset password', 'error');

    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset email sent', 'success');
    } catch (error) {
        showToast(getAuthErrorMessage(error.code), 'error');
    }
}

function setAuthLoading(isLoading) {
    els.btnLogin.disabled = isLoading;
    els.btnSignup.disabled = isLoading;
    els.btnLogin.innerHTML = isLoading ? '<div class="spinner small"></div>' : 'Sign In';
}

function getAuthErrorMessage(code) {
    switch (code) {
        case 'auth/invalid-email': return 'Invalid email format.';
        case 'auth/user-not-found': return 'User not found.';
        case 'auth/wrong-password': return 'Incorrect password.';
        case 'auth/invalid-credential': return 'Invalid credentials.';
        case 'auth/email-already-in-use': return 'Email already in use.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        default: return 'Authentication error. Please try again.';
    }
}

// ==========================================================================
// DATE NAVIGATION LOGIC
// ==========================================================================
function generateDateStrip() {
    els.dateStrip.innerHTML = '';
    const centerDateObj = parseLocalDateKey(selectedDateKey);

    // Generate dates: 7 days before, 14 days after
    for (let i = -7; i <= 14; i++) {
        const d = new Date(centerDateObj);
        d.setDate(d.getDate() + i);
        const dateKey = getLocalDateKey(d);

        const isSelected = dateKey === selectedDateKey;
        const today = isToday(dateKey);

        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
        const dayNum = d.getDate();

        const dateEl = document.createElement('div');
        dateEl.className = `date-item ${isSelected ? 'selected' : ''} ${today ? 'is-today' : ''}`;
        dateEl.innerHTML = `
            <span class="day-name">${dayName}</span>
            <span class="day-num">${dayNum}</span>
        `;

        dateEl.addEventListener('click', () => changeSelectedDate(dateKey, dateEl));
        els.dateStrip.appendChild(dateEl);
    }

    // Center selected item smoothly
    setTimeout(() => {
        const selectedEl = els.dateStrip.querySelector('.selected');
        if (selectedEl) {
            selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 100);
}

function changeSelectedDate(newDateKey, clickedElement = null) {
    if (selectedDateKey === newDateKey) return; // Ignore if same

    selectedDateKey = newDateKey;
    els.calendarInput.value = selectedDateKey;

    // Visual update
    document.querySelectorAll('.date-item').forEach(el => el.classList.remove('selected'));
    if (clickedElement) {
        clickedElement.classList.add('selected');
        clickedElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
        generateDateStrip();
    }

    updateDateHeader();

    // UI transition - Optimistic clearing
    els.taskList.innerHTML = '';
    els.tasksEmpty.classList.add('hidden');
    els.tasksLoading.classList.remove('hidden');
    tasksData = {};
    updateProgressUI();

    loadTasksForDate(selectedDateKey);
}

function updateDateHeader() {
    els.displayDate.textContent = formatDateDisplay(selectedDateKey);

    const todayObj = parseLocalDateKey(getLocalDateKey(new Date()));
    const selectedObj = parseLocalDateKey(selectedDateKey);
    const diffDays = Math.round((selectedObj - todayObj) / (1000 * 60 * 60 * 24));

    els.displayDateBadge.classList.remove('hidden');
    if (diffDays === 0) {
        els.displayDateBadge.textContent = 'TODAY';
    } else if (diffDays === -1) {
        els.displayDateBadge.textContent = 'YESTERDAY';
    } else if (diffDays === 1) {
        els.displayDateBadge.textContent = 'TOMORROW';
    } else if (diffDays < 0) {
        els.displayDateBadge.textContent = `${Math.abs(diffDays)} DAYS AGO`;
    } else {
        els.displayDateBadge.textContent = `IN ${diffDays} DAYS`;
    }
}

// ==========================================================================
// FIREBASE REALTIME DATABASE LISTENER
// ==========================================================================
function detachCurrentListener() {
    if (currentDbListenerRef) {
        off(currentDbListenerRef);
        currentDbListenerRef = null;
    }
}

function loadTasksForDate(dateKey) {
    if (!currentUser) return;

    detachCurrentListener();

    const dbPath = `users/${currentUser.uid}/todos/${dateKey}`;
    currentDbListenerRef = ref(db, dbPath);

    // Attach date-scoped listener
    onValue(currentDbListenerRef, (snapshot) => {
        // Critical: Guard against race conditions during rapid date switching
        if (dateKey !== selectedDateKey) return;

        els.tasksLoading.classList.add('hidden');
        const data = snapshot.val();

        if (data) {
            tasksData = data;
            renderTasks();
            updateProgressUI();
        } else {
            tasksData = {};
            els.taskList.innerHTML = '';
            els.tasksEmpty.classList.remove('hidden');
            updateProgressUI();
        }
    }, (error) => {
        if (dateKey === selectedDateKey) {
            els.tasksLoading.classList.add('hidden');
            showToast('Error loading tasks. Please try again.', 'error');
            console.error(error);
        }
    });
}

// ==========================================================================
// TASK RENDERING & PROGRESS
// ==========================================================================
function renderTasks() {
    els.taskList.innerHTML = '';
    const tasksArray = Object.entries(tasksData).map(([id, task]) => ({ id, ...task }));

    if (tasksArray.length === 0) {
        els.tasksEmpty.classList.remove('hidden');
        return;
    }

    els.tasksEmpty.classList.add('hidden');

    // Sort logic: Incomplete first, then completed. Sub-sort by time or creation.
    tasksArray.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return (a.createdAt || 0) - (b.createdAt || 0);
    });

    tasksArray.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card card fade-in ${task.completed ? 'completed' : ''}`;

        const timeHtml = task.time ? `<span class="task-meta-item"><i class="ri-time-line"></i> ${formatTimeDisplay(task.time)}</span>` : '';
        const priorityHtml = `<span class="task-meta-item"><div class="priority-dot priority-${task.priority}"></div> ${task.priority}</span>`;

        card.innerHTML = `
            <div class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Complete Task">
            </div>
            <div class="task-content">
                <h4 class="task-title">${escapeHTML(task.title)}</h4>
                ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
                <div class="task-meta">
                    ${priorityHtml}
                    ${timeHtml}
                </div>
            </div>
            <div class="task-actions">
                <button class="icon-btn btn-edit-task" aria-label="Edit Task">
                    <i class="ri-pencil-line"></i>
                </button>
                <button class="icon-btn btn-delete-task" aria-label="Delete Task">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;

        // Attach handlers directly to avoid event delegation complexity
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('change', (e) => toggleTaskCompletion(task.id, e.target.checked));

        const editBtn = card.querySelector('.btn-edit-task');
        editBtn.addEventListener('click', () => openTaskModal(task));

        const deleteBtn = card.querySelector('.btn-delete-task');
        deleteBtn.addEventListener('click', () => openDeleteConfirm(task.id));

        els.taskList.appendChild(card);
    });
}

function updateProgressUI() {
    const tasksArray = Object.values(tasksData);
    const total = tasksArray.length;
    const completed = tasksArray.filter(t => t.completed).length;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    els.progressText.textContent = `${completed} of ${total} tasks completed`;
    els.progressPercentText.textContent = `${percentage}%`;
    els.progressBarFill.style.width = `${percentage}%`;
}

// ==========================================================================
// TASK CRUD OPERATIONS
// ==========================================================================
function openTaskModal(task = null) {
    els.taskForm.reset();
    els.taskIdInput.value = '';

    if (task) {
        els.modalTitle.textContent = 'Edit Task';
        els.taskIdInput.value = task.id;
        els.taskTitleInput.value = task.title;
        els.taskDescInput.value = task.description || '';
        els.taskTimeInput.value = task.time || '';
        els.taskPriorityInput.value = task.priority || 'Medium';
    } else {
        els.modalTitle.textContent = 'Add Task';
        els.taskPriorityInput.value = 'Medium';
    }

    els.taskModal.classList.remove('hidden');
    els.taskTitleInput.focus();
}

function closeModals() {
    els.taskModal.classList.add('hidden');
    els.confirmModal.classList.add('hidden');
    taskToDeleteId = null;
}

async function handleSaveTask(e) {
    e.preventDefault();
    if (!currentUser) return;

    const id = els.taskIdInput.value;
    const title = els.taskTitleInput.value.trim();
    const description = els.taskDescInput.value.trim();
    const time = els.taskTimeInput.value;
    const priority = els.taskPriorityInput.value;

    if (!title) return showToast('Task title is required', 'error');

    const taskData = {
        title,
        description,
        time,
        priority,
        updatedAt: Date.now()
    };

    els.btnSaveTask.disabled = true;
    els.btnSaveTask.textContent = 'Saving...';

    try {
        const dbPath = `users/${currentUser.uid}/todos/${selectedDateKey}`;

        if (id) {
            // Update
            const taskRef = ref(db, `${dbPath}/${id}`);
            await update(taskRef, taskData);
            showToast('Task updated successfully', 'success');
        } else {
            // Create
            const dateRef = ref(db, dbPath);
            const newTaskRef = push(dateRef);
            await set(newTaskRef, {
                ...taskData,
                completed: false,
                createdAt: Date.now(),
                order: Date.now() // Simple default ordering
            });
            showToast('Task added successfully', 'success');
        }
        closeModals();
    } catch (error) {
        showToast('Error saving task', 'error');
        console.error(error);
    } finally {
        els.btnSaveTask.disabled = false;
        els.btnSaveTask.textContent = 'Save Task';
    }
}

async function toggleTaskCompletion(taskId, isCompleted) {
    if (!currentUser) return;

    try {
        const taskRef = ref(db, `users/${currentUser.uid}/todos/${selectedDateKey}/${taskId}`);
        await update(taskRef, { completed: isCompleted, updatedAt: Date.now() });
    } catch (error) {
        showToast('Error updating task state', 'error');
        renderTasks(); // Revert optimistic UI
    }
}

function openDeleteConfirm(taskId) {
    taskToDeleteId = taskId;
    els.confirmModal.classList.remove('hidden');
}

async function confirmDeleteTask() {
    if (!currentUser || !taskToDeleteId) return;

    els.btnConfirmDelete.disabled = true;
    els.btnConfirmDelete.textContent = 'Deleting...';

    try {
        const taskRef = ref(db, `users/${currentUser.uid}/todos/${selectedDateKey}/${taskToDeleteId}`);
        await remove(taskRef);
        showToast('Task deleted', 'success');
        closeModals();
    } catch (error) {
        showToast('Error deleting task', 'error');
    } finally {
        els.btnConfirmDelete.disabled = false;
        els.btnConfirmDelete.textContent = 'Delete';
    }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', init);
