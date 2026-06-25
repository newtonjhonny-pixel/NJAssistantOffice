import { NextResponse } from 'next/server'
import { getOutlookAuthUrl, isOutlookConfigured } from '@/lib/email/outlook'

export async function GET() {
  if (!isOutlookConfigured()) {
    return NextResponse.redirect(
      new URL('/integracoes?error=outlook_not_configured', process.env.MICROSOFT_REDIRECT_URI?.replace('/api/auth/outlook/callback', '') ?? 'http://localhost:3000')
    )
  }

  const url = getOutlookAuthUrl()
  return NextResponse.redirect(url)
}
