'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatTimeElapsed } from '@/lib/time-utils'

interface SessionHistoryItem {
  id: string
  code: string
  game: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    username: string
    email: string
  }
  createdAt: string
  joinedAt: string
  participantCount: number
  result?: {
    id: string
    status: string
    createdAt: string
    enteredById: string
    approvedById?: string | null
    scoreData?: any
  } | null
  isActive: boolean
  status: string
  timeElapsed: number
  isCreator: boolean
}

interface SessionHistoryResponse {
  sessions: SessionHistoryItem[]
  totalCount: number
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user && !session.user.hasCompletedOnboarding) {
      router.push('/auth/onboard')
      return
    }

    fetchHistory()
  }, [session, status, router])

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/history')
      
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      } else {
        setError('Failed to load session history')
      }
    } catch {
      setError('An error occurred while loading session history')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      VOID: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      ENDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
        {status}
      </span>
    )
  }

  const getResultBadge = (sessionItem: SessionHistoryItem) => {
    if (!sessionItem.result || sessionItem.result.status !== 'APPROVED') {
      return null
    }

    const scoreData = sessionItem.result.scoreData
    if (!scoreData) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Completed
        </span>
      )
    }

    if (scoreData.winner === 'DRAW') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          🤝 Draw
        </span>
      )
    }

    // Check if current user is the winner
    const isWinner = scoreData.winner === session?.user?.id
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        isWinner 
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      }`}>
        {isWinner ? '🏆 Win' : '❌ Loss'}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-indigo-600 hover:text-indigo-500 text-sm sm:text-base">
                ← Back to Home
              </Link>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Session History</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base truncate">
                {session.user.username || session.user.email}
              </span>
              <Link
                href="/settings"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium text-center"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {sessions.length === 0 && !isLoading && !error ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Sessions Yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">You haven&apos;t participated in any game sessions yet.</p>
              <Link
                href="/"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Create Your First Session
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Your Game Sessions ({sessions.length})
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Game
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session ID
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Players
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((sessionItem) => (
                      <tr key={sessionItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium mr-2 sm:mr-3">
                              {sessionItem.game.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                {sessionItem.game.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white font-mono">
                            {sessionItem.code}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                            {formatDate(sessionItem.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeElapsed(sessionItem.timeElapsed)} ago
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-1 sm:px-2 py-1 text-xs font-semibold rounded-full ${
                            sessionItem.isCreator 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {sessionItem.isCreator ? 'Creator' : 'Participant'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          {sessionItem.participantCount} players
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(sessionItem.status)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {getResultBadge(sessionItem)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <Link
                            href={`/session/${sessionItem.id}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 