// App State
let types = [];
let tasks = [];
let events = [];
let currentDate = new Date();

// Modal State Variables
let targetEventDate = null; 
let targetEventId = null;

// DOM Elements
const taskListContainer = document.getElementById('task-list-container');
const calendarGrid = document.getElementById('calendar-grid');
const monthYearDisplay = document.getElementById('month-year-display');
const sidebarContent = document.getElementById('sidebar-content');

// Modal Elements
const eventModal = document.getElementById('event-modal');
const eventNameInput = document.getElementById('event-name');
const eventColorInput = document.getElementById('event-color');
const modalTitle = document.getElementById('modal-title');
const deleteEventBtn = document.getElementById('delete-event-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderTasks();
    renderCalendar();
    setupEventListeners();
});

// --- Local Storage Functions ---
function saveData() {
    localStorage.setItem('plannerTypes', JSON.stringify(types));
    localStorage.setItem('plannerTasks', JSON.stringify(tasks));
    localStorage.setItem('plannerEvents', JSON.stringify(events));
}

function loadData() {
    const storedTypes = localStorage.getItem('plannerTypes');
    const storedTasks = localStorage.getItem('plannerTasks');
    const storedEvents = localStorage.getItem('plannerEvents');
    const storedTheme = localStorage.getItem('plannerTheme');

    if (storedTypes) types = JSON.parse(storedTypes);
    if (storedTasks) tasks = JSON.parse(storedTasks);
    if (storedEvents) events = JSON.parse(storedEvents);

    if (storedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('moon-icon').style.display = 'none';
        document.getElementById('sun-icon').style.display = 'block';
    }
}

// Helper to keep cursor focused after pressing Tab/Enter
function restoreFocus(taskId) {
    setTimeout(() => {
        const input = document.querySelector(`input.task-input[data-id="${taskId}"]`);
        if (input) {
            input.focus();
            input.selectionStart = input.selectionEnd = input.value.length;
        }
    }, 0);
}

function getTranslucentColor(hex, opacity = 0.3) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// --- App Logic ---
function setupEventListeners() {
    document.getElementById('add-type-btn').addEventListener('click', () => { addNewType(); });

    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar();
    });

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

    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    exportBtn.addEventListener('click', () => {
        const data = { types, tasks, events };
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
                    saveData();
                    renderTasks();
                    renderCalendar();
                } else {
                    alert('Invalid file format. Please upload a valid planner backup JSON.');
                }
            } catch (err) {
                alert('Error reading the file. Make sure it is a valid JSON file.');
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

        // Only export Parent Tasks to Calendar
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
        
        // Ensure subtasks aren't dragged
        if (task && !task.parentId) {
            task.assignedDate = null; 
            saveData(); 
            renderTasks();    
            renderCalendar(); 
        }
    });

    document.getElementById('cancel-event-btn').addEventListener('click', () => {
        eventModal.classList.add('hidden');
    });

    document.getElementById('save-event-btn').addEventListener('click', () => {
        const name = eventNameInput.value.trim();
        if (name && targetEventDate) {
            if (targetEventId) {
                const evt = events.find(e => e.id === targetEventId);
                evt.name = name;
                evt.color = eventColorInput.value;
            } else {
                events.push({
                    id: Date.now().toString(),
                    date: targetEventDate,
                    name: name,
                    color: eventColorInput.value
                });
            }
            saveData(); renderCalendar();
            eventModal.classList.add('hidden');
        }
    });

    deleteEventBtn.addEventListener('click', () => {
        if (targetEventId) {
            events = events.filter(e => e.id !== targetEventId);
            saveData(); renderCalendar();
            eventModal.classList.add('hidden');
        }
    });
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

    // Subtasks cannot have assigned dates
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
        
        // Progress Bar (counts all tasks & subtasks for accuracy)
        const totalTasks = typeTasks.length;
        const completedTasks = typeTasks.filter(t => t.completed).length;
        const progressPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
        
        const isCollapsed = type.isCollapsed || false;

        const typeHeader = document.createElement('div');
        typeHeader.className = 'flex-row';
        typeHeader.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
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
        
        // 1. Render Parent Tasks First
        const parentTasks = typeTasks.filter(t => !t.parentId);
        parentTasks.forEach(parentTask => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item flex-row ${parentTask.completed ? 'completed' : ''} ${parentTask.assignedDate ? 'translucent' : ''}`;
            taskEl.draggable = true; 
            
            taskEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', parentTask.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            taskEl.innerHTML = `
                <span class="drag-handle">⋮⋮</span>
                <input type="checkbox" class="task-checkbox" ${parentTask.completed ? 'checked' : ''} data-id="${parentTask.id}">
                <input type="text" class="inline-input task-input" value="${parentTask.name}" placeholder="Task (Press Tab for subtask)" data-id="${parentTask.id}">
            `;
            taskListDiv.appendChild(taskEl);

            // 2. Render Subtasks directly under their Parent
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
                saveData(); renderCalendar(); renderTasks(); // Updates progress bar colors
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
                saveData(); renderTasks(); renderCalendar();
            }
        });
    });

    document.querySelectorAll('.task-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const task = tasks.find(t => t.id === e.target.dataset.id);
            if (task) { task.name = e.target.value; saveData(); renderCalendar(); }
        });
        
        input.addEventListener('keydown', (e) => {
            const task = tasks.find(t => t.id === e.target.dataset.id);
            if (!task) return;

            // ENTER: Create new task (or subtask if currently on a subtask)
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewTask(task.typeId, task.parentId); 
            }

            // TAB: Indent / Outdent Logic
            if (e.key === 'Tab') {
                e.preventDefault();
                
                if (e.shiftKey) {
                    // Outdent (Make subtask into a parent task)
                    if (task.parentId) {
                        task.parentId = null;
                        saveData(); renderTasks(); restoreFocus(task.id);
                    }
                } else {
                    // Indent (Make parent task into a subtask)
                    if (!task.parentId) {
                        // Find the task directly above it to become its parent
                        const typeParentTasks = tasks.filter(t => t.typeId === task.typeId && !t.parentId);
                        const currentIndex = typeParentTasks.findIndex(t => t.id === task.id);
                        if (currentIndex > 0) {
                            task.parentId = typeParentTasks[currentIndex - 1].id;
                            task.assignedDate = null; // Remove subtasks from calendar
                            saveData(); renderTasks(); renderCalendar(); restoreFocus(task.id);
                        }
                    }
                }
            }
        });

        input.addEventListener('blur', (e) => {
            if (e.target.value.trim() === '') {
                const taskId = e.target.dataset.id;
                // Delete task, and any subtasks attached to it
                tasks = tasks.filter(t => t.id !== taskId && t.parentId !== taskId);
                saveData(); renderTasks(); renderCalendar();
            }
        });
    });

    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const task = tasks.find(t => t.id === e.target.dataset.id);
            if (task) {
                task.completed = e.target.checked;
                saveData(); renderTasks(); renderCalendar();
            }
        });
    });
}

// --- Calendar Logic ---
function openEventModal(dateStr, evtId = null) {
    targetEventDate = dateStr;
    targetEventId = evtId;

    if (evtId) {
        const evt = events.find(e => e.id === evtId);
        modalTitle.textContent = "Edit Event";
        eventNameInput.value = evt.name;
        eventColorInput.value = evt.color;
        deleteEventBtn.classList.remove('hidden');
    } else {
        modalTitle.textContent = "Add Event";
        eventNameInput.value = '';
        eventColorInput.value = '#ffeb3b';
        deleteEventBtn.classList.add('hidden');
    }

    eventModal.classList.remove('hidden');
    eventNameInput.focus();
}

function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell', 'empty-day');
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const cell = document.createElement('div');
        cell.classList.add('day-cell');
        cell.dataset.date = dateStr;
        
        cell.innerHTML = `
            <div class="day-header">
                <button class="add-event-btn" title="Add Event">+</button>
                <div class="day-number">${day}</div>
            </div>
        `;

        cell.querySelector('.add-event-btn').addEventListener('click', () => {
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
            
            // Only allow dropping Parent Tasks
            if (task && task.assignedDate !== dateStr && !task.parentId) {
                task.assignedDate = dateStr;
                saveData(); 
                renderTasks(); 
                renderCalendar(); 
            }
        });

        const dayEvents = events.filter(e => e.date === dateStr);
        if (dayEvents.length > 0) {
            cell.style.backgroundColor = getTranslucentColor(dayEvents[0].color, 0.3);
            dayEvents.forEach(evt => {
                const evtEl = document.createElement('div');
                evtEl.className = 'calendar-event';
                evtEl.textContent = evt.name;
                evtEl.addEventListener('click', () => openEventModal(dateStr, evt.id));
                cell.appendChild(evtEl);
            });
        }

        // Only render Parent Tasks in Calendar
        const dayTasks = tasks.filter(t => t.assignedDate === dateStr && !t.parentId);
        dayTasks.forEach(task => {
            const type = types.find(t => t.id === task.typeId);
            const taskEl = document.createElement('div');
            taskEl.className = `calendar-task ${task.completed ? 'completed' : ''}`;
            
            taskEl.draggable = true;
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
                saveData(); renderTasks(); renderCalendar();
            });

            cell.appendChild(taskEl);
        });

        calendarGrid.appendChild(cell);
    }
}