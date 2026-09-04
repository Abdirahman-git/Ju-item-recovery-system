const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const { facultyFromStudentId } = require('./faculty');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

function decodeJwtRole(jwt) {
  try {
    const payload = String(jwt || '').split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json)?.role || null;
  } catch {
    return null;
  }
}

function assertServerSupabaseKey(key) {
  const raw = String(key || '').trim();
  if (!raw) {
    console.error('================================================');
    console.error('❌ SUPABASE_KEY is missing in Backend/.env');
    console.error('   Use sb_secret_... (API Keys → Secret) or legacy service_role JWT.');
    console.error('================================================');
    return;
  }

  // New Supabase secret keys bypass RLS — valid for Backend
  if (raw.startsWith('sb_secret_')) {
    console.log('[Supabase] Using sb_secret_ server key (OK for Backend).');
    return;
  }

  // Publishable / anon must never be used as Backend key after Phase 3A
  if (raw.startsWith('sb_publishable_')) {
    console.error('================================================');
    console.error('❌ SUPABASE_KEY is a publishable key — Backend needs sb_secret_...');
    console.error('   After Phase 3A, anon/publishable cannot use admin_recycle_bin / archived_items.');
    console.error('================================================');
    return;
  }

  const role = decodeJwtRole(raw);
  if (role === 'service_role') {
    console.log('[Supabase] Using legacy service_role JWT (OK for Backend).');
    return;
  }
  if (role === 'anon') {
    console.error('================================================');
    console.error('❌ SUPABASE_KEY is the anon JWT — Backend needs sb_secret_ or service_role.');
    console.error('   Supabase → Project Settings → API Keys → Secret keys');
    console.error('   After Phase 3A, anon cannot use admin_recycle_bin / archived_items.');
    console.error('================================================');
    return;
  }

  console.warn('[Supabase] Could not detect key type; ensure this is a server secret, not anon.');
}

assertServerSupabaseKey(supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

// Middlewares
app.use(cors());
app.use(express.json());

// In-Memory store for temporary OTPs
// Key: email -> Value: { otp, expiresAt, studentId, verified }
const otpStore = {};
const resetOtpStore = {};
const OTP_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function emailDomainLooksDeliverable(email) {
  const domain = String(email || '')
    .split('@')[1]
    ?.trim()
    .toLowerCase();
  if (!domain || domain.length < 3) return false;
  try {
    const mx = await dns.resolveMx(domain);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch {
    /* try A record fallback */
  }
  try {
    const a = await dns.resolve4(domain);
    return Array.isArray(a) && a.length > 0;
  } catch {
    return false;
  }
}

function createMailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error('Email is not configured. Set GMAIL_USER and GMAIL_PASS in Backend/.env.');
  }
  const fromEmail = normalizeEmail(process.env.GMAIL_USER);
  if (!isValidEmail(fromEmail)) {
    throw new Error('GMAIL_USER must be a valid admin mailbox email.');
  }
  return {
    fromEmail,
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    }),
  };
}

function normalizePhone(phone) {
  let cleaned = String(phone || '').replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('252')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

function maskPhone(phone) {
  const str = String(phone || '').trim();
  if (str.length < 4) return '***';
  return str.slice(0, 3) + '***' + str.slice(-4);
}

let tabaarakToken = null;
let tokenExpiresAt = 0;

async function getTabaarakToken() {
  if (tabaarakToken && Date.now() < tokenExpiresAt) {
    return tabaarakToken;
  }

  const username = process.env.TABARAAK_SMS_USER;
  const password = process.env.TABARAAK_SMS_PASSWORD;

  if (!username || !password || username === 'your_tabaarak_username') {
    console.warn('[Tabaarak] SMS credentials are not configured or are placeholders. SMS will be simulated.');
    return 'SIMULATED_TOKEN';
  }

  try {
    const response = await fetch('https://sms.tabaarak.com/Auth/SMSLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Name: username, Password: password }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Tabaarak Authentication failed: ${response.status} - ${errText}`);
    }

    const resData = await response.json();
    if (!resData.success || !resData.data || !resData.data.token) {
      throw new Error(`Tabaarak Authentication failed: ${resData.message || 'Invalid response structure'}`);
    }

    tabaarakToken = resData.data.token;
    tokenExpiresAt = Date.now() + 60 * 60 * 1000; // Cache for 1 hour
    return tabaarakToken;
  } catch (err) {
    console.error('[Tabaarak] Token fetch error:', err.message);
    throw err;
  }
}

async function sendSms(phone, message) {
  const normalized = normalizePhone(phone);
  console.log(`[SMS] Sending message to ${normalized}: "${message}"`);

  const token = await getTabaarakToken();
  if (token === 'SIMULATED_TOKEN') {
    console.log(`[SMS SIMULATION] Sent to ${normalized}: "${message}"`);
    return { success: true, simulated: true };
  }

  const response = await fetch('https://sms.tabaarak.com/Sms/sendsms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      smsMessage: message,
      mobile: [normalized]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tabaarak Send SMS failed: ${response.status} - ${errText}`);
  }

  const resData = await response.json();
  if (!resData.success) {
    throw new Error(`Tabaarak Send SMS failed: ${resData.message || 'Unknown error'}`);
  }

  return resData;
}

async function lookupDirectoryFaculty(studentId) {
  const id = String(studentId || '').trim().toUpperCase();
  if (!id) return '';
  const { data } = await supabase
    .from('student_directory')
    .select('faculty')
    .eq('student_id', id)
    .maybeSingle();
  return String(data?.faculty || '').trim() || facultyFromStudentId(id);
}

async function lookupStudentForActivation(studentId) {
  const id = studentId.trim().toUpperCase();

  const { data: student, error } = await supabase
    .from('student_directory')
    .select('student_id, status, full_name, phone_number, faculty, email')
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
      faculty: student.faculty || facultyFromStudentId(student.student_id),
      email: student.email || '',
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
      faculty: student.faculty || facultyFromStudentId(student.student_id)
    });
  } catch (err) {
    console.error('Validate ID Error:', err.message);
    res.status(500).json({ error: 'Server validation error. Please try again.' });
  }
});

/**
 * 2. Send 6-Digit OTP via Tabaarak SMS API
 * POST /api/send-otp
 */
app.post('/api/send-otp', async (req, res) => {
  const { studentId, email } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    const lookup = await lookupStudentForActivation(studentId);
    if (lookup.error) {
      return res.status(400).json({ error: lookup.error });
    }

    const { studentId: directoryId, phone, fullName, faculty, email: directoryEmail } = lookup.student;
    const studentEmail = directoryEmail || email || '';
    const normalizedEmail = normalizeEmail(studentEmail);

    if (!phone) {
      return res.status(400).json({ error: 'No phone number on file for this Student ID. Please contact Jazeera University Admin.' });
    }

    // Generate 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 10 minutes from now
    const expiresAt = Date.now() + OTP_TTL_MS;

    const record = {
      otp: otpCode,
      expiresAt,
      studentId: directoryId,
      phone: normalizePhone(phone),
      email: normalizedEmail,
      verified: false,
    };

    // Save to memory store under multiple keys for maximum compatibility
    otpStore[directoryId] = record;
    if (normalizedEmail) {
      otpStore[normalizedEmail] = record;
    }
    otpStore[normalizePhone(phone)] = record;

    // Send the SMS
    const message = `JU LOFO: Code ${otpCode}. Valid 10 min. Do not share.`;
    await sendSms(phone, message);

    res.json({
      success: true,
      message: 'OTP verification code sent to your phone.',
      phone: maskPhone(phone),
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('Send OTP Error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP SMS. Please try again.' });
  }
});

/**
 * 3. Verify OTP Code
 * POST /api/verify-otp
 */
app.post('/api/verify-otp', (req, res) => {
  const { email, studentId, phone, otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP code is required.' });
  }

  let record = null;

  if (studentId) {
    const key = studentId.trim().toUpperCase();
    if (otpStore[key]) {
      record = otpStore[key];
    }
  }

  if (!record && email) {
    const key = email.toLowerCase().trim();
    if (otpStore[key]) {
      record = otpStore[key];
    }
  }

  if (!record && phone) {
    const key = normalizePhone(phone);
    if (otpStore[key]) {
      record = otpStore[key];
    }
  }

  if (!record) {
    return res.status(400).json({ error: 'No active OTP verification session found.' });
  }

  if (Date.now() > record.expiresAt) {
    if (record.studentId) delete otpStore[record.studentId.toUpperCase()];
    if (record.email) delete otpStore[record.email.toLowerCase().trim()];
    if (record.phone) delete otpStore[record.phone];
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

  if (!studentId || !password || !name) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  let record = null;
  if (studentId) {
    record = otpStore[studentId.trim().toUpperCase()];
  }
  if (!record && email) {
    record = otpStore[email.toLowerCase().trim()];
  }
  if (!record && phone) {
    record = otpStore[normalizePhone(phone)];
  }

  if (!record || record.studentId !== studentId.trim().toUpperCase()) {
    return res.status(400).json({ error: 'Verification credentials mismatch. Please restart activation.' });
  }

  if (!record.verified) {
    return res.status(400).json({ error: 'OTP not verified. Complete verification first.' });
  }

  const normalizedEmail = normalizeEmail(email || record.email);

  try {
    const faculty = await lookupDirectoryFaculty(studentId.trim().toUpperCase());
    const userRow = {
      student_id: studentId.trim(),
      email: normalizedEmail,
      password: password, // manual custom password stored
      name: name,
      phone: phone || record.phone || '',
      role: 'user',
      faculty,
      is_approved: true // Approved by default
    };

    // 1. Create student user profile in Supabase users table
    let { error: insertError } = await supabase.from('users').insert(userRow);
    if (insertError && /faculty|column|schema cache/i.test(insertError.message || '')) {
      delete userRow.faculty;
      ({ error: insertError } = await supabase.from('users').insert(userRow));
    }

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
    if (record.studentId) delete otpStore[record.studentId.toUpperCase()];
    if (record.email) delete otpStore[record.email.toLowerCase().trim()];
    if (record.phone) delete otpStore[record.phone];

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
            * This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
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
    .select('student_id, email, name, phone')
    .eq('student_id', id)
    .maybeSingle();

  if (error || !user) {
    return { error: 'Account not found. Activate your account first.' };
  }

  const email = normalizeEmail(user.email);
  let phone = user.phone || '';

  // Fallback to student_directory if phone is missing in users table
  if (!phone) {
    const { data: directoryStudent } = await supabase
      .from('student_directory')
      .select('phone_number')
      .eq('student_id', id)
      .maybeSingle();

    if (directoryStudent && directoryStudent.phone_number) {
      phone = directoryStudent.phone_number;
    }
  }

  return {
    user: {
      studentId: user.student_id,
      email,
      name: user.name,
      phone: phone || '',
    },
  };
}

/**
 * Forgot password — send OTP to account phone via Tabaarak SMS
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

  const { studentId: accountId, email, name, phone } = lookup.user;

  if (!phone) {
    return res.status(400).json({ error: 'No phone number on file for this account. Please contact Jazeera University Admin.' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  const record = {
    otp: otpCode,
    expiresAt,
    studentId: accountId,
    phone: normalizePhone(phone),
    email,
    verified: false,
  };

  // Save under multiple keys for maximum compatibility
  resetOtpStore[accountId] = record;
  if (email) {
    resetOtpStore[email] = record;
  }
  resetOtpStore[normalizePhone(phone)] = record;

  try {
    const message = `JU LOFO: Code ${otpCode}. Valid 10 min. Do not share.`;
    await sendSms(phone, message);

    console.log(`[RESET OTP] Sent code ${otpCode} to ${phone}`);
    res.json({
      success: true,
      message: 'Password reset code sent to your phone.',
      email,
      phone: maskPhone(phone),
    });
  } catch (err) {
    console.error('Reset OTP SMS error:', err.message);
    res.status(500).json({ error: 'Failed to send reset OTP SMS. Please try again.' });
  }
});

/**
 * Forgot password — verify OTP
 * POST /api/forgot-password/verify-otp
 */
app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { email, studentId, phone, otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP code is required.' });
  }

  let record = null;

  if (studentId) {
    const key = studentId.trim().toUpperCase();
    if (resetOtpStore[key]) {
      record = resetOtpStore[key];
    }
  }

  if (!record && email) {
    const key = email.toLowerCase().trim();
    if (resetOtpStore[key]) {
      record = resetOtpStore[key];
    }
  }

  if (!record && phone) {
    const key = normalizePhone(phone);
    if (resetOtpStore[key]) {
      record = resetOtpStore[key];
    }
  }

  if (!record) {
    return res.status(400).json({ error: 'No active password reset session found.' });
  }

  if (Date.now() > record.expiresAt) {
    if (record.studentId) delete resetOtpStore[record.studentId.toUpperCase()];
    if (record.email) delete resetOtpStore[record.email.toLowerCase().trim()];
    if (record.phone) delete resetOtpStore[record.phone];
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
  const { studentId, email, phone, password } = req.body;

  if (!studentId || !password) {
    return res.status(400).json({ error: 'Student ID and new password are required.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  let record = null;
  if (studentId) {
    record = resetOtpStore[studentId.trim().toUpperCase()];
  }
  if (!record && email) {
    record = resetOtpStore[email.toLowerCase().trim()];
  }
  if (!record && phone) {
    record = resetOtpStore[normalizePhone(phone)];
  }

  const id = studentId.trim().toUpperCase();

  if (!record || record.studentId !== id) {
    return res.status(400).json({ error: 'Reset session mismatch. Start again from Forgot Password.' });
  }

  if (!record.verified) {
    return res.status(400).json({ error: 'OTP not verified. Complete verification first.' });
  }

  const targetEmail = email || record.email;

  try {
    let query = supabase.from('users').update({ password }).eq('student_id', id);
    if (targetEmail) {
      query = query.eq('email', normalizeEmail(targetEmail));
    }

    const { error } = await query;

    if (error) {
      console.error('Password reset update failed:', error);
      return res.status(500).json({ error: 'Failed to update password.' });
    }

    // Clean up reset OTP keys
    if (record.studentId) delete resetOtpStore[record.studentId.toUpperCase()];
    if (record.email) delete resetOtpStore[record.email.toLowerCase().trim()];
    if (record.phone) delete resetOtpStore[record.phone];

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
function parseMissingColumn(error) {
  if (!error || (error.code !== 'PGRST204' && error.code !== '42703')) return null;
  const match = error.message?.match(/Could not find the '([^']+)' column|column "([^"]+)"/i);
  return match?.[1] || match?.[2] || null;
}

async function insertClaimWithColumnFallback(payload) {
  let current = { ...payload };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase.from('item_claims').insert(current).select().single();
    if (!error) return data;

    const missingCol = parseMissingColumn(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(current, missingCol)) {
      delete current[missingCol];
      continue;
    }

    throw error;
  }

  throw new Error('Claim insert failed after column fallbacks.');
}

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
    match_score: Number(claim.match_score) || Number(claim.challenge_score) || 0,
    match_breakdown: claim.match_breakdown ?? { source: 'direct' },
    status: claim.status || 'pending',
  };

  if (claim.challenge_id != null) payload.challenge_id = claim.challenge_id;
  if (claim.challenge_score != null) payload.challenge_score = claim.challenge_score;
  if (claim.challenge_result != null) payload.challenge_result = claim.challenge_result;
  if (claim.challenge_answers != null) payload.challenge_answers = claim.challenge_answers;

  try {
    const data = await insertClaimWithColumnFallback(payload);
    res.json({ success: true, row: data });
  } catch (err) {
    console.error('Claim submit error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to save claim.' });
  }
});

/**
 * Auth — login (students + admins)
 * POST /api/auth/login
 * Body: { identifier, password, adminOnly?: boolean }
 * Uses service_role so clients never need SELECT on users.password
 */
const loginAttempts = new Map(); // key -> { count, resetAt }

function checkLoginRateLimit(key) {
  const now = Date.now();
  const row = loginAttempts.get(key);
  if (!row || now > row.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return null;
  }
  row.count += 1;
  if (row.count > 20) {
    return 'Too many login attempts. Try again in 15 minutes.';
  }
  return null;
}

app.post('/api/auth/login', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim();
  const password = String(req.body?.password || '');
  const adminOnly = Boolean(req.body?.adminOnly);

  if (!identifier || !password) {
    return res.status(400).json({ error: 'ID and password are required.', code: 'MISSING_FIELDS' });
  }

  const rateKey = identifier.toLowerCase();
  const limited = checkLoginRateLimit(rateKey);
  if (limited) {
    return res.status(429).json({ error: limited, code: 'RATE_LIMIT' });
  }

  try {
    const id = identifier;
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .or(`student_id.eq.${id.toUpperCase()},student_id.eq.${id.toLowerCase()}`)
      .limit(1);

    if (error) {
      console.error('Auth login lookup error:', error);
      return res.status(500).json({ error: 'Login failed. Please try again.', code: 'SERVER_ERROR' });
    }

    if (!userData?.length) {
      // Soft-deleted / banned check
      let removedByAdmin = false;
      try {
        const upper = id.toUpperCase();
        const lower = id.toLowerCase();
        const { data: binRows } = await supabase
          .from('admin_recycle_bin')
          .select('payload, entity_type')
          .eq('entity_type', 'user')
          .order('deleted_at', { ascending: false })
          .limit(40);
        removedByAdmin = (binRows || []).some((entry) => {
          const row = entry?.payload?.row || {};
          const sid = String(row.student_id || row.studentId || '').trim();
          return sid === upper || sid === lower || sid.toLowerCase() === lower;
        });
      } catch {
        removedByAdmin = false;
      }

      if (removedByAdmin) {
        return res.status(403).json({
          error: 'Your account has been banned by an administrator. Please contact the JU Lost & Found office.',
          code: 'ACCOUNT_BANNED',
        });
      }

      return res.status(404).json({
        error: 'No account was found for this ID. Please contact the JU Lost & Found office.',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    const user = userData[0];

    if (String(user.password || '') !== password) {
      return res.status(401).json({
        error: 'The password you entered is incorrect. Please try again.',
        code: 'WRONG_PASSWORD',
      });
    }

    if (adminOnly && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access only. Students should use the mobile app.',
        code: 'ADMIN_ONLY',
      });
    }

    if (user.role !== 'admin' && user.is_approved === false) {
      return res.status(403).json({
        error: 'Your account is not active. Please contact the JU Lost & Found office.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Enrich phone / faculty from directory if missing on the user row
    let phone = user.phone || '';
    let faculty = String(user.faculty || '').trim();
    if ((!phone || !faculty) && user.student_id) {
      const { data: dir } = await supabase
        .from('student_directory')
        .select('phone_number, faculty')
        .eq('student_id', String(user.student_id).toUpperCase())
        .maybeSingle();
      if (!phone) phone = dir?.phone_number || '';
      if (!faculty) faculty = String(dir?.faculty || '').trim();
    }
    if (!faculty) faculty = facultyFromStudentId(user.student_id);

    const session = {
      email: (user.email || '').trim().toLowerCase(),
      role: user.role,
      isLoggedIn: true,
      userName: user.name,
      studentId: user.student_id,
      phone: phone || '',
      faculty: faculty || '',
      is_approved: user.is_approved !== false,
    };

    // Admin-only token for Phase 3A hardened mutations (service_role routes)
    if (user.role === 'admin') {
      session.adminToken = issueAdminToken({
        email: session.email,
        studentId: session.studentId,
        userName: session.userName,
      });
    }

    // Never return password to clients
    res.json({ success: true, session });
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.', code: 'SERVER_ERROR' });
  }
});

/**
 * Auth — change password (requires current password)
 * POST /api/auth/change-password
 */
app.post('/api/auth/change-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const studentId = String(req.body?.studentId || '').trim();
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if ((!email && !studentId) || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from your current password.' });
  }

  try {
    let user = null;
    if (email) {
      const { data, error } = await supabase.from('users').select('*').ilike('email', email).limit(1);
      if (error) throw error;
      user = data?.[0] || null;
    }
    if (!user && studentId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`student_id.eq.${studentId.toUpperCase()},student_id.eq.${studentId.toLowerCase()}`)
        .limit(1);
      if (error) throw error;
      user = data?.[0] || null;
    }

    if (!user) {
      return res.status(404).json({ error: 'Account was not found.' });
    }
    if (String(user.password || '') !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    let updateQuery = supabase.from('users').update({ password: newPassword });
    if (user.email) updateQuery = updateQuery.eq('email', user.email);
    else if (user.student_id) updateQuery = updateQuery.eq('student_id', user.student_id);
    else if (user.id != null) updateQuery = updateQuery.eq('id', user.id);

    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

// =============================================================================
// Phase 3A — Admin APIs (service_role). Clients must send X-Admin-Token.
// =============================================================================

const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_JWT_SECRET = String(
  process.env.ADMIN_JWT_SECRET || process.env.SUPABASE_KEY || 'ju-lofo-admin-dev-secret'
).trim();

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64').toString('utf8');
}

function issueAdminToken(actor) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      email: normalizeEmail(actor.email),
      studentId: actor.studentId || null,
      userName: actor.userName || null,
      role: 'admin',
      exp: Date.now() + ADMIN_TOKEN_TTL_MS,
    })
  );
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyAdminToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(String(signature));
  const expBuf = Buffer.from(String(expected));
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const claims = JSON.parse(fromBase64Url(payload));
    if (!claims?.email || !claims?.exp || Date.now() > Number(claims.exp)) return null;
    return {
      email: normalizeEmail(claims.email),
      studentId: claims.studentId || null,
      userName: claims.userName || null,
      exp: Number(claims.exp),
    };
  } catch {
    return null;
  }
}

function requireAdminToken(req, res) {
  const token = String(req.headers['x-admin-token'] || req.body?.adminToken || '').trim();
  if (!token) {
    res.status(401).json({
      error: 'Admin session expired. Please log in again.',
      code: 'ADMIN_TOKEN_MISSING',
    });
    return null;
  }
  const row = verifyAdminToken(token);
  if (!row) {
    res.status(401).json({
      error: 'Admin session expired. Please log in again.',
      code: 'ADMIN_TOKEN_EXPIRED',
    });
    return null;
  }
  return row;
}

function isMissingRelationError(error) {
  const msg = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /relation .* does not exist|Could not find the table/i.test(msg)
  );
}

async function snapshotToRecycleBin({ entityType, entityId, title, summary, payload, deletedBy }) {
  const { error } = await supabase.from('admin_recycle_bin').insert({
    entity_type: entityType,
    entity_id: entityId != null ? String(entityId) : null,
    title: title || entityType,
    summary: summary || null,
    payload,
    deleted_by: deletedBy || null,
    deleted_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn('[recycle] admin_recycle_bin missing — skip snapshot');
      return { success: true, skipped: true };
    }
    throw new Error(error.message || 'Could not save to recycle bin.');
  }
  return { success: true };
}

async function deleteRelatedItemClaims({ itemType, id }) {
  const queries = [
    supabase.from('item_claims').delete().eq('item_type', itemType).eq('item_id', id),
    itemType === 'lost'
      ? supabase.from('item_claims').delete().eq('lost_item_id', id)
      : supabase.from('item_claims').delete().eq('found_item_id', id),
  ];
  for (const query of queries) {
    const { error } = await query;
    if (error && !/column|does not exist/i.test(error.message || '')) {
      throw new Error(error.message || 'Could not remove linked ownership requests.');
    }
  }
}

async function restorePayloadRow(payload) {
  const table = payload?.table;
  const row = payload?.row;
  if (!table || !row) throw new Error('Backup payload is incomplete.');

  if (table === 'users') {
    const email = normalizeEmail(row.email);
    if (!email) throw new Error('User email missing from backup.');
    const { data: existing } = await supabase.from('users').select('email').eq('email', email).maybeSingle();
    if (existing) throw new Error('A user with this email already exists.');
    const { id: _id, ...insertRow } = row;
    const { error: insertError } = await supabase.from('users').insert(insertRow);
    if (insertError) throw new Error(insertError.message || 'Could not restore user.');
    return;
  }

  const { error: insertError } = await supabase.from(table).insert(row);
  if (insertError) {
    if (/duplicate|unique/i.test(insertError.message || '')) {
      const { id: _id, ...withoutId } = row;
      const retry = await supabase.from(table).insert(withoutId);
      if (retry.error) throw new Error(retry.error.message || 'Could not restore item.');
      return;
    }
    throw new Error(insertError.message || 'Could not restore item.');
  }
}

app.post('/api/admin/users/set-approval', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const email = normalizeEmail(req.body?.email);
  const isApproved = Boolean(req.body?.isApproved);
  if (!email) return res.status(400).json({ error: 'User email is required.' });

  try {
    const { error } = await supabase.from('users').update({ is_approved: isApproved }).eq('email', email);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('set-approval error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update user approval.' });
  }
});

app.post('/api/admin/users/delete', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const email = normalizeEmail(req.body?.email);
  const deletedBy = req.body?.deletedBy || actor.email || actor.userName || null;
  if (!email) return res.status(400).json({ error: 'User email is required.' });

  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await snapshotToRecycleBin({
      entityType: 'user',
      entityId: user.email || user.id,
      title: user.name || user.email || 'User',
      summary: user.role === 'admin' ? 'Admin account' : 'Student account',
      payload: { table: 'users', row: user },
      deletedBy,
    });

    const { error } = await supabase.from('users').delete().eq('email', email);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('admin delete user error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to delete user.' });
  }
});

app.get('/api/admin/recycle-bin', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  try {
    const { data, error } = await supabase
      .from('admin_recycle_bin')
      .select('*')
      .order('deleted_at', { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        return res.json({ success: true, available: true, backend: 'none', items: [] });
      }
      throw error;
    }

    res.json({
      success: true,
      available: true,
      backend: 'table',
      items: data || [],
    });
  } catch (err) {
    console.error('recycle-bin list error:', err.message);
    res.status(500).json({ error: err.message || 'Could not load recycle bin.' });
  }
});

app.post('/api/admin/recycle-bin/restore', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const id = req.body?.id;
  if (id == null) return res.status(400).json({ error: 'Recycle bin id is required.' });

  try {
    const { data: entry, error } = await supabase.from('admin_recycle_bin').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!entry) return res.status(404).json({ error: 'Recycle bin entry not found.' });

    await restorePayloadRow(entry.payload || {});
    const { error: deleteError } = await supabase.from('admin_recycle_bin').delete().eq('id', id);
    if (deleteError) throw new Error(deleteError.message || 'Restored, but could not clear recycle bin entry.');
    res.json({ success: true });
  } catch (err) {
    console.error('recycle-bin restore error:', err.message);
    res.status(500).json({ error: err.message || 'Could not restore entry.' });
  }
});

app.post('/api/admin/recycle-bin/purge', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const id = req.body?.id;
  if (id == null) return res.status(400).json({ error: 'Recycle bin id is required.' });

  try {
    const { error } = await supabase.from('admin_recycle_bin').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('recycle-bin purge error:', err.message);
    res.status(500).json({ error: err.message || 'Could not purge entry.' });
  }
});

app.post('/api/admin/items/delete-to-recycle', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const itemType = req.body?.itemType === 'found' ? 'found' : req.body?.itemType === 'lost' ? 'lost' : null;
  const itemId = req.body?.id;
  const deletedBy = req.body?.deletedBy || actor.email || actor.userName || null;
  if (!itemType || itemId == null) {
    return res.status(400).json({ error: 'itemType and id are required.' });
  }

  try {
    const table = itemType === 'found' ? 'found_items' : 'lost_items';
    const { data: raw, error: fetchError } = await supabase.from(table).select('*').eq('id', itemId).maybeSingle();
    if (fetchError) throw fetchError;
    if (!raw) return res.status(404).json({ error: 'Item not found or already deleted.' });

    await snapshotToRecycleBin({
      entityType: itemType === 'found' ? 'found_item' : 'lost_item',
      entityId: itemId,
      title: raw.itemName || raw.item_name || 'Item',
      summary: `${itemType === 'found' ? 'Found' : 'Lost'} - ${raw.category || 'General'}`,
      payload: { table, itemType, row: raw },
      deletedBy,
    });

    await deleteRelatedItemClaims({ itemType, id: itemId });

    const { error } = await supabase.from(table).delete().eq('id', itemId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('delete-to-recycle error:', err.message);
    res.status(500).json({ error: err.message || 'Could not delete this item.' });
  }
});

app.get('/api/admin/archived', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  try {
    const { data, error } = await supabase
      .from('archived_items')
      .select('*')
      .order('archived_at', { ascending: false, nullsFirst: false });

    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(404).json({
          error: 'Archived items table is missing. Run supabase/archived_items.sql in the Supabase SQL editor.',
        });
      }
      // Fallback order
      const fallback = await supabase.from('archived_items').select('*').order('id', { ascending: false });
      if (fallback.error) throw fallback.error;
      return res.json({ success: true, items: fallback.data || [] });
    }

    res.json({ success: true, items: data || [] });
  } catch (err) {
    console.error('archived list error:', err.message);
    res.status(500).json({ error: err.message || 'Could not load archived items.' });
  }
});

app.post('/api/admin/archive-item', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const itemType = req.body?.itemType === 'found' ? 'found' : req.body?.itemType === 'lost' ? 'lost' : null;
  const itemId = req.body?.id;
  const archivedBy = req.body?.archivedBy || actor.email || actor.userName || null;
  const reason = req.body?.reason || 'Unclaimed / stale item';

  if (!itemType || itemId == null) {
    return res.status(400).json({ error: 'itemType and id are required.' });
  }

  try {
    const table = itemType === 'found' ? 'found_items' : 'lost_items';
    const { data: raw, error: fetchError } = await supabase.from(table).select('*').eq('id', itemId).maybeSingle();
    if (fetchError) throw fetchError;
    if (!raw) return res.status(404).json({ error: 'Item not found or already archived.' });

    const typeLabel = itemType === 'found' ? 'FOUND' : 'LOST';
    const archivedRow = {
      item_name: raw.itemName || raw.item_name || 'Item',
      category: raw.category || 'General',
      description: raw.description || null,
      location: raw.location || null,
      imageuri: raw.imageURI || raw.imageuri || raw.image_url || null,
      type: typeLabel,
      original_reporter:
        typeLabel === 'LOST'
          ? raw.ownerName || raw.owner_name || 'Unknown'
          : raw.finderName || raw.finder_name || 'Unknown',
      reporter_email: raw.email || null,
      source_table: table,
      source_id: String(raw.id),
      reason,
      archived_by: archivedBy,
      archived_at: new Date().toISOString(),
      payload: { table, itemType, row: raw },
    };

    const { error: insertError } = await supabase.from('archived_items').insert(archivedRow);
    if (insertError) {
      if (isMissingRelationError(insertError)) {
        return res.status(404).json({
          error: 'Archived items table is missing. Run supabase/archived_items.sql in the Supabase SQL editor.',
        });
      }
      throw new Error(insertError.message || 'Could not archive item.');
    }

    await deleteRelatedItemClaims({ itemType, id: itemId });

    const { error: deleteError } = await supabase.from(table).delete().eq('id', itemId);
    if (deleteError) {
      throw new Error(
        deleteError.message ||
          'Item was archived, but could not be removed from live inventory. Check Archived Items.'
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('archive-item error:', err.message);
    res.status(500).json({ error: err.message || 'Could not archive item.' });
  }
});

app.post('/api/admin/archived/restore', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const id = req.body?.id;
  if (id == null) return res.status(400).json({ error: 'Archived item id is required.' });

  try {
    const { data: entry, error } = await supabase.from('archived_items').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message || 'Could not load archived item.');
    if (!entry) return res.status(404).json({ error: 'Archived item not found.' });

    const payload = entry.payload || {};
    const table = payload.table || (String(entry.type).toUpperCase() === 'FOUND' ? 'found_items' : 'lost_items');
    const row = payload.row;
    if (!row) throw new Error('Archive payload is incomplete; cannot restore.');

    const { id: _id, ...withoutId } = row;
    const { error: insertError } = await supabase.from(table).insert(withoutId);
    if (insertError) {
      if (/duplicate|unique/i.test(insertError.message || '')) {
        const retry = await supabase.from(table).insert(row);
        if (retry.error) throw new Error(retry.error.message || 'Could not restore item.');
      } else {
        throw new Error(insertError.message || 'Could not restore item.');
      }
    }

    const { error: deleteError } = await supabase.from('archived_items').delete().eq('id', id);
    if (deleteError) throw new Error(deleteError.message || 'Restored, but could not clear archive entry.');
    res.json({ success: true });
  } catch (err) {
    console.error('archived restore error:', err.message);
    res.status(500).json({ error: err.message || 'Could not restore archived item.' });
  }
});

app.post('/api/admin/archived/purge', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;

  const id = req.body?.id;
  if (id == null) return res.status(400).json({ error: 'Archived item id is required.' });

  try {
    const { error } = await supabase.from('archived_items').delete().eq('id', id);
    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(404).json({
          error: 'Archived items table is missing. Run supabase/archived_items.sql in the Supabase SQL editor.',
        });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('archived purge error:', err.message);
    res.status(500).json({ error: err.message || 'Could not delete archived item.' });
  }
});

const SUPER_ADMIN_EMAIL = String(process.env.SUPER_ADMIN_EMAIL || 'admin2@ju.edu.so')
  .trim()
  .toLowerCase();

function requireSuperAdmin(actor, res) {
  const email = String(actor?.email || '').trim().toLowerCase();
  if (email !== SUPER_ADMIN_EMAIL) {
    res.status(403).json({ error: 'Super Admin access required.' });
    return false;
  }
  return true;
}

async function notifyContactMessageEmail(row) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;
  const to = normalizeEmail(
    process.env.CONTACT_INBOX_EMAIL || process.env.GMAIL_USER || SUPER_ADMIN_EMAIL
  );
  if (!isValidEmail(to)) return;
  const { fromEmail, transporter } = createMailTransporter();
  await transporter.sendMail({
    from: `"JU LOFO Contact" <${fromEmail}>`,
    to,
    replyTo: row.email,
    subject: `[Contact] ${row.subject}`,
    text: [
      `From: ${row.first_name} ${row.last_name}`,
      `Email: ${row.email}`,
      `Phone: ${row.phone || '—'}`,
      '',
      row.message,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <p><strong>From:</strong> ${row.first_name} ${row.last_name}</p>
        <p><strong>Email:</strong> ${row.email}</p>
        <p><strong>Phone:</strong> ${row.phone || '—'}</p>
        <p><strong>Subject:</strong> ${row.subject}</p>
        <hr />
        <p style="white-space:pre-wrap">${String(row.message || '').replace(/</g, '&lt;')}</p>
      </div>
    `,
  });
}

/**
 * Public contact form submit
 * POST /api/contact/submit
 */
app.post('/api/contact/submit', async (req, res) => {
  const body = req.body || {};
  const firstName = String(body.firstName || body.first_name || '').trim();
  const lastName = String(body.lastName || body.last_name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First and last name are required.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid sender email is required.' });
  }
  const senderOk = await emailDomainLooksDeliverable(email);
  if (!senderOk) {
    return res.status(400).json({
      error: 'Sender email domain does not look real. Please use a valid email address.',
    });
  }
  if (!subject) {
    return res.status(400).json({ error: 'Subject is required.' });
  }
  if (!message || message.length < 5) {
    return res.status(400).json({ error: 'Please write a longer message.' });
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    subject,
    message,
    status: 'new',
  };

  try {
    const { data, error } = await supabase.from('contact_messages').insert(payload).select().single();
    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(503).json({
          error:
            'Contact inbox is not set up yet. Run supabase/contact_messages.sql in the Supabase SQL editor.',
        });
      }
      throw error;
    }

    try {
      await notifyContactMessageEmail(data);
    } catch (mailErr) {
      console.warn('[contact] email notify failed:', mailErr.message);
    }

    res.json({ success: true, id: data.id });
  } catch (err) {
    console.error('Contact submit error:', err.message);
    res.status(500).json({ error: err.message || 'Could not send message.' });
  }
});

/**
 * Super Admin: list contact messages
 * GET /api/admin/contact-messages
 */
app.get('/api/admin/contact-messages', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;
  if (!requireSuperAdmin(actor, res)) return;

  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(404).json({
          error:
            'Contact messages table is missing. Run supabase/contact_messages.sql in the Supabase SQL editor.',
          items: [],
        });
      }
      throw error;
    }
    res.json({ items: data || [] });
  } catch (err) {
    console.error('contact list error:', err.message);
    res.status(500).json({ error: err.message || 'Could not load contact messages.' });
  }
});

/**
 * Super Admin: which mailbox sends/receives contact replies
 * GET /api/admin/contact-messages/mail-identity
 */
app.get('/api/admin/contact-messages/mail-identity', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;
  if (!requireSuperAdmin(actor, res)) return;

  const fromEmail = normalizeEmail(process.env.GMAIL_USER || '');
  const replyTo = normalizeEmail(
    process.env.CONTACT_REPLY_TO || process.env.CONTACT_INBOX_EMAIL || process.env.GMAIL_USER || ''
  );
  const configured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASS);

  res.json({
    configured,
    fromEmail: isValidEmail(fromEmail) ? fromEmail : '',
    replyTo: isValidEmail(replyTo) ? replyTo : fromEmail,
    adminLoginEmail: SUPER_ADMIN_EMAIL,
    note: configured
      ? 'Replies are sent from GMAIL_USER. admin login email is only for dashboard access.'
      : 'Set GMAIL_USER and GMAIL_PASS in Backend/.env to a real Gmail with an App Password.',
  });
});

/**
 * Super Admin: reply to contact message by email
 * POST /api/admin/contact-messages/reply
 */
app.post('/api/admin/contact-messages/reply', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;
  if (!requireSuperAdmin(actor, res)) return;

  const id = req.body?.id;
  const replyBody = String(req.body?.replyBody || req.body?.message || '').trim();
  if (id == null) return res.status(400).json({ error: 'Message id is required.' });
  if (!replyBody || replyBody.length < 5) {
    return res.status(400).json({ error: 'Please write a longer reply (at least 5 characters).' });
  }

  const adminLogin = normalizeEmail(actor.email || SUPER_ADMIN_EMAIL);
  if (adminLogin !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Only the Super Admin can send replies.' });
  }

  try {
    const { data: row, error: fetchError } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) {
      if (isMissingRelationError(fetchError)) {
        return res.status(404).json({
          error:
            'Contact messages table is missing. Run supabase/contact_messages.sql in the Supabase SQL editor.',
        });
      }
      throw fetchError;
    }
    if (!row) return res.status(404).json({ error: 'Message not found.' });

    const senderEmail = normalizeEmail(row.email);
    if (!isValidEmail(senderEmail)) {
      return res.status(400).json({ error: 'Sender email on this message is invalid.' });
    }
    const senderOk = await emailDomainLooksDeliverable(senderEmail);
    if (!senderOk) {
      return res.status(400).json({
        error: 'Sender email domain does not look deliverable. Cannot send reply.',
      });
    }

    let fromEmail;
    let transporter;
    try {
      ({ fromEmail, transporter } = createMailTransporter());
    } catch (cfgErr) {
      return res.status(503).json({ error: cfgErr.message });
    }

    const replyTo = normalizeEmail(
      process.env.CONTACT_REPLY_TO || process.env.CONTACT_INBOX_EMAIL || fromEmail
    );
    if (!isValidEmail(replyTo)) {
      return res.status(503).json({
        error: 'CONTACT_REPLY_TO / GMAIL_USER must be a real deliverable email.',
      });
    }

    const senderName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'there';
    const subject = row.subject?.startsWith('Re:')
      ? row.subject
      : `Re: ${row.subject || 'JU LOFO contact'}`;

    await transporter.sendMail({
      from: `"JU LOFO Lost & Found" <${fromEmail}>`,
      to: senderEmail,
      replyTo,
      subject,
      text: [
        `Hello ${senderName},`,
        '',
        replyBody,
        '',
        '—',
        'JU LOFO Lost & Found Desk',
        `Reply to: ${replyTo}`,
        '',
        '--- Original message ---',
        row.message,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:560px">
          <p>Hello ${senderName.replace(/</g, '&lt;')},</p>
          <p style="white-space:pre-wrap">${replyBody.replace(/</g, '&lt;')}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
          <p style="font-size:13px;color:#64748b;margin:0">
            JU LOFO Lost & Found Desk<br/>
            Reply to: ${replyTo}
          </p>
          <p style="font-size:12px;color:#94a3b8;margin-top:16px">Original message</p>
          <p style="white-space:pre-wrap;font-size:13px;color:#475569;background:#f8fafc;padding:12px;border-radius:8px">${String(row.message || '').replace(/</g, '&lt;')}</p>
        </div>
      `,
    });

    const patch = {
      reply_body: replyBody,
      replied_at: new Date().toISOString(),
      replied_by: fromEmail,
      status: row.status === 'new' ? 'read' : row.status,
      read_at: row.read_at || new Date().toISOString(),
      read_by: row.read_by || adminLogin,
    };

    const { data: updated, error: updateError } = await supabase
      .from('contact_messages')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (isMissingRelationError(updateError) || /reply_body|column/i.test(updateError.message || '')) {
        return res.json({
          success: true,
          warning:
            'Reply email sent, but reply columns are missing. Run supabase/contact_messages_reply.sql.',
          sentTo: senderEmail,
          sentFrom: fromEmail,
          replyTo,
          repliedBy: fromEmail,
        });
      }
      throw updateError;
    }

    res.json({
      success: true,
      item: updated,
      sentTo: senderEmail,
      sentFrom: fromEmail,
      replyTo,
      repliedBy: fromEmail,
    });
  } catch (err) {
    console.error('contact reply error:', err.message);
    res.status(500).json({ error: err.message || 'Could not send reply.' });
  }
});

/**
 * Super Admin: mark read / archive
 * POST /api/admin/contact-messages/update-status
 */
app.post('/api/admin/contact-messages/update-status', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;
  if (!requireSuperAdmin(actor, res)) return;

  const id = req.body?.id;
  const status = String(req.body?.status || '').trim().toLowerCase();
  if (id == null) return res.status(400).json({ error: 'Message id is required.' });
  if (!['new', 'read', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const patch = { status };
  if (status === 'read') {
    patch.read_at = new Date().toISOString();
    patch.read_by = actor.email || SUPER_ADMIN_EMAIL;
  }

  try {
    const { error } = await supabase.from('contact_messages').update(patch).eq('id', id);
    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(404).json({
          error:
            'Contact messages table is missing. Run supabase/contact_messages.sql in the Supabase SQL editor.',
        });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('contact status error:', err.message);
    res.status(500).json({ error: err.message || 'Could not update message.' });
  }
});

/**
 * Super Admin: delete contact message
 * POST /api/admin/contact-messages/delete
 */
app.post('/api/admin/contact-messages/delete', async (req, res) => {
  const actor = requireAdminToken(req, res);
  if (!actor) return;
  if (!requireSuperAdmin(actor, res)) return;

  const id = req.body?.id;
  const deletedBy = req.body?.deletedBy || actor.email || actor.userName || null;
  if (id == null) return res.status(400).json({ error: 'Message id is required.' });

  try {
    const { data: row, error: fetchError } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) {
      if (isMissingRelationError(fetchError)) {
        return res.status(404).json({
          error:
            'Contact messages table is missing. Run supabase/contact_messages.sql in the Supabase SQL editor.',
        });
      }
      throw fetchError;
    }
    if (!row) return res.status(404).json({ error: 'Message not found or already deleted.' });

    const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || 'Contact message';
    await snapshotToRecycleBin({
      entityType: 'contact_message',
      entityId: id,
      title: fullName,
      summary: row.subject || 'LOFO contact message',
      payload: { table: 'contact_messages', row },
      deletedBy,
    });

    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('contact delete error:', err.message);
    res.status(500).json({ error: err.message || 'Could not delete message.' });
  }
});

// Start Server — bind 0.0.0.0 so phones on the same WiFi can reach OTP APIs
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================`);
  console.log(`🚀 JU LOFO Backend server running on port ${PORT}`);
  console.log(`================================================`);
});
