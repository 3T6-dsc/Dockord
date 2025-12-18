
const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let items = [];
const DATA_FILE = path.join(app.getPath('userData'), 'dockord_data.json');

// --- Persistence ---
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      items = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load data', e);
    items = [];
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
  } catch (e) {
    console.error('Failed to save data', e);
  }
}

// --- Reminders Engine ---
function checkReminders() {
  const now = new Date();
  items.forEach(item => {
    if (item.reminderDate && !item.reminderNotified) {
      const rDate = new Date(item.reminderDate);
      // Check if it's today or past due
      if (rDate.toDateString() === now.toDateString()) {
        new Notification({
          title: 'Dockord Reminder',
          body: `Don't forget: ${item.title || 'Untitled Message'}`,
          icon: path.join(__dirname, 'icon.png')
        }).show();
        item.reminderNotified = true;
        saveData();
      }
    }
  });
}

// --- Window Management ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: true, 
    autoHideMenuBar: true,
    title: "Dockord",
    backgroundColor: '#313338',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webSecurity: false 
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadData();
  createWindow();
  
  // Check reminders every hour
  setInterval(checkReminders, 60 * 60 * 1000);
  // Initial check
  setTimeout(checkReminders, 5000);

  app.on('activate', function () {
    if (mainWindow === null) createWindow();
  });
});

app.on('will-quit', () => {
  saveData();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

// Data
ipcMain.handle('get-recipes', () => items); // Keeping name for compat or update index.tsx

ipcMain.on('save-recipe', (event, item) => {
  const existingIndex = items.findIndex(r => r.id === item.id);
  if (existingIndex >= 0) {
    items[existingIndex] = { ...item, updatedAt: Date.now() };
  } else {
    items.push({ ...item, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveData();
  mainWindow.webContents.send('recipes-updated', items);
});

ipcMain.on('delete-recipe', (event, id) => {
  items = items.filter(r => r.id !== id);
  saveData();
  mainWindow.webContents.send('recipes-updated', items);
});
