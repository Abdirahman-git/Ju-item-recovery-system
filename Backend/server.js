const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middlewares
app.use(cors());
app.use(express.json());

// In-Memory store for temporary OTPs
// Key: email -> Value: { otp, expiresAt, studentId, verified }
const otpStore = {};
const resetOtpStore = {};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function lookupStudentForActivation(studentId) {
  const id = studentId.trim().toUpperCase();

  const { data: student, error } = await supabase
    .from('student_directory')
    .select('student_id, status, full_name, phone_number, faculty')
    .eq('student_id', id)
    .single();

  if (error || !student) {
    return { error: 'Student ID not found in Jazeera University directory.' };
  }

  if (student.status === 'activated') {
    return { error: 'This Student ID is already activated. Please login instead.' };
  }

  return {
    student: {
      studentId: student.student_id,
      fullName: student.full_name,
      phone: student.phone_number || '',
      faculty: student.faculty || '',
    },
  };
}

// Test Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JU LOFO Backend Service is running.' });
});

/**
 * 1. Validate Student ID
 * POST /api/validate-id
 */
app.post('/api/validate-id', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    const { data: student, error } = await supabase
      .from('student_directory')
      .select('*')
      .eq('student_id', studentId.trim())
      .single();

    if (error || !student) {
      return res.status(444).json({ error: 'Student ID not found in Jazeera University directory.' });
    }

    if (student.status === 'activated') {
      return res.status(445).json({ error: 'This Student ID is already activated. Please login instead.' });
    }

    // Success - return student credentials
    res.json({
      success: true,
      studentId: student.student_id,
      fullName: student.full_name,
      phone: student.phone_number,
      faculty: student.faculty
    });
  } catch (err) {
    console.error('Validate ID Error:', err.message);
    res.status(500).json({ error: 'Server validation error. Please try again.' });
  }
});

/**
 * 2. Send 6-Digit OTP via Nodemailer
 * POST /api/send-otp
 */
app.post('/api/send-otp', async (req, res) => {
  const { studentId, email } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const lookup = await lookupStudentForActivation(studentId);
  if (lookup.error) {
    return res.status(400).json({ error: lookup.error });
  }

  const { studentId: directoryId } = lookup.student;
  const emailToSend = normalizedEmail;

  // Generate 6-digit random code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Set expiration to 5 minutes from now
  const expiresAt = Date.now() + 5 * 60 * 1000;

  // Save to memory store (keyed by the email the student entered)
  otpStore[emailToSend] = {
    otp: otpCode,
    expiresAt,
    studentId: directoryId,
    verified: false,
  };

  // Configure Nodemailer Transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  // Beautiful HTML template with Jazeera University branding
  const mailOptions = {
    from: `"Jazeera University LOFO" <${process.env.GMAIL_USER}>`,
    to: emailToSend,
    subject: 'JU LOFO Account Activation OTP Code',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #1E3A8A; padding-bottom: 15px;">
          <h2 style="color: #1E3A8A; margin: 0; font-size: 24px;">JAZEERA UNIVERSITY</h2>
          <p style="color: #64748B; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px;">LOST AND FOUND SYSTEM</p>
        </div>
        
        <div style="padding: 24px 10px;">
          <h3 style="color: #0F172A; margin: 0 0 16px 0; font-size: 18px;">Account Activation Code</h3>
          <p style="color: #475569; font-size: 14px; line-height: 20px;">
            Hi there, <br/>
            You requested to activate your Jazeera University LOFO account for Student ID: <strong>${directoryId}</strong>.
          </p>
          
          <div style="background-color: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; margin: 24px 0; text-align: center; border-radius: 8px;">
            <p style="color: #1E3A8A; font-size: 11px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 0.5px; text-transform: uppercase;">YOUR 6-DIGIT OTP CODE</p>
            <span style="font-size: 32px; font-weight: bold; color: #1E3A8A; letter-spacing: 4px;">${otpCode}</span>
          </div>

          <p style="color: #E29578; font-size: 12px; margin-top: 20px;">
            * This OTP code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center;">
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">
            JU LOFO Admin Hub © ${new Date().getFullYear()} - Mogadishu, Somalia
          </p>
        </div>
      </div>
    `
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`[OTP] Sent code ${otpCode} to ${emailToSend}`);
    res.json({
      success: true,
      message: 'OTP verification code sent to your email.',
    });
  } catch (err) {
    console.error('Nodemailer Error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP email. Please verify backend configurations.' });
  }
});

/**
 * 3. Verify OTP Code
 * POST /api/verify-otp
 */
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const record = otpStore[email.toLowerCase().trim()];

  if (!record) {
    return res.status(400).json({ error: 'No active OTP verification session found.' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email.toLowerCase().trim()];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Incorrect OTP verification code.' });
  }

  record.verified = true;

  res.json({ success: true, message: 'OTP code verified successfully.' });
});

/**
 * 4. Create Account & Activate ID
 * POST /api/activate-account
 */
app.post('/api/activate-account', async (req, res) => {
  const { studentId, email, password, name, phone } = req.body;

  if (!studentId || !email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const record = otpStore[email.toLowerCase().trim()];

  const normalizedEmail = normalizeEmail(email);

  if (!record || record.studentId !== studentId.trim().toUpperCase()) {
    return res.status(400).json({ error: 'Verification credentials mismatch. Please restart activation.' });
  }

  if (!record.verified) {
    return res.status(400).json({ error: 'OTP not verified. Complete email verification first.' });
  }

  try {
    // 1. Create student user profile in Supabase users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        student_id: studentId.trim(),
        email: normalizedEmail,
        password: password, // manual custom password stored
        name: name,
        phone: phone || '',
        role: 'user',
        is_approved: true // Approved by default
      });

    if (insertError) {
      console.error("Supabase user insert failed:", insertError);
      return res.status(500).json({ error: 'Failed to register account profile. It may already exist.' });
    }

    // 2. Update status to 'activated' in student_directory
    const { error: updateError } = await supabase
      .from('student_directory')
      .update({ status: 'activated' })
      .eq('student_id', studentId.trim());

    if (updateError) {
      console.error("Supabase directory update failed:", updateError);
    }

    // Remove OTP from memory store
    delete otpStore[email.toLowerCase().trim()];

    res.json({ success: true, message: 'Your account has been activated successfully!' });
  } catch (err) {
    console.error('Account Activation Error:', err.message);
    res.status(500).json({ error: 'Failed to activate account. Try again.' });
  }
});

function buildOtpMail({ subject, heading, bodyHtml, otpCode }) {
  return {
    subject,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #1E3A8A; padding-bottom: 15px;">
          <h2 style="color: #1E3A8A; margin: 0; font-size: 24px;">JAZEERA UNIVERSITY</h2>
          <p style="color: #64748B; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px;">LOST AND FOUND SYSTEM</p>
        </div>
        <div style="padding: 24px 10px;">
          <h3 style="color: #0F172A; margin: 0 0 16px 0; font-size: 18px;">${heading}</h3>
          ${bodyHtml}
          <div style="background-color: #EFF6FF; border-left: 4px solid #1A56DB; padding: 16px; margin: 24px 0; text-align: center; border-radius: 8px;">
            <p style="color: #1E3A8A; font-size: 11px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 0.5px; text-transform: uppercase;">YOUR 6-DIGIT OTP CODE</p>
            <span style="font-size: 32px; font-weight: bold; color: #1E3A8A; letter-spacing: 4px;">${otpCode}</span>
          </div>
          <p style="color: #E29578; font-size: 12px; margin-top: 20px;">
            * This OTP code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center;">
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">
            JU LOFO Admin Hub © ${new Date().getFullYear()} - Mogadishu, Somalia
          </p>
        </div>
      </div>
    `,
  };
}

async function sendOtpEmail({ to, subject, heading, bodyHtml, otpCode }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mail = buildOtpMail({ subject, heading, bodyHtml, otpCode });
  await transporter.sendMail({
    from: `"Jazeera University LOFO" <${process.env.GMAIL_USER}>`,
    to,
    subject: mail.subject,
    html: mail.html,
  });
}

async function lookupUserForPasswordReset(studentId) {
  const id = studentId.trim().toUpperCase();

  const { data: user, error } = await supabase
    .from('users')
    .select('student_id, email, name')
    .eq('student_id', id)
    .maybeSingle();

  if (error || !user) {
    return { error: 'Account not found. Activate your account first.' };
  }

  const email = normalizeEmail(user.email);
  if (!email || !isValidEmail(email)) {
    return { error: 'No valid email on this account. Contact Admin.' };
  }

  return {
    user: {
      studentId: user.student_id,
      email,
      name: user.name,
    },
  };
}

/**
 * Forgot password — send OTP to account email
 * POST /api/forgot-password/send-otp
 */
app.post('/api/forgot-password/send-otp', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  const lookup = await lookupUserForPasswordReset(studentId);
  if (lookup.error) {
    return res.status(400).json({ error: lookup.error });
  }

  const { studentId: accountId, email, name } = lookup.user;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  resetOtpStore[email] = {
    otp: otpCode,
    expiresAt,
    studentId: accountId,
    verified: false,
  };

  try {
    await sendOtpEmail({
      to: email,
      subject: 'JU LOFO Password Reset OTP Code',
      heading: 'Password Reset Code',
      bodyHtml: `
        <p style="color: #475569; font-size: 14px; line-height: 20px;">
          Hi ${name || 'there'},<br/>
          You requested to reset your password for Student ID: <strong>${accountId}</strong>.
        </p>
      `,
      otpCode,
    });
    console.log(`[RESET OTP] Sent code ${otpCode} to ${email}`);
    res.json({
      success: true,
      message: 'Password reset code sent to your email.',
      email,
    });
  } catch (err) {
    console.error('Reset OTP mail error:', err.message);
    res.status(500).json({ error: 'Failed to send reset email. Check backend configuration.' });
  }
});

/**
 * Forgot password — verify OTP
 * POST /api/forgot-password/verify-otp
 */
app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const key = normalizeEmail(email);
  const record = resetOtpStore[key];

  if (!record) {
    return res.status(400).json({ error: 'No active password reset session found.' });
  }

  if (Date.now() > record.expiresAt) {
    delete resetOtpStore[key];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Incorrect OTP verification code.' });
  }

  record.verified = true;
  res.json({ success: true, message: 'OTP verified. You may set a new password.' });
});

/**
 * Forgot password — set new password
 * POST /api/forgot-password/reset
 */
app.post('/api/forgot-password/reset', async (req, res) => {
  const { studentId, email, password } = req.body;

  if (!studentId || !email || !password) {
    return res.status(400).json({ error: 'Student ID, email, and new password are required.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const record = resetOtpStore[normalizedEmail];
  const id = studentId.trim().toUpperCase();

  if (!record || record.studentId !== id) {
    return res.status(400).json({ error: 'Reset session mismatch. Start again from Forgot Password.' });
  }

  if (!record.verified) {
    return res.status(400).json({ error: 'OTP not verified. Complete verification first.' });
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ password })
      .eq('student_id', id)
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Password reset update failed:', error);
      return res.status(500).json({ error: 'Failed to update password.' });
    }

    delete resetOtpStore[normalizedEmail];
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Try again.' });
  }
});

/**
 * Submit ownership request ("This is mine")
 * POST /api/claims/submit
 */
app.post('/api/claims/submit', async (req, res) => {
  const { claim } = req.body;

  if (!claim?.description?.trim()) {
    return res.status(400).json({ error: 'description is required.' });
  }

  const itemId = Number(claim.item_id || claim.lost_item_id || claim.found_item_id);
  if (!itemId) {
    return res.status(400).json({ error: 'item id is required.' });
  }

  const claimerEmail = (claim.claimer_email || '').trim().toLowerCase();
  if (!claimerEmail) {
    return res.status(400).json({ error: 'claimer_email is required.' });
  }

  const payload = {
    lost_item_id: itemId,
    found_item_id: itemId,
    item_type: claim.item_type || 'found',
    item_id: itemId,
    claimer_name: claim.claimer_name,
    claimer_email: claimerEmail,
    claimer_student_id: claim.claimer_student_id ?? null,
    description: claim.description.trim(),
    match_score: 0,
    match_breakdown: claim.match_breakdown ?? { source: 'direct' },
    status: 'pending',
  };

  try {
    const { data, error } = await supabase.from('item_claims').insert(payload).select().single();
    if (error) {
      console.error('Claim insert failed:', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, row: data });
  } catch (err) {
    console.error('Claim submit error:', err.message);
    res.status(500).json({ error: 'Failed to save claim.' });
  }
});

// Start Server — bind 0.0.0.0 so phones on the same WiFi can reach OTP APIs
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================`);
  console.log(`🚀 JU LOFO Backend server running on port ${PORT}`);
  console.log(`================================================`);
});
