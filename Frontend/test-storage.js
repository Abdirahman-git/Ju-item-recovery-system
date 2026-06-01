const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://rzlmlegawumzijcrdijq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bG1sZWdhd3VtemlqY3JkaWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTE2NzMsImV4cCI6MjA5MDM4NzY3M30.lmtQiH-kojObUrqNTu7WhUAy7FbowI4gO29Od29GXvk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorage() {
  console.log("Testing storage upload...");
  // Create a dummy file
  fs.writeFileSync('test.jpg', 'dummy image content');
  const fileContent = fs.readFileSync('test.jpg');

  const { data, error } = await supabase.storage
    .from('item-images')
    .upload('test_image.jpg', fileContent, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error("STORAGE ERROR:", error.message);
  } else {
    console.log("STORAGE SUCCESS:", data);
  }
}

testStorage();
