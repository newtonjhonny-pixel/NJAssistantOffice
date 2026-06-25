import { NextResponse } from 'next/server'
import { getOutlookAuthUrl, isOutlookConfigured } from '@/lib/email/outlook'

const BASE = process.env.MICROSOFT_REDIRECT_URI?.replace('/api/auth/outlook/callback', '') ?? 'http://localhost:3000'

export async function GET() {
  if (!isOutlookConfigured()) {
    return NextResponse.redirect(`${BASE}/integracoes?error=outlook_not_configured`)
  }
  return NextResponse.redirect(getOutlookAuthUrl())
}
