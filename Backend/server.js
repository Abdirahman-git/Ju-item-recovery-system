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
// Key: email -> Value: { otp, expiresAt, studentId }
const otpStore = {};

async function lookupStudentForOtp(studentId) {
  const id = studentId.trim().toUpperCase();

  const { data: student, error } = await supabase
    .from('student_directory')
    .select('student_id, email, status, full_name')
    .eq('student_id', id)
    .single();

  if (error || !student) {
    return { error: 'Student ID not found in Jazeera University directory.' };
  }

  if (student.status === 'activated') {
    return { error: 'This Student ID is already activated. Please login instead.' };
  }

  if (!student.email || !student.email.trim()) {
    return { error: 'No pre-registered email found for this ID. Contact Admin.' };
  }

  return {
    student: {
      studentId: student.student_id,
      email: student.email.trim().toLowerCase(),
      fullName: student.full_name,
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
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  const lookup = await lookupStudentForOtp(studentId);
  if (lookup.error) {
    return res.status(400).json({ error: lookup.error });
  }

  const { studentId: directoryId, email } = lookup.student;

  // Generate 6-digit random code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Set expiration to 5 minutes from now
  const expiresAt = Date.now() + 5 * 60 * 1000;

  // Save to memory store
  otpStore[email] = {
    otp: otpCode,
    expiresAt,
    studentId: directoryId,
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
    to: email,
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
    console.log(`[OTP] Sent code ${otpCode} to ${email}`);
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

  // Success
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

  if (!record || record.studentId !== studentId) {
    return res.status(400).json({ error: 'Verification credentials mismatch. Please restart activation.' });
  }

  try {
    // 1. Create student user profile in Supabase users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        student_id: studentId.trim(),
        email: email.trim().toLowerCase(),
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

/**
 * 5. Upsert item match rows (bypasses client RLS when backend uses service_role key)
 * POST /api/matches/upsert
 */
app.post('/api/matches/upsert', async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows array is required.' });
  }

  const payload = rows.map((row) => ({
    lost_item_id: row.lost_item_id,
    found_item_id: row.found_item_id,
    score: row.score ?? 0,
    breakdown: row.breakdown ?? null,
    status: row.status ?? 'suggested',
  }));

  try {
    const { data, error } = await supabase
      .from('item_matches')
      .upsert(payload, { onConflict: 'lost_item_id,found_item_id' })
      .select();

    if (error) {
      console.error('Match upsert failed:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, rows: data });
  } catch (err) {
    console.error('Match upsert error:', err.message);
    res.status(500).json({ error: 'Failed to save match rows.' });
  }
});

/**
 * 6. Update match status by id or upsert by pair ids
 * PATCH /api/matches/status
 */
app.patch('/api/matches/status', async (req, res) => {
  const { id, status, lost_item_id, found_item_id, score, breakdown } = req.body;

  if (!status || !['suggested', 'linked', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required.' });
  }

  try {
    if (id && !String(id).startsWith('live-')) {
      const { error } = await supabase
        .from('item_matches')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true });
    }

    if (!lost_item_id || !found_item_id) {
      return res.status(400).json({ error: 'lost_item_id and found_item_id are required.' });
    }

    const { error } = await supabase
      .from('item_matches')
      .upsert(
        {
          lost_item_id,
          found_item_id,
          score: score ?? 0,
          breakdown: breakdown ?? null,
          status,
        },
        { onConflict: 'lost_item_id,found_item_id' }
      );

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Match status update failed:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update match status.' });
  }
});

// Start Server — bind 0.0.0.0 so phones on the same WiFi can reach OTP/match APIs
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================`);
  console.log(`🚀 JU LOFO Backend server running on port ${PORT}`);
  console.log(`================================================`);
});
