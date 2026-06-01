const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rzlmlegawumzijcrdijq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bG1sZWdhd3VtemlqY3JkaWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTE2NzMsImV4cCI6MjA5MDM4NzY3M30.lmtQiH-kojObUrqNTu7WhUAy7FbowI4gO29Od29GXvk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log("Testing insert into found_items...");
  const { data, error } = await supabase.from('found_items').insert({
    "itemName": "Test Item from Node",
    "category": "Electronics",
    "dateFound": "10/05/2026",
    "location": "Test Location",
    "description": "Test Description",
    "finderName": "Test Finder",
    "phnum": "123456789",
    "email": "test@ju.edu.so",
    "finderId": "test@ju.edu.so",
    "imageURI": null
  });

  if (error) {
    console.error("ERROR:", error.message, error.details, error.hint);
  } else {
    console.log("SUCCESS! Data inserted.");
  }
}

testInsert();
