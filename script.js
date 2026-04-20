// App State
let types = [];
let tasks = [];
let events = [];
let eventOnlyTypes = [];

// Continuous Scroll State
let viewStartDate = new Date();
let currentSelectedMonth = viewStartDate.getMonth();
let currentSelectedYear = viewStartDate.getFullYear();

// DYNAMIC LAYOUT STATE (This was missing!)
let isMobileMode = false;
let isMobilePortrait = false;

// Modal State Variables
let targetEventDate = null; 
let targetEventId = null;

const PRESET_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#fd79a8', '#f368e0', '#00cec9', '#badc58', '#d35400', '#2c3e50'];
let activeColorTypeId = null;

// --- FIREBASE AUTHENTICATION ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// PASTE YOUR FIREBASE CONFIG HERE:
const firebaseConfig = {
  apiKey: "AIzaSyBDLQx_4ubu-4cfGKW_9-LEJ9CZ7FltNv0",
  authDomain: "dynamic-cal.firebaseapp.com",
  projectId: "dynamic-cal",
  storageBucket: "dynamic-cal.firebasestorage.app",
  messagingSenderId: "100721725657",
  appId: "1:100721725657:web:249aa3e30d522a68252ec8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUserId = null; 

// DOM Elements
const taskListContainer = document.getElementById('task-list-container');
const calendarGrid = document.getElementById('calendar-grid');
const sidebarContent = document.getElementById('sidebar-content');
const todaysTasksList = document.getElementById('todays-tasks-list');
const sidebar = document.getElementById('sidebar');

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileOverlay = document.getElementById('mobile-overlay');

const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

const eventModal = document.getElementById('event-modal');
const eventNameInput = document.getElementById('event-name');
const eventTypeSelect = document.getElementById('event-type-select');
const customTypeFields = document.getElementById('custom-type-fields');
const customTypeName = document.getElementById('custom-type-name');
const eventColorInput = document.getElementById('event-color');
const modalTitle = document.getElementById('modal-title');
const deleteEventBtn = document.getElementById('delete-event-btn');

const deadlineModal = document.getElementById('deadline-modal');
const addDeadlineBtn = document.getElementById('add-deadline-btn');
const cancelDeadlineBtn = document.getElementById('cancel-deadline-btn');
const saveDeadlineBtn = document.getElementById('save-deadline-btn');
const deadlineDaySel = document.getElementById('deadline-day');
const deadlineMonthSel = document.getElementById('deadline-month');
const deadlineYearSel = document.getElementById('deadline-year');
const deadlineTypeSel = document.getElementById('deadline-type-select');
const deadlineNameInput = document.getElementById('deadline-name');

const dayViewModal = document.getElementById('day-view-modal');
const closeDayViewBtn = document.getElementById('close-day-view-btn');
const dayViewTitle = document.getElementById('day-view-title');
const dayViewEvents = document.getElementById('day-view-events');
const dayViewTasks = document.getElementById('day-view-tasks');

const startupModal = document.getElementById('startup-modal');
const overdueTasksList = document.getElementById('overdue-tasks-list');
const doNotAskCheckbox = document.getElementById('do-not-ask-checkbox');
const ignoreOverdueBtn = document.getElementById('ignore-overdue-btn');
const shiftOverdueBtn = document.getElementById('shift-overdue-btn');

const colorPickerModal = document.getElementById('color-picker-modal');
const colorGrid = document.getElementById('color-grid');
const closeColorPickerBtn = document.getElementById('close-color-picker-btn');
const hiddenCustomColorInput = document.getElementById('hidden-custom-color');

// --- MODULE INITIALIZATION ---
// Modules automatically wait for HTML, so we just run this directly!
checkLayoutMode(); 
initializeCalendarState();
setupEventListeners(); 

const storedTheme = localStorage.getItem('plannerTheme');
if (storedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('moon-icon').style.display = 'none';
    document.getElementById('sun-icon').style.display = 'block';
}

// Listen for Login/Logout state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        document.getElementById('login-screen').style.display = 'none';
        console.log(`Success! Logged in as: ${user.displayName}`);
        loadData(); // Fetch cloud data
    } else {
        currentUserId = null;
        document.getElementById('login-screen').style.display = 'flex';
        types = []; tasks = []; events = []; eventOnlyTypes = [];
        renderTasks(); renderCalendar(); renderTodaysTasksWidget();
    }
});

// Handle the Login Button Click
document.getElementById('google-login-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
        console.error("Login failed:", error.message);
    });
});

window.addEventListener('resize', checkLayoutMode);

// --- DYNAMIC GEOMETRY MATH ---
function checkLayoutMode() {
    const H = window.innerHeight;
    const W = window.innerWidth;
    const thresholdWidth = Math.floor((7 * (H - 100) / 5) + 380);
    const newIsMobile = W < thresholdWidth || W <= 768; 
    const newIsPortrait = newIsMobile && (H > W);
    
    let layoutChanged = false;
    
    if (newIsMobile !== isMobileMode) {
        isMobileMode = newIsMobile;
        if (isMobileMode) document.body.classList.add('mobile-mode');
        else document.body.classList.remove('mobile-mode');
        layoutChanged = true;
    }
    
    if (newIsPortrait !== isMobilePortrait) {
        isMobilePortrait = newIsPortrait;
        if (isMobilePortrait) document.body.classList.add('mobile-portrait');
        else document.body.classList.remove('mobile-portrait');
        layoutChanged = true;
    }
    
    if (layoutChanged && currentUserId) {
        renderCalendar();
    }
}

// --- Utility Functions ---
function getTodayStr() {
    const realToday = new Date();
    return `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(realToday.getDate()).padStart(2, '0')}`;
}

function getTranslucentColor(hex, opacity = 0.5) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getModeColor(hex) {
    if (!hex) hex = '#ccc';
    const isDark = document.body.classList.contains('dark-mode');
    return isDark ? getTranslucentColor(hex, 0.5) : hex;
}

function restoreFocus(taskId) {
    setTimeout(() => {
        const input = document.querySelector(`input.task-input[data-id="${taskId}"]`);
        if (input) {
            input.focus();
            input.selectionStart = input.selectionEnd = input.value.length;
        }
    }, 0);
}

// --- Color Picker Logic ---
function getUnusedColor() {
    const usedColors = types.map(t => t.color.toLowerCase());
    for (let color of PRESET_COLORS) {
        if (!usedColors.includes(color.toLowerCase())) {
            return color;
        }
    }
    return PRESET_COLORS[0];
}

function openColorPickerModal(typeId, currentColor) {
    activeColorTypeId = typeId;
    colorGrid.innerHTML = '';

    PRESET_COLORS.forEach(color => {
        const circle = document.createElement('div');
        circle.className = `color-circle ${color.toLowerCase() === currentColor.toLowerCase() ? 'selected' : ''}`;
        circle.style.backgroundColor = color;
        circle.addEventListener('click', () => applyColorToType(color));
        colorGrid.appendChild(circle);
    });

    const customBtn = document.createElement('div');
    customBtn.className = 'custom-color-btn';
    customBtn.innerHTML = '+';
    customBtn.title = "Custom Color";
    customBtn.addEventListener('click', () => {
        hiddenCustomColorInput.value = currentColor;
        hiddenCustomColorInput.click();
    });
    colorGrid.appendChild(customBtn);

    colorPickerModal.classList.remove('hidden');
}

function applyColorToType(hexColor) {
    if (activeColorTypeId) {
        const type = types.find(t => t.id === activeColorTypeId);
        if (type) {
            type.color = hexColor;
            saveData();
            renderTasks();
            renderCalendar();
            renderTodaysTasksWidget();
        }
    }
    colorPickerModal.classList.add('hidden');
}

// --- CLOUD DATABASE FUNCTIONS ---

async function saveData() {
    if (!auth.currentUser) return;
    
    const token = await auth.currentUser.getIdToken();
    const data = { types, tasks, events, eventOnlyTypes };
    
    try {
        await fetch('http://127.0.0.1:5000/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.error("Failed to save to cloud:", err);
    }
}

async function loadData() {
    if (!auth.currentUser) return;
    
    const token = await auth.currentUser.getIdToken();
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/data', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            types = data.types || [];
            tasks = data.tasks || [];
            events = data.events || [];
            eventOnlyTypes = data.eventOnlyTypes || [];
        }
    } catch (err) {
        console.error("Failed to load from cloud:", err);
    }

    renderTasks();
    renderCalendar();
    renderTodaysTasksWidget();
    checkStartupTasks();
}

// --- Continuous Calendar Setup ---
function initializeCalendarState() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 10; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }

    viewStartDate = new Date();
    viewStartDate.setHours(0, 0, 0, 0);
    viewStartDate.setDate(viewStartDate.getDate() - viewStartDate.getDay());
    
    updateDropdownsFromView();
}

function updateDropdownsFromView() {
    const topRowSaturday = new Date(viewStartDate);
    topRowSaturday.setDate(viewStartDate.getDate() + 6);
    
    currentSelectedMonth = topRowSaturday.getMonth();
    currentSelectedYear = topRowSaturday.getFullYear();
    
    monthSelect.value = currentSelectedMonth;
    yearSelect.value = currentSelectedYear;
}

// --- Startup Review Logic ---
function checkStartupTasks() {
    const todayStr = getTodayStr();
    const lastReviewDate = localStorage.getItem('plannerLastReviewDate');

    if (lastReviewDate === todayStr) return;

    const overdueTasks = tasks.filter(t => !t.parentId && t.assignedDate && t.assignedDate < todayStr && !t.completed);

    if (overdueTasks.length > 0) {
        overdueTasksList.innerHTML = '';
        overdueTasks.forEach(task => {
            const type = types.find(t => t.id === task.typeId);
            const taskEl = document.createElement('div');
            taskEl.className = 'widget-task';
            taskEl.innerHTML = `
                <span class="color-dot" style="background-color: ${getModeColor(type ? type.color : '#ccc')};"></span>
                <span class="task-text">${task.isDeadline ? '🚩 ' : ''}${task.name}</span> 
                <span style="font-size: 0.7rem; color: #888; margin-left: auto;">(${task.assignedDate})</span>
            `;
            overdueTasksList.appendChild(taskEl);
        });

        startupModal.classList.remove('hidden');
    }
}

// --- Today's Tasks Widget Logic ---
function renderTodaysTasksWidget() {
    todaysTasksList.innerHTML = '';
    const todayStr = getTodayStr();
    const todayObj = new Date(todayStr);
    
    const visibleTasks = tasks.filter(t => {
        if (t.parentId) return false;
        if (t.isDeadline && !t.completed) return true; 
        if (t.assignedDate === todayStr || (t.assignedDate < todayStr && !t.completed)) return true;
        return false;
    });

    visibleTasks.sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));
    
    if (visibleTasks.length === 0) {
        todaysTasksList.innerHTML = '<div class="widget-empty">No tasks for today :)</div>';
        return;
    }

    visibleTasks.forEach(task => {
        const type = types.find(t => t.id === task.typeId);
        const isOverdue = task.assignedDate < todayStr && !task.completed;
        
        let daysText = '';
        if (task.isDeadline && task.assignedDate && !task.completed) {
            const dlObj = new Date(task.assignedDate);
            const diffDays = Math.ceil((dlObj - todayObj) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) daysText = `(${diffDays} days remaining)`;
            else if (diffDays === 0) daysText = `(Due Today)`;
            else daysText = `(${Math.abs(diffDays)} days overdue)`;
        }

        const taskEl = document.createElement('div');
        taskEl.className = `widget-task ${task.completed ? 'completed' : ''}`;
        
        taskEl.innerHTML = `
            <span class="color-dot" style="background-color: ${getModeColor(type ? type.color : '#ccc')};"></span>
            <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
            <span class="task-text">${task.isDeadline ? '🚩 ' : ''}${task.name} <span class="deadline-info">${daysText}</span></span>
            ${isOverdue && !task.isDeadline ? '<span class="overdue-badge">Overdue</span>' : ''}
        `;

        taskEl.querySelector('input').addEventListener('change', (e) => {
            task.completed = e.target.checked;
            saveData(); 
            renderTasks(); 
            renderCalendar();
            renderTodaysTasksWidget(); 
            
            if (!dayViewModal.classList.contains('hidden') && targetEventDate === todayStr) {
                openDayViewModal(todayStr);
            }
        });

        todaysTasksList.appendChild(taskEl);
    });
}

// --- App Logic & Listeners ---
function setupEventListeners() {
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("User signed out successfully.");
        }).catch((error) => {
            console.error("Logout failed:", error);
        });
    });

    addDeadlineBtn.addEventListener('click', () => {
        deadlineDaySel.innerHTML = '';
        for(let i=1; i<=31; i++) deadlineDaySel.innerHTML += `<option value="${i}">${i}</option>`;

        deadlineMonthSel.innerHTML = '';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        months.forEach((m, i) => deadlineMonthSel.innerHTML += `<option value="${i}">${m}</option>`);

        deadlineYearSel.innerHTML = '';
        const currYear = new Date().getFullYear();
        for(let i=currYear-2; i<=currYear+5; i++) deadlineYearSel.innerHTML += `<option value="${i}">${i}</option>`;

        const today = new Date();
        deadlineDaySel.value = today.getDate();
        deadlineMonthSel.value = today.getMonth();
        deadlineYearSel.value = today.getFullYear();

        deadlineTypeSel.innerHTML = '';
        types.forEach(t => { deadlineTypeSel.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
        if(types.length === 0) deadlineTypeSel.innerHTML = `<option value="">Create a category first!</option>`;

        deadlineNameInput.value = '';
        deadlineModal.classList.remove('hidden');
    });

    cancelDeadlineBtn.addEventListener('click', () => {
        deadlineModal.classList.add('hidden');
    });

    saveDeadlineBtn.addEventListener('click', () => {
        const name = deadlineNameInput.value.trim();
        const typeId = deadlineTypeSel.value;
        
        if (!name || !typeId) {
            alert("Please enter a name and ensure a category is selected.");
            return;
        }

        const d = deadlineDaySel.value;
        const m = deadlineMonthSel.value;
        const y = deadlineYearSel.value;
        const dateStr = `${y}-${String(parseInt(m)+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const newId = Date.now().toString();
        tasks.push({
            id: newId,
            name: name,
            typeId: typeId,
            parentId: null,
            completed: false,
            assignedDate: dateStr,
            isDeadline: true
        });

        saveData();
        renderTasks();
        renderCalendar();
        renderTodaysTasksWidget();
        deadlineModal.classList.add('hidden');
    });

    hiddenCustomColorInput.addEventListener('input', (e) => {
        applyColorToType(e.target.value);
    });

    closeColorPickerBtn.addEventListener('click', () => {
        colorPickerModal.classList.add('hidden');
    });

    if (mobileMenuBtn && mobileOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
        });

        mobileMenuBtn.addEventListener('dragover', (e) => {
            e.preventDefault();
            mobileMenuBtn.style.opacity = '0.5';
            mobileMenuBtn.style.transform = 'scale(1.1)';
        });
        mobileMenuBtn.addEventListener('dragleave', () => {
            mobileMenuBtn.style.opacity = '1';
            mobileMenuBtn.style.transform = 'none';
        });
        mobileMenuBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            mobileMenuBtn.style.opacity = '1';
            mobileMenuBtn.style.transform = 'none';
            const taskId = e.dataTransfer.getData('text/plain');
            const task = tasks.find(t => t.id === taskId);
            
            if (task && !task.parentId) {
                task.assignedDate = null; 
                saveData(); 
                renderTasks();    
                renderCalendar(); 
                renderTodaysTasksWidget();
            }
        });
    }

    document.getElementById('add-type-btn').addEventListener('click', () => { addNewType(); });

    document.getElementById('prev-week').addEventListener('click', () => {
        viewStartDate.setDate(viewStartDate.getDate() - 7);
        updateDropdownsFromView();
        renderCalendar();
    });
    
    document.getElementById('next-week').addEventListener('click', () => {
        viewStartDate.setDate(viewStartDate.getDate() + 7);
        updateDropdownsFromView();
        renderCalendar();
    });

    const handleDropdownChange = () => {
        const m = parseInt(monthSelect.value);
        const y = parseInt(yearSelect.value);
        
        const targetDate = new Date(y, m, 1);
        targetDate.setDate(targetDate.getDate() - targetDate.getDay());
        
        viewStartDate = targetDate;
        updateDropdownsFromView(); 
        renderCalendar();
    };

    monthSelect.addEventListener('change', handleDropdownChange);
    yearSelect.addEventListener('change', handleDropdownChange);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        if (isDark) {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
            localStorage.setItem('plannerTheme', 'dark');
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
            localStorage.setItem('plannerTheme', 'light');
        }

        renderTasks();
        renderCalendar();
        renderTodaysTasksWidget();
        if (!dayViewModal.classList.contains('hidden') && targetEventDate) {
            openDayViewModal(targetEventDate);
        }
    });

    function handleStartupClose() {
        if (doNotAskCheckbox.checked) {
            localStorage.setItem('plannerLastReviewDate', getTodayStr());
        }
        startupModal.classList.add('hidden');
    }

    ignoreOverdueBtn.addEventListener('click', handleStartupClose);

    shiftOverdueBtn.addEventListener('click', () => {
        const todayStr = getTodayStr();
        let changed = false;
        
        tasks.forEach(t => {
            if (!t.parentId && t.assignedDate && t.assignedDate < todayStr && !t.completed) {
                t.assignedDate = todayStr; 
                changed = true;
            }
        });

        if (changed) {
            saveData();
            renderTasks();
            renderCalendar();
            renderTodaysTasksWidget();
        }
        handleStartupClose();
    });

    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    exportBtn.addEventListener('click', () => {
        const data = { types, tasks, events, eventOnlyTypes };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planner-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
        importFile.click(); 
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.types && data.tasks) {
                    types = data.types;
                    tasks = data.tasks;
                    events = data.events || []; 
                    eventOnlyTypes = data.eventOnlyTypes || []; 
                    saveData();
                    renderTasks();
                    renderCalendar();
                    renderTodaysTasksWidget();
                } else {
                    alert('Invalid file format.');
                }
            } catch (err) {
                alert('Error reading the file.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; 
    });

    const exportIcsBtn = document.getElementById('export-ics-btn');
    exportIcsBtn.addEventListener('click', () => {
        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//My Planner App//EN\n";

        const formatIcsDate = (dateStr, addDays = 0) => {
            const parts = dateStr.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            d.setDate(d.getDate() + addDays);
            return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        };

        events.forEach(evt => {
            icsContent += "BEGIN:VEVENT\n";
            icsContent += `SUMMARY:★ ${evt.name}\n`;
            icsContent += `DTSTART;VALUE=DATE:${formatIcsDate(evt.date)}\n`;
            icsContent += `DTEND;VALUE=DATE:${formatIcsDate(evt.date, 1)}\n`; 
            icsContent += "END:VEVENT\n";
        });

        tasks.filter(t => t.assignedDate && !t.parentId).forEach(task => {
            const type = types.find(t => t.id === task.typeId);
            const prefix = type ? `[${type.name}] ` : '';
            const status = task.completed ? "COMPLETED" : "NEEDS-ACTION";
            
            icsContent += "BEGIN:VEVENT\n";
            icsContent += `SUMMARY:${prefix}${task.name}\n`;
            icsContent += `DTSTART;VALUE=DATE:${formatIcsDate(task.assignedDate)}\n`;
            icsContent += `DTEND;VALUE=DATE:${formatIcsDate(task.assignedDate, 1)}\n`;
            icsContent += `STATUS:${status}\n`;
            icsContent += "END:VEVENT\n";
        });

        icsContent += "END:VCALENDAR";

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planner-export-${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    sidebarContent.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        sidebarContent.classList.add('drag-over');
    });

    sidebarContent.addEventListener('dragleave', () => {
        sidebarContent.classList.remove('drag-over');
    });

    sidebarContent.addEventListener('drop', (e) => {
        e.preventDefault();
        sidebarContent.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const task = tasks.find(t => t.id === taskId);
        
        if (task && !task.parentId) {
            task.assignedDate = null; 
            saveData(); 
            renderTasks();    
            renderCalendar(); 
            renderTodaysTasksWidget();
        }
    });

    eventTypeSelect.addEventListener('change', () => {
        if (eventTypeSelect.value === 'others') {
            customTypeFields.classList.remove('hidden');
        } else {
            customTypeFields.classList.add('hidden');
        }
    });

    document.getElementById('cancel-event-btn').addEventListener('click', () => {
        eventModal.classList.add('hidden');
    });

    document.getElementById('save-event-btn').addEventListener('click', () => {
        const name = eventNameInput.value.trim();
        if (!name) {
            alert("Please enter a name for the event.");
            return;
        }
        if (!targetEventDate) return;

        let finalTypeId = eventTypeSelect.value;

        if (finalTypeId === 'others') {
            const newTypeName = customTypeName.value.trim() || 'Custom Category';
            const newColor = eventColorInput.value;
            finalTypeId = Date.now().toString();

            eventOnlyTypes.push({
                id: finalTypeId,
                name: newTypeName,
                color: newColor
            });
        }

        if (targetEventId) {
            const evt = events.find(e => e.id === targetEventId);
            evt.name = name;
            evt.typeId = finalTypeId;
        } else {
            events.push({
                id: Date.now().toString(),
                date: targetEventDate,
                name: name,
                typeId: finalTypeId
            });
        }
        
        saveData(); 
        renderCalendar();
        eventModal.classList.add('hidden');
    });

    deleteEventBtn.addEventListener('click', () => {
        if (targetEventId) {
            events = events.filter(e => e.id !== targetEventId);
            saveData(); renderCalendar();
            eventModal.classList.add('hidden');
        }
    });

    closeDayViewBtn.addEventListener('click', () => {
        dayViewModal.classList.add('hidden');
    });

    let touchTimer = null;
    let ghostEl = null;
    let draggedTaskEl = null;
    let activeTouchTask = null;
    let currentDropTarget = null;

    document.addEventListener('touchstart', (e) => {
        const taskEl = e.target.closest('.task-item[draggable="true"], .calendar-task[draggable="true"]');
        if (!taskEl || e.target.type === 'checkbox' || e.target.tagName.toLowerCase() === 'button') return;
        
        const taskId = taskEl.dataset.taskId;
        activeTouchTask = tasks.find(t => t.id === taskId);
        if (!activeTouchTask || activeTouchTask.parentId) return; 

        if (e.touches.length > 1) return;
        const touch = e.touches[0];
        
        touchTimer = setTimeout(() => {
            draggedTaskEl = taskEl;
            taskEl.style.opacity = '0.5';
            
            ghostEl = taskEl.cloneNode(true);
            ghostEl.style.position = 'fixed';
            ghostEl.style.zIndex = '9999';
            ghostEl.style.opacity = '0.8';
            ghostEl.style.pointerEvents = 'none';
            ghostEl.style.width = taskEl.offsetWidth + 'px';
            ghostEl.style.left = (touch.clientX - taskEl.offsetWidth/2) + 'px';
            ghostEl.style.top = (touch.clientY - taskEl.offsetHeight/2) + 'px';
            ghostEl.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            document.body.appendChild(ghostEl);

            if (navigator.vibrate) navigator.vibrate(50);

            if (isMobileMode) {
                if (sidebar) sidebar.classList.remove('open');
                if (mobileOverlay) mobileOverlay.classList.remove('active');
            }
        }, 400); 
    }, {passive: false});

    document.addEventListener('touchmove', (e) => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
        if (!ghostEl) return;
        e.preventDefault(); 

        const touch = e.touches[0];
        ghostEl.style.left = (touch.clientX - ghostEl.offsetWidth/2) + 'px';
        ghostEl.style.top = (touch.clientY - ghostEl.offsetHeight/2) + 'px';

        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const dropCell = elements.find(el => el.classList.contains('day-cell') || el.id === 'mobile-menu-btn');

        if (currentDropTarget && currentDropTarget !== dropCell) {
            currentDropTarget.classList.remove('drag-over');
            if (currentDropTarget.id === 'mobile-menu-btn') {
                currentDropTarget.style.transform = 'none';
                currentDropTarget.style.opacity = '1';
            }
        }

        if (dropCell) {
            if (dropCell.classList.contains('day-cell')) {
                dropCell.classList.add('drag-over');
            } else if (dropCell.id === 'mobile-menu-btn') {
                dropCell.style.transform = 'scale(1.1)';
                dropCell.style.opacity = '0.5';
            }
        }
        currentDropTarget = dropCell;
    }, {passive: false});

    document.addEventListener('touchend', (e) => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
        if (!ghostEl) return;

        ghostEl.remove();
        ghostEl = null;

        if (draggedTaskEl) {
            draggedTaskEl.style.opacity = '1';
            draggedTaskEl = null;
        }

        if (currentDropTarget && activeTouchTask) {
            currentDropTarget.classList.remove('drag-over');
            if (currentDropTarget.classList.contains('day-cell')) {
                const dateStr = currentDropTarget.dataset.date;
                if (activeTouchTask.assignedDate !== dateStr) {
                    activeTouchTask.assignedDate = dateStr;
                    saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                }
            } else if (currentDropTarget.id === 'mobile-menu-btn') {
                currentDropTarget.style.transform = 'none';
                currentDropTarget.style.opacity = '1';
                if (activeTouchTask.assignedDate !== null) {
                    activeTouchTask.assignedDate = null; 
                    saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                }
            }
            currentDropTarget = null;
        }
        activeTouchTask = null;
    });

    document.addEventListener('touchcancel', () => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        if (draggedTaskEl) { draggedTaskEl.style.opacity = '1'; draggedTaskEl = null; }
        activeTouchTask = null;
        if (currentDropTarget) {
            currentDropTarget.classList.remove('drag-over');
            currentDropTarget.style.transform = 'none';
            currentDropTarget.style.opacity = '1';
            currentDropTarget = null;
        }
    });
}

function populateEventTypes(selectedTypeId = null) {
    eventTypeSelect.innerHTML = '';
    const allTypes = [...types, ...eventOnlyTypes];

    allTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name || 'Unnamed Category';
        if (t.id === selectedTypeId) opt.selected = true;
        eventTypeSelect.appendChild(opt);
    });

    const othersOpt = document.createElement('option');
    othersOpt.value = 'others';
    othersOpt.textContent = '+ Others (Create New)';
    if (selectedTypeId === 'others') othersOpt.selected = true;
    eventTypeSelect.appendChild(othersOpt);

    if (eventTypeSelect.value === 'others') {
        customTypeFields.classList.remove('hidden');
    } else {
        customTypeFields.classList.add('hidden');
    }
}

// --- Inline List Logic ---
function addNewType() {
    const newId = Date.now().toString();
    const assignedColor = getUnusedColor();
    types.push({ id: newId, name: '', color: assignedColor, isCollapsed: false });
    saveData(); renderTasks();
    restoreFocus(newId);
}

function addNewTask(typeId, parentId = null) {
    const newId = Date.now().toString();
    const parentType = types.find(t => t.id === typeId);
    if (parentType) parentType.isCollapsed = false;

    tasks.push({ id: newId, name: '', typeId, parentId, completed: false, assignedDate: null, isDeadline: false });
    saveData(); renderTasks();
    restoreFocus(newId);
}

function renderTasks() {
    taskListContainer.innerHTML = '';
    types.forEach(type => {
        const typeDiv = document.createElement('div');
        typeDiv.className = 'type-group';
        
        const typeTasks = tasks.filter(t => t.typeId === type.id);
        
        const totalTasks = typeTasks.length;
        const completedTasks = typeTasks.filter(t => t.completed).length;
        const progressPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
        
        const isCollapsed = type.isCollapsed || false;

        const typeHeader = document.createElement('div');
        typeHeader.className = 'flex-row';
        
        typeHeader.innerHTML = `
            <span class="drag-handle" style="visibility: hidden; cursor: default;">⋮⋮</span>
            <span class="collapse-toggle ${isCollapsed ? 'collapsed' : ''}" data-id="${type.id}">▼</span>
            <div class="color-picker-container" title="Click to change color" data-id="${type.id}" data-color="${type.color}">
                <div class="color-dot" style="background-color: ${getModeColor(type.color)};"></div>
            </div>
            <input type="text" class="inline-input type-input" value="${type.name}" placeholder="Type name..." data-id="${type.id}">
        `;
        typeDiv.appendChild(typeHeader);
        
        const progressDiv = document.createElement('div');
        progressDiv.className = 'progress-bar-container';
        progressDiv.innerHTML = `<div class="progress-bar-fill" style="width: ${progressPercent}%; background-color: ${type.color};"></div>`;
        typeDiv.appendChild(progressDiv);

        const taskListDiv = document.createElement('div');
        taskListDiv.className = `task-list ${isCollapsed ? 'hidden' : ''}`;
        
        const parentTasks = typeTasks.filter(t => !t.parentId);
        parentTasks.forEach(parentTask => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item flex-row ${parentTask.completed ? 'completed' : ''} ${parentTask.assignedDate ? 'translucent' : ''}`;
            taskEl.draggable = true; 
            taskEl.dataset.taskId = parentTask.id; 
            
            taskEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', parentTask.id);
                e.dataTransfer.effectAllowed = 'move';
                
                if (isMobileMode) {
                    setTimeout(() => {
                        if (sidebar) sidebar.classList.remove('open');
                        if (mobileOverlay) mobileOverlay.classList.remove('active');
                    }, 10); 
                }
            });

            taskEl.innerHTML = `
                <span class="drag-handle">⋮⋮</span>
                <input type="checkbox" class="task-checkbox" ${parentTask.completed ? 'checked' : ''} data-id="${parentTask.id}">
                ${parentTask.isDeadline ? '<span title="Deadline" style="font-size:0.8rem; margin-right:4px;">🚩</span>' : ''}
                <input type="text" class="inline-input task-input" value="${parentTask.name}" placeholder="Task (Press Tab for subtask)" data-id="${parentTask.id}">
                <button class="delete-task-btn" data-id="${parentTask.id}" title="Delete Task">&times;</button>
            `;
            taskListDiv.appendChild(taskEl);

            const subtasks = typeTasks.filter(t => t.parentId === parentTask.id);
            if (subtasks.length > 0) {
                const subtaskContainer = document.createElement('div');
                subtaskContainer.className = 'subtask-list';
                
                subtasks.forEach(subtask => {
                    const subEl = document.createElement('div');
                    subEl.className = `task-item subtask-item flex-row ${subtask.completed ? 'completed' : ''}`;
                    subEl.innerHTML = `
                        <span class="drag-handle">⋮⋮</span>
                        <input type="checkbox" class="task-checkbox" ${subtask.completed ? 'checked' : ''} data-id="${subtask.id}">
                        <input type="text" class="inline-input task-input" value="${subtask.name}" placeholder="Subtask..." data-id="${subtask.id}">
                        <button class="delete-task-btn" data-id="${subtask.id}" title="Delete Subtask">&times;</button>
                    `;
                    subtaskContainer.appendChild(subEl);
                });
                taskListDiv.appendChild(subtaskContainer);
            }
        });
        
        const addTaskBtn = document.createElement('div');
        addTaskBtn.className = 'add-btn';
        addTaskBtn.innerHTML = '+ List task';
        addTaskBtn.onclick = () => addNewTask(type.id);
        taskListDiv.appendChild(addTaskBtn);
        
        typeDiv.appendChild(taskListDiv);
        taskListContainer.appendChild(typeDiv);
    });

    attachInlineListeners();
}

function attachInlineListeners() {
    document.querySelectorAll('.collapse-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const type = types.find(t => t.id === e.target.dataset.id);
            if (type) {
                type.isCollapsed = !type.isCollapsed;
                saveData();
                renderTasks(); 
            }
        });
    });

    document.querySelectorAll('.color-picker-container').forEach(container => {
        container.addEventListener('click', () => {
            openColorPickerModal(container.dataset.id, container.dataset.color);
        });
    });

    document.querySelectorAll('.type-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const type = types.find(t => t.id === e.target.dataset.id);
            if (type) { type.name = e.target.value; saveData(); }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addNewType(); }
        });
        input.addEventListener('blur', (e) => {
            if (e.target.value.trim() === '') {
                types = types.filter(t => t.id !== e.target.dataset.id);
                tasks = tasks.filter(t => t.typeId !== e.target.dataset.id); 
                saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
            }
        });
    });

    document.querySelectorAll('.task-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const task = tasks.find(t => t.id === e.target.dataset.id);
            if (task) { task.name = e.target.value; saveData(); renderCalendar(); renderTodaysTasksWidget(); }
        });
        
        input.addEventListener('keydown', (e) => {
            const task = tasks.find(t => t.id === e.target.dataset.id);
            if (!task) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                addNewTask(task.typeId, task.parentId); 
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (task.parentId) {
                        task.parentId = null;
                        saveData(); renderTasks(); restoreFocus(task.id);
                    }
                } else {
                    if (!task.parentId) {
                        const typeParentTasks = tasks.filter(t => t.typeId === task.typeId && !t.parentId);
                        const currentIndex = typeParentTasks.findIndex(t => t.id === task.id);
                        if (currentIndex > 0) {
                            task.parentId = typeParentTasks[currentIndex - 1].id;
                            task.assignedDate = null; 
                            saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget(); restoreFocus(task.id);
                        }
                    }
                }
            }
        });

        input.addEventListener('blur', (e) => {
            if (e.target.value.trim() === '') {
                const taskId = e.target.dataset.id;
                tasks = tasks.filter(t => t.id !== taskId && t.parentId !== taskId);
                saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
            }
        });
    });

    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const task = tasks.find(t => t.id === e.target.dataset.id);
            if (task) {
                task.completed = e.target.checked;
                saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                
                if (!dayViewModal.classList.contains('hidden') && task.assignedDate) {
                    openDayViewModal(task.assignedDate);
                }
            }
        });
    });

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.target.dataset.id;
            tasks = tasks.filter(t => t.id !== taskId && t.parentId !== taskId);
            saveData(); 
            renderTasks(); 
            renderCalendar(); 
            renderTodaysTasksWidget();
        });
    });
}

function openDayViewModal(dateStr) {
    targetEventDate = dateStr;
    const d = dateStr.split('-');
    const dateObj = new Date(d[0], d[1] - 1, d[2]);
    dayViewTitle.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    dayViewEvents.innerHTML = '';
    dayViewTasks.innerHTML = '';

    const dayEvents = events.filter(e => e.date === dateStr);
    const dayTasks = tasks.filter(t => t.assignedDate === dateStr && !t.parentId);

    if (dayEvents.length > 0) {
        dayEvents.forEach(evt => {
            const evtEl = document.createElement('div');
            evtEl.className = 'calendar-event';
            evtEl.textContent = evt.name;
            evtEl.addEventListener('click', () => {
                dayViewModal.classList.add('hidden'); 
                openEventModal(dateStr, evt.id);      
            });
            dayViewEvents.appendChild(evtEl);
        });
    }

    if (dayTasks.length > 0) {
        dayTasks.forEach(task => {
            const type = types.find(t => t.id === task.typeId);
            const taskEl = document.createElement('div');
            taskEl.className = `calendar-task ${task.completed ? 'completed' : ''}`;
            taskEl.innerHTML = `
                <span class="color-dot" style="background-color: ${getModeColor(type ? type.color : '#ccc')}; width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></span>
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span>${task.isDeadline ? '🚩 ' : ''}${task.name}</span>
            `;

            taskEl.querySelector('input').addEventListener('change', (e) => {
                task.completed = e.target.checked;
                saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                openDayViewModal(dateStr); 
            });
            dayViewTasks.appendChild(taskEl);
        });
    } else if (dayEvents.length === 0) {
        dayViewTasks.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Nothing planned for this day.</p>';
    }

    dayViewModal.classList.remove('hidden');
}

function openEventModal(dateStr, evtId = null) {
    targetEventDate = dateStr;
    targetEventId = evtId;

    if (evtId) {
        const evt = events.find(e => e.id === evtId);
        modalTitle.textContent = "Edit Event";
        eventNameInput.value = evt.name;
        populateEventTypes(evt.typeId);
        deleteEventBtn.classList.remove('hidden');
    } else {
        modalTitle.textContent = "Add Event";
        eventNameInput.value = '';
        customTypeName.value = '';
        eventColorInput.value = '#ffeb3b';
        populateEventTypes();
        deleteEventBtn.classList.add('hidden');
    }

    eventModal.classList.remove('hidden');
    eventNameInput.focus();
}

function renderCalendar() {
    calendarGrid.innerHTML = '';
    const todayStr = getTodayStr();
    
    const daysToRender = isMobilePortrait ? 14 : 35;

    for (let i = 0; i < daysToRender; i++) {
        const loopDate = new Date(viewStartDate);
        loopDate.setDate(viewStartDate.getDate() + i);
        
        const loopYear = loopDate.getFullYear();
        const loopMonth = loopDate.getMonth();
        const loopDay = loopDate.getDate();
        const dateStr = `${loopYear}-${String(loopMonth + 1).padStart(2, '0')}-${String(loopDay).padStart(2, '0')}`;
        
        const cell = document.createElement('div');
        cell.classList.add('day-cell');
        
        if (dateStr === todayStr) {
            cell.classList.add('today-highlight');
        }

        if (loopMonth !== currentSelectedMonth) {
            cell.classList.add('dimmed-day');
        }

        const dayDeadlines = tasks.filter(t => t.assignedDate === dateStr && !t.parentId && t.isDeadline && !t.completed);
        if (dayDeadlines.length > 0) {
            cell.classList.add('deadline-day');
        }

        cell.dataset.date = dateStr;
        
        cell.innerHTML = `
            <div class="day-header">
                <button class="add-event-btn" title="Add Event">+</button>
                <div class="day-number">${loopDay}</div>
            </div>
        `;
        
        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';
        cell.appendChild(dayContent);

        cell.addEventListener('click', (e) => {
            if (e.target.closest('.add-event-btn') || e.target.type === 'checkbox' || e.target.closest('.calendar-event')) return;
            openDayViewModal(dateStr);
        });

        cell.querySelector('.add-event-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            openEventModal(dateStr);
        });

        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
        });
        
        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });
        
        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const task = tasks.find(t => t.id === taskId);
            
            if (task && task.assignedDate !== dateStr && !task.parentId) {
                task.assignedDate = dateStr;
                saveData(); 
                renderTasks(); 
                renderCalendar(); 
                renderTodaysTasksWidget();
            }
        });

        const dayEvents = events.filter(e => e.date === dateStr);
        const dayTasks = tasks.filter(t => t.assignedDate === dateStr && !t.parentId && !t.isDeadline);
        const totalItems = dayEvents.length + dayDeadlines.length + dayTasks.length;
        let renderedCount = 0; 

        if (dayEvents.length > 0) {
            let dayColor = '#ffeb3b';
            const firstEvt = dayEvents[0];
            
            if (firstEvt.typeId) {
                const matchedType = types.find(t => t.id === firstEvt.typeId) || eventOnlyTypes.find(t => t.id === firstEvt.typeId);
                if (matchedType) dayColor = matchedType.color;
            } else if (firstEvt.color) { 
                dayColor = firstEvt.color; 
            }

            cell.style.backgroundColor = getModeColor(dayColor);
            
            const isDark = document.body.classList.contains('dark-mode');
            if (!isDark) {
                const dayNum = cell.querySelector('.day-number');
                const addBtn = cell.querySelector('.add-event-btn');
                dayNum.style.color = '#fff';
                dayNum.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
                addBtn.style.color = '#fff';
                addBtn.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
            }
            
            dayEvents.forEach(evt => {
                if (renderedCount < 2) {
                    const evtEl = document.createElement('div');
                    evtEl.className = 'calendar-event';
                    evtEl.textContent = evt.name;
                    evtEl.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        openEventModal(dateStr, evt.id);
                    });
                    dayContent.appendChild(evtEl);
                    renderedCount++;
                }
            });
        }

        dayDeadlines.forEach(task => {
            if (renderedCount < 2) {
                const type = types.find(t => t.id === task.typeId);
                const taskEl = document.createElement('div');
                taskEl.className = `calendar-event ${task.completed ? 'completed' : ''}`;
                
                taskEl.style.backgroundColor = getModeColor(type ? type.color : '#e74c3c');
                taskEl.style.display = 'flex';
                taskEl.style.alignItems = 'center';
                
                const isDark = document.body.classList.contains('dark-mode');
                if (!isDark) {
                    taskEl.style.color = '#fff';
                    taskEl.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
                }

                taskEl.draggable = true;
                taskEl.dataset.taskId = task.id; 
                
                taskEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                });

                taskEl.innerHTML = `
                    <input type="checkbox" ${task.completed ? 'checked' : ''} style="margin-right: 5px; flex-shrink: 0;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🚩 ${task.name}</span>
                `;

                taskEl.querySelector('input').addEventListener('change', (e) => {
                    task.completed = e.target.checked;
                    saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                });

                dayContent.appendChild(taskEl);
                renderedCount++;
            }
        });

        dayTasks.forEach(task => {
            if (renderedCount < 2) {
                const type = types.find(t => t.id === task.typeId);
                const taskEl = document.createElement('div');
                taskEl.className = `calendar-task ${task.completed ? 'completed' : ''}`;
                
                taskEl.draggable = true;
                taskEl.dataset.taskId = task.id; 
                
                taskEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                });

                taskEl.innerHTML = `
                    <span class="color-dot" style="background-color: ${getModeColor(type ? type.color : '#ccc')}; width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></span>
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <span>${task.name}</span>
                `;

                taskEl.querySelector('input').addEventListener('change', (e) => {
                    task.completed = e.target.checked;
                    saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                });

                dayContent.appendChild(taskEl);
                renderedCount++;
            }
        });

        if (totalItems > 2) {
            const moreEl = document.createElement('div');
            moreEl.className = 'more-indicator';
            moreEl.textContent = `+${totalItems - 2} more`;

            const isDark = document.body.classList.contains('dark-mode');
            if (dayEvents.length > 0 && !isDark) {
                moreEl.style.color = '#fff';
                moreEl.style.textShadow = '0 1px 3px rgba(0,0,0,0.7)';
            }

            cell.appendChild(moreEl);
        }

        calendarGrid.appendChild(cell);
    }
}