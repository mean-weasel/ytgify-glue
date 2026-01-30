import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function DELETE(request: NextRequest) {
  // JWT tokens are stateless, so logout is handled client-side by deleting tokens
  // This endpoint exists for API compatibility and could be used for:
  // - Token blacklisting (if implemented)
  // - Audit logging
  // - Session cleanup

  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: corsHeaders }
    )
  }

  // For now, just return success
  // In a production environment, you might want to:
  // - Add the token to a blacklist
  // - Log the logout event
  // - Clear any server-side sessions

  return NextResponse.json(
    { message: 'Logged out successfully' },
    { headers: corsHeaders }
  )
}
