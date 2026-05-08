import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { config } from "./config";

const connectionString = config.database.url;

// Create pool with connection retry settings
export const pool = new Pool({ 
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Ensure every new pooled connection resolves unqualified table names against
// the peacepad schema first, then public. All Drizzle tables are defined
// without a schema prefix, but production tables live under `peacepad.*`.
// connect-pg-simple's `sessions` table also exists in `public` (created by
// migrations/hotfix_sessions.sql), so this ordering keeps both happy.
pool.on('connect', (client) => {
  client.query('SET search_path TO peacepad, public, extensions').catch((err) => {
    console.error('[Database] Failed to set search_path on new connection:', err);
  });
});

export const db = drizzle(pool, { schema });

// Health check function with retry logic
async function checkDatabaseConnection(retries = 3, delay = 1000): Promise<boolean> {
  const isProduction = config.isProduction;
  
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[Database] Connection successful');
      return true;
    } catch (error: any) {
      const isLastRetry = i === retries - 1;
      
      // Log detailed error info for debugging DNS/connection issues
      if (error.code === 'ENOTFOUND') {
        console.error(`[Database] DNS resolution failed - hostname not found. Check PGHOST/DATABASE_URL configuration.`);
        console.error(`[Database] Error details: ${error.message}`);
      } else if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
        console.warn(`[Database] Endpoint is suspended (attempt ${i + 1}/${retries}).`);
      } else {
        console.warn(`[Database] Connection attempt ${i + 1}/${retries} failed:`, error.message);
      }
      
      if (!isLastRetry) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  // In production, fail fast to prevent deploying a broken app
  if (isProduction) {
    console.error('[Database] FATAL: Failed to connect to database after retries. Exiting to prevent broken deployment.');
    process.exit(1);
  }
  
  console.warn('[Database] Failed to connect after retries. App will continue but database features may be limited.');
  return false;
}

// Initialize connection check - blocking in production, non-blocking in development
const connectionPromise = checkDatabaseConnection();
if (config.isProduction) {
  // In production, wait for connection check before continuing
  connectionPromise.catch(err => {
    console.error('[Database] FATAL: Health check error:', err);
    process.exit(1);
  });
} else {
  connectionPromise.catch(err => {
    console.error('[Database] Health check error:', err);
  });
}

// Add error handler for pool
pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err);
});

// Export a wrapper for queries that auto-retries on failures
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      const isLastRetry = i === maxRetries - 1;
      
      if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
        if (!isLastRetry) {
          console.log(`[Database] Retrying query (attempt ${i + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw new Error('Query failed after retries');
}
