const { app, BrowserWindow, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'pomodoro-data.json');

let mainWindow;
let tray;

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
  return { records: {} };
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

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayTooltip() {
  if (tray) {
    const count = countTodayPomodoros();
    tray.setToolTip(`番茄钟日记 - 今日完成 ${count} 个番茄钟`);
  }
}

ipcMain.handle('load-data', () => {
  return loadData();
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

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
