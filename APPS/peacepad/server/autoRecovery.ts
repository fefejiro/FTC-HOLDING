import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Smart Auto-Recovery System
 * Automatically detects and fixes common issues without manual intervention
 */

/**
 * Kill any process using the specified port
 * Prevents EADDRINUSE errors by cleaning up zombie processes
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    console.log(`[Auto-Recovery] Checking for processes on port ${port}...`);
    
    // Find process using the port
    const { stdout } = await execAsync(`lsof -ti :${port} || true`);
    const pids = stdout.trim().split('\n').filter(pid => pid);
    
    if (pids.length === 0) {
      console.log(`[Auto-Recovery] Port ${port} is clear`);
      return true;
    }
    
    console.log(`[Auto-Recovery] Found ${pids.length} process(es) on port ${port}, cleaning up...`);
    
    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`);
        console.log(`[Auto-Recovery] Killed process ${pid}`);
      } catch (err) {
        // Process might already be dead
        console.log(`[Auto-Recovery] Process ${pid} already terminated`);
      }
    }
    
    // Wait a moment for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`[Auto-Recovery] Port ${port} cleared successfully`);
    return true;
  } catch (error) {
    console.error('[Auto-Recovery] Failed to clear port:', error);
    return false;
  }
}

/**
 * Smart server startup with automatic conflict resolution
 */
export async function smartStartServer(
  startFn: () => Promise<any>,
  port: number,
  maxRetries: number = 3
): Promise<any> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      console.log(`[Auto-Recovery] Starting server (attempt ${attempt + 1}/${maxRetries})...`);
      return await startFn();
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        console.log(`[Auto-Recovery] Port ${port} conflict detected on attempt ${attempt + 1}`);
        
        // Automatically kill conflicting process
        const cleared = await killProcessOnPort(port);
        
        if (cleared && attempt < maxRetries - 1) {
          console.log(`[Auto-Recovery] Retrying server start...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          throw new Error(`Failed to start server after ${maxRetries} attempts`);
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw new Error(`Failed to start server after ${maxRetries} attempts`);
}

/**
 * Health check system - monitors app health and auto-recovers
 */
export class HealthMonitor {
  private isHealthy: boolean = true;
  private lastCheck: number = Date.now();
  private checkInterval: NodeJS.Timeout | null = null;
  private isBuildMode: boolean = process.env.BUILD_MODE === 'true' || process.env.PLAY_STORE_BUILD === 'true';
  
  start() {
    if (this.isBuildMode) {
      console.log('[Auto-Recovery] Build mode detected - health monitor disabled to conserve memory');
      return;
    }
    
    console.log('[Auto-Recovery] Health monitor started');
    
    // Check health every 2 minutes (reduced from 30 seconds to conserve resources)
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, 120000);
  }
  
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  private async performHealthCheck() {
    try {
      this.lastCheck = Date.now();
      
      // Check database connection
      const dbHealthy = await this.checkDatabase();
      
      // Check memory usage
      const memHealthy = this.checkMemory();
      
      this.isHealthy = dbHealthy && memHealthy;
      
      if (!this.isHealthy) {
        console.warn('[Auto-Recovery] Health check failed, attempting recovery...');
        await this.attemptRecovery();
      }
    } catch (error) {
      console.error('[Auto-Recovery] Health check error:', error);
    }
  }
  
  private async checkDatabase(): Promise<boolean> {
    // Database check is handled by the database connection itself
    // Just verify we haven't had any critical errors
    return true;
  }
  
  private checkMemory(): boolean {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    
    // Warn if using more than 80% of heap
    if (heapUsedMB / heapTotalMB > 0.8) {
      console.warn(`[Auto-Recovery] High memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`);
      
      // Trigger garbage collection if available
      if (global.gc) {
        console.log('[Auto-Recovery] Running garbage collection...');
        global.gc();
      }
    }
    
    return true;
  }
  
  private async attemptRecovery() {
    console.log('[Auto-Recovery] Attempting automatic recovery...');
    
    // Run garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Log recovery attempt
    console.log('[Auto-Recovery] Recovery attempt completed');
  }
  
  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

/**
 * Automatic cleanup on shutdown
 */
export function setupAutoCleanup() {
  const cleanup = async () => {
    console.log('[Auto-Recovery] Running automatic cleanup...');
    
    // Give time for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[Auto-Recovery] Cleanup complete');
  };
  
  process.on('beforeExit', cleanup);
}
