import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function validateBody(body) {
  const firstName = String(body?.firstName || body?.first_name || '').trim();
  const lastName = String(body?.lastName || body?.last_name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const phone = String(body?.phone || '').trim() || null;
  const subject = String(body?.subject || '').trim();
  const message = String(body?.message || '').trim();

  if (!firstName || !lastName) {
    return { error: 'First and last name are required.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'A valid email address is required.' };
  }
  if (!subject) {
    return { error: 'Subject is required.' };
  }
  if (!message || message.length < 5) {
    return { error: 'Please write a longer message.' };
  }

  return {
    payload: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      subject,
      message,
      status: 'new',
    },
  };
}

/** Fallback path when direct anon insert is blocked — uses service role on Vercel. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const validated = validateBody(body);
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server contact config missing. Use direct Supabase insert or set SUPABASE_SERVICE_ROLE_KEY on Vercel.' },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from('contact_messages')
    .insert(validated.payload)
    .select('id')
    .single();

  if (error) {
    console.error('POST /api/contact/submit failed:', error.message);
    return NextResponse.json({ error: error.message || 'Could not send message.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id });
}
