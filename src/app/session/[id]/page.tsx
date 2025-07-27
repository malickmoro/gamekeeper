'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Participant {
  id: string
  user: {
    id: string
    username: string
    email: string
  }
  joinedAt: string
}

interface Result {
  id: string
  enteredById: string
  approvedById?: string | null
  scoreData: any
  status: string
  createdAt: string
  updatedAt: string
}

interface GameSession {
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
  participants: Participant[]
  result?: Result | null
  isActive: boolean
  createdAt: string
  sessionStatus?: string
  timeElapsed?: number
}

export default function SessionPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isEndingSession, setIsEndingSession] = useState(false)
  const [isDeletingSession, setIsDeletingSession] = useState(false)
  
  // Score form state
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [scoreFormData, setScoreFormData] = useState({
    winner: '',
    goals: {} as Record<string, number>,
    matchDuration: '90 minutes',
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user && !session.user.hasCompletedOnboarding) {
      router.push('/auth/onboard')
      return
    }

    fetchSession()
  }, [session, status, sessionId, router])

  const fetchSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/session/${sessionId}`)
      
      if (response.ok) {
        const data = await response.json()
        setGameSession(data.session)
        
        // Initialize score form with participants
        if (data.session.participants) {
          const initialGoals: any = {}
          data.session.participants.forEach((p: Participant) => {
            initialGoals[p.user.id] = 0
          })
          setScoreFormData(prev => ({
            ...prev,
            goals: initialGoals
          }))
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load session')
      }
    } catch (error) {
      setError('An error occurred while loading the session')
    } finally {
      setIsLoading(false)
    }
  }

  const joinSession = async () => {
    setIsJoining(true)
    try {
      const response = await fetch(`/api/session/${sessionId}/join`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setSuccessMessage('Successfully joined the session!')
        fetchSession() // Refresh session data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to join session')
      }
    } catch (error) {
      setError('An error occurred while joining the session')
    } finally {
      setIsJoining(false)
    }
  }

  const submitScore = async () => {
    setIsSubmittingScore(true)
    try {
      const response = await fetch(`/api/session/${sessionId}/submit-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scoreFormData)
      })
      
      if (response.ok) {
        setSuccessMessage('Score submitted successfully! Waiting for confirmation.')
        setShowScoreForm(false)
        fetchSession() // Refresh session data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit score')
      }
    } catch (error) {
      setError('An error occurred while submitting the score')
    } finally {
      setIsSubmittingScore(false)
    }
  }

  const confirmScore = async (action: 'approve' | 'reject') => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/session/${sessionId}/confirm-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        setSuccessMessage(`Score ${action === 'approve' ? 'approved' : 'rejected'} successfully!`)
        fetchSession() // Refresh session data
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to ${action} score`)
      }
    } catch (error) {
      setError(`An error occurred while ${action}ing the score`)
    } finally {
      setIsConfirming(false)
    }
  }

  const updateGoals = (userId: string, goals: number) => {
    setScoreFormData(prev => ({
      ...prev,
      goals: {
        ...prev.goals,
        [userId]: Math.max(0, goals)
      }
    }))
  }

  const endSession = async () => {
    setIsEndingSession(true)
    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: false })
      })
      
      if (response.ok) {
        setSuccessMessage('Session ended successfully!')
        fetchSession() // Refresh session data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to end session')
      }
    } catch (error) {
      setError('An error occurred while ending the session')
    } finally {
      setIsEndingSession(false)
    }
  }

  const deleteSession = async () => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return
    }
    
    setIsDeletingSession(true)
    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.push('/')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete session')
      }
    } catch (error) {
      setError('An error occurred while deleting the session')
    } finally {
      setIsDeletingSession(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border bg-green-500/20 text-green-300 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Active
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30">
            Completed
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-red-500/20 text-red-300 border-red-500/30">
            Cancelled
          </span>
        )
      case 'ABANDONED':
        return (
          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            Abandoned
          </span>
        )
      default:
        return (
          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-gray-500/20 text-gray-300 border-gray-500/30">
            {status}
          </span>
        )
    }
  }

  const generateQRCodeUrl = (sessionCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sessionCode)}`
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen gradient-gaming">
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="text-xl text-purple-200">Loading session...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error && !gameSession) {
    return (
      <div className="min-h-screen gradient-gaming">
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass rounded-2xl p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Session</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <Link
              href="/"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen gradient-gaming">
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Session Not Found</h2>
            <p className="text-purple-200 mb-6">The session you're looking for doesn't exist.</p>
            <Link
              href="/"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isParticipant = gameSession.participants.some(p => p.user.id === session.user.id)
  const isCreator = gameSession.createdBy.id === session.user.id
  const hasResult = !!gameSession.result
  const canSubmitScore = isParticipant && !hasResult && gameSession.isActive
  const canConfirmScore = isParticipant && hasResult && gameSession.result?.status === 'PENDING' && gameSession.result?.enteredById !== session.user.id

  return (
    <div className="min-h-screen gradient-gaming">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-purple-300 hover:text-purple-100 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Home</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {gameSession.game.name} Session
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-purple-200">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{session.user.username || session.user.email}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <a
                  href="/friends"
                  className="p-2 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                  title="Friends"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </a>
                
                <a
                  href="/history"
                  className="p-2 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                  title="History"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </a>
                
                <a
                  href="/settings"
                  className="p-2 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
                
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="p-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 glass-light rounded-xl p-4">
            <div className="flex items-center space-x-2 text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 glass-light rounded-xl p-4">
            <div className="flex items-center space-x-2 text-green-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session Info */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {gameSession.game.name} Session
                  </h2>
                  <p className="text-purple-200 mb-2">
                    Created by {gameSession.createdBy.username || gameSession.createdBy.email}
                  </p>
                  <p className="text-purple-300 text-sm break-all sm:break-normal">
                    Session Code: <span className="font-mono bg-gray-800/50 px-2 py-1 rounded text-xs sm:text-sm border border-purple-500/30">{gameSession.code}</span>
                  </p>
                  {gameSession.timeElapsed && (
                    <p className="text-xs text-purple-400 mt-2">
                      Session age: {gameSession.timeElapsed.toFixed(1)} hours
                    </p>
                  )}
                </div>
                <div>
                  {getStatusBadge(gameSession.sessionStatus || (gameSession.isActive ? 'ACTIVE' : 'INACTIVE'))}
                </div>
              </div>

              {!isParticipant && (
                <div className="glass-light rounded-xl p-6 mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Not a Participant</h3>
                      <p className="text-purple-200">You're not currently part of this session.</p>
                    </div>
                  </div>
                  <button
                    onClick={joinSession}
                    disabled={isJoining}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    {isJoining ? 'Joining...' : 'Join Session'}
                  </button>
                </div>
              )}

              {/* Participants */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Participants ({gameSession.participants.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameSession.participants.map((participant) => (
                    <div key={participant.id} className="glass-light rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {(participant.user.username || participant.user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {participant.user.username || participant.user.email}
                          </p>
                          <p className="text-purple-300 text-sm">
                            Joined {new Date(participant.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {participant.user.id === gameSession.createdBy.id && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            Creator
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Submission */}
              {canSubmitScore && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowScoreForm(!showScoreForm)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    {showScoreForm ? 'Cancel Score Submission' : 'Submit Score'}
                  </button>
                  
                  {showScoreForm && (
                    <div className="glass-light rounded-xl p-6 mt-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Submit Match Score</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-purple-200 text-sm font-medium mb-2">Winner</label>
                          <select
                            value={scoreFormData.winner}
                            onChange={(e) => setScoreFormData(prev => ({ ...prev, winner: e.target.value }))}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Select winner...</option>
                            {gameSession.participants.map((p) => (
                              <option key={p.user.id} value={p.user.id}>
                                {p.user.username || p.user.email}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-purple-200 text-sm font-medium mb-2">Goals per Player</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {gameSession.participants.map((p) => (
                              <div key={p.user.id} className="flex items-center space-x-3">
                                <span className="text-purple-200 text-sm flex-1">
                                  {p.user.username || p.user.email}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={scoreFormData.goals[p.user.id] || 0}
                                  onChange={(e) => updateGoals(p.user.id, parseInt(e.target.value) || 0)}
                                  className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-1 text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-purple-200 text-sm font-medium mb-2">Match Duration</label>
                          <select
                            value={scoreFormData.matchDuration}
                            onChange={(e) => setScoreFormData(prev => ({ ...prev, matchDuration: e.target.value }))}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="90 minutes">90 minutes</option>
                            <option value="60 minutes">60 minutes</option>
                            <option value="45 minutes">45 minutes</option>
                            <option value="30 minutes">30 minutes</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-purple-200 text-sm font-medium mb-2">Notes (Optional)</label>
                          <textarea
                            value={scoreFormData.notes}
                            onChange={(e) => setScoreFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Any additional notes about the match..."
                          />
                        </div>
                        
                        <button
                          onClick={submitScore}
                          disabled={isSubmittingScore || !scoreFormData.winner}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                        >
                          {isSubmittingScore ? 'Submitting...' : 'Submit Score'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Score Confirmation */}
              {canConfirmScore && gameSession.result && (
                <div className="glass-light rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Confirm Score</h3>
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <h4 className="text-purple-200 font-medium mb-2">Submitted Score:</h4>
                    <div className="space-y-2 text-sm text-purple-300">
                      <p>Winner: {gameSession.participants.find(p => p.user.id === gameSession.result?.scoreData.winner)?.user.username || 'Unknown'}</p>
                      <p>Duration: {gameSession.result.scoreData.matchDuration}</p>
                      {gameSession.result.scoreData.notes && (
                        <p>Notes: {gameSession.result.scoreData.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => confirmScore('approve')}
                      disabled={isConfirming}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                    >
                      {isConfirming ? 'Confirming...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => confirmScore('reject')}
                      disabled={isConfirming}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                    >
                      {isConfirming ? 'Confirming...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}

                             {/* Session Result */}
               {hasResult && gameSession.result && (
                 <div className="glass-light rounded-xl p-6">
                   <h3 className="text-lg font-semibold text-white mb-4">Match Result</h3>
                   <div className="bg-gray-800/50 rounded-lg p-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                       <div>
                         <p className="text-purple-200 text-sm">Status</p>
                         <p className="text-white font-medium">{gameSession.result.status}</p>
                       </div>
                       <div>
                         <p className="text-purple-200 text-sm">Submitted</p>
                         <p className="text-white font-medium">{new Date(gameSession.result.createdAt).toLocaleDateString()}</p>
                       </div>
                     </div>
                     {gameSession.result.scoreData && (
                       <div className="mt-4 pt-4 border-t border-purple-500/30">
                         <h4 className="text-purple-200 font-medium mb-4">Score Details:</h4>
                         
                         {/* Winner Highlight */}
                         <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
                           <div className="flex items-center space-x-3">
                             <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                               </svg>
                             </div>
                             <div>
                               <p className="text-yellow-200 text-sm font-medium">🏆 WINNER</p>
                               <p className="text-white text-lg font-bold">
                                 {gameSession.participants.find(p => p.user.id === gameSession.result?.scoreData.winner)?.user.username || 'Unknown'}
                               </p>
                             </div>
                           </div>
                         </div>
                         
                         {/* Match Details */}
                         <div className="space-y-3">
                           <div className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                             <span className="text-purple-200 text-sm">Duration</span>
                             <span className="text-white font-medium">{gameSession.result.scoreData.matchDuration}</span>
                           </div>
                           
                           {/* Goals Breakdown */}
                           <div className="bg-gray-700/50 rounded-lg p-3">
                             <p className="text-purple-200 text-sm mb-2">Goals Scored:</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {Object.entries(gameSession.result.scoreData.goals || {}).map(([userId, goals]) => {
                                 const participant = gameSession.participants.find(p => p.user.id === userId)
                                 const isWinner = userId === gameSession.result?.scoreData.winner
                                 return (
                                   <div key={userId} className={`flex justify-between items-center p-2 rounded ${
                                     isWinner ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' : 'bg-gray-600/50'
                                   }`}>
                                     <span className={`text-sm font-medium ${
                                       isWinner ? 'text-yellow-200' : 'text-white'
                                     }`}>
                                       {participant?.user.username || 'Unknown'}
                                       {isWinner && ' 🏆'}
                                     </span>
                                     <span className={`text-sm font-bold ${
                                       isWinner ? 'text-yellow-200' : 'text-white'
                                     }`}>
                                       {goals as number} goals
                                     </span>
                                   </div>
                                 )
                               })}
                             </div>
                           </div>
                           
                           {gameSession.result.scoreData.notes && (
                             <div className="bg-gray-700/50 rounded-lg p-3">
                               <p className="text-purple-200 text-sm mb-2">Notes:</p>
                               <p className="text-white text-sm">{gameSession.result.scoreData.notes}</p>
                             </div>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}

              {/* Session Actions */}
              {isCreator && (
                <div className="flex flex-col sm:flex-row gap-4">
                  {gameSession.isActive && (
                    <button
                      onClick={endSession}
                      disabled={isEndingSession}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                    >
                      {isEndingSession ? 'Ending...' : 'End Session'}
                    </button>
                  )}
                  <button
                    onClick={deleteSession}
                    disabled={isDeletingSession}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    {isDeletingSession ? 'Deleting...' : 'Delete Session'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* QR Code */}
            <div className="glass rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Session QR Code</h3>
              <div className="text-center">
                <img
                  src={generateQRCodeUrl(gameSession.code)}
                  alt="Session QR Code"
                  className="border-2 border-purple-500/30 rounded-xl w-full max-w-48 mx-auto"
                />
                <p className="text-purple-200 text-sm mt-2">Share this code with friends to join</p>
              </div>
            </div>

            {/* Session Stats */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-200">Game</span>
                  <span className="text-white font-medium">{gameSession.game.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Participants</span>
                  <span className="text-white font-medium">{gameSession.participants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Created</span>
                  <span className="text-white font-medium">{new Date(gameSession.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Status</span>
                  <span className="text-white font-medium">{gameSession.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 