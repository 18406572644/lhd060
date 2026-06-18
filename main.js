const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'pomodoro-data.json');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'pomodoro-settings.json');

let mainWindow;
let miniWindow;
let tray;

const DEFAULT_SHORTCUTS = {
  toggleTimer: 'Ctrl+Shift+S',
  resetTimer: 'Ctrl+Shift+R',
  toggleWindow: 'Ctrl+Shift+H',
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.tasks) data.tasks = {};
      if (!data.lastActiveDate) data.lastActiveDate = null;
      if (!data.customPresets) data.customPresets = [];
      if (!data.projects) data.projects = [];
      return data;
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
  return { records: {}, tasks: {}, lastActiveDate: null, customPresets: [], projects: [] };
}

function saveData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('保存数据失败:', e);
    return false;
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SHORTCUTS, ...parsed };
    }
  } catch (e) {
    console.error('加载设置失败:', e);
  }
  return { ...DEFAULT_SHORTCUTS };
}

function saveSettings(settings) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error('保存设置失败:', e);
    return false;
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function carryOverUnfinishedTasks(data) {
  const today = getTodayKey();
  const lastDate = data.lastActiveDate;

  if (!lastDate || lastDate === today) {
    data.lastActiveDate = today;
    return data;
  }

  if (!data.tasks[today]) {
    data.tasks[today] = [];
  }

  const todayMaxOrder = data.tasks[today].reduce((max, t) => {
    return typeof t.order === 'number' ? Math.max(max, t.order) : max;
  }, -1);

  let nextOrder = todayMaxOrder + 1;

  const dates = Object.keys(data.tasks).sort();
  dates.forEach(dateKey => {
    if (dateKey >= today) return;

    const tasks = data.tasks[dateKey] || [];
    const sortedTasks = [...tasks].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 999999;
      const orderB = typeof b.order === 'number' ? b.order : 999999;
      return orderA - orderB;
    });

    sortedTasks.forEach(task => {
      if (task.status !== 'completed') {
        const existingTask = data.tasks[today].find(t => t.id === task.id);
        if (!existingTask) {
          const newTask = {
            ...task,
            isCarriedOver: true,
            originalDate: task.originalDate || dateKey,
            order: nextOrder++,
          };
          data.tasks[today].push(newTask);
        }
      }
    });
  });

  data.tasks[today].forEach((task, idx) => {
    if (typeof task.order !== 'number') {
      task.order = idx;
    }
  });

  data.lastActiveDate = today;
  return data;
}

function countTodayPomodoros() {
  const data = loadData();
  const today = getTodayKey();
  return data.records[today] ? data.records[today].length : 0;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock?.hide();
      }
    }
  });
}

function createMiniWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  miniWindow = new BrowserWindow({
    width: 140,
    height: 44,
    x: workArea.width - 160,
    y: 40,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  miniWindow.setAlwaysOnTop(true, 'screen-saver');
  miniWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  miniWindow.loadFile('mini.html');

  if (process.platform === 'darwin') {
    miniWindow.setHiddenInAppNapDisabled(true);
  }
}

function createTray() {
  let trayIcon;
  if (process.platform === 'win32') {
    trayIcon = path.join(__dirname, 'tray.ico');
  } else {
    trayIcon = path.join(__dirname, 'tray.png');
  }

  let iconExists = false;
  try {
    iconExists = fs.existsSync(trayIcon);
  } catch (e) {}

  if (!iconExists) {
    const { nativeImage } = require('electron');
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = x - size / 2;
        const dy = y - size / 2 + 1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < size / 2 - 1) {
          canvas[i] = 239;
          canvas[i + 1] = 68;
          canvas[i + 2] = 68;
          canvas[i + 3] = 255;
        } else {
          canvas[i + 3] = 0;
        }
      }
    }
    const img = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    tray = new Tray(img);
  } else {
    tray = new Tray(trayIcon);
  }

  updateTrayTooltip();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
          if (process.platform === 'darwin') {
            app.dock?.hide();
          }
        } else {
          mainWindow.show();
          mainWindow.focus();
          if (process.platform === 'darwin') {
            app.dock?.show();
          }
        }
      },
    },
    {
      label: '显示/隐藏迷你窗',
      click: () => {
        if (miniWindow.isVisible()) {
          miniWindow.hide();
        } else {
          miniWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock?.hide();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
      if (process.platform === 'darwin') {
        app.dock?.show();
      }
    }
  });
}

function updateTrayTooltip() {
  if (tray) {
    const count = countTodayPomodoros();
    tray.setToolTip(`番茄钟日记 - 今日完成 ${count} 个番茄钟`);
  }
}

function registerGlobalShortcuts() {
  const settings = loadSettings();

  globalShortcut.unregisterAll();

  try {
    globalShortcut.register(settings.toggleTimer, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:toggle-timer');
      }
      if (miniWindow && !miniWindow.isDestroyed()) {
        miniWindow.webContents.send('shortcut:toggle-timer');
      }
    });
  } catch (e) {
    console.error('注册快捷键失败 (toggleTimer):', e);
  }

  try {
    globalShortcut.register(settings.resetTimer, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:reset-timer');
      }
      if (miniWindow && !miniWindow.isDestroyed()) {
        miniWindow.webContents.send('shortcut:reset-timer');
      }
    });
  } catch (e) {
    console.error('注册快捷键失败 (resetTimer):', e);
  }

  try {
    globalShortcut.register(settings.toggleWindow, () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
        if (process.platform === 'darwin') {
          app.dock?.hide();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
        if (process.platform === 'darwin') {
          app.dock?.show();
        }
      }
    });
  } catch (e) {
    console.error('注册快捷键失败 (toggleWindow):', e);
  }
}

function checkShortcutConflict(accelerator, excludeKey) {
  const settings = loadSettings();
  for (const [key, value] of Object.entries(settings)) {
    if (key !== excludeKey && value === accelerator) {
      return true;
    }
  }
  return false;
}

function isShortcutAvailable(accelerator) {
  if (!accelerator || accelerator.trim() === '') {
    return { valid: false, reason: '快捷键不能为空' };
  }
  if (checkShortcutConflict(accelerator, null)) {
    return { valid: false, reason: '与其他快捷键冲突' };
  }
  const canRegister = globalShortcut.isRegistered(accelerator);
  if (canRegister) {
    return { valid: false, reason: '该快捷键已被系统或其他应用占用' };
  }
  return { valid: true };
}

ipcMain.handle('load-data', () => {
  let data = loadData();
  data = carryOverUnfinishedTasks(data);
  saveData(data);
  return data;
});

ipcMain.handle('save-data', (_event, data) => {
  const ok = saveData(data);
  if (ok) updateTrayTooltip();
  return ok;
});

ipcMain.handle('notify', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const n = new Notification({ title, body });
    n.show();
  }
  return true;
});

ipcMain.handle('update-tray', () => {
  updateTrayTooltip();
  return true;
});

ipcMain.handle('load-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (_event, settings) => {
  const ok = saveSettings(settings);
  if (ok) {
    registerGlobalShortcuts();
  }
  return ok;
});

ipcMain.handle('check-shortcut', (_event, { accelerator, excludeKey }) => {
  if (!accelerator || accelerator.trim() === '') {
    return { valid: false, reason: '快捷键不能为空' };
  }
  const settings = loadSettings();
  for (const [key, value] of Object.entries(settings)) {
    if (key !== excludeKey && value === accelerator) {
      return { valid: false, reason: '与其他快捷键冲突' };
    }
  }
  const currentShortcuts = Object.values(settings).filter((s) => s !== settings[excludeKey]);
  const isRegistered = currentShortcuts.includes(accelerator);
  if (isRegistered) {
    return { valid: false, reason: '与其他快捷键冲突' };
  }
  return { valid: true };
});

ipcMain.handle('toggle-main-window', () => {
  mainWindow.show();
  mainWindow.focus();
  if (process.platform === 'darwin') {
    app.dock?.show();
  }
  return true;
});

ipcMain.handle('timer-state-updated', (_event, state) => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('timer-state', state);
  }
  return true;
});

ipcMain.handle('mini-toggle-timer', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('shortcut:toggle-timer');
  }
  return true;
});

ipcMain.handle('mini-reset-timer', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('shortcut:reset-timer');
  }
  return true;
});

ipcMain.handle('mini-show-main', () => {
  mainWindow.show();
  mainWindow.focus();
  if (process.platform === 'darwin') {
    app.dock?.show();
  }
  return true;
});

ipcMain.handle('mini-close', () => {
  miniWindow.hide();
  return true;
});

ipcMain.handle('get-timer-state', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('request-timer-state');
  }
  return true;
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const isFullscreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullscreen);
    return !isFullscreen;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();
  createMiniWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
      if (process.platform === 'darwin') {
        app.dock?.show();
      }
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
