'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GameSession {
  id: string
  code: string
  game: {
    name: string
  }
  isActive: boolean
  createdAt: string
  participants: {
    user: {
      username: string
      email: string
    }
  }[]
  result?: {
    id: string
    status: string
    createdAt: string
  }
}

interface Participation {
  sessionId: string
  sessionCode: string
  gameName: string
  isActive: boolean
  createdAt: string
  result?: {
    id: string
    status: string
    createdAt: string
  }
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'created' | 'participated'>('created')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user && !session.user.hasCompletedOnboarding) {
      router.push('/auth/onboard')
      return
    }

    if (session) {
      fetchHistory()
    }
  }, [session, status, router])

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch('/api/user/history')
      const data = await response.json()

      if (response.ok) {
        setGameSessions(data.createdSessions || [])
        setParticipations(data.participations || [])
      } else {
        setError(data.error || 'Failed to load history')
      }
    } catch (error) {
      setError('An error occurred while loading history')
    } finally {
      setIsLoading(false)
    }
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

  const getStatusBadge = (isActive: boolean, result?: { status: string }) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border bg-green-500/20 text-green-300 border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          Active
        </span>
      )
    }
    
    if (result) {
      const statusClasses = {
        COMPLETED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/30',
        ABANDONED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      }
      
      return (
        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${statusClasses[result.status as keyof typeof statusClasses] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
          {result.status}
        </span>
      )
    }
    
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-gray-500/20 text-gray-300 border-gray-500/30">
        Unknown
      </span>
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading history...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-purple-300 hover:text-purple-100 transition-colors duration-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Home</span>
                </div>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Gaming History
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-purple-200">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{session.user.username || session.user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('created')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'created'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              Sessions Created ({gameSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('participated')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'participated'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              Sessions Joined ({participations.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p className="text-purple-200 text-lg">Loading gaming history...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Created Sessions Tab */}
            {activeTab === 'created' && (
              <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-500/20">
                  <h2 className="text-xl font-bold text-white">
                    Sessions You Created
                  </h2>
                </div>
                
                {gameSessions.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-gray-400 mb-6">
                      <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">No Sessions Created Yet</h3>
                    <p className="text-gray-300 mb-6">
                      Start by creating your first gaming session and invite friends to join!
                    </p>
                    <Link
                      href="/"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      Create Session
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-purple-500/20">
                    {gameSessions.map((session) => (
                      <div key={session.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-white">
                                {session.game.name}
                              </div>
                              <div className="text-gray-300 text-sm">
                                Code: <span className="font-mono text-purple-400">{session.code}</span>
                              </div>
                              <div className="flex items-center space-x-3 mt-2">
                                {getStatusBadge(session.isActive, session.result)}
                                <span className="text-xs text-gray-400">
                                  {formatDate(session.createdAt)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {session.participants.length} participants
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            {session.isActive && (
                              <Link
                                href={`/session/${session.code}`}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105"
                              >
                                Join Session
                              </Link>
                            )}
                            <Link
                              href={`/session/${session.code}`}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Participated Sessions Tab */}
            {activeTab === 'participated' && (
              <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-500/20">
                  <h2 className="text-xl font-bold text-white">
                    Sessions You Joined
                  </h2>
                </div>
                
                {participations.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-gray-400 mb-6">
                      <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">No Sessions Joined Yet</h3>
                    <p className="text-gray-300 mb-6">
                      Join your first gaming session by entering a session code or scanning a QR code!
                    </p>
                    <Link
                      href="/"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      Join Session
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-purple-500/20">
                    {participations.map((participation) => (
                      <div key={participation.sessionId} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-white">
                                {participation.gameName}
                              </div>
                              <div className="text-gray-300 text-sm">
                                Code: <span className="font-mono text-green-400">{participation.sessionCode}</span>
                              </div>
                              <div className="flex items-center space-x-3 mt-2">
                                {getStatusBadge(participation.isActive, participation.result)}
                                <span className="text-xs text-gray-400">
                                  {formatDate(participation.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            {participation.isActive && (
                              <Link
                                href={`/session/${participation.sessionCode}`}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105"
                              >
                                Rejoin Session
                              </Link>
                            )}
                            <Link
                              href={`/session/${participation.sessionCode}`}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
} 