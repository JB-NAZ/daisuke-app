/**
 * Schedule App Core Logic
 */

// State
const state = {
    events: [],
    currentDate: new Date(),
    selectedDate: null,
    view: 'home',
    currentCategory: null // Track active category
};

// DOM Elements
const elements = {
    views: document.querySelectorAll('.view'),
    navItems: document.querySelectorAll('.nav-item'),
    fab: document.getElementById('add-event-btn'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    menuBtn: document.getElementById('menu-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar'),
    modals: {
        addEvent: document.getElementById('modal-add-event'),
        dayDetails: document.getElementById('modal-day-details')
    },
    forms: {
        addEvent: document.getElementById('add-event-form')
    },
    calendar: {
        grid: document.getElementById('calendar-grid'),
        monthDisplay: document.getElementById('current-month-display'),
        prevBtn: document.getElementById('prev-month'),
        nextBtn: document.getElementById('next-month')
    },
    lists: {
        upcoming: document.getElementById('upcoming-list'),
        important: document.getElementById('important-section'),
        category: document.getElementById('category-task-list'),
        day: document.getElementById('day-events-list')
    },
    counts: {
        assignment: document.getElementById('count-assignment'),
        attendance: document.getElementById('count-attendance'),
        parttime: document.getElementById('count-parttime'),
        event: document.getElementById('count-event'),
        other: document.getElementById('count-other')
    },
    memo: document.getElementById('memo-area')
};

// Initialization
function init() {
    loadData();
    setupEventListeners();
    renderAll();
}

// Data Management
function loadData() {
    const storedEvents = localStorage.getItem('schedule_events');
    if (storedEvents) {
        state.events = JSON.parse(storedEvents);
    }
    
    const storedMemo = localStorage.getItem('schedule_memo');
    if (storedMemo) {
        elements.memo.value = storedMemo;
    }
}

function saveData() {
    localStorage.setItem('schedule_events', JSON.stringify(state.events));
}

function saveMemo() {
    localStorage.setItem('schedule_memo', elements.memo.value);
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.dataset.target;
            switchView(targetId);
            
            // Update active nav state
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Close sidebar
            closeSidebar();
        });
    });

    // Sidebar
    elements.menuBtn.addEventListener('click', openSidebar);
    elements.closeSidebarBtn.addEventListener('click', closeSidebar);
    elements.sidebarOverlay.addEventListener('click', closeSidebar);

    // FAB
    elements.fab.addEventListener('click', () => {
        openModal('addEvent');
    });

    // Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Add Event Form
    elements.forms.addEvent.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newEvent = {
            id: Date.now().toString(),
            title: document.getElementById('event-title').value,
            category: document.querySelector('input[name="category"]:checked').value,
            date: document.getElementById('event-date').value,
            memo: document.getElementById('event-memo').value,
            isImportant: document.getElementById('event-important').checked,
            completed: false,
            createdAt: new Date().toISOString()
        };

        addEvent(newEvent);
        closeAllModals();
        e.target.reset();
        
        // Reset date to today or selected
        document.getElementById('event-date').valueAsDate = new Date();
    });

    // Calendar Navigation
    elements.calendar.prevBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderCalendar();
    });

    elements.calendar.nextBtn.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Category Cards
    document.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            showCategoryList(category);
        });
    });

    // Back Button in List View
    document.querySelector('.back-btn').addEventListener('click', () => {
        switchView('view-home');
    });
    
    // View All Link
    document.getElementById('view-all-link').addEventListener('click', (e) => {
        e.preventDefault();
        showCategoryList('all');
    });

    // Memo Auto-save
    elements.memo.addEventListener('input', saveMemo);
    
    // Add Event from Day Modal
    document.getElementById('add-event-on-day').addEventListener('click', () => {
        if (state.selectedDate) {
            document.getElementById('event-date').value = state.selectedDate;
            closeAllModals();
            openModal('addEvent');
        }
    });
}

// Logic
function addEvent(event) {
    state.events.push(event);
    saveData();
    renderAll();
}

function deleteEvent(id) {
    if(confirm('このイベントを削除しますか？')) {
        state.events = state.events.filter(e => e.id !== id);
        saveData();
        renderAll();
        
        // Refresh day modal if open
        if (state.selectedDate) {
            openDayDetails(state.selectedDate);
        }
    }
}

function toggleComplete(id) {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    const event = state.events.find(e => e.id === id);
    if (event) {
        event.completed = !event.completed;
        saveData();
        renderAll();
    }
}

// Rendering
function renderAll() {
    renderCounts();
    renderImportant();
    renderUpcoming();
    renderCalendar();
    
    // Refresh active list view if open
    const listTitle = document.getElementById('list-title').textContent;
    if (document.getElementById('view-list').classList.contains('active')) {
        // Reverse lookup category from title or just re-run filter based on current knowledge
        // Easier way: store currentCategory in state
        if (state.currentCategory) {
            showCategoryList(state.currentCategory);
        }
    }
}

function renderCounts() {
    const counts = {
        assignment: 0, attendance: 0, parttime: 0, event: 0, other: 0
    };
    
    state.events.forEach(e => {
        if (!e.completed && counts.hasOwnProperty(e.category)) {
            counts[e.category]++;
        }
    });

    for (const [key, val] of Object.entries(counts)) {
        if (elements.counts[key]) {
            elements.counts[key].textContent = val;
        }
    }
}



function renderImportant() {
    const list = elements.lists.important;
    list.innerHTML = '';
    
    // Get important events
    const today = new Date().toISOString().split('T')[0];
    const important = state.events
        .filter(e => e.isImportant && !e.completed)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
        
    if (important.length === 0) {
        list.style.display = 'none';
        return;
    }
    
    list.style.display = 'block';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'section-title';
    title.innerHTML = `<h1>重要</h1>`;
    list.appendChild(title);
    
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '16px'; // var(--spacing-md)
    
    important.forEach(e => {
        container.appendChild(createEventCard(e));
    });
    
    list.appendChild(container);
}

function renderUpcoming() {
    const list = elements.lists.upcoming;
    list.innerHTML = '';
    
    // Get future events, sort by date
    const today = new Date().toISOString().split('T')[0];
    const upcoming = state.events
        .filter(e => e.date >= today && !e.completed && !e.isImportant)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5); // Show top 5

    if (upcoming.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding: 20px;">今後の予定はありません</div>';
        return;
    }

    upcoming.forEach(e => {
        list.appendChild(createEventCard(e));
    });
}

function createEventCard(e) {
    const div = document.createElement('div');
    div.className = `task-card ${e.category} ${e.completed ? 'completed' : ''}`;
    
    // Calculate days remaining for assignments
    let reminderHtml = '';
    if (e.category === 'assignment' && !e.completed) {
        const diffTime = new Date(e.date) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 3 && diffDays >= 0) {
            reminderHtml = `<div class="reminder-badge"><i class="fa-solid fa-triangle-exclamation"></i> 期限間近</div>`;
        }
    }

    div.innerHTML = `
        <div class="task-info" onclick="showEventDetails('${e.id}')">
            <div class="task-title">
                ${e.title}
            </div>
            <div class="task-meta">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(e.date)}</span>
                ${e.memo ? '<span><i class="fa-solid fa-note-sticky"></i></span>' : ''}
                ${e.isImportant ? '<span class="badge-important">重要</span>' : ''}
            </div>
            ${reminderHtml}
        </div>
        ${e.category === 'assignment' ? `
        <div class="task-check" onclick="toggleComplete('${e.id}')">
            <i class="fa-solid fa-check"></i>
        </div>
        ` : `
        <div class="task-check" onclick="deleteEvent('${e.id}')" style="border:none; color: var(--text-secondary)">
             <i class="fa-solid fa-trash"></i>
        </div>
        `}
    `;
    return div;
}

function renderCalendar() {
    const grid = elements.calendar.grid;
    grid.innerHTML = '';
    
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    elements.calendar.monthDisplay.textContent = new Date(year, month).toLocaleString('ja-JP', { year: 'numeric', month: 'long' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }
    
    // Days
    const todayStr = new Date().toISOString().split('T')[0];
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (dateStr === todayStr) div.classList.add('today');
        
        div.innerHTML = `<span>${i}</span>`;
        
        // Dots for events
        const dayEvents = state.events.filter(e => e.date === dateStr);
        if (dayEvents.length > 0) {
            const dotsDiv = document.createElement('div');
            dotsDiv.className = 'day-dots';
            // Show max 3 dots
            dayEvents.slice(0, 3).forEach(e => {
                const dot = document.createElement('div');
                dot.className = `dot ${e.category}`;
                dotsDiv.appendChild(dot);
            });
            div.appendChild(dotsDiv);
        }
        
        div.addEventListener('click', () => openDayDetails(dateStr));
        grid.appendChild(div);
    }
}

function openDayDetails(dateStr) {
    state.selectedDate = dateStr;
    document.getElementById('selected-date-title').textContent = formatDate(dateStr);
    
    const list = elements.lists.day;
    list.innerHTML = '';
    
    const dayEvents = state.events.filter(e => e.date === dateStr);
    
    if (dayEvents.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">この日の予定はありません</p>';
    } else {
        dayEvents.forEach(e => {
            list.appendChild(createEventCard(e));
        });
    }
    
    openModal('dayDetails');
}

function showCategoryList(category) {
    state.currentCategory = category; // Store current category
    switchView('view-list');
    const list = elements.lists.category;
    list.innerHTML = '';
    
    let filtered = [];
    if (category === 'all') {
        document.getElementById('list-title').textContent = 'すべてのイベント';
        filtered = state.events;
    } else {
        const catMap = {
            'assignment': '課題',
            'attendance': '出席',
            'parttime': 'バイト',
            'event': '行事',
            'other': 'その他'
        };
        document.getElementById('list-title').textContent = catMap[category] || category;
        filtered = state.events.filter(e => e.category === category);
    }
    
    // Sort by date
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top: 20px;">イベントが見つかりません</p>';
        return;
    }

    filtered.forEach(e => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '10px';
        wrapper.appendChild(createEventCard(e));
        list.appendChild(wrapper);
    });
}

// Helpers
function switchView(viewId) {
    elements.views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    // Hide FAB on memo view? Optional. Keeping it for now.
}

function openModal(name) {
    elements.modals[name].classList.add('open');
}

function closeAllModals() {
    Object.values(elements.modals).forEach(m => m.classList.remove('open'));
}

function openSidebar() {
    elements.sidebar.classList.add('open');
    elements.sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('open');
}

function formatDate(dateStr) {
    const options = { month: 'short', day: 'numeric', weekday: 'short' };
    return new Date(dateStr).toLocaleDateString('ja-JP', options);
}

// Start
document.addEventListener('DOMContentLoaded', init);
