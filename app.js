// Global variables
let tasks = [];
let calendar;
let subjectChart;
let priorityChart;
let currentEditingTask = null;

// Sample data
const sampleTasks = [
    {
        id: 1,
        name: "Complete ML Notes",
        subject: "Machine Learning",
        deadline: "2025-09-30",
        priority: "High",
        completed: true,
        completedDate: "2025-09-29",
        createdDate: "2025-09-25"
    },
    {
        id: 2,
        name: "Revise CN Diagrams",
        subject: "Computer Networks",
        deadline: "2025-10-01",
        priority: "Medium",
        completed: false,
        completedDate: null,
        createdDate: "2025-09-26"
    },
    {
        id: 3,
        name: "Database Assignment",
        subject: "Database Systems",
        deadline: "2025-10-03",
        priority: "High",
        completed: false,
        completedDate: null,
        createdDate: "2025-09-27"
    }
];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadTasksFromStorage();
    setupEventListeners();
    setMinDate();
    updateUI();
    initializeCalendar();
    updateCharts();
    setupHourlyReminders();
    generateSuggestions();
    loadTheme();
}

// Set minimum date for date inputs to today
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDeadline').setAttribute('min', today);
    document.getElementById('editTaskDeadline').setAttribute('min', today);
}

// Local Storage Functions
function saveTasksToStorage() {
    localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
}

function loadTasksFromStorage() {
    const storedTasks = localStorage.getItem('studyPlannerTasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        tasks = [...sampleTasks];
        saveTasksToStorage();
    }
}

function saveTheme(theme) {
    localStorage.setItem('studyPlannerTheme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('studyPlannerTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-color-scheme', theme);
    updateThemeIcon(theme);
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Task form
    document.getElementById('taskForm').addEventListener('submit', addTask);
    
    // Search and filter
    document.getElementById('searchTasks').addEventListener('input', filterTasks);
    document.getElementById('filterPriority').addEventListener('change', filterTasks);
    document.getElementById('filterStatus').addEventListener('change', filterTasks);
    document.getElementById('filterDeadline').addEventListener('change', filterTasks);
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    document.getElementById('editTaskForm').addEventListener('submit', saveEditedTask);
    
    // Close modal on backdrop click
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditModal();
        }
    });
}

// Theme Functions
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-color-scheme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-color-scheme', newTheme);
    updateThemeIcon(newTheme);
    saveTheme(newTheme);
    
    // Update charts with new theme
    setTimeout(() => {
        updateCharts();
        if (calendar) {
            calendar.render();
        }
    }, 100);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// Task Management Functions
function addTask(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('taskName').value.trim();
    const taskSubject = document.getElementById('taskSubject').value;
    const taskDeadline = document.getElementById('taskDeadline').value;
    const taskPriority = document.getElementById('taskPriority').value;
    
    if (!taskName || !taskSubject || !taskDeadline || !taskPriority) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        name: taskName,
        subject: taskSubject,
        deadline: taskDeadline,
        priority: taskPriority,
        completed: false,
        completedDate: null,
        createdDate: new Date().toISOString().split('T')[0]
    };
    
    tasks.push(newTask);
    saveTasksToStorage();
    updateUI();
    
    // Clear form
    document.getElementById('taskForm').reset();
    
    showToast('Task added successfully!', 'success');
}

function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        task.completedDate = task.completed ? new Date().toISOString().split('T')[0] : null;
        
        // Reset reminder sent flag when task is uncompleted
        if (!task.completed) {
            task.reminderSent = false;
        }
        
        saveTasksToStorage();
        updateUI();
        
        const message = task.completed ? 'Task completed! 🎉' : 'Task marked as pending';
        showToast(message, 'success');
    }
}

function deleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && confirm(`Are you sure you want to delete "${task.name}"?`)) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasksToStorage();
        updateUI();
        showToast('Task deleted successfully!', 'success');
    }
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        currentEditingTask = task;
        
        document.getElementById('editTaskName').value = task.name;
        document.getElementById('editTaskSubject').value = task.subject;
        document.getElementById('editTaskDeadline').value = task.deadline;
        document.getElementById('editTaskPriority').value = task.priority;
        
        document.getElementById('editModal').classList.remove('hidden');
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('editTaskName').focus();
        }, 100);
    }
}

function saveEditedTask(e) {
    e.preventDefault();
    
    if (!currentEditingTask) return;
    
    const taskName = document.getElementById('editTaskName').value.trim();
    const taskSubject = document.getElementById('editTaskSubject').value;
    const taskDeadline = document.getElementById('editTaskDeadline').value;
    const taskPriority = document.getElementById('editTaskPriority').value;
    
    if (!taskName || !taskSubject || !taskDeadline || !taskPriority) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    currentEditingTask.name = taskName;
    currentEditingTask.subject = taskSubject;
    currentEditingTask.deadline = taskDeadline;
    currentEditingTask.priority = taskPriority;
    
    saveTasksToStorage();
    updateUI();
    closeEditModal();
    
    showToast('Task updated successfully!', 'success');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    currentEditingTask = null;
}

// UI Update Functions
function updateUI() {
    renderTasks();
    updateProgress();
    updateProductivityScore();
    updateNextReminder();
    updateCharts();
    updateCalendar();
    generateSuggestions();
}

function renderTasks(tasksToRender = null) {
    const tasksList = document.getElementById('tasksList');
    const tasksArray = tasksToRender || tasks;
    
    if (tasksArray.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks found</h3>
                <p>Add a new task to get started!</p>
            </div>
        `;
        return;
    }
    
    // Find next due task
    const now = new Date();
    const pendingTasks = tasksArray.filter(task => !task.completed);
    const sortedPending = pendingTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const nextDueTask = sortedPending[0];
    
    tasksList.innerHTML = tasksArray.map(task => {
        const isNextDue = nextDueTask && task.id === nextDueTask.id;
        const daysUntilDeadline = Math.ceil((new Date(task.deadline) - now) / (1000 * 60 * 60 * 24));
        
        let deadlineText = '';
        if (daysUntilDeadline < 0) {
            deadlineText = `(${Math.abs(daysUntilDeadline)} days overdue)`;
        } else if (daysUntilDeadline === 0) {
            deadlineText = '(Due today!)';
        } else {
            deadlineText = `(${daysUntilDeadline} days left)`;
        }
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isNextDue ? 'next-due' : ''} fade-in">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="toggleTaskCompletion(${task.id})">
                <div class="task-info">
                    <div class="task-name">${escapeHtml(task.name)}</div>
                    <div class="task-meta">
                        <span class="task-subject">${escapeHtml(task.subject)}</span>
                        <span class="task-deadline">Due: ${formatDate(task.deadline)} ${deadlineText}</span>
                        <span class="task-priority ${task.priority.toLowerCase()}">${task.priority}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn--outline btn--sm" onclick="editTask(${task.id})" type="button">Edit</button>
                    <button class="btn btn--outline btn--sm" onclick="deleteTask(${task.id})" type="button">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateProgress() {
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `${percentage}% completed (${completedTasks}/${totalTasks} tasks)`;
}

function updateProductivityScore() {
    const completedTasks = tasks.filter(task => task.completed);
    const totalTasks = tasks.length;
    
    if (totalTasks === 0) {
        document.getElementById('productivityScore').textContent = '😊 No tasks yet';
        document.getElementById('productivityMessage').textContent = 'Add some tasks to get started!';
        return;
    }
    
    // Calculate completion rate (60% weight)
    const completionRate = (completedTasks.length / totalTasks) * 100;
    
    // Calculate punctuality (40% weight)
    let punctualityScore = 100;
    const now = new Date();
    
    completedTasks.forEach(task => {
        if (task.completedDate) {
            const deadlineDate = new Date(task.deadline);
            const completedDate = new Date(task.completedDate);
            
            if (completedDate > deadlineDate) {
                punctualityScore -= 10; // Penalize late completion
            }
        }
    });
    
    // Check overdue tasks
    const overdueTasks = tasks.filter(task => {
        if (task.completed) return false;
        return new Date(task.deadline) < now;
    });
    
    punctualityScore -= overdueTasks.length * 15;
    punctualityScore = Math.max(0, punctualityScore);
    
    // Final score calculation
    const finalScore = Math.round((completionRate * 0.6) + (punctualityScore * 0.4));
    
    let emoji, message;
    if (finalScore >= 90) {
        emoji = '🔥';
        message = 'Excellent work! Keep it up!';
    } else if (finalScore >= 70) {
        emoji = '👍';
        message = 'Good progress! Stay focused!';
    } else if (finalScore >= 50) {
        emoji = '⚠️';
        message = 'Needs improvement. Stay organized!';
    } else {
        emoji = '😰';
        message = 'Time to get back on track!';
    }
    
    document.getElementById('productivityScore').textContent = `${emoji} ${finalScore}/100`;
    document.getElementById('productivityMessage').textContent = message;
}

function updateNextReminder() {
    const now = new Date();
    const pendingTasks = tasks.filter(task => !task.completed);
    
    if (pendingTasks.length === 0) {
        document.getElementById('nextReminder').textContent = 'No upcoming tasks';
        return;
    }
    
    // Sort by deadline
    pendingTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const nextTask = pendingTasks[0];
    
    const deadlineDate = new Date(nextTask.deadline);
    const timeDiff = deadlineDate - now;
    const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let timeText;
    if (daysUntil < 0) {
        timeText = `overdue by ${Math.abs(daysUntil)} days`;
    } else if (daysUntil === 0) {
        timeText = 'due today';
    } else if (daysUntil === 1) {
        timeText = 'due tomorrow';
    } else {
        timeText = `due in ${daysUntil} days`;
    }
    
    document.getElementById('nextReminder').textContent = `"${nextTask.name}" ${timeText}`;
}

// Filter and Search Functions
function filterTasks() {
    const searchTerm = document.getElementById('searchTasks').value.toLowerCase();
    const priorityFilter = document.getElementById('filterPriority').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const deadlineFilter = document.getElementById('filterDeadline').value;
    
    let filteredTasks = tasks.filter(task => {
        // Search filter
        const matchesSearch = task.name.toLowerCase().includes(searchTerm) || 
                            task.subject.toLowerCase().includes(searchTerm);
        
        // Priority filter
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        
        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'completed') {
            matchesStatus = task.completed;
        } else if (statusFilter === 'pending') {
            matchesStatus = !task.completed;
        }
        
        // Deadline filter
        let matchesDeadline = true;
        if (deadlineFilter) {
            const now = new Date();
            const taskDeadline = new Date(task.deadline);
            
            if (deadlineFilter === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                matchesDeadline = taskDeadline >= today && taskDeadline < tomorrow;
            } else if (deadlineFilter === 'week') {
                const weekFromNow = new Date();
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                matchesDeadline = taskDeadline <= weekFromNow;
            }
        }
        
        return matchesSearch && matchesPriority && matchesStatus && matchesDeadline;
    });
    
    renderTasks(filteredTasks);
}

// Chart Functions
function updateCharts() {
    updateSubjectChart();
    updatePriorityChart();
}

function updateSubjectChart() {
    const ctx = document.getElementById('subjectChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    // Count tasks by subject
    const subjectCounts = {};
    tasks.forEach(task => {
        subjectCounts[task.subject] = (subjectCounts[task.subject] || 0) + 1;
    });
    
    const labels = Object.keys(subjectCounts);
    const data = Object.values(subjectCounts);
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545'];
    
    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }
    
    subjectChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text'),
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

function updatePriorityChart() {
    const ctx = document.getElementById('priorityChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (priorityChart) {
        priorityChart.destroy();
    }
    
    // Count tasks by priority
    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    tasks.forEach(task => {
        priorityCounts[task.priority]++;
    });
    
    priorityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Number of Tasks',
                data: [priorityCounts.High, priorityCounts.Medium, priorityCounts.Low],
                backgroundColor: ['#B4413C', '#FFC185', '#1FB8CD'],
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text')
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-border')
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text'),
                        stepSize: 1
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-border')
                    }
                }
            }
        }
    });
}

// Calendar Functions
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        events: getCalendarEvents(),
        eventClick: function(info) {
            const task = tasks.find(t => t.id == info.event.id);
            if (task) {
                showToast(`${task.name} - ${task.subject} (${task.priority} priority)`, 'info');
            }
        },
        height: 'auto',
        themeSystem: 'bootstrap'
    });
    
    calendar.render();
}

function updateCalendar() {
    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(getCalendarEvents());
        calendar.render();
    }
}

function getCalendarEvents() {
    return tasks.map(task => ({
        id: task.id,
        title: task.name,
        date: task.deadline,
        className: `${task.priority.toLowerCase()}-priority`,
        backgroundColor: getPriorityColor(task.priority),
        borderColor: getPriorityColor(task.priority),
        textColor: '#fff',
        extendedProps: {
            subject: task.subject,
            priority: task.priority,
            completed: task.completed
        }
    }));
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'High': return '#B4413C';
        case 'Medium': return '#FFC185';
        case 'Low': return '#1FB8CD';
        default: return '#5D878F';
    }
}

// Reminder and Notification Functions
function setupHourlyReminders() {
    // Check every minute for upcoming tasks
    setInterval(checkUpcomingTasks, 60000);
    
    // Initial check
    checkUpcomingTasks();
}

function checkUpcomingTasks() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const upcomingTasks = tasks.filter(task => {
        if (task.completed) return false;
        
        const deadlineDate = new Date(task.deadline);
        deadlineDate.setHours(23, 59, 59, 999); // Set to end of day
        
        return deadlineDate <= twoHoursFromNow && deadlineDate > now;
    });
    
    upcomingTasks.forEach(task => {
        const deadlineDate = new Date(task.deadline);
        const hoursUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60));
        
        // Only show reminder once per task
        if (hoursUntil <= 48 && !task.reminderSent) {
            let timeText = '';
            if (hoursUntil <= 24) {
                timeText = hoursUntil <= 1 ? 'due very soon' : `due in ${hoursUntil} hours`;
            } else {
                const days = Math.ceil(hoursUntil / 24);
                timeText = `due in ${days} days`;
            }
            
            showToast(`⏰ Reminder: "${task.name}" is ${timeText}!`, 'warning');
            task.reminderSent = true;
            saveTasksToStorage();
        }
    });
}

// ML Suggestions
function generateSuggestions() {
    const suggestionsContainer = document.getElementById('suggestions');
    const suggestions = [];
    
    if (tasks.length === 0) {
        suggestions.push(`🌟 Welcome to Smart Study Planner! Add your first task to get personalized suggestions.`);
        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item slide-in">${suggestion}</div>
        `).join('');
        return;
    }
    
    // Analyze completion patterns
    const completedTasks = tasks.filter(task => task.completed);
    const pendingTasks = tasks.filter(task => !task.completed);
    const now = new Date();
    
    // Check for overdue tasks
    const overdueTasks = pendingTasks.filter(task => {
        return new Date(task.deadline) < now;
    });
    
    if (overdueTasks.length > 0) {
        suggestions.push(`🚨 You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. Consider prioritizing them!`);
    }
    
    // Late completion pattern
    const lateCompletedTasks = tasks.filter(task => {
        if (task.completed && task.completedDate) {
            return new Date(task.completedDate) > new Date(task.deadline);
        }
        return false;
    });
    
    if (lateCompletedTasks.length > 0) {
        const lateSubjects = {};
        lateCompletedTasks.forEach(task => {
            lateSubjects[task.subject] = (lateSubjects[task.subject] || 0) + 1;
        });
        
        const mostLateSubject = Object.keys(lateSubjects).reduce((a, b) => 
            lateSubjects[a] > lateSubjects[b] ? a : b
        );
        
        suggestions.push(`💡 You tend to complete ${mostLateSubject} tasks late. Consider setting higher priority for similar tasks.`);
    }
    
    // High priority pattern
    const highPriorityTasks = tasks.filter(task => task.priority === 'High');
    const completedHighPriority = highPriorityTasks.filter(task => task.completed);
    
    if (highPriorityTasks.length > 0) {
        const completionRate = (completedHighPriority.length / highPriorityTasks.length) * 100;
        
        if (completionRate < 70) {
            suggestions.push(`🎯 Your high-priority task completion rate is ${Math.round(completionRate)}%. Focus on completing urgent tasks first.`);
        } else if (completionRate === 100) {
            suggestions.push(`🌟 Perfect! You've completed all high-priority tasks. Great job!`);
        }
    }
    
    // Subject workload suggestion
    const subjectCounts = {};
    pendingTasks.forEach(task => {
        subjectCounts[task.subject] = (subjectCounts[task.subject] || 0) + 1;
    });
    
    const heaviestSubject = Object.keys(subjectCounts).reduce((a, b) => 
        subjectCounts[a] > subjectCounts[b] ? a : b, null
    );
    
    if (heaviestSubject && subjectCounts[heaviestSubject] > 2) {
        suggestions.push(`📚 You have ${subjectCounts[heaviestSubject]} pending tasks in ${heaviestSubject}. Consider breaking them into smaller chunks.`);
    }
    
    // Positive reinforcement
    if (completedTasks.length > 0 && pendingTasks.length === 0) {
        suggestions.push(`🎉 Amazing! You've completed all your tasks. Time to add some new goals!`);
    } else if (completedTasks.length > pendingTasks.length) {
        suggestions.push(`👏 Great progress! You've completed more tasks than you have pending. Keep it up!`);
    }
    
    // Default suggestion if no patterns found
    if (suggestions.length === 0) {
        suggestions.push(`✨ Keep up the great work! Consider adding deadlines 1-2 days earlier to avoid last-minute stress.`);
    }
    
    // Limit to 3 suggestions
    const displaySuggestions = suggestions.slice(0, 3);
    
    suggestionsContainer.innerHTML = displaySuggestions.map(suggestion => `
        <div class="suggestion-item slide-in">${suggestion}</div>
    `).join('');
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function showToast(message, type = 'info') {
    let backgroundColor;
    switch (type) {
        case 'success':
            backgroundColor = '#1FB8CD';
            break;
        case 'error':
            backgroundColor = '#B4413C';
            break;
        case 'warning':
            backgroundColor = '#FFC185';
            break;
        default:
            backgroundColor = '#5D878F';
    }
    
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: backgroundColor,
        className: "toastify",
        stopOnFocus: true,
        close: true
    }).showToast();
}

// Make functions available globally for onclick handlers
window.toggleTaskCompletion = toggleTaskCompletion;
window.editTask = editTask;
window.deleteTask = deleteTask;