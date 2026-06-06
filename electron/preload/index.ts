import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  }
} as const

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
