const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getEntries: () => ipcRenderer.invoke("get-entries"),
  saveEntry: (data) => ipcRenderer.invoke("save-entry", data),
  openEntry: (data) => ipcRenderer.invoke("open-entry", data),
  deleteEntry: (data) => ipcRenderer.invoke("delete-entry", data),
  editEntry: (data) => ipcRenderer.invoke("edit-entry", data),
});
