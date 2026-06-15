import { offlineDb } from './offlineDb';
import * as projectsApi from './projects';
import * as filesApi from './files';

class SyncManager {
  private isSyncing = false;
  private listeners: ((online: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleStatusChange(true));
      window.addEventListener('offline', () => this.handleStatusChange(false));
    }
  }

  public get isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public subscribe(listener: (online: boolean) => void) {
    this.listeners.push(listener);
    // Initial call
    listener(this.isOnline);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private handleStatusChange(online: boolean) {
    this.listeners.forEach(l => l(online));
    if (online) {
      this.sync();
    }
  }

  public async sync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;
    this.isSyncing = true;

    // Trigger event that sync is starting
    window.dispatchEvent(new CustomEvent('sync-status', { detail: 'syncing' }));

    try {
      const queue = await offlineDb.getQueue();
      if (queue.length === 0) {
        window.dispatchEvent(new CustomEvent('sync-status', { detail: 'idle' }));
        this.isSyncing = false;
        return;
      }

      // Sort queue by timestamp just in case
      queue.sort((a, b) => a.timestamp - b.timestamp);

      // Temporary ID to Real ID mapping
      const idMap = new Map<string, string>();

      for (const item of queue) {
        const { id, action, payload } = item;

        try {
          if (action === 'create_project') {
            const res = await projectsApi.createProject(payload.name, payload.color);
            if (payload.tempId) {
              idMap.set(payload.tempId, res.id);
              // Update local cache
              const projects = await offlineDb.getProjects();
              const updated = projects.map(p => p.id === payload.tempId ? { ...p, id: res.id } : p);
              await offlineDb.saveProjects(updated);
            }
          } 
          else if (action === 'update_project') {
            const targetId = idMap.get(payload.id) || payload.id;
            await projectsApi.updateProject(targetId, payload.data);
          } 
          else if (action === 'delete_project') {
            const targetId = idMap.get(payload.id) || payload.id;
            await projectsApi.deleteProject(targetId);
          } 
          else if (action === 'reorder_projects') {
            const targetIds = payload.orderedIds.map((tid: string) => idMap.get(tid) || tid);
            await projectsApi.reorderProjects(targetIds);
          } 
          else if (action === 'create_file') {
            const targetProjectId = idMap.get(payload.projectId) || payload.projectId;
            const res = await filesApi.createFile(targetProjectId, payload.type, payload.title);
            if (payload.tempId) {
              idMap.set(payload.tempId, res.id);
              // Update local cache: replace temp file id with real file id
              const files = await offlineDb.getFilesByProject(targetProjectId);
              const updated = files.map(f => f.id === payload.tempId ? { ...f, id: res.id, projectId: targetProjectId } : f);
              
              // Remove temp file from IndexedDB
              await offlineDb.deleteFile(payload.tempId);
              // Save real file to IndexedDB
              await offlineDb.saveFiles(updated);
            }
          } 
          else if (action === 'update_file') {
            const targetId = idMap.get(payload.id) || payload.id;
            await filesApi.updateFile(targetId, payload.data);
          } 
          else if (action === 'delete_file') {
            const targetId = idMap.get(payload.id) || payload.id;
            await filesApi.deleteFile(targetId);
          } 
          else if (action === 'reorder_files') {
            const targetProjectId = idMap.get(payload.projectId) || payload.projectId;
            const targetIds = payload.orderedIds.map((tid: string) => idMap.get(tid) || tid);
            await filesApi.reorderFiles(targetProjectId, targetIds);
          } 
          else if (action === 'move_file') {
            const targetId = idMap.get(payload.id) || payload.id;
            const targetProjectId = idMap.get(payload.targetProjectId) || payload.targetProjectId;
            await filesApi.moveFile(targetId, targetProjectId);
          }

          // Dequeue processed item
          if (id !== undefined) {
            await offlineDb.dequeue(id);
          }
        } catch (itemErr) {
          console.error(`Error processing sync item ${action}:`, itemErr);
          // If server error occurs, we break and stop sync (preserving queue) so we don't drop updates or run them out of order
          break;
        }
      }

      window.dispatchEvent(new CustomEvent('sync-status', { detail: 'success' }));
    } catch (err) {
      console.error('Sync failed:', err);
      window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
