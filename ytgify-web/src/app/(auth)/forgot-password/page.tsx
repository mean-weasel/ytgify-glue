'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/lib/auth/actions'
import Link from 'next/link'

type State = { error?: string; success?: string }

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: State, formData: FormData): Promise<State> => {
      const result = await resetPassword(formData)
      return result || {}
    },
    {} as State
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">YTgify</h1>
          <p className="mt-2 text-gray-400">Reset your password</p>
        </div>

        {/* Success message */}
        {state.success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
            {state.success}
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            {state.error}
          </div>
        )}

        {/* Reset form */}
        {!state.success && (
          <form action={formAction} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                className="mt-1 block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="you@example.com"
              />
              <p className="mt-2 text-sm text-gray-500">
                We&apos;ll send you a link to reset your password.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {/* Back to login */}
        <p className="text-center text-sm text-gray-400">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
