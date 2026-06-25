import { NextResponse } from 'next/server'
import { getGmailAuthUrl, isGmailConfigured } from '@/lib/email/gmail'

export async function GET() {
  if (!isGmailConfigured()) {
    return NextResponse.redirect(
      new URL('/integracoes?error=gmail_not_configured', process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/gmail/callback', '') ?? 'http://localhost:3000')
    )
  }

  const url = getGmailAuthUrl()
  return NextResponse.redirect(url)
}
