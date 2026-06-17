const { ipcRenderer } = require('electron');

const el = {
  miniTimer: document.getElementById('miniTimer'),
  miniToggleBtn: document.getElementById('miniToggleBtn'),
  miniResetBtn: document.getElementById('miniResetBtn'),
  miniShowBtn: document.getElementById('miniShowBtn'),
  miniCloseBtn: document.getElementById('miniCloseBtn'),
};

let state = {
  remainingSeconds: 25 * 60,
  isRunning: false,
};

function formatTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  el.miniTimer.textContent = formatTimerDisplay(state.remainingSeconds);
  if (state.isRunning) {
    el.miniTimer.classList.add('running');
    el.miniToggleBtn.textContent = '⏸';
    el.miniToggleBtn.title = '暂停';
  } else {
    el.miniTimer.classList.remove('running');
    el.miniToggleBtn.textContent = '▶';
    el.miniToggleBtn.title = '开始';
  }
}

ipcRenderer.on('timer-state', (_event, newState) => {
  state = { ...state, ...newState };
  updateDisplay();
});

ipcRenderer.on('shortcut:toggle-timer', () => {
  ipcRenderer.invoke('mini-toggle-timer');
});

ipcRenderer.on('shortcut:reset-timer', () => {
  ipcRenderer.invoke('mini-reset-timer');
});

el.miniToggleBtn.addEventListener('click', () => {
  ipcRenderer.invoke('mini-toggle-timer');
});

el.miniResetBtn.addEventListener('click', () => {
  ipcRenderer.invoke('mini-reset-timer');
});

el.miniShowBtn.addEventListener('click', () => {
  ipcRenderer.invoke('mini-show-main');
});

el.miniCloseBtn.addEventListener('click', () => {
  ipcRenderer.invoke('mini-close');
});

window.addEventListener('DOMContentLoaded', () => {
  updateDisplay();
  ipcRenderer.invoke('get-timer-state');
});
