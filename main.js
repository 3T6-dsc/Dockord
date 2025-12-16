const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let history = [];
const HISTORY_FILE = path.join(app.getPath('userData'), 'clipsync_history.json');

// --- Persistence ---
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      history = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load history', e);
    history = [];
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

// --- Clipboard Monitoring ---
let lastText = '';
let lastImage = '';

function determineType(text) {
  if (/^(http|https|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(text)) return 'link';
  // Simple heuristic for code
  if (/^(\s*const\s|\s*let\s|\s*var\s|\s*function\s|\s*import\s|\s*class\s|<html|<!DOCTYPE|\{)/m.test(text)) return 'code';
  return 'text';
}

function checkClipboard() {
  const text = clipboard.readText();
  const image = clipboard.readImage();
  
  let changed = false;

  // Handle Text
  if (text && text !== lastText) {
    lastText = text;
    // Avoid duplicates at top
    if (history.length > 0 && history[0].content === text) return;

    const newItem = {
      id: Date.now().toString() + Math.random().toString(),
      type: determineType(text),
      content: text,
      timestamp: Date.now()
    };
    
    history.unshift(newItem);
    if (history.length > 100) history.pop(); // Increased limit to 100
    changed = true;
  } 
  // Handle Image (Only if text is empty or image is different)
  else if (!image.isEmpty()) {
    const dataUrl = image.toDataURL();
    if (dataUrl !== lastImage) {
      lastImage = dataUrl;
      // Simple duplicate check
      if (history.length > 0 && history[0].content === dataUrl) return;

      const newItem = {
        id: Date.now().toString() + Math.random().toString(),
        type: 'image',
        content: dataUrl,
        timestamp: Date.now()
      };
      
      history.unshift(newItem);
      if (history.length > 100) history.pop();
      changed = true;
    }
  }

  if (changed) {
    saveHistory();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('history-updated', history);
    }
  }
}

// --- Window Management ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: true, 
    autoHideMenuBar: true, // Cleaner look
    title: "ClipSync Pro",
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webSecurity: false 
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadHistory();
  createWindow();

  // Register Global Shortcut
  globalShortcut.register('CommandOrControl+Alt+C', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Start Monitoring
  setInterval(checkClipboard, 1000);

  app.on('activate', function () {
    if (mainWindow === null) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  saveHistory();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---
ipcMain.handle('get-history', () => history);

ipcMain.on('copy-item', (event, item) => {
  if (item.type === 'image') {
    const nativeImage = require('electron').nativeImage.createFromDataURL(item.content);
    clipboard.writeImage(nativeImage);
    lastImage = item.content; // Prevent re-capture loop
  } else {
    clipboard.writeText(item.content);
    lastText = item.content; // Prevent re-capture loop
  }
});

ipcMain.on('delete-item', (event, id) => {
  history = history.filter(item => item.id !== id);
  saveHistory();
  if (mainWindow) mainWindow.webContents.send('history-updated', history);
});

ipcMain.on('clear-history', () => {
  history = [];
  saveHistory();
  if (mainWindow) mainWindow.webContents.send('history-updated', history);
});

ipcMain.on('paste-item', (event, item) => {
    // Logic to simulate paste if needed, currently copy is sufficient for MVP
    // User can just paste manually after copy
});