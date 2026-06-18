const { ipcRenderer } = require('electron');

const RING_CIRCUMFERENCE = 2 * Math.PI * 85;

const DEFAULT_SHORTCUTS = {
  toggleTimer: 'Ctrl+Shift+S',
  resetTimer: 'Ctrl+Shift+R',
  toggleWindow: 'Ctrl+Shift+H',
};

let state = {
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  totalSeconds: 25 * 60,
  isRunning: false,
  timerId: null,
  startTime: null,
  data: { records: {}, tasks: {}, lastActiveDate: null, customPresets: [] },
  currentDate: getDateKey(new Date()),
  editingRecordId: null,
  editingDateKey: null,
  settings: { ...DEFAULT_SHORTCUTS },
  tempSettings: { ...DEFAULT_SHORTCUTS },
  recordingShortcut: null,
  charts: {
    trend: null,
    hour: null,
    tag: null,
  },
  trendPeriod: '30days',
  currentTaskId: null,
  editingTaskId: null,
  tempTaskPomodoroCount: 1,
  activeTab: 'tasks',
  draggedTaskId: null,
  deepFocusMode: false,
  isFullscreen: false,
  calendar: {
    viewMode: 'month',
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    viewWeekStart: null,
    weekZoom: 60,
    holidays: {},
    holidaysEnabled: false,
    quickRecordDate: null,
  },
};

const el = {
  app: document.getElementById('app'),
  timerText: document.getElementById('timerText'),
  ringProgress: document.getElementById('ringProgress'),
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resetBtn: document.getElementById('resetBtn'),
  tomatoes: document.getElementById('tomatoes'),
  dateTitle: document.getElementById('dateTitle'),
  datePicker: document.getElementById('datePicker'),
  recordsContainer: document.getElementById('recordsContainer'),
  todayMinutes: document.getElementById('todayMinutes'),
  weekMinutes: document.getElementById('weekMinutes'),
  barChart: document.getElementById('barChart'),
  recordModal: document.getElementById('recordModal'),
  recordInput: document.getElementById('recordInput'),
  cancelRecord: document.getElementById('cancelRecord'),
  saveRecord: document.getElementById('saveRecord'),
  editModal: document.getElementById('editModal'),
  editInput: document.getElementById('editInput'),
  cancelEdit: document.getElementById('cancelEdit'),
  saveEdit: document.getElementById('saveEdit'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettings: document.getElementById('closeSettings'),
  cancelSettings: document.getElementById('cancelSettings'),
  saveSettings: document.getElementById('saveSettings'),
  shortcutToggleTimer: document.getElementById('shortcutToggleTimer'),
  shortcutResetTimer: document.getElementById('shortcutResetTimer'),
  shortcutToggleWindow: document.getElementById('shortcutToggleWindow'),
  errorToggleTimer: document.getElementById('errorToggleTimer'),
  errorResetTimer: document.getElementById('errorResetTimer'),
  errorToggleWindow: document.getElementById('errorToggleWindow'),
  statsOpenBtn: document.getElementById('statsOpenBtn'),
  statsModal: document.getElementById('statsModal'),
  closeStats: document.getElementById('closeStats'),
  heatmapContainer: document.getElementById('heatmapContainer'),
  currentStreak: document.getElementById('currentStreak'),
  longestStreak: document.getElementById('longestStreak'),
  totalMinutes: document.getElementById('totalMinutes'),
  totalPomodoros: document.getElementById('totalPomodoros'),
  trendChart: document.getElementById('trendChart'),
  hourChart: document.getElementById('hourChart'),
  tagChart: document.getElementById('tagChart'),
  tagEmptyHint: document.getElementById('tagEmptyHint'),
  trendToggleBtns: document.querySelectorAll('.trend-toggle-btn'),
  taskSelect: document.getElementById('taskSelect'),
  tasksTab: document.getElementById('tasksTab'),
  recordsTab: document.getElementById('recordsTab'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  tasksContainer: document.getElementById('tasksContainer'),
  tasksSummary: document.getElementById('tasksSummary'),
  taskModal: document.getElementById('taskModal'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  taskNameInput: document.getElementById('taskNameInput'),
  taskPrioritySelect: document.getElementById('taskPrioritySelect'),
  pomodoroMinus: document.getElementById('pomodoroMinus'),
  pomodoroPlus: document.getElementById('pomodoroPlus'),
  pomodoroCountDisplay: document.getElementById('pomodoroCountDisplay'),
  cancelTask: document.getElementById('cancelTask'),
  saveTask: document.getElementById('saveTask'),
  recordTaskInfo: document.getElementById('recordTaskInfo'),
  durationSelector: document.getElementById('durationSelector'),
  customDurationBtn: document.getElementById('customDurationBtn'),
  customDurationRow: document.getElementById('customDurationRow'),
  customDurationInput: document.getElementById('customDurationInput'),
  saveCustomDuration: document.getElementById('saveCustomDuration'),
  cancelCustomDuration: document.getElementById('cancelCustomDuration'),
  customPresets: document.getElementById('customPresets'),
  focusModeBtn: document.getElementById('focusModeBtn'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  content: document.querySelector('.content'),
  sidebar: document.querySelector('.sidebar'),
  statsBar: document.querySelector('.stats-bar'),
  contentHeader: document.querySelector('.content-header'),
  calendarTab: document.getElementById('calendarTab'),
  calPrevBtn: document.getElementById('calPrevBtn'),
  calNextBtn: document.getElementById('calNextBtn'),
  calNavTitle: document.getElementById('calNavTitle'),
  calTodayBtn: document.getElementById('calTodayBtn'),
  calViewBtns: document.querySelectorAll('.cal-view-btn'),
  calZoomToggle: document.getElementById('calZoomToggle'),
  calZoomBtns: document.querySelectorAll('.cal-zoom-btn'),
  calMonthView: document.getElementById('calMonthView'),
  calWeekView: document.getElementById('calWeekView'),
  calTooltip: document.getElementById('calTooltip'),
  quickRecordModal: document.getElementById('quickRecordModal'),
  qrDateInput: document.getElementById('qrDateInput'),
  qrStartTime: document.getElementById('qrStartTime'),
  qrDuration: document.getElementById('qrDuration'),
  qrContent: document.getElementById('qrContent'),
  qrTaskSelect: document.getElementById('qrTaskSelect'),
  cancelQuickRecord: document.getElementById('cancelQuickRecord'),
  saveQuickRecord: document.getElementById('saveQuickRecord'),
};

function getDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const today = getDateKey(new Date());
  const yesterdayD = new Date();
  yesterdayD.setDate(yesterdayD.getDate() - 1);
  const yesterday = getDateKey(yesterdayD);

  if (dateKey === today) return `今天 · ${m}月${d}日 ${weekdays[date.getDay()]}`;
  if (dateKey === yesterday) return `昨天 · ${m}月${d}日 ${weekdays[date.getDay()]}`;
  return `${y}年${m}月${d}日 ${weekdays[date.getDay()]}`;
}

function formatTimeRange(startTime, minutes) {
  const start = new Date(startTime);
  const end = new Date(startTime + minutes * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function formatTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateRingProgress() {
  const progress = state.remainingSeconds / state.totalSeconds;
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  el.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
  el.ringProgress.style.strokeDashoffset = offset;
}

function updateTimerDisplay() {
  el.timerText.textContent = formatTimerDisplay(state.remainingSeconds);
  updateRingProgress();
}

async function syncTimerState() {
  try {
    await ipcRenderer.invoke('timer-state-updated', {
      remainingSeconds: state.remainingSeconds,
      isRunning: state.isRunning,
      totalSeconds: state.totalSeconds,
    });
  } catch (e) {
    console.warn('同步定时器状态失败:', e);
  }
}

function startTimer() {
  if (state.isRunning) return;
  if (state.remainingSeconds <= 0) {
    state.remainingSeconds = state.totalSeconds;
  }
  if (!state.startTime) {
    state.startTime = Date.now() - (state.totalSeconds - state.remainingSeconds) * 1000;
  }
  state.isRunning = true;
  el.startBtn.disabled = true;
  el.pauseBtn.disabled = false;

  if (state.deepFocusMode) {
    applyDeepFocusMode();
  }

  state.timerId = setInterval(() => {
    if (state.remainingSeconds > 0) {
      state.remainingSeconds--;
      updateTimerDisplay();
      syncTimerState();
    } else {
      completePomodoro();
    }
  }, 1000);

  syncTimerState();
}

function pauseTimer() {
  if (!state.isRunning) return;
  state.isRunning = false;
  clearInterval(state.timerId);
  state.timerId = null;
  el.startBtn.disabled = false;
  el.pauseBtn.disabled = true;
  syncTimerState();
}

function resetTimer() {
  state.isRunning = false;
  clearInterval(state.timerId);
  state.timerId = null;
  state.remainingSeconds = state.totalSeconds;
  state.startTime = null;

  if (state.deepFocusMode) {
    toggleDeepFocusMode();
  }

  updateTimerDisplay();
  el.startBtn.disabled = false;
  el.pauseBtn.disabled = true;
  syncTimerState();
}

function playDingSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.4);
    playTone(1174.66, now + 0.25, 0.5);
  } catch (e) {
    console.warn('播放提示音失败:', e);
  }
}

function completePomodoro() {
  pauseTimer();

  if (state.deepFocusMode) {
    toggleDeepFocusMode();
  }

  playDingSound();

  ipcRenderer.invoke('notify', {
    title: '番茄钟完成！',
    body: '休息一下，记录这个番茄钟完成了什么吧。',
  }).catch(() => {});

  const taskId = state.currentTaskId || null;
  let taskName = '';
  if (taskId) {
    const dates = Object.keys(state.data.tasks);
    for (const dateKey of dates) {
      const task = state.data.tasks[dateKey].find(t => t.id === taskId);
      if (task) {
        taskName = task.name;
        break;
      }
    }
  }

  state.pendingRecord = {
    id: Date.now().toString(),
    startTime: Date.now() - state.totalSeconds * 1000,
    durationMinutes: state.durationMinutes,
    content: '',
    taskId,
    taskName,
  };

  if (taskName) {
    el.recordTaskInfo.innerHTML = `<span class="record-task-info-label">关联任务:</span>${escapeHtml(taskName)}`;
    el.recordTaskInfo.style.display = 'block';
  } else {
    el.recordTaskInfo.style.display = 'none';
  }

  el.recordInput.value = '';
  el.recordModal.style.display = 'flex';
  setTimeout(() => el.recordInput.focus(), 100);
}

function savePendingRecord(content) {
  if (!state.pendingRecord) return;
  const record = { ...state.pendingRecord, content: content.trim() || '（未填写）' };
  const dateKey = getDateKey(new Date(record.startTime));

  if (!state.data.records[dateKey]) {
    state.data.records[dateKey] = [];
  }
  state.data.records[dateKey].push(record);
  state.data.records[dateKey].sort((a, b) => a.startTime - b.startTime);

  if (record.taskId) {
    const taskDates = Object.keys(state.data.tasks);
    for (const taskDateKey of taskDates) {
      const task = state.data.tasks[taskDateKey].find(t => t.id === record.taskId);
      if (task) {
        task.completedPomodoros = (task.completedPomodoros || 0) + 1;
        if (task.status === 'todo') {
          task.status = 'inProgress';
        }
        break;
      }
    }
  }

  persistData();
  state.pendingRecord = null;
  state.startTime = null;

  if (dateKey === getDateKey(new Date())) {
    renderTomatoes();
    renderStats();
  }
  if (dateKey === state.currentDate) {
    renderAll();
  }
}

function discardPendingRecord() {
  state.pendingRecord = null;
  state.startTime = null;
}

async function persistData() {
  try {
    await ipcRenderer.invoke('save-data', state.data);
    await ipcRenderer.invoke('update-tray');
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

function getTasksForDate(dateKey) {
  const tasks = state.data.tasks[dateKey] || [];
  let maxOrder = tasks.length > 0
    ? Math.max(...tasks.map(t => typeof t.order === 'number' ? t.order : -1))
    : -1;
  let needNormalize = maxOrder === -1 || tasks.some(t => typeof t.order !== 'number');
  if (needNormalize) {
    tasks.forEach((t, idx) => {
      if (typeof t.order !== 'number') {
        t.order = idx;
      }
    });
  }
  return tasks;
}

function getSortedTasks(dateKey) {
  const tasks = getTasksForDate(dateKey);
  return [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    const orderA = typeof a.order === 'number' ? a.order : 999999;
    const orderB = typeof b.order === 'number' ? b.order : 999999;
    return orderA - orderB;
  });
}

function generateTaskId() {
  return 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function addTask(name, estimatedPomodoros, priority) {
  const today = getDateKey(new Date());
  const currentTasks = getTasksForDate(today);
  const maxOrder = currentTasks.length > 0
    ? Math.max(...currentTasks.map(t => typeof t.order === 'number' ? t.order : -1))
    : -1;

  const task = {
    id: generateTaskId(),
    name: name.trim(),
    estimatedPomodoros,
    priority,
    status: 'todo',
    completedPomodoros: 0,
    createdAt: Date.now(),
    completedAt: null,
    isCarriedOver: false,
    originalDate: today,
    order: maxOrder + 1,
  };

  if (!state.data.tasks[today]) {
    state.data.tasks[today] = [];
  }
  state.data.tasks[today].push(task);
  persistData();
  return task;
}

function updateTask(taskId, updates) {
  const dates = Object.keys(state.data.tasks);
  for (const dateKey of dates) {
    const tasks = state.data.tasks[dateKey];
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates };
      persistData();
      return tasks[idx];
    }
  }
  return null;
}

function deleteTask(taskId) {
  const dates = Object.keys(state.data.tasks);
  for (const dateKey of dates) {
    const tasks = state.data.tasks[dateKey];
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks.splice(idx, 1);
      if (tasks.length === 0) {
        delete state.data.tasks[dateKey];
      }
      persistData();
      return true;
    }
  }
  return false;
}

function toggleTaskStatus(taskId) {
  const dates = Object.keys(state.data.tasks);
  for (const dateKey of dates) {
    const tasks = state.data.tasks[dateKey];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const statuses = ['todo', 'inProgress', 'completed'];
      const currentIdx = statuses.indexOf(task.status);
      const nextIdx = (currentIdx + 1) % statuses.length;
      const newStatus = statuses[nextIdx];

      task.status = newStatus;
      task.completedAt = newStatus === 'completed' ? Date.now() : null;

      if (state.currentTaskId === taskId && newStatus === 'completed') {
        state.currentTaskId = null;
      }

      persistData();
      return task;
    }
  }
  return null;
}

function getPriorityLabel(priority) {
  const labels = { 1: '低', 2: '中', 3: '高' };
  return labels[priority] || '中';
}

function getStatusLabel(status) {
  const labels = { todo: '待办', inProgress: '进行中', completed: '已完成' };
  return labels[status] || '待办';
}

function renderTaskSelector() {
  const today = getDateKey(new Date());
  const tasks = getSortedTasks(today).filter(t => t.status !== 'completed');

  el.taskSelect.innerHTML = '<option value="">不关联任务</option>';
  tasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = `${task.name} (预估${task.estimatedPomodoros}个)`;
    if (state.currentTaskId === task.id) {
      option.selected = true;
    }
    el.taskSelect.appendChild(option);
  });

  if (state.currentTaskId && !tasks.find(t => t.id === state.currentTaskId)) {
    state.currentTaskId = null;
  }
}

function renderTasksSummary() {
  const tasks = getTasksForDate(state.currentDate);
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const estimatedTotal = tasks.reduce((sum, t) => sum + t.estimatedPomodoros, 0);
  const completedTotal = tasks.reduce((sum, t) => sum + t.completedPomodoros, 0);

  el.tasksSummary.innerHTML = `
    <div class="tasks-summary-item">
      <span>任务:</span>
      <span class="tasks-summary-value">${completed}/${total}</span>
    </div>
    <div class="tasks-summary-item">
      <span>番茄:</span>
      <span class="tasks-summary-value">${completedTotal}/${estimatedTotal}</span>
    </div>
  `;
}

function renderTasks() {
  el.dateTitle.textContent = formatDateDisplay(state.currentDate);
  el.datePicker.value = state.currentDate;

  const tasks = getSortedTasks(state.currentDate);
  el.tasksContainer.innerHTML = '';

  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tasks-empty-state';
    empty.innerHTML = `
      <div class="tasks-empty-icon">📋</div>
      <div class="tasks-empty-text">今天还没有任务</div>
      <div class="tasks-empty-hint">点击上方"新增任务"开始规划你的一天</div>
    `;
    el.tasksContainer.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card status-${task.status}`;
    card.draggable = true;
    card.dataset.taskId = task.id;

    const progressPct = Math.min((task.completedPomodoros / task.estimatedPomodoros) * 100, 100);
    const isExceeded = task.completedPomodoros > task.estimatedPomodoros;

    card.innerHTML = `
      <div class="task-status-toggle status-${task.status}" title="切换状态：${getStatusLabel(task.status)}"></div>
      <div class="task-content">
        <div class="task-header">
          <span class="task-name">${escapeHtml(task.name)}</span>
          <span class="task-priority priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
          ${task.isCarriedOver ? '<span class="task-carried-badge">顺延</span>' : ''}
        </div>
        <div class="task-progress-section">
          <div class="task-progress-info">
            <span class="task-progress-text">${task.completedPomodoros} / ${task.estimatedPomodoros} 番茄</span>
            <span class="task-progress-percentage" style="color: ${isExceeded ? '#f59e0b' : '#22c55e'}">${Math.round(progressPct)}%</span>
          </div>
          <div class="task-progress-bar">
            <div class="task-progress-fill ${isExceeded ? 'exceeded' : ''}" style="width: ${progressPct}%"></div>
          </div>
        </div>
        <div class="task-meta">
          <div class="task-pomodoro-info">
            <span class="task-pomodoro-icon">🍅</span>
            <span>实际完成: ${task.completedPomodoros} 个</span>
          </div>
          <span>状态: ${getStatusLabel(task.status)}</span>
        </div>
      </div>
      <div class="task-drag-handle" title="拖拽排序">
        <span class="task-drag-dot"></span>
        <span class="task-drag-dot"></span>
        <span class="task-drag-dot"></span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" data-action="edit" title="编辑" draggable="false">✎</button>
        <button class="task-action-btn delete" data-action="delete" title="删除" draggable="false">✕</button>
      </div>
    `;

    const statusToggle = card.querySelector('.task-status-toggle');
    statusToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskStatus(task.id);
      renderAll();
    });
    statusToggle.setAttribute('draggable', 'false');

    const editBtn = card.querySelector('[data-action="edit"]');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditTaskModal(task.id);
    });

    const deleteBtn = card.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`确定要删除任务"${task.name}"吗？`)) {
        deleteTask(task.id);
        if (state.currentTaskId === task.id) {
          state.currentTaskId = null;
        }
        renderAll();
      }
    });

    const noDragElements = card.querySelectorAll('.task-status-toggle, .task-actions, .task-action-btn');
    noDragElements.forEach(el => {
      el.setAttribute('draggable', 'false');
      el.addEventListener('mousedown', (e) => e.stopPropagation());
      el.addEventListener('dragstart', (e) => e.preventDefault());
    });

    el.tasksContainer.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openAddTaskModal() {
  state.editingTaskId = null;
  state.tempTaskPomodoroCount = 1;
  el.taskModalTitle.textContent = '新增任务';
  el.taskNameInput.value = '';
  el.taskPrioritySelect.value = '2';
  el.pomodoroCountDisplay.textContent = '1';
  el.pomodoroMinus.disabled = true;
  el.taskModal.style.display = 'flex';
  setTimeout(() => el.taskNameInput.focus(), 100);
}

function openEditTaskModal(taskId) {
  const dates = Object.keys(state.data.tasks);
  let task = null;
  for (const dateKey of dates) {
    task = state.data.tasks[dateKey].find(t => t.id === taskId);
    if (task) break;
  }
  if (!task) return;

  state.editingTaskId = taskId;
  state.tempTaskPomodoroCount = task.estimatedPomodoros;
  el.taskModalTitle.textContent = '编辑任务';
  el.taskNameInput.value = task.name;
  el.taskPrioritySelect.value = String(task.priority);
  el.pomodoroCountDisplay.textContent = String(task.estimatedPomodoros);
  el.pomodoroMinus.disabled = task.estimatedPomodoros <= 1;
  el.taskModal.style.display = 'flex';
  setTimeout(() => {
    el.taskNameInput.focus();
    el.taskNameInput.select();
  }, 100);
}

function closeTaskModal() {
  state.editingTaskId = null;
  el.taskModal.style.display = 'none';
}

function saveTaskHandler() {
  const name = el.taskNameInput.value.trim();
  if (!name) {
    el.taskNameInput.focus();
    return;
  }

  const estimatedPomodoros = state.tempTaskPomodoroCount;
  const priority = parseInt(el.taskPrioritySelect.value, 10);

  if (state.editingTaskId) {
    updateTask(state.editingTaskId, { name, estimatedPomodoros, priority });
  } else {
    addTask(name, estimatedPomodoros, priority);
  }

  closeTaskModal();
  renderAll();
}

function handlePomodoroCountChange(delta) {
  const newCount = state.tempTaskPomodoroCount + delta;
  if (newCount >= 1 && newCount <= 20) {
    state.tempTaskPomodoroCount = newCount;
    el.pomodoroCountDisplay.textContent = String(newCount);
    el.pomodoroMinus.disabled = newCount <= 1;
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  el.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  el.tasksTab.style.display = tab === 'tasks' ? 'flex' : 'none';
  el.recordsTab.style.display = tab === 'records' ? 'flex' : 'none';
  el.calendarTab.style.display = tab === 'calendar' ? 'flex' : 'none';
  if (tab === 'tasks') {
    renderTasks();
    renderTasksSummary();
  } else if (tab === 'records') {
    renderRecords();
  } else if (tab === 'calendar') {
    renderCalendar();
  }
}

function handleDragStart(e) {
  const taskId = e.currentTarget.dataset.taskId;
  state.draggedTaskId = taskId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  try {
    e.dataTransfer.setData('text/plain', taskId);
  } catch (err) {}
}

function handleDragEnd(e) {
  state.draggedTaskId = null;
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.task-card').forEach(card => {
    card.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  const card = e.currentTarget;
  if (card.dataset.taskId !== state.draggedTaskId) {
    card.classList.add('drag-over');
  }
  return false;
}

function handleDragLeave(e) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    card.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const targetTaskId = e.currentTarget.dataset.taskId;
  e.currentTarget.classList.remove('drag-over');

  if (!state.draggedTaskId || state.draggedTaskId === targetTaskId) {
    return false;
  }

  const today = state.currentDate;
  let tasks = state.data.tasks[today];
  if (!tasks || tasks.length === 0) {
    return false;
  }

  tasks = getTasksForDate(today);

  const draggedIdx = tasks.findIndex(t => t.id === state.draggedTaskId);
  const targetIdx = tasks.findIndex(t => t.id === targetTaskId);

  if (draggedIdx === -1 || targetIdx === -1) {
    return false;
  }

  const [draggedTask] = tasks.splice(draggedIdx, 1);
  tasks.splice(targetIdx, 0, draggedTask);

  tasks.forEach((task, idx) => {
    task.order = idx;
  });

  state.data.tasks[today] = tasks;

  persistData();
  renderAll();
  return false;
}

function renderAll() {
  renderTaskSelector();
  renderCustomPresets();
  if (state.activeTab === 'tasks') {
    renderTasks();
    renderTasksSummary();
  } else if (state.activeTab === 'records') {
    renderRecords();
  } else if (state.activeTab === 'calendar') {
    renderCalendar();
  }
  renderTomatoes();
  renderStats();
}

function renderTomatoes() {
  const today = getDateKey(new Date());
  const records = state.data.records[today] || [];
  el.tomatoes.innerHTML = '';
  records.forEach(() => {
    const t = document.createElement('div');
    t.className = 'tomato';
    t.title = '完成的番茄钟';
    el.tomatoes.appendChild(t);
  });

  if (records.length === 0) {
    const hint = document.createElement('span');
    hint.style.color = 'rgba(255,255,255,0.3)';
    hint.style.fontSize = '13px';
    hint.textContent = '还没有完成，加油！';
    el.tomatoes.appendChild(hint);
  }
}

function renderRecords() {
  el.dateTitle.textContent = formatDateDisplay(state.currentDate);
  el.datePicker.value = state.currentDate;

  const records = state.data.records[state.currentDate] || [];
  el.recordsContainer.innerHTML = '';

  if (records.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state-icon">🍅</div>
      <div class="empty-state-text">这一天还没有番茄钟记录</div>
    `;
    el.recordsContainer.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'record-card';

    const time = document.createElement('div');
    time.className = 'record-time';
    time.textContent = formatTimeRange(record.startTime, record.durationMinutes);

    const content = document.createElement('div');
    content.className = 'record-content';

    const text = document.createElement('div');
    text.textContent = record.content;
    content.appendChild(text);

    if (record.taskName) {
      const taskTag = document.createElement('div');
      taskTag.style.cssText = 'margin-top: 6px; font-size: 12px; color: #22c55e;';
      taskTag.innerHTML = `📋 ${escapeHtml(record.taskName)}`;
      content.appendChild(taskTag);
    }

    const actions = document.createElement('div');
    actions.className = 'record-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'record-action-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = '编辑';
    editBtn.onclick = () => openEditModal(record.id, state.currentDate);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'record-action-btn delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = '删除';
    deleteBtn.onclick = () => deleteRecord(record.id, state.currentDate);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(time);
    card.appendChild(content);
    card.appendChild(actions);
    el.recordsContainer.appendChild(card);
  });
}

function openEditModal(recordId, dateKey) {
  const records = state.data.records[dateKey] || [];
  const record = records.find((r) => r.id === recordId);
  if (!record) return;

  state.editingRecordId = recordId;
  state.editingDateKey = dateKey;
  el.editInput.value = record.content;
  el.editModal.style.display = 'flex';
  setTimeout(() => {
    el.editInput.focus();
    el.editInput.select();
  }, 50);
}

function saveEditedRecord() {
  const content = el.editInput.value.trim();
  if (!state.editingRecordId || !state.editingDateKey) return;

  const records = state.data.records[state.editingDateKey] || [];
  const record = records.find((r) => r.id === state.editingRecordId);
  if (record) {
    record.content = content || '（未填写）';
    persistData();
    const isToday = state.editingDateKey === getDateKey(new Date());
    if (isToday) renderStats();
    if (state.editingDateKey === state.currentDate) renderRecords();
  }

  state.editingRecordId = null;
  state.editingDateKey = null;
  el.editModal.style.display = 'none';
}

function deleteRecord(recordId, dateKey) {
  const records = state.data.records[dateKey];
  if (!records) return;

  const idx = records.findIndex((r) => r.id === recordId);
  if (idx === -1) return;

  const deletedRecord = records[idx];
  records.splice(idx, 1);
  if (records.length === 0) {
    delete state.data.records[dateKey];
  }

  if (deletedRecord.taskId) {
    const taskDates = Object.keys(state.data.tasks);
    for (const taskDateKey of taskDates) {
      const task = state.data.tasks[taskDateKey].find(t => t.id === deletedRecord.taskId);
      if (task) {
        task.completedPomodoros = Math.max(0, (task.completedPomodoros || 0) - 1);
        break;
      }
    }
  }

  persistData();
  const isToday = dateKey === getDateKey(new Date());
  if (isToday) {
    renderTomatoes();
    renderStats();
  }
  if (dateKey === state.currentDate) renderAll();
}

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    dates.push(d);
  }
  return dates;
}

function calculateMinutesForDate(dateKey) {
  const records = state.data.records[dateKey] || [];
  return records.reduce((sum, r) => sum + r.durationMinutes, 0);
}

function renderStats() {
  const todayKey = getDateKey(new Date());
  const todayMinutes = calculateMinutesForDate(todayKey);

  const weekDates = getWeekDates();
  let weekTotal = 0;
  const dailyMinutes = [];
  weekDates.forEach((d) => {
    const k = getDateKey(d);
    const mins = calculateMinutesForDate(k);
    weekTotal += mins;
    dailyMinutes.push({ date: d, minutes: mins, key: k });
  });

  el.todayMinutes.textContent = `${todayMinutes} 分钟`;
  el.weekMinutes.textContent = `${weekTotal} 分钟`;

  el.barChart.innerHTML = '';
  const maxMinutes = Math.max(...dailyMinutes.map((x) => x.minutes), 60);
  const labels = ['一', '二', '三', '四', '五', '六', '日'];

  dailyMinutes.forEach((item, i) => {
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    const isToday = item.key === todayKey;
    if (isToday) barItem.classList.add('today');

    const bar = document.createElement('div');
    bar.className = 'bar' + (isToday ? ' today' : '');
    const heightPct = maxMinutes > 0 ? (item.minutes / maxMinutes) * 100 : 0;
    bar.style.height = `${Math.max(heightPct, 2)}%`;
    bar.title = `${item.minutes} 分钟`;

    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = labels[i];

    barItem.appendChild(bar);
    barItem.appendChild(label);
    el.barChart.appendChild(barItem);
  });
}

function extractTags(content) {
  const regex = /#(\S+)/g;
  const tags = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

function getStreakData() {
  const dateKeys = Object.keys(state.data.records).sort();
  if (dateKeys.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longestStreak = 0;
  let currentStreak = 0;
  let prevDate = null;

  const today = new Date();
  const todayKey = getDateKey(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  const hasToday = dateKeys.includes(todayKey);
  const hasYesterday = dateKeys.includes(yesterdayKey);

  if (!hasToday && !hasYesterday) {
    currentStreak = 0;
  } else {
    let checkDate = hasToday ? new Date(today) : new Date(yesterday);
    while (true) {
      const key = getDateKey(checkDate);
      if (dateKeys.includes(key)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  let tempStreak = 0;
  for (let i = 0; i < dateKeys.length; i++) {
    const current = new Date(dateKeys[i]);
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.floor((current - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    prevDate = current;
  }

  return { current: currentStreak, longest: longestStreak };
}

function getTotalStats() {
  let totalMin = 0;
  let totalCount = 0;

  Object.values(state.data.records).forEach((records) => {
    records.forEach((r) => {
      totalMin += r.durationMinutes;
      totalCount++;
    });
  });

  return { totalMin, totalCount };
}

function getYearData() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setHours(0, 0, 0, 0);

  const days = [];
  const current = new Date(startDate);
  while (current <= today) {
    const key = getDateKey(current);
    const minutes = calculateMinutesForDate(key);
    days.push({
      date: new Date(current),
      dateKey: key,
      minutes,
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getHeatmapLevel(minutes) {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function renderHeatmap() {
  const yearData = getYearData();
  el.heatmapContainer.innerHTML = '';

  const weeks = [];
  let currentWeek = [];
  const firstDay = yearData[0].date.getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }

  yearData.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  weeks.forEach((week) => {
    const weekEl = document.createElement('div');
    weekEl.className = 'heatmap-week';

    week.forEach((day) => {
      const dayEl = document.createElement('div');
      dayEl.className = 'heatmap-day';

      if (day !== null) {
        const level = getHeatmapLevel(day.minutes);
        if (level > 0) {
          dayEl.classList.add(`level-${level}`);
        }
        dayEl.title = `${day.dateKey}: ${day.minutes} 分钟`;
      } else {
        dayEl.style.visibility = 'hidden';
      }

      weekEl.appendChild(dayEl);
    });

    el.heatmapContainer.appendChild(weekEl);
  });
}

function getTrendData30Days() {
  const today = new Date();
  const labels = [];
  const data = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    const minutes = calculateMinutesForDate(key);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    data.push(minutes);
  }

  return { labels, data };
}

function getTrendData12Weeks() {
  const labels = [];
  const data = [];

  for (let i = 11; i >= 0; i--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    let weekMinutes = 0;
    for (let j = 0; j < 7; j++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + j);
      const key = getDateKey(d);
      weekMinutes += calculateMinutesForDate(key);
    }

    labels.push(`第${12 - i}周`);
    data.push(weekMinutes);
  }

  return { labels, data };
}

function renderTrendChart() {
  const ctx = el.trendChart.getContext('2d');
  const trendData = state.trendPeriod === '30days' ? getTrendData30Days() : getTrendData12Weeks();

  if (state.charts.trend) {
    state.charts.trend.destroy();
  }

  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.labels,
      datasets: [{
        label: '专注时长（分钟）',
        data: trendData.data,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleFont: {
            family: 'DM Sans',
            size: 13,
          },
          bodyFont: {
            family: 'DM Mono',
            size: 12,
          },
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: 'DM Sans',
              size: 11,
            },
            color: '#999',
            maxRotation: 0,
            maxTicksLimit: 10,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f0f0f0',
          },
          ticks: {
            font: {
              family: 'DM Mono',
              size: 11,
            },
            color: '#999',
          },
        },
      },
    },
  });
}

function getHourDistribution() {
  const hours = new Array(24).fill(0);

  Object.values(state.data.records).forEach((records) => {
    records.forEach((r) => {
      const startDate = new Date(r.startTime);
      const startHour = startDate.getHours();
      const totalMinutes = r.durationMinutes;
      const startMinute = startDate.getMinutes();

      let remaining = totalMinutes;
      let currentHour = startHour;
      let minutesInFirstHour = 60 - startMinute;

      if (remaining <= minutesInFirstHour) {
        hours[currentHour] += remaining;
      } else {
        hours[currentHour] += minutesInFirstHour;
        remaining -= minutesInFirstHour;
        currentHour++;

        while (remaining > 0 && currentHour < 24) {
          const addMinutes = Math.min(remaining, 60);
          hours[currentHour] += addMinutes;
          remaining -= addMinutes;
          currentHour++;
        }
      }
    });
  });

  return hours;
}

function renderHourChart() {
  const ctx = el.hourChart.getContext('2d');
  const hourData = getHourDistribution();
  const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  if (state.charts.hour) {
    state.charts.hour.destroy();
  }

  state.charts.hour = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '专注时长（分钟）',
        data: hourData,
        backgroundColor: hourData.map((v) => v > 0 ? '#22c55e' : '#e5e7eb'),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleFont: {
            family: 'DM Sans',
            size: 13,
          },
          bodyFont: {
            family: 'DM Mono',
            size: 12,
          },
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: 'DM Mono',
              size: 10,
            },
            color: '#999',
            maxRotation: 45,
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f0f0f0',
          },
          ticks: {
            font: {
              family: 'DM Mono',
              size: 10,
            },
            color: '#999',
          },
        },
      },
    },
  });
}

function getTagDistribution() {
  const tagMinutes = {};
  const tagCount = {};

  Object.values(state.data.records).forEach((records) => {
    records.forEach((r) => {
      const tags = extractTags(r.content);
      if (tags.length === 0) return;

      const minutesPerTag = r.durationMinutes / tags.length;
      tags.forEach((tag) => {
        if (!tagMinutes[tag]) {
          tagMinutes[tag] = 0;
          tagCount[tag] = 0;
        }
        tagMinutes[tag] += minutesPerTag;
        tagCount[tag]++;
      });
    });
  });

  const sortedTags = Object.entries(tagMinutes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, minutes]) => ({ tag, minutes, count: tagCount[tag] }));

  return sortedTags;
}

function renderTagChart() {
  const ctx = el.tagChart.getContext('2d');
  const tagData = getTagDistribution();

  if (state.charts.tag) {
    state.charts.tag.destroy();
  }

  if (tagData.length === 0) {
    el.tagEmptyHint.style.display = 'block';
    el.tagChart.style.display = 'none';
    return;
  }

  el.tagEmptyHint.style.display = 'none';
  el.tagChart.style.display = 'block';

  const colors = [
    '#22c55e',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];

  state.charts.tag = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tagData.map((t) => `#${t.tag}`),
      datasets: [{
        data: tagData.map((t) => Math.round(t.minutes)),
        backgroundColor: colors.slice(0, tagData.length),
        borderWidth: 0,
        spacing: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: {
              family: 'DM Sans',
              size: 11,
            },
            color: '#666',
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleFont: {
            family: 'DM Sans',
            size: 13,
          },
          bodyFont: {
            family: 'DM Mono',
            size: 12,
          },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const tagIndex = context.dataIndex;
              const tag = tagData[tagIndex];
              return `${tag.minutes} 分钟 (${tag.count}个番茄)`;
            },
          },
        },
      },
    },
  });
}

function renderOverviewStats() {
  const streakData = getStreakData();
  const totalStats = getTotalStats();

  el.currentStreak.textContent = `${streakData.current} 天`;
  el.longestStreak.textContent = `${streakData.longest} 天`;
  el.totalMinutes.textContent = `${totalStats.totalMin} 分钟`;
  el.totalPomodoros.textContent = `${totalStats.totalCount} 个`;
}

function renderAllStats() {
  renderOverviewStats();
  renderHeatmap();
  renderTrendChart();
  renderHourChart();
  renderTagChart();
}

function openStatsModal() {
  el.statsModal.style.display = 'flex';
  setTimeout(() => {
    renderAllStats();
  }, 50);
}

function closeStatsModal() {
  el.statsModal.style.display = 'none';
}

function setupStatsModal() {
  el.statsOpenBtn.addEventListener('click', openStatsModal);
  el.closeStats.addEventListener('click', closeStatsModal);

  el.statsModal.addEventListener('click', (e) => {
    if (e.target === el.statsModal) {
      closeStatsModal();
    }
  });

  el.trendToggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.trendToggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.trendPeriod = btn.dataset.period;
      renderTrendChart();
    });
  });
}

function selectDuration(mins, btnElement) {
  if (state.isRunning) return;
  document.querySelectorAll('.duration-btn, .custom-preset-btn').forEach((b) => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  state.durationMinutes = mins;
  state.totalSeconds = mins * 60;
  state.remainingSeconds = mins * 60;
  state.startTime = null;
  updateTimerDisplay();
  syncTimerState();
}

function setupDurationButtons() {
  document.querySelectorAll('.duration-btn[data-minutes]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectDuration(parseInt(btn.dataset.minutes, 10), btn);
    });
  });
}

function renderCustomPresets() {
  const presets = state.data.customPresets || [];
  el.customPresets.innerHTML = '';

  if (presets.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-presets-row';
  wrapper.innerHTML = '<span class="custom-presets-label">我的预设:</span>';

  const btnsContainer = document.createElement('div');
  btnsContainer.className = 'custom-presets-btns';

  presets.forEach((mins) => {
    const btnWrap = document.createElement('div');
    btnWrap.className = 'custom-preset-wrap';

    const btn = document.createElement('button');
    btn.className = 'duration-btn custom-preset-btn';
    btn.dataset.minutes = String(mins);
    btn.textContent = String(mins);
    if (state.durationMinutes === mins) btn.classList.add('active');

    btn.addEventListener('click', () => selectDuration(mins, btn));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'custom-preset-remove';
    removeBtn.title = '删除预设';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.isRunning) return;
      removeCustomPreset(mins);
    });

    btnWrap.appendChild(btn);
    btnWrap.appendChild(removeBtn);
    btnsContainer.appendChild(btnWrap);
  });

  wrapper.appendChild(btnsContainer);
  el.customPresets.appendChild(wrapper);
}

function removeCustomPreset(mins) {
  if (!state.data.customPresets) state.data.customPresets = [];
  const idx = state.data.customPresets.indexOf(mins);
  if (idx !== -1) {
    state.data.customPresets.splice(idx, 1);
    persistData();
    renderCustomPresets();
  }
}

function addCustomPreset(mins) {
  if (!state.data.customPresets) state.data.customPresets = [];
  if (state.data.customPresets.includes(mins)) return false;
  if ([25, 30, 45, 60].includes(mins)) return false;
  state.data.customPresets.push(mins);
  state.data.customPresets.sort((a, b) => a - b);
  persistData();
  return true;
}

function setupCustomDuration() {
  el.customDurationBtn.addEventListener('click', () => {
    if (state.isRunning) return;
    el.customDurationRow.style.display = 'flex';
    el.customDurationInput.value = '';
    setTimeout(() => el.customDurationInput.focus(), 50);
  });

  el.cancelCustomDuration.addEventListener('click', () => {
    el.customDurationRow.style.display = 'none';
    el.customDurationInput.value = '';
  });

  const handleSave = () => {
    const val = parseInt(el.customDurationInput.value, 10);
    if (isNaN(val) || val < 1 || val > 120) {
      el.customDurationInput.focus();
      el.customDurationInput.select();
      return;
    }

    if (![25, 30, 45, 60].includes(val) && !state.data.customPresets?.includes(val)) {
      addCustomPreset(val);
      renderCustomPresets();
    }

    el.customDurationRow.style.display = 'none';
    el.customDurationInput.value = '';
    selectDuration(val, null);
    document.querySelectorAll('.duration-btn, .custom-preset-btn').forEach((b) => {
      if (parseInt(b.dataset.minutes, 10) === val) b.classList.add('active');
    });
  };

  el.saveCustomDuration.addEventListener('click', handleSave);

  el.customDurationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      el.customDurationRow.style.display = 'none';
      el.customDurationInput.value = '';
    }
  });
}

function toggleDeepFocusMode() {
  state.deepFocusMode = !state.deepFocusMode;
  applyDeepFocusMode();

  if (state.deepFocusMode) {
    ipcRenderer.invoke('notify', {
      title: '深度专注模式已开启',
      body: '保持专注，番茄钟结束后恢复正常界面。',
    }).catch(() => {});
  }
}

function applyDeepFocusMode() {
  if (state.deepFocusMode) {
    el.app.classList.add('deep-focus-mode');
    el.focusModeBtn.classList.add('active');
    el.addTaskBtn.disabled = true;
    el.datePicker.disabled = true;
    el.statsOpenBtn.disabled = true;
    el.settingsBtn.disabled = true;
    el.tabBtns.forEach((btn) => (btn.disabled = true));
  } else {
    el.app.classList.remove('deep-focus-mode');
    el.focusModeBtn.classList.remove('active');
    el.addTaskBtn.disabled = false;
    el.datePicker.disabled = false;
    el.statsOpenBtn.disabled = false;
    el.settingsBtn.disabled = false;
    el.tabBtns.forEach((btn) => (btn.disabled = false));
  }
}

async function toggleFullscreen() {
  try {
    const result = await ipcRenderer.invoke('toggle-fullscreen');
    state.isFullscreen = result;
    if (state.isFullscreen) {
      el.fullscreenBtn.classList.add('active');
      el.fullscreenBtn.querySelector('.fullscreen-icon').textContent = '⛶';
    } else {
      el.fullscreenBtn.classList.remove('active');
    }
  } catch (e) {
    console.warn('切换全屏失败:', e);
  }
}

function setupFocusAndFullscreen() {
  el.focusModeBtn.addEventListener('click', () => {
    toggleDeepFocusMode();
  });

  el.fullscreenBtn.addEventListener('click', () => {
    toggleFullscreen();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
    if (e.key === 'Escape' && state.deepFocusMode && state.isRunning) {
      e.preventDefault();
    }
  });
}

function setupTaskControls() {
  el.taskSelect.addEventListener('change', (e) => {
    state.currentTaskId = e.target.value || null;
  });

  el.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  el.addTaskBtn.addEventListener('click', openAddTaskModal);

  el.cancelTask.addEventListener('click', closeTaskModal);
  el.saveTask.addEventListener('click', saveTaskHandler);

  el.pomodoroMinus.addEventListener('click', () => handlePomodoroCountChange(-1));
  el.pomodoroPlus.addEventListener('click', () => handlePomodoroCountChange(1));

  el.taskNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveTaskHandler();
    } else if (e.key === 'Escape') {
      closeTaskModal();
    }
  });

  el.taskModal.addEventListener('click', (e) => {
    if (e.target === el.taskModal) {
      closeTaskModal();
    }
  });

  el.tasksContainer.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) {
      e.preventDefault();
      return;
    }
    const noDrag = e.target.closest('.task-status-toggle, .task-actions, .task-action-btn');
    if (noDrag) {
      e.preventDefault();
      return;
    }
    const taskId = card.dataset.taskId;
    state.draggedTaskId = taskId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', taskId);
    } catch (err) {}
  });

  el.tasksContainer.addEventListener('dragend', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    state.draggedTaskId = null;
    card.classList.remove('dragging');
    document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  });

  el.tasksContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.task-card');
    if (!card) return false;
    if (!state.draggedTaskId) return false;
    if (card.dataset.taskId === state.draggedTaskId) return false;
    e.dataTransfer.dropEffect = 'move';
    card.classList.add('drag-over');
    return false;
  });

  el.tasksContainer.addEventListener('dragleave', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      card.classList.remove('drag-over');
    }
  });

  el.tasksContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const card = e.target.closest('.task-card');
    if (!card) return false;
    const targetTaskId = card.dataset.taskId;
    card.classList.remove('drag-over');

    if (!state.draggedTaskId || state.draggedTaskId === targetTaskId) {
      return false;
    }

    const today = state.currentDate;
    let tasks = state.data.tasks[today];
    if (!tasks || tasks.length === 0) {
      return false;
    }

    tasks = getTasksForDate(today);

    const draggedIdx = tasks.findIndex(t => t.id === state.draggedTaskId);
    const targetIdx = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIdx === -1 || targetIdx === -1) {
      return false;
    }

    const [draggedTask] = tasks.splice(draggedIdx, 1);
    tasks.splice(targetIdx, 0, draggedTask);

    tasks.forEach((task, idx) => {
      task.order = idx;
    });

    state.data.tasks[today] = tasks;

    persistData();
    renderAll();
    return false;
  });
}

function setupControls() {
  el.startBtn.addEventListener('click', startTimer);
  el.pauseBtn.addEventListener('click', pauseTimer);
  el.resetBtn.addEventListener('click', resetTimer);

  el.datePicker.addEventListener('change', (e) => {
    state.currentDate = e.target.value;
    renderAll();
  });

  el.cancelRecord.addEventListener('click', () => {
    discardPendingRecord();
    el.recordModal.style.display = 'none';
  });

  el.saveRecord.addEventListener('click', () => {
    savePendingRecord(el.recordInput.value);
    el.recordModal.style.display = 'none';
  });

  el.recordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      savePendingRecord(el.recordInput.value);
      el.recordModal.style.display = 'none';
    } else if (e.key === 'Escape') {
      discardPendingRecord();
      el.recordModal.style.display = 'none';
    }
  });

  el.cancelEdit.addEventListener('click', () => {
    state.editingRecordId = null;
    state.editingDateKey = null;
    el.editModal.style.display = 'none';
  });

  el.saveEdit.addEventListener('click', saveEditedRecord);

  el.editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveEditedRecord();
    } else if (e.key === 'Escape') {
      state.editingRecordId = null;
      state.editingDateKey = null;
      el.editModal.style.display = 'none';
    }
  });
}

function keyEventToAccelerator(e) {
  const parts = [];
  if (e.controlKey || e.metaKey) parts.push(process.platform === 'darwin' ? 'Cmd' : 'Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  else if (key.startsWith('Arrow')) key = key.replace('Arrow', '');
  else if (key === 'Escape') key = 'Esc';

  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta'];
  if (modifierKeys.includes(key)) {
    return null;
  }

  parts.push(key);
  return parts.join('+');
}

function setupShortcutInputs() {
  const inputs = [
    { input: el.shortcutToggleTimer, key: 'toggleTimer', error: el.errorToggleTimer },
    { input: el.shortcutResetTimer, key: 'resetTimer', error: el.errorResetTimer },
    { input: el.shortcutToggleWindow, key: 'toggleWindow', error: el.errorToggleWindow },
  ];

  inputs.forEach(({ input, key, error }) => {
    input.value = state.tempSettings[key];

    input.addEventListener('focus', () => {
      state.recordingShortcut = key;
      input.classList.add('recording');
      input.value = '请按下快捷键...';
      error.textContent = '';
    });

    input.addEventListener('blur', () => {
      if (state.recordingShortcut === key) {
        state.recordingShortcut = null;
        input.classList.remove('recording');
        input.value = state.tempSettings[key];
      }
    });

    input.addEventListener('keydown', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        state.recordingShortcut = null;
        input.classList.remove('recording');
        input.value = state.tempSettings[key];
        input.blur();
        return;
      }

      const accelerator = keyEventToAccelerator(e);
      if (!accelerator) return;

      const result = await ipcRenderer.invoke('check-shortcut', {
        accelerator,
        excludeKey: key,
      });

      if (result.valid) {
        state.tempSettings[key] = accelerator;
        input.value = accelerator;
        error.textContent = '';
        error.classList.remove('show');
        state.recordingShortcut = null;
        input.classList.remove('recording');
        input.blur();
      } else {
        error.textContent = result.reason;
        error.classList.add('show');
      }
    });
  });

  document.querySelectorAll('.shortcut-clear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      state.tempSettings[key] = DEFAULT_SHORTCUTS[key];
      const input = document.getElementById(`shortcut${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (input) {
        input.value = DEFAULT_SHORTCUTS[key];
      }
      const errorEl = document.getElementById(`error${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      }
    });
  });
}

function openSettings() {
  state.tempSettings = { ...state.settings };
  el.shortcutToggleTimer.value = state.tempSettings.toggleTimer;
  el.shortcutResetTimer.value = state.tempSettings.resetTimer;
  el.shortcutToggleWindow.value = state.tempSettings.toggleWindow;
  el.errorToggleTimer.textContent = '';
  el.errorResetTimer.textContent = '';
  el.errorToggleWindow.textContent = '';
  el.errorToggleTimer.classList.remove('show');
  el.errorResetTimer.classList.remove('show');
  el.errorToggleWindow.classList.remove('show');
  el.settingsModal.style.display = 'flex';
}

function closeSettings() {
  el.settingsModal.style.display = 'none';
  state.recordingShortcut = null;
}

async function saveSettingsHandler() {
  const ok = await ipcRenderer.invoke('save-settings', state.tempSettings);
  if (ok) {
    state.settings = { ...state.tempSettings };
    closeSettings();
  }
}

function setupSettings() {
  el.settingsBtn.addEventListener('click', openSettings);
  el.closeSettings.addEventListener('click', closeSettings);
  el.cancelSettings.addEventListener('click', closeSettings);
  el.saveSettings.addEventListener('click', saveSettingsHandler);

  el.settingsModal.addEventListener('click', (e) => {
    if (e.target === el.settingsModal) {
      closeSettings();
    }
  });
}

ipcRenderer.on('shortcut:toggle-timer', () => {
  if (state.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

ipcRenderer.on('shortcut:reset-timer', () => {
  resetTimer();
});

ipcRenderer.on('request-timer-state', () => {
  syncTimerState();
});

function getWeekStartForDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDatesFromDate(weekStart) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let startDayOfWeek = firstDay.getDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7;
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 1; i < startDayOfWeek; i++) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - startDayOfWeek + i + 1), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  let nextMonthDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextMonthDay++), isCurrentMonth: false });
  }
  return cells;
}

function getCarryOverCountForDate(dateKey) {
  const tasks = state.data.tasks[dateKey] || [];
  return tasks.filter(t => t.isCarriedOver).length;
}

function getDayStatsForDate(dateKey) {
  const records = state.data.records[dateKey] || [];
  const tasks = state.data.tasks[dateKey] || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalMinutes = records.reduce((s, r) => s + r.durationMinutes, 0);
  const pomodoroCount = records.length;
  const carryOver = tasks.filter(t => t.isCarriedOver).length;
  return { totalTasks, completedTasks, totalMinutes, pomodoroCount, carryOver };
}

function renderCalendar() {
  const cal = state.calendar;
  if (cal.viewMode === 'month') {
    el.calMonthView.style.display = 'flex';
    el.calWeekView.style.display = 'none';
    el.calZoomToggle.style.display = 'none';
    renderMonthView();
  } else {
    el.calMonthView.style.display = 'none';
    el.calWeekView.style.display = 'flex';
    el.calZoomToggle.style.display = 'flex';
    renderWeekView();
  }
  updateCalendarNavTitle();
}

function updateCalendarNavTitle() {
  const cal = state.calendar;
  if (cal.viewMode === 'month') {
    el.calNavTitle.textContent = `${cal.viewYear}年${cal.viewMonth + 1}月`;
  } else {
    const weekStart = cal.viewWeekStart || getWeekStartForDate(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const sm = weekStart.getMonth() + 1;
    const sd = weekStart.getDate();
    const em = weekEnd.getMonth() + 1;
    const ed = weekEnd.getDate();
    el.calNavTitle.textContent = `${sm}月${sd}日 - ${em}月${ed}日`;
  }
}

function renderMonthView() {
  const cal = state.calendar;
  const cells = getMonthData(cal.viewYear, cal.viewMonth);
  const todayKey = getDateKey(new Date());
  const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  let html = '<div class="cal-month-header">';
  weekHeaders.forEach((h, i) => {
    const isWeekend = i >= 5;
    html += `<div class="cal-month-header-cell${isWeekend ? ' weekend' : ''}">${h}</div>`;
  });
  html += '</div><div class="cal-month-grid">';

  cells.forEach(cell => {
    const dateKey = getDateKey(cell.date);
    const isToday = dateKey === todayKey;
    const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
    const isOtherMonth = !cell.isCurrentMonth;
    const stats = getDayStatsForDate(dateKey);
    const heatLevel = getHeatmapLevel(stats.totalMinutes);
    const isHoliday = cal.holidaysEnabled && cal.holidays[dateKey];

    let cls = 'cal-month-cell';
    if (isOtherMonth) cls += ' other-month';
    if (isWeekend) cls += ' weekend';
    if (isToday) cls += ' today';
    if (isHoliday) cls += ' holiday';

    const progressPct = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    const pomoDisplay = stats.pomodoroCount > 8 ? '8+' : stats.pomodoroCount;

    html += `<div class="${cls}" data-date="${dateKey}">`;
    html += `<div class="cal-day-number">${cell.date.getDate()}</div>`;
    if (stats.carryOver > 0) {
      html += `<span class="cal-day-carryover">顺延 ${stats.carryOver}</span>`;
    }
    if (stats.totalTasks > 0 || stats.pomodoroCount > 0) {
      html += '<div class="cal-day-stats">';
      if (stats.totalTasks > 0) {
        html += `<div class="cal-day-progress">
          <div class="cal-day-progress-bar"><div class="cal-day-progress-fill" style="width:${progressPct}%"></div></div>
          <span class="cal-day-progress-text">${stats.completedTasks}/${stats.totalTasks}</span>
        </div>`;
      }
      html += `<div style="display:flex;align-items:center;gap:6px;">
        <span class="cal-day-heat level-${heatLevel}"></span>
        <span class="cal-day-pomodoro"><span class="cal-day-pomodoro-icon">🍅</span>${pomoDisplay}</span>
      </div>`;
      html += '</div>';
    }
    html += '</div>';
  });

  html += '</div>';
  el.calMonthView.innerHTML = html;

  el.calMonthView.querySelectorAll('.cal-month-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const dateKey = cell.dataset.date;
      state.currentDate = dateKey;
      el.datePicker.value = dateKey;
      switchTab('tasks');
    });

    cell.addEventListener('mouseenter', (e) => {
      const dateKey = cell.dataset.date;
      const stats = getDayStatsForDate(dateKey);
      const records = state.data.records[dateKey] || [];
      const tasks = state.data.tasks[dateKey] || [];

      if (stats.totalTasks === 0 && stats.pomodoroCount === 0) return;

      const [y, m, d] = dateKey.split('-').map(Number);
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const dayOfWeek = new Date(y, m - 1, d).getDay();

      let tooltipHtml = `<div class="cal-tooltip-title">${m}月${d}日 星期${weekdays[dayOfWeek]}</div>`;
      if (stats.totalTasks > 0) {
        tooltipHtml += `<div class="cal-tooltip-row">📋 任务: ${stats.completedTasks}/${stats.totalTasks} 完成</div>`;
      }
      if (stats.carryOver > 0) {
        tooltipHtml += `<div class="cal-tooltip-row" style="color:#c084fc;">⤴ 顺延: ${stats.carryOver} 个</div>`;
      }
      tooltipHtml += `<div class="cal-tooltip-row">⏱ 专注: ${stats.totalMinutes} 分钟</div>`;
      tooltipHtml += `<div class="cal-tooltip-row">🍅 番茄: ${stats.pomodoroCount} 个</div>`;

      if (records.length > 0) {
        tooltipHtml += '<div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.15);padding-top:4px;">';
        records.slice(0, 3).forEach(r => {
          const timeStr = formatTimeRange(r.startTime, r.durationMinutes);
          const contentShort = (r.content || '').substring(0, 20);
          tooltipHtml += `<div class="cal-tooltip-row" style="font-size:11px;">${timeStr} ${escapeHtml(contentShort)}</div>`;
        });
        if (records.length > 3) {
          tooltipHtml += `<div class="cal-tooltip-row" style="font-size:11px;color:rgba(255,255,255,0.5);">...还有 ${records.length - 3} 条</div>`;
        }
        tooltipHtml += '</div>';
      }

      el.calTooltip.innerHTML = tooltipHtml;
      el.calTooltip.style.display = 'block';

      const rect = cell.getBoundingClientRect();
      let left = rect.right + 8;
      let top = rect.top;
      if (left + 270 > window.innerWidth) {
        left = rect.left - 270;
      }
      if (top + 200 > window.innerHeight) {
        top = window.innerHeight - 200;
      }
      el.calTooltip.style.left = left + 'px';
      el.calTooltip.style.top = top + 'px';
    });

    cell.addEventListener('mouseleave', () => {
      el.calTooltip.style.display = 'none';
    });
  });
}

function renderWeekView() {
  const cal = state.calendar;
  const weekStart = cal.viewWeekStart || getWeekStartForDate(new Date());
  const weekDates = getWeekDatesFromDate(weekStart);
  const todayKey = getDateKey(new Date());
  const zoom = cal.weekZoom;
  const startHour = 8;
  const endHour = 24;
  const totalHours = endHour - startHour;
  const totalSlots = (totalHours * 60) / zoom;
  const slotHeight = Math.max(zoom * 1.2, 30);
  const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  let headerHtml = '<div class="cal-week-header">';
  headerHtml += '<div class="cal-week-header-spacer"></div>';
  weekDates.forEach((d, i) => {
    const dateKey = getDateKey(d);
    const isToday = dateKey === todayKey;
    const isWeekend = i >= 5;
    const isHoliday = cal.holidaysEnabled && cal.holidays[dateKey];
    let dayCls = 'cal-week-header-day';
    if (isToday) dayCls += ' today';
    if (isWeekend) dayCls += ' weekend';
    headerHtml += `<div class="${dayCls}">
      <span>${weekHeaders[i]}</span>
      <span class="cal-week-header-date">${d.getDate()}</span>
      ${isHoliday ? '<span style="color:#ef4444;font-size:10px;">假</span>' : ''}
    </div>`;
  });
  headerHtml += '</div>';

  let gridHtml = `<div class="cal-week-body" id="calWeekBody">
    <div class="cal-week-grid" style="grid-template-columns:56px repeat(7,1fr);">`;

  for (let slot = 0; slot < totalSlots; slot++) {
    const minutesFromStart = slot * zoom;
    const hour = startHour + Math.floor(minutesFromStart / 60);
    const min = minutesFromStart % 60;
    const showLabel = min === 0 || zoom <= 30;

    gridHtml += `<div class="cal-week-time-cell" style="height:${slotHeight}px;">
      ${showLabel ? `<span class="cal-week-time-label">${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}</span>` : ''}
    </div>`;

    weekDates.forEach((d, colIdx) => {
      const dateKey = getDateKey(d);
      const isWeekend = colIdx >= 5;
      const isHoliday = cal.holidaysEnabled && cal.holidays[dateKey];
      let cellCls = 'cal-week-day-cell';
      if (isWeekend) cellCls += ' weekend';
      if (isHoliday) cellCls += ' holiday';
      gridHtml += `<div class="${cellCls}" style="height:${slotHeight}px;" data-date="${dateKey}" data-slot="${slot}" data-hour="${hour}" data-min="${min}"></div>`;
    });
  }

  gridHtml += '</div></div>';

  el.calWeekView.innerHTML = headerHtml + gridHtml;

  requestAnimationFrame(() => {
    const weekBody = document.getElementById('calWeekBody');
    if (!weekBody) return;

    const grid = weekBody.querySelector('.cal-week-grid');
    if (!grid) return;

    weekDates.forEach((d, colIdx) => {
      const dateKey = getDateKey(d);
      const records = state.data.records[dateKey] || [];

      records.forEach(record => {
        const startDate = new Date(record.startTime);
        const recHour = startDate.getHours();
        const recMin = startDate.getMinutes();
        if (recHour < startHour) return;

        const recMinutesFromStart = (recHour - startHour) * 60 + recMin;
        const topSlot = recMinutesFromStart / zoom;
        const heightSlots = record.durationMinutes / zoom;
        const topPx = topSlot * slotHeight;
        const heightPx = Math.max(heightSlots * slotHeight - 2, 20);

        const cellSelector = `.cal-week-day-cell[data-date="${dateKey}"][data-slot="0"]`;
        const firstCell = weekBody.querySelector(cellSelector);
        if (!firstCell) return;

        const colWidth = firstCell.offsetWidth;
        const gridRect = grid.getBoundingClientRect();
        const firstCellRect = firstCell.getBoundingClientRect();
        const timeCellWidth = 56;

        const leftPx = timeCellWidth + colIdx * colWidth + 2;
        const widthPx = colWidth - 4;

        const card = document.createElement('div');
        card.className = 'cal-week-pomodoro-card';
        card.style.top = topPx + 'px';
        card.style.height = heightPx + 'px';
        card.style.width = widthPx + 'px';
        card.style.left = leftPx + 'px';

        const taskShort = record.taskName ? record.taskName.substring(0, 4) : '';
        const contentShort = (record.content || '').substring(0, 10);

        card.innerHTML = `${taskShort ? `<div class="card-task">${escapeHtml(taskShort)}</div>` : ''}<div class="card-content">${escapeHtml(contentShort)}</div>`;
        card.title = `${formatTimeRange(record.startTime, record.durationMinutes)}\n${record.taskName ? record.taskName + ' - ' : ''}${record.content}`;

        grid.style.position = 'relative';
        grid.appendChild(card);
      });
    });

    weekBody.querySelectorAll('.cal-week-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateKey = cell.dataset.date;
        const hour = parseInt(cell.dataset.hour, 10);
        const min = parseInt(cell.dataset.min, 10);
        openQuickRecordModal(dateKey, hour, min);
      });
    });

    const now = new Date();
    const nowKey = getDateKey(now);
    const nowHour = now.getHours();
    const nowMin = now.getMinutes();
    if (nowHour >= startHour && nowHour < endHour) {
      const weekStartForNow = getWeekStartForDate(now);
      if (getDateKey(weekStartForNow) === getDateKey(weekStart)) {
        const nowMinutesFromStart = (nowHour - startHour) * 60 + nowMin;
        const scrollPos = Math.max(0, (nowMinutesFromStart / zoom) * slotHeight - weekBody.clientHeight / 3);
        weekBody.scrollTop = scrollPos;
      }
    }
  });
}

function openQuickRecordModal(dateKey, hour, min) {
  state.calendar.quickRecordDate = dateKey;
  el.qrDateInput.value = dateKey;
  el.qrStartTime.value = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  el.qrDuration.value = '25';
  el.qrContent.value = '';

  const tasks = state.data.tasks[dateKey] || [];
  const incompleteTasks = tasks.filter(t => t.status !== 'completed');
  el.qrTaskSelect.innerHTML = '<option value="">不关联任务</option>';
  incompleteTasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = task.name;
    el.qrTaskSelect.appendChild(option);
  });

  el.quickRecordModal.style.display = 'flex';
  setTimeout(() => el.qrContent.focus(), 100);
}

function saveQuickRecordHandler() {
  const dateKey = el.qrDateInput.value;
  const startTimeStr = el.qrStartTime.value;
  const duration = parseInt(el.qrDuration.value, 10);
  const content = el.qrContent.value.trim();
  const taskId = el.qrTaskSelect.value || null;

  if (!dateKey || !startTimeStr || isNaN(duration) || duration < 1) {
    el.qrContent.focus();
    return;
  }

  const [h, m] = startTimeStr.split(':').map(Number);
  const [y, mon, d] = dateKey.split('-').map(Number);
  const startMs = new Date(y, mon - 1, d, h, m).getTime();

  let taskName = '';
  if (taskId) {
    const tasks = state.data.tasks[dateKey] || [];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      taskName = task.name;
      task.completedPomodoros = (task.completedPomodoros || 0) + 1;
      if (task.status === 'todo') task.status = 'inProgress';
    }
  }

  const record = {
    id: Date.now().toString(),
    startTime: startMs,
    durationMinutes: duration,
    content: content || '（补录）',
    taskId,
    taskName,
  };

  if (!state.data.records[dateKey]) {
    state.data.records[dateKey] = [];
  }
  state.data.records[dateKey].push(record);
  state.data.records[dateKey].sort((a, b) => a.startTime - b.startTime);

  persistData();
  el.quickRecordModal.style.display = 'none';

  if (state.activeTab === 'calendar') {
    renderCalendar();
  }
  if (dateKey === state.currentDate) {
    renderAll();
  }
}

function navigateCalendar(direction) {
  const cal = state.calendar;
  if (cal.viewMode === 'month') {
    cal.viewMonth += direction;
    if (cal.viewMonth > 11) {
      cal.viewMonth = 0;
      cal.viewYear++;
    } else if (cal.viewMonth < 0) {
      cal.viewMonth = 11;
      cal.viewYear--;
    }
  } else {
    const currentStart = cal.viewWeekStart || getWeekStartForDate(new Date());
    currentStart.setDate(currentStart.getDate() + direction * 7);
    cal.viewWeekStart = new Date(currentStart);
  }
  renderCalendar();
}

function goCalendarToday() {
  const cal = state.calendar;
  const now = new Date();
  if (cal.viewMode === 'month') {
    cal.viewYear = now.getFullYear();
    cal.viewMonth = now.getMonth();
  } else {
    cal.viewWeekStart = getWeekStartForDate(now);
  }
  renderCalendar();
}

function switchCalendarView(viewMode) {
  state.calendar.viewMode = viewMode;
  el.calViewBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewMode);
  });
  if (viewMode === 'week' && !state.calendar.viewWeekStart) {
    state.calendar.viewWeekStart = getWeekStartForDate(new Date());
  }
  renderCalendar();
}

function setupCalendarControls() {
  el.calPrevBtn.addEventListener('click', () => navigateCalendar(-1));
  el.calNextBtn.addEventListener('click', () => navigateCalendar(1));
  el.calTodayBtn.addEventListener('click', goCalendarToday);

  el.calViewBtns.forEach(btn => {
    btn.addEventListener('click', () => switchCalendarView(btn.dataset.view));
  });

  el.calZoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.calendar.weekZoom = parseInt(btn.dataset.zoom, 10);
      el.calZoomBtns.forEach(b => b.classList.toggle('active', b.dataset.zoom === btn.dataset.zoom));
      renderWeekView();
    });
  });

  el.cancelQuickRecord.addEventListener('click', () => {
    el.quickRecordModal.style.display = 'none';
  });

  el.saveQuickRecord.addEventListener('click', saveQuickRecordHandler);

  el.qrContent.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveQuickRecordHandler();
    } else if (e.key === 'Escape') {
      el.quickRecordModal.style.display = 'none';
    }
  });

  el.quickRecordModal.addEventListener('click', (e) => {
    if (e.target === el.quickRecordModal) {
      el.quickRecordModal.style.display = 'none';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (el.calTooltip.style.display === 'block') {
      const tooltipRect = el.calTooltip.getBoundingClientRect();
      if (e.clientX < tooltipRect.left - 20 || e.clientX > tooltipRect.right + 20 ||
          e.clientY < tooltipRect.top - 20 || e.clientY > tooltipRect.bottom + 20) {
        el.calTooltip.style.display = 'none';
      }
    }
  });
}

function renderCalendarNavTitle() {
  updateCalendarNavTitle();
}

async function init() {
  try {
    state.data = await ipcRenderer.invoke('load-data');
    if (!state.data.tasks) state.data.tasks = {};
    if (!state.data.lastActiveDate) state.data.lastActiveDate = null;
    if (!state.data.customPresets) state.data.customPresets = [];
  } catch (e) {
    console.error('加载数据失败:', e);
    state.data = { records: {}, tasks: {}, lastActiveDate: null, customPresets: [] };
  }

  try {
    const loadedSettings = await ipcRenderer.invoke('load-settings');
    state.settings = { ...DEFAULT_SHORTCUTS, ...loadedSettings };
    state.tempSettings = { ...state.settings };
  } catch (e) {
    console.error('加载设置失败:', e);
    state.settings = { ...DEFAULT_SHORTCUTS };
    state.tempSettings = { ...DEFAULT_SHORTCUTS };
  }

  setupDurationButtons();
  setupCustomDuration();
  setupFocusAndFullscreen();
  setupTaskControls();
  setupControls();
  setupSettings();
  setupShortcutInputs();
  setupStatsModal();
  setupCalendarControls();
  updateTimerDisplay();
  renderAll();
  syncTimerState();
}

init();
