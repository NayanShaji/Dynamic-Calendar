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
    if (storedTypes) types = JSON.parse(storedTypes);
    if (storedTasks) tasks = JSON.parse(storedTasks);
    if (storedEvents) events = JSON.parse(storedEvents);
}

// --- Helper: Convert Hex to Translucent RGBA ---
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

    // --- Import / Export Logic ---
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    // Export Data (JSON)
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

    // Import Data (JSON)
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

    // Export to ICS (Google Calendar)
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

        tasks.filter(t => t.assignedDate).forEach(task => {
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

    // --- Sidebar Drop Zone Logic ---
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
        
        if (task) {
            task.assignedDate = null; 
            saveData(); 
            renderTasks();    
            renderCalendar(); 
        }
    });

    // --- Modal Logic ---
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
    types.push({ id: newId, name: '', color: '#3498db' });
    saveData(); renderTasks();
    setTimeout(() => document.querySelector(`input.type-input[data-id="${newId}"]`).focus(), 0);
}

function addNewTask(typeId) {
    const newId = Date.now().toString();
    tasks.push({ id: newId, name: '', typeId, completed: false, assignedDate: null });
    saveData(); renderTasks();
    setTimeout(() => document.querySelector(`input.task-input[data-id="${newId}"]`).focus(), 0);
}

function renderTasks() {
    taskListContainer.innerHTML = '';
    types.forEach(type => {
        const typeDiv = document.createElement('div');
        typeDiv.className = 'type-group';
        
        const typeHeader = document.createElement('div');
        typeHeader.className = 'flex-row';
        typeHeader.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <div class="color-picker-container" title="Click to change color">
                <input type="color" class="hidden-color-picker" value="${type.color}" data-id="${type.id}">
                <div class="color-dot" style="background-color: ${type.color};"></div>
            </div>
            <input type="text" class="inline-input type-input" value="${type.name}" placeholder="Type name..." data-id="${type.id}">
        `;
        typeDiv.appendChild(typeHeader);
        
        const typeTasks = tasks.filter(t => t.typeId === type.id);
        const taskListDiv = document.createElement('div');
        taskListDiv.className = 'task-list';
        
        typeTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item flex-row ${task.completed ? 'completed' : ''} ${task.assignedDate ? 'translucent' : ''}`;
            taskEl.draggable = true; 
            
            taskEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'move';
            });

            taskEl.innerHTML = `
                <span class="drag-handle">⋮⋮</span>
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <input type="text" class="inline-input task-input" value="${task.name}" placeholder="Task..." data-id="${task.id}">
            `;
            taskListDiv.appendChild(taskEl);
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
    document.querySelectorAll('.hidden-color-picker').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const type = types.find(t => t.id === e.target.dataset.id);
            if (type) {
                type.color = e.target.value;
                e.target.nextElementSibling.style.backgroundColor = type.color;
                saveData(); renderCalendar();
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
            if (e.key === 'Enter') {
                e.preventDefault();
                const task = tasks.find(t => t.id === e.target.dataset.id);
                if (task) addNewTask(task.typeId); 
            }
        });
        input.addEventListener('blur', (e) => {
            if (e.target.value.trim() === '') {
                tasks = tasks.filter(t => t.id !== e.target.dataset.id);
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
        emptyCell.classList.add('day-cell');
        emptyCell.style.background = '#f9f9f9';
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
            
            if (task && task.assignedDate !== dateStr) {
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

        const dayTasks = tasks.filter(t => t.assignedDate === dateStr);
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