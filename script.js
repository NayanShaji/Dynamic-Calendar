// App State
let types = [];
let tasks = [];
let events = [];
let eventOnlyTypes = [];

// Continuous Scroll State
let viewStartDate = new Date();
let currentSelectedMonth = viewStartDate.getMonth();
let currentSelectedYear = viewStartDate.getFullYear();

// Display State
let isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;

// Modal State Variables
let targetEventDate = null; 
let targetEventId = null;

// DOM Elements
const taskListContainer = document.getElementById('task-list-container');
const calendarGrid = document.getElementById('calendar-grid');
const sidebarContent = document.getElementById('sidebar-content');
const todaysTasksList = document.getElementById('todays-tasks-list');
const sidebar = document.getElementById('sidebar');

// Mobile UI Elements
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileOverlay = document.getElementById('mobile-overlay');

// Header Dropdowns
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

// Event Modal Elements
const eventModal = document.getElementById('event-modal');
const eventNameInput = document.getElementById('event-name');
const eventTypeSelect = document.getElementById('event-type-select');
const customTypeFields = document.getElementById('custom-type-fields');
const customTypeName = document.getElementById('custom-type-name');
const eventColorInput = document.getElementById('event-color');
const modalTitle = document.getElementById('modal-title');
const deleteEventBtn = document.getElementById('delete-event-btn');

// Day View Modal Elements
const dayViewModal = document.getElementById('day-view-modal');
const closeDayViewBtn = document.getElementById('close-day-view-btn');
const dayViewTitle = document.getElementById('day-view-title');
const dayViewEvents = document.getElementById('day-view-events');
const dayViewTasks = document.getElementById('day-view-tasks');

// Startup Modal Elements
const startupModal = document.getElementById('startup-modal');
const overdueTasksList = document.getElementById('overdue-tasks-list');
const doNotAskCheckbox = document.getElementById('do-not-ask-checkbox');
const ignoreOverdueBtn = document.getElementById('ignore-overdue-btn');
const shiftOverdueBtn = document.getElementById('shift-overdue-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeCalendarState();
    renderTasks();
    renderCalendar();
    renderTodaysTasksWidget();
    setupEventListeners();
    
    checkStartupTasks();
});

window.addEventListener('resize', () => {
    const newIsMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    if (newIsMobilePortrait !== isMobilePortrait) {
        isMobilePortrait = newIsMobilePortrait;
        renderCalendar();
    }
});

// --- Utility Functions ---
function getTodayStr() {
    const realToday = new Date();
    return `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(realToday.getDate()).padStart(2, '0')}`;
}

function getTranslucentColor(hex, opacity = 0.3) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

// --- Local Storage Functions ---
function saveData() {
    localStorage.setItem('plannerTypes', JSON.stringify(types));
    localStorage.setItem('plannerTasks', JSON.stringify(tasks));
    localStorage.setItem('plannerEvents', JSON.stringify(events));
    localStorage.setItem('plannerEventOnlyTypes', JSON.stringify(eventOnlyTypes));
}

function loadData() {
    const storedTypes = localStorage.getItem('plannerTypes');
    const storedTasks = localStorage.getItem('plannerTasks');
    const storedEvents = localStorage.getItem('plannerEvents');
    const storedEventOnlyTypes = localStorage.getItem('plannerEventOnlyTypes');
    const storedTheme = localStorage.getItem('plannerTheme');

    if (storedTypes) types = JSON.parse(storedTypes);
    if (storedTasks) tasks = JSON.parse(storedTasks);
    if (storedEvents) events = JSON.parse(storedEvents);
    if (storedEventOnlyTypes) eventOnlyTypes = JSON.parse(storedEventOnlyTypes);

    if (storedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('moon-icon').style.display = 'none';
        document.getElementById('sun-icon').style.display = 'block';
    }
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
                <span class="color-dot" style="background-color: ${type ? type.color : '#ccc'};"></span>
                <span class="task-text">${task.name}</span> 
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
    
    const visibleTasks = tasks.filter(t => 
        !t.parentId && t.assignedDate && 
        (t.assignedDate === todayStr || (t.assignedDate < todayStr && !t.completed))
    );

    visibleTasks.sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));
    
    if (visibleTasks.length === 0) {
        todaysTasksList.innerHTML = '<div class="widget-empty">No tasks for today :)</div>';
        return;
    }

    visibleTasks.forEach(task => {
        const type = types.find(t => t.id === task.typeId);
        const isOverdue = task.assignedDate < todayStr && !task.completed;
        const taskEl = document.createElement('div');
        taskEl.className = `widget-task ${task.completed ? 'completed' : ''}`;
        
        taskEl.innerHTML = `
            <span class="color-dot" style="background-color: ${type ? type.color : '#ccc'};"></span>
            <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
            <span class="task-text">${task.name}</span>
            ${isOverdue ? '<span class="overdue-badge">Overdue</span>' : ''}
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
    
    if (mobileMenuBtn && mobileOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
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

    // Touch Event Listeners for Mobile Drag & Drop
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
        if (!activeTouchTask || activeTouchTask.parentId) return; // Only parent tasks drag

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

            // Close sidebar to reveal calendar
            if (window.innerWidth <= 768) {
                if (sidebar) sidebar.classList.remove('open');
                if (mobileOverlay) mobileOverlay.classList.remove('active');
            }
        }, 400); // 400ms long press
    }, {passive: false});

    document.addEventListener('touchmove', (e) => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
        if (!ghostEl) return;
        e.preventDefault(); // Stop screen from scrolling while dragging

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
                    activeTouchTask.assignedDate = null; // Drop on hamburger un-assigns it!
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
    types.push({ id: newId, name: '', color: '#3498db', isCollapsed: false });
    saveData(); renderTasks();
    restoreFocus(newId);
}

function addNewTask(typeId, parentId = null) {
    const newId = Date.now().toString();
    const parentType = types.find(t => t.id === typeId);
    if (parentType) parentType.isCollapsed = false;

    tasks.push({ id: newId, name: '', typeId, parentId, completed: false, assignedDate: null });
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
            <div class="color-picker-container" title="Click to change color">
                <input type="color" class="hidden-color-picker" value="${type.color}" data-id="${type.id}">
                <div class="color-dot" style="background-color: ${type.color};"></div>
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
            taskEl.dataset.taskId = parentTask.id; // Added for touch logic
            
            taskEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', parentTask.id);
                e.dataTransfer.effectAllowed = 'move';
                
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        if (sidebar) sidebar.classList.remove('open');
                        if (mobileOverlay) mobileOverlay.classList.remove('active');
                    }, 10); 
                }
            });

            taskEl.innerHTML = `
                <span class="drag-handle">⋮⋮</span>
                <input type="checkbox" class="task-checkbox" ${parentTask.completed ? 'checked' : ''} data-id="${parentTask.id}">
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

    document.querySelectorAll('.hidden-color-picker').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const type = types.find(t => t.id === e.target.dataset.id);
            if (type) {
                type.color = e.target.value;
                e.target.nextElementSibling.style.backgroundColor = type.color;
                saveData(); renderCalendar(); renderTasks(); renderTodaysTasksWidget();
            }
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
                <span class="color-dot" style="background-color: ${type ? type.color : '#ccc'}; width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></span>
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span>${task.name}</span>
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
    
    const daysToRender = isMobilePortrait ? 14 : 42;

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

        cell.dataset.date = dateStr;
        
        cell.innerHTML = `
            <div class="day-header">
                <button class="add-event-btn" title="Add Event">+</button>
                <div class="day-number">${loopDay}</div>
            </div>
        `;

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
        const dayTasks = tasks.filter(t => t.assignedDate === dateStr && !t.parentId);
        const totalItems = dayEvents.length + dayTasks.length;
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

            cell.style.backgroundColor = getTranslucentColor(dayColor, 0.3);
            
            dayEvents.forEach(evt => {
                if (renderedCount < 2) {
                    const evtEl = document.createElement('div');
                    evtEl.className = 'calendar-event';
                    evtEl.textContent = evt.name;
                    evtEl.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        openEventModal(dateStr, evt.id);
                    });
                    cell.appendChild(evtEl);
                    renderedCount++;
                }
            });
        }

        dayTasks.forEach(task => {
            if (renderedCount < 2) {
                const type = types.find(t => t.id === task.typeId);
                const taskEl = document.createElement('div');
                taskEl.className = `calendar-task ${task.completed ? 'completed' : ''}`;
                
                taskEl.draggable = true;
                taskEl.dataset.taskId = task.id; // Added for touch logic
                
                taskEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                });

                taskEl.innerHTML = `
                    <span class="color-dot" style="background-color: ${type ? type.color : '#ccc'}; width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></span>
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <span>${task.name}</span>
                `;

                taskEl.querySelector('input').addEventListener('change', (e) => {
                    task.completed = e.target.checked;
                    saveData(); renderTasks(); renderCalendar(); renderTodaysTasksWidget();
                });

                cell.appendChild(taskEl);
                renderedCount++;
            }
        });

        if (totalItems > 2) {
            const moreEl = document.createElement('div');
            moreEl.className = 'more-indicator';
            moreEl.textContent = `+${totalItems - 2} more`;
            cell.appendChild(moreEl);
        }

        calendarGrid.appendChild(cell);
    }
}