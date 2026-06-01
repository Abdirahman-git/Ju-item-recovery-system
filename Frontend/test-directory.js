const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rzlmlegawumzijcrdijq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bG1sZWdhd3VtemlqY3JkaWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTE2NzMsImV4cCI6MjA5MDM4NzY3M30.lmtQiH-kojObUrqNTu7WhUAy7FbowI4gO29Od29GXvk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data, error } = await supabase
      .from('student_directory')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error fetching student_directory:', error);
    } else {
      console.log('Successfully fetched rows from student_directory:', data);
    }
  } catch (err) {
    console.error('Fatal test error:', err.message);
  }
}

test();
