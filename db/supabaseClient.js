import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fidcyrshemjwnhnmulrf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZGN5cnNoZW1qd25obm11bHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODc5MjUsImV4cCI6MjA2OTY2MzkyNX0.-L2S-Ap8edSpxE9Qy0ZLtMnOuplsVMJUxBRlhA3vanM';

export const supabase = createClient(supabaseUrl, supabaseKey);
