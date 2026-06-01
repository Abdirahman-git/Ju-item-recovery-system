const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rzlmlegawumzijcrdijq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bG1sZWdhd3VtemlqY3JkaWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTE2NzMsImV4cCI6MjA5MDM4NzY3M30.lmtQiH-kojObUrqNTu7WhUAy7FbowI4gO29Od29GXvk';
const supabase = createClient(supabaseUrl, supabaseKey);

const students = [
  { student_id: 'CS1300648', full_name: 'Abdifitah Mohamud Abdirahman', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300651', full_name: 'Abdijabar Ahmed Osman', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300734', full_name: 'Abdikafi Dahir Samatar', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300652', full_name: 'Abdikarim Adam Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300653', full_name: 'Abdikhalikh Ahmed Osman', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300733', full_name: 'Abdiladif Ahmed Mohamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300655', full_name: 'Abdimajid Ali Moalim Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300656', full_name: 'Abdinafac Mohamed Rashid', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300661', full_name: 'Abdirahman Dahir Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300662', full_name: 'Abdirahman Mohamud Mohamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300663', full_name: 'Abdirashid Abdullahi Mohamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300664', full_name: 'Abdirizak Abdi Sheikhdon', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300665', full_name: 'Abdishakur Hassan Abdirahman', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300666', full_name: 'Abdishakur Yusuf Moalin Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300667', full_name: 'Abdulkadir Mahad Abdulle', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300669', full_name: 'Abdullahi Aweys Mahamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300670', full_name: 'Abdullahi Mahamed Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300732', full_name: 'Adan Dahir Abdi', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300673', full_name: 'Ahmed Barre Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300674', full_name: 'Ahmed Ibrahim Mohamud', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300679', full_name: 'Alibashi Mohamed Abdidon', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300680', full_name: 'Anfac Abdiweli Hassan', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300681', full_name: 'Anisa Abdi Ali', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300684', full_name: 'Faiza Abdirahman Said', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300686', full_name: 'Fuad Bishar Ali', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300688', full_name: 'Hafsa Hassan Nur', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300731', full_name: 'Hani Abdikadir Hassan', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300690', full_name: 'Ilyas Abdi Ahmed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300691', full_name: 'Iman Abdulkadir Abdullahi', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300693', full_name: 'Isse Awil Abdi', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300695', full_name: 'Khadar Abdirashid Saiad', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300697', full_name: 'Mahad Mohamed Hassan', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300699', full_name: 'Masud Abdi Mohamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300737', full_name: 'Mohamed Da\'ar Muhumed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300703', full_name: 'Mohamed Yusuf Maow', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300704', full_name: 'Musab Ali Mukhtar', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300705', full_name: 'Mustaf Ahmed Isse', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300890', full_name: 'Nafiso Hussein Wehliye', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300708', full_name: 'Omar Ibrahim Mohamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300709', full_name: 'Omar Mohamud Mahdi', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300710', full_name: 'Rayan Abdinasir Warsame', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300712', full_name: 'Sahra Mohamed Hussein', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300727', full_name: 'Salma Mohamed Mukhtar', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300713', full_name: 'Samira Mohamed Hussein', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300716', full_name: 'Sumaya Abdirizak Adam', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300718', full_name: 'Suweys Abdirizak Mohamud', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300720', full_name: 'Wafaa Said Mohamed', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300721', full_name: 'Yonis Khalif Abdulle', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300722', full_name: 'Zahra Ahmed Dhore', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' },
  { student_id: 'CS1300632', full_name: 'Salad Ali Ishak', phone_number: null, faculty: 'Computer Science and IT', status: 'pending' }
];

async function seed() {
  try {
    // Clean old
    await supabase.from('student_directory').delete().neq('student_id', '');
    
    // Insert new
    const { data, error } = await supabase
      .from('student_directory')
      .insert(students);

    if (error) {
      console.error('Error seeding database:', error.message);
    } else {
      console.log('🎉 Successfully seeded 50 Jazeera University students into the database!');
    }
  } catch (err) {
    console.error('Fatal seed error:', err.message);
  }
}

seed();
