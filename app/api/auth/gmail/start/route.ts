import { NextResponse } from 'next/server'
import { getGmailAuthUrl, isGmailConfigured } from '@/lib/email/gmail'

const BASE = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/gmail/callback', '') ?? 'http://localhost:3000'

export async function GET() {
  if (!isGmailConfigured()) {
    return NextResponse.redirect(`${BASE}/integracoes?error=gmail_not_configured`)
  }
  return NextResponse.redirect(getGmailAuthUrl())
}
