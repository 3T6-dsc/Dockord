const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow;
let recipes = [];
const RECIPES_FILE = path.join(app.getPath('userData'), 'codechef_recipes.json');

// --- Persistence ---
function loadRecipes() {
  try {
    if (fs.existsSync(RECIPES_FILE)) {
      const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
      recipes = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load recipes', e);
    recipes = [];
  }
}

function saveRecipes() {
  try {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
  } catch (e) {
    console.error('Failed to save recipes', e);
  }
}

// --- Window Management ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: true, 
    autoHideMenuBar: true,
    title: "CodeChef",
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webSecurity: false 
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open links externally
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadRecipes();
  createWindow();

  app.on('activate', function () {
    if (mainWindow === null) createWindow();
  });
});

app.on('will-quit', () => {
  saveRecipes();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

// Data
ipcMain.handle('get-recipes', () => recipes);

ipcMain.on('save-recipe', (event, recipe) => {
  const existingIndex = recipes.findIndex(r => r.id === recipe.id);
  if (existingIndex >= 0) {
    recipes[existingIndex] = { ...recipe, updatedAt: Date.now() };
  } else {
    recipes.push({ ...recipe, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveRecipes();
  mainWindow.webContents.send('recipes-updated', recipes);
});

ipcMain.on('delete-recipe', (event, id) => {
  recipes = recipes.filter(r => r.id !== id);
  saveRecipes();
  mainWindow.webContents.send('recipes-updated', recipes);
});

// Execution
ipcMain.on('execute-command', (event, { command, cwd }) => {
  if (!command) return;

  // Determine shell based on OS
  const isWin = process.platform === 'win32';
  const shellCmd = isWin ? 'powershell.exe' : '/bin/bash';
  const shellArgs = isWin ? ['-Command', command] : ['-c', command];
  
  // Default CWD to home dir if not specified
  const workingDir = cwd || os.homedir();

  event.reply('execution-start', { command });

  try {
    const child = spawn(shellCmd, shellArgs, {
      cwd: workingDir,
      shell: true,
      env: process.env // Inherit system environment variables
    });

    child.stdout.on('data', (data) => {
      event.reply('execution-output', data.toString());
    });

    child.stderr.on('data', (data) => {
      event.reply('execution-error', data.toString());
    });

    child.on('close', (code) => {
      event.reply('execution-end', { code });
    });

    child.on('error', (err) => {
      event.reply('execution-error', err.message);
      event.reply('execution-end', { code: 1 });
    });

  } catch (error) {
    event.reply('execution-error', error.message);
    event.reply('execution-end', { code: 1 });
  }
});