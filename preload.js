const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件对话框
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // 应用信息
  getAppPath: (name) => ipcRenderer.invoke('app:getPath', name),
  getPythonDir: () => ipcRenderer.invoke('app:getPythonDir'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Python桥接 - 通过隐藏DOM传递消息
  sendToPython: (channel, data) => {
    // 通过ipcRenderer发送到主进程，由主进程调用Python
    ipcRenderer.send('python:execute', { channel, data });
  },

  onPythonProgress: (callback) => {
    ipcRenderer.on('python:progress', (event, data) => callback(data));
  },

  onPythonComplete: (callback) => {
    ipcRenderer.on('python:complete', (event, data) => callback(data));
  },

  onPythonError: (callback) => {
    ipcRenderer.on('python:error', (event, data) => callback(data));
  }
});