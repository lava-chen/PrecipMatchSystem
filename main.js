const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '多源气象卫星降水数据一体化处理与时空匹配系统',
    backgroundColor: '#0D1B2A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ========== IPC 通信处理 ==========

// 打开文件选择对话框
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [
      { name: '气象数据文件', extensions: ['hdf', 'h5', 'nc', 'nc4', 'HDF', 'HDF5'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  return result;
});

// 打开文件夹选择对话框
ipcMain.handle('dialog:openDirectory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

// 保存文件对话框
ipcMain.handle('dialog:saveFile', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: options.filters || [
      { name: 'CSV文件', extensions: ['csv'] },
      { name: 'GeoTIFF', extensions: ['tif', 'tiff'] },
      { name: 'PNG图片', extensions: ['png'] }
    ]
  });
  return result;
});

// 获取应用路径
ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});

// 获取Python脚本目录
ipcMain.handle('app:getPythonDir', () => {
  return path.join(__dirname, 'python');
});

// 获取应用版本
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});