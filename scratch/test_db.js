
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credentials missing in environment. Ensure you use --env-file=.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Try to fetch something generic. 
    // Even if table doesn't exist, a 404 response with code 42P01 proves the connection works.
    const { data, error } = await supabase.from('_connection_probe_').select('*').limit(1);
    
    if (error) {
      // 42P01: relation does not exist (Proof we reached the database but table is missing)
      // PGRST116: no rows found (Proof we reached the database and table exists)
      // 401/403: auth error (Proof we reached the instance but key is invalid/restricted)
      if (error.code === '42P01' || error.code === 'PGRST116' || error.status === 401 || error.status === 403) {
        console.log('\x1b[32m%s\x1b[0m', '✔ PROVED: Successfully reached your Supabase instance!');
        console.log('Status Code:', error.status);
        console.log('PostgREST Code:', error.code);
        console.log('Message:', error.message);
      } else {
        console.log('Connection reached but returned error:', error.message);
      }
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✔ PROVED: Connected and query executed successfully!');
    }
  } catch (err) {
    console.error('Connection failed (Network Error):', err.message);
  }
}

testConnection();
