class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentView = 'tasks';
        this.currentFilter = 'all';
        this.currentDate = new Date();
        this.editingTaskId = null;
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.render();
        this.fetchSampleTasks();
    }

    loadTasks() {
        const savedTasks = localStorage.getItem('taskmaster_tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }
    }

    saveTasks() {
        localStorage.setItem('taskmaster_tasks', JSON.stringify(this.tasks));
    }

    async fetchSampleTasks() {
        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
            if (!response.ok) throw new Error('API request failed');
            const todos = await response.json();
            
            const sampleTasks = todos.map((todo, index) => ({
                id: Date.now() + index,
                title: todo.title,
                description: 'Tarefa de exemplo carregada da API pública',
                dueDate: new Date(Date.now() + (index + 1) * 86400000).toISOString().split('T')[0],
                priority: ['routine', 'urgent', 'important', 'delegate', 'postpone'][index % 5],
                status: todo.completed ? 'completed' : 'pending',
                notes: 'Notas adicionais para esta tarefa de exemplo'
            }));
            
            if (this.tasks.length === 0) {
                this.tasks = sampleTasks;
                this.saveTasks();
                this.render();
            }
        } catch (error) {
            console.log('Using local data only:', error.message);
        }
    }

    setupEventListeners() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openModal());
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') this.closeModal();
        });
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleSubmit(e));
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });
        
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
    }

    openModal(taskId = null) {
        this.editingTaskId = taskId;
        const modal = document.getElementById('modalOverlay');
        const form = document.getElementById('taskForm');
        const title = document.getElementById('modalTitle');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                title.textContent = 'Editar Tarefa';
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskDueDate').value = task.dueDate || '';
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskNotes').value = task.notes || '';
            }
        } else {
            title.textContent = 'Nova Tarefa';
            form.reset();
        }
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeModal() {
        const modal = document.getElementById('modalOverlay');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        this.editingTaskId = null;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const taskData = {
            id: this.editingTaskId || Date.now(),
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            dueDate: document.getElementById('taskDueDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            notes: document.getElementById('taskNotes').value,
            createdAt: this.editingTaskId ? 
                this.tasks.find(t => t.id === this.editingTaskId)?.createdAt : 
                new Date().toISOString()
        };
        
        if (this.editingTaskId) {
            const index = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (index !== -1) this.tasks[index] = taskData;
        } else {
            this.tasks.push(taskData);
        }
        
        this.saveTasks();
        this.render();
        this.closeModal();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
        this.render();
    }

    updateStatus(taskId, status) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = status;
            this.saveTasks();
            this.render();
        }
    }

    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        document.getElementById('tasksView').classList.toggle('hidden', view !== 'tasks');
        document.getElementById('agendaView').classList.toggle('hidden', view !== 'agenda');
        document.getElementById('notesView').classList.toggle('hidden', view !== 'notes');
        
        if (view === 'agenda') this.renderCalendar();
        if (view === 'notes') this.renderNotes();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTasks();
    }

    getFilteredTasks() {
        if (this.currentFilter === 'all') return this.tasks;
        return this.tasks.filter(t => t.priority === this.currentFilter);
    }

    render() {
        this.renderStats();
        this.renderTasks();
        if (this.currentView === 'agenda') this.renderCalendar();
        if (this.currentView === 'notes') this.renderNotes();
    }

    renderStats() {
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const urgent = this.tasks.filter(t => t.priority === 'urgent').length;
        
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('inProgressCount').textContent = inProgress;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('urgentCount').textContent = urgent;
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 4rem; margin-bottom: 16px;">📋</div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Nenhuma tarefa encontrada</h3>
                    <p>Clique em "Nova Tarefa" para começar</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
        
        container.querySelectorAll('.task-card').forEach(card => {
            const taskId = parseInt(card.dataset.id);
            
            card.querySelector('.edit-btn')?.addEventListener('click', () => this.openModal(taskId));
            card.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteTask(taskId));
            card.querySelectorAll('.status-btn').forEach(btn => {
                btn.addEventListener('click', () => this.updateStatus(taskId, btn.dataset.status));
            });
        });
    }

    createTaskCard(task) {
        const priorityLabels = {
            routine: { icon: 'repeat', label: 'Rotina' },
            urgent: { icon: 'warning', label: 'Urgente' },
            important: { icon: 'star', label: 'Importante' },
            delegate: { icon: 'group', label: 'Delegar' },
            postpone: { icon: 'schedule_send', label: 'Adiar' }
        };
        
        const statusButtons = `
            <button class="status-btn ${task.status === 'pending' ? 'active' : ''}" data-status="pending">
                <span class="material-icons">schedule</span>
                Para Começar
            </button>
            <button class="status-btn ${task.status === 'in-progress' ? 'active' : ''}" data-status="in-progress">
                <span class="material-icons">rotate_right</span>
                Em Andamento
            </button>
            <button class="status-btn ${task.status === 'completed' ? 'active' : ''}" data-status="completed">
                <span class="material-icons">check_circle</span>
                Concluída
            </button>
        `;
        
        return `
            <div class="task-card ${task.priority} ${task.status}" data-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button class="task-action-btn edit-btn" aria-label="Editar tarefa">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="task-action-btn delete-btn" aria-label="Excluir tarefa">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="task-tag ${task.priority}">
                        <span class="material-icons">${priorityLabels[task.priority].icon}</span>
                        ${priorityLabels[task.priority].label}
                    </span>
                    ${task.dueDate ? `<span class="task-due-date">
                        <span class="material-icons">event</span>
                        ${task.dueDate}
                    </span>` : ''}
                </div>
                ${task.notes ? `<div class="task-notes"><strong>Notas:</strong> ${this.escapeHtml(task.notes)}</div>` : ''}
                <div class="task-footer">
                    <div class="task-status">
                        ${statusButtons}
                    </div>
                </div>
            </div>
        `;
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        document.getElementById('currentMonth').textContent = 
            `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let html = dayNames.map(day => `<div class="calendar-day-header">${day}</div>`).join('');
        
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day disabled"></div>';
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const tasksOnDay = this.tasks.filter(t => t.dueDate === dateStr);
            const hasTasks = tasksOnDay.length > 0;
            
            html += `
                <div class="calendar-day ${hasTasks ? 'has-tasks' : ''}" data-date="${dateStr}">
                    <span class="calendar-day-number">${day}</span>
                    ${hasTasks ? `<span class="calendar-day-tasks">${tasksOnDay.length} tarefa${tasksOnDay.length > 1 ? 's' : ''}</span>` : ''}
                </div>
            `;
        }
        
        calendar.innerHTML = html;
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        const tasksWithNotes = this.tasks.filter(t => t.notes);
        
        if (tasksWithNotes.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <div style="font-size: 4rem; margin-bottom: 16px;">📝</div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Nenhuma nota encontrada</h3>
                    <p>Adicione notas às suas tarefas para vê-las aqui</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasksWithNotes.map(task => `
            <div class="note-card">
                <h3 class="note-title">${this.escapeHtml(task.title)}</h3>
                <p class="note-content">${this.escapeHtml(task.notes)}</p>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});
