const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

console.log('Using GMAIL_USER:', process.env.GMAIL_USER);
console.log('Using GMAIL_PASS:', process.env.GMAIL_PASS ? '*****' : 'empty');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const mailOptions = {
  from: process.env.GMAIL_USER,
  to: 'xaajicagta09@gmail.com',
  subject: 'Test Email from JU LOFO System',
  text: 'Hello! This is a test email to verify Nodemailer backend setup.'
};

async function testEmail() {
  try {
    console.log('Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('🎉 Email sent successfully!', info.response);
  } catch (err) {
    console.error('❌ Nodemailer Error Stack:', err);
  }
}

testEmail();
