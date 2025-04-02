// 全局变量
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let timer;
let timeLeft = 25 * 60; // 25分钟
let isRunning = false;
let completedTasks = parseInt(localStorage.getItem('completedTasks')) || 0;
let totalFocusTime = parseInt(localStorage.getItem('totalFocusTime')) || 0;

// DOM 元素
const taskInput = document.getElementById('taskInput');
const taskDate = document.getElementById('taskDate');
const addTaskBtn = document.getElementById('addTask');
const todayTaskList = document.getElementById('todayTaskList');
const futureTaskList = document.getElementById('futureTaskList');
const completedTaskList = document.getElementById('completedTaskList');
const todayCount = document.getElementById('todayCount');
const futureCount = document.getElementById('futureCount');
const completedCount = document.getElementById('completedCount');
const totalTasksDisplay = document.getElementById('totalTasks');
const startTimerBtn = document.getElementById('startTimer');
const pauseTimerBtn = document.getElementById('pauseTimer');
const resetTimerBtn = document.getElementById('resetTimer');
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const completedTasksDisplay = document.getElementById('completedTasks');
const focusTimeDisplay = document.getElementById('focusTime');

// 初始化日期选择器
const datePicker = flatpickr(taskDate, {
    locale: "zh",
    dateFormat: "Y-m-d",
    defaultDate: "today",
    theme: "material_blue",
    onChange: function(selectedDates, dateStr) {
        console.log('选择的日期:', dateStr);
    },
    allowInput: true,
    dateFormat: "Y-m-d",
    disableMobile: true
});

// 初始化
function init() {
    renderTasks();
    updateStats();
    updateTimerDisplay();
    updateTaskCounts();
}

// 任务相关函数
function addTask() {
    const taskText = taskInput.value.trim();
    const selectedDate = datePicker.selectedDates[0];
    
    if (taskText && selectedDate) {
        // 确保日期格式正确
        const formattedDate = selectedDate.toISOString().split('T')[0];
        console.log('添加任务，日期:', formattedDate);
        
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            date: formattedDate,
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        tasks.push(task);
        saveTasks();
        renderTasks();
        updateTaskCounts();
        taskInput.value = '';
        datePicker.clear();
    }
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            completedTasks++;
            task.completedAt = new Date().toISOString();
            saveStats();
            updateStats();
        } else {
            completedTasks--;
            task.completedAt = null;
            saveStats();
            updateStats();
        }
        saveTasks();
        // 立即重新渲染所有任务列表
        renderTasks();
        updateTaskCounts();
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    renderTasks();
    updateTaskCounts();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 设置时间为0点进行比较
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
        return '今天';
    } else if (date.getTime() === tomorrow.getTime()) {
        return '明天';
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }
}

function formatCompletionDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString.split('T')[0] === today.toISOString().split('T')[0]) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (dateString.split('T')[0] === yesterday.toISOString().split('T')[0]) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}

function renderTasks() {
    // 清空所有列表
    todayTaskList.innerHTML = '';
    futureTaskList.innerHTML = '';
    completedTaskList.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 对已完成任务按完成时间排序
    const completedTasks = tasks.filter(t => t.completed)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // 渲染未完成任务
    tasks.filter(task => !task.completed).forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <input type="checkbox" onclick="toggleTask(${task.id})">
            <span>${task.text}</span>
            <span class="task-date">${formatDate(task.date)}</span>
            <span class="delete-task" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </span>
        `;
        
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        
        if (taskDate.getTime() === today.getTime()) {
            todayTaskList.appendChild(taskElement);
        } else {
            futureTaskList.appendChild(taskElement);
        }
    });
    
    // 渲染已完成任务
    completedTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item completed';
        taskElement.innerHTML = `
            <input type="checkbox" checked onclick="toggleTask(${task.id})">
            <span>${task.text}</span>
            <span class="task-date">${formatDate(task.date)}</span>
            <span class="completion-date">完成于 ${formatCompletionDate(task.completedAt)}</span>
            <span class="delete-task" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </span>
        `;
        completedTaskList.appendChild(taskElement);
    });
}

function updateTaskCounts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTasks = tasks.filter(t => {
        if (t.completed) return false;
        const taskDate = new Date(t.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
    }).length;
    
    const futureTasks = tasks.filter(t => {
        if (t.completed) return false;
        const taskDate = new Date(t.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() !== today.getTime();
    }).length;
    
    const completedTasksCount = tasks.filter(t => t.completed).length;
    
    todayCount.textContent = todayTasks;
    futureCount.textContent = futureTasks;
    completedCount.textContent = completedTasksCount;
    totalTasksDisplay.textContent = tasks.length;
}

// 计时器相关函数
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startTimerBtn.disabled = true;
        pauseTimerBtn.disabled = false;
        timer = setInterval(updateTimer, 1000);
    }
}

function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
        clearInterval(timer);
    }
}

function resetTimer() {
    pauseTimer();
    timeLeft = 25 * 60;
    updateTimerDisplay();
}

function updateTimer() {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft === 0) {
        pauseTimer();
        totalFocusTime += 25;
        saveStats();
        updateStats();
        alert('时间到！休息一下吧！');
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
}

// 统计相关函数
function updateStats() {
    completedTasksDisplay.textContent = completedTasks;
    focusTimeDisplay.textContent = `${totalFocusTime}分钟`;
}

// 本地存储相关函数
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function saveStats() {
    localStorage.setItem('completedTasks', completedTasks);
    localStorage.setItem('totalFocusTime', totalFocusTime);
}

// 事件监听器
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

startTimerBtn.addEventListener('click', startTimer);
pauseTimerBtn.addEventListener('click', pauseTimer);
resetTimerBtn.addEventListener('click', resetTimer);

// 初始化应用
init(); 