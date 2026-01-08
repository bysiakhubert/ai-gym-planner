import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/db/database.types';

/**
 * Database cleanup helper for E2E tests
 * Cleans up test data after each test to ensure test isolation
 * 
 * Note: The database schema only has these tables:
 * - plans (training plans with embedded day/exercise data as JSON)
 * - training_sessions (workout sessions with embedded exercise data as JSON)
 * - audit_events (audit log)
 */

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

// Create admin client with service role key for cleanup operations
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Clean up all test data from the database
 * Preserves the seed user (dev.user@example.com) but removes all their data
 */
export async function cleanupTestData() {
  try {
    // Get the test user ID from environment
    const testUserId = process.env.E2E_USERNAME_ID;
    
    if (!testUserId) {
      console.warn('⚠️  E2E_USERNAME_ID not set, skipping database cleanup');
      return;
    }

    // Delete in correct order to respect foreign key constraints
    // The schema only has: plans, training_sessions, audit_events
    
    // 1. Delete training_sessions for the test user
    const { error: sessionsError } = await supabaseAdmin
      .from('training_sessions')
      .delete()
      .eq('user_id', testUserId);

    if (sessionsError) {
      console.error('Error deleting training_sessions:', sessionsError);
    }

    // 2. Delete plans for the test user
    const { error: plansError } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('user_id', testUserId);

    if (plansError) {
      console.error('Error deleting plans:', plansError);
    }

    // 3. Delete audit_events for the test user (optional, for complete cleanup)
    const { error: auditError } = await supabaseAdmin
      .from('audit_events')
      .delete()
      .eq('user_id', testUserId);

    if (auditError) {
      console.error('Error deleting audit_events:', auditError);
    }

    console.log('✅ Database cleanup completed');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    // Don't throw - we don't want cleanup failures to break tests
  }
}

/**
 * Verify database connection
 */
export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('plans')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
