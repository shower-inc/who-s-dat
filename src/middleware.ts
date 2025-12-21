import { NextResponse, type NextRequest } from 'next/server'

// Basic認証の認証情報
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'shower'
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'novasound'

function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  const base64Credentials = authHeader.split(' ')[1]
  const credentials = atob(base64Credentials)
  const [username, password] = credentials.split(':')

  return username === BASIC_AUTH_USER && password === BASIC_AUTH_PASS
}

export async function middleware(request: NextRequest) {
  // 管理画面（/admin/*）のみBasic認証を適用
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminPage) {
    if (!isAuthenticated(request)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
