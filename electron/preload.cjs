const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('marketApi', {
  getStock: (symbol) =>
    ipcRenderer.invoke('market:get-stock', symbol),

  getUsdIls: () =>
    ipcRenderer.invoke('market:get-usd-ils')
});
