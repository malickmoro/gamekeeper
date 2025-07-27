'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
          setScoreFormData(prev => ({ ...prev, goals: initialGoals }))
        }

        // Check if user is already a participant
        const isParticipant = data.session.participants.some(
          (p: Participant) => p.user.id === session?.user?.id
        )

        // If not a participant, automatically join the session
        if (!isParticipant && session?.user?.id) {
          await joinSession()
        }
      } else if (response.status === 404) {
        setError('Session not found')
      } else {
        setError('Failed to load session')
      }
    } catch (error) {
      setError('An error occurred while loading the session')
    } finally {
      setIsLoading(false)
    }
  }

  const joinSession = async () => {
    setIsJoining(true)
    setError('')

    try {
      const response = await fetch(`/api/session/${sessionId}/join`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setGameSession(data.session)
        setSuccessMessage('Successfully joined the session!')
      } else {
        setError(data.error || 'Failed to join session')
      }
    } catch (error) {
      setError('An error occurred while joining the session')
    } finally {
      setIsJoining(false)
    }
  }

  const submitScore = async () => {
    setIsSubmittingScore(true)
    setError('')

    try {
      const response = await fetch(`/api/session/${sessionId}/submit-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoreData: scoreFormData
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Score submitted successfully!')
        setShowScoreForm(false)
        fetchSession() // Refresh session data
      } else {
        setError(data.error || 'Failed to submit score')
      }
    } catch (error) {
      setError('An error occurred while submitting the score')
    } finally {
      setIsSubmittingScore(false)
    }
  }

  const confirmScore = async (action: 'approve' | 'reject') => {
    setIsConfirming(true)
    setError('')

    try {
      const response = await fetch(`/api/session/${sessionId}/confirm-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Score ${action === 'approve' ? 'approved' : 'rejected'} successfully!`)
        
        // If approved, end the session and redirect to home
        if (action === 'approve') {
          setTimeout(() => {
            setSuccessMessage('Session completed! Redirecting to home...')
            setTimeout(() => {
              router.push('/')
            }, 2000)
          }, 1000)
        } else {
          fetchSession() // Refresh session data
        }
      } else {
        setError(data.error || `Failed to ${action} score`)
      }
    } catch (error) {
      setError(`An error occurred while ${action}ing the score`)
    } finally {
      setIsConfirming(false)
    }
  }

  const updateGoals = (userId: string, goals: number) => {
    setScoreFormData(prev => {
      const newGoals = {
        ...prev.goals,
        [userId]: goals
      }
      
      // Determine winner or draw based on goals
      const goalValues = Object.values(newGoals)
      const maxGoals = Math.max(...goalValues)
      const playersWithMaxGoals = Object.keys(newGoals).filter(id => newGoals[id] === maxGoals)
      
      // Check if it's a draw (multiple players with same max score) or if all scores are 0
      const isDraw = playersWithMaxGoals.length > 1 || (maxGoals === 0 && goalValues.every(g => g === 0))
      const winner = isDraw ? 'DRAW' : playersWithMaxGoals[0]
      
      return {
        ...prev,
        goals: newGoals,
        winner: winner
      }
    })
  }

  const endSession = async () => {
    if (!confirm('Are you sure you want to end this session? This will prevent new participants from joining.')) {
      return
    }

    setIsEndingSession(true)
    setError('')

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'end' }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Session ended successfully!')
        fetchSession() // Refresh session data
      } else {
        setError(data.error || 'Failed to end session')
      }
    } catch (error) {
      setError('An error occurred while ending the session')
    } finally {
      setIsEndingSession(false)
    }
  }

  const deleteSession = async () => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone and will permanently remove all session data.')) {
      return
    }

    setIsDeletingSession(true)
    setError('')

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Session deleted successfully!')
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } else {
        setError(data.error || 'Failed to delete session')
      }
    } catch (error) {
      setError('An error occurred while deleting the session')
    } finally {
      setIsDeletingSession(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      VOID: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ENDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
        {status}
      </span>
    )
  }

  const generateQRCodeUrl = (sessionCode: string) => {
    const joinUrl = `${window.location.origin}/session/${sessionCode}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`
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

  if (error && !gameSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link
            href="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Session not found</div>
      </div>
    )
  }

  const isParticipant = gameSession.participants.some(p => p.user.id === session.user.id)
  const isCreator = gameSession.createdBy.id === session.user.id
  const hasResult = !!gameSession.result
  const canSubmitScore = isParticipant && !hasResult && gameSession.isActive
  const canConfirmScore = isParticipant && hasResult && gameSession.result?.status === 'PENDING' && gameSession.result?.enteredById !== session.user.id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-indigo-600 hover:text-indigo-500 text-sm sm:text-base">
                ← Back to Home
              </Link>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">GameKeeper</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-gray-700 text-sm sm:text-base truncate">
                {session.user.username || session.user.email}
              </span>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium text-center"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Session Info */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {gameSession.game.name} Session
                    </h2>
                    <p className="text-sm text-gray-600">
                      Created by {gameSession.createdBy.username || gameSession.createdBy.email}
                    </p>
                    <p className="text-sm text-gray-600 break-all sm:break-normal">
                      Session Code: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm">{gameSession.code}</span>
                    </p>
                    {gameSession.timeElapsed && (
                      <p className="text-xs text-gray-500 mt-1">
                        Session age: {gameSession.timeElapsed.toFixed(1)} hours
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(gameSession.sessionStatus || (gameSession.isActive ? 'ACTIVE' : 'INACTIVE'))}
                  </div>
                </div>

                {!isParticipant && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 mb-2">You're not a participant in this session.</p>
                    <button
                      onClick={joinSession}
                      disabled={isJoining}
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      {isJoining ? 'Joining...' : 'Join Session'}
                    </button>
                  </div>
                )}

                {/* Score Submission */}
                {canSubmitScore && (
                  <div className="mb-4">
                    {!showScoreForm ? (
                      <button 
                        onClick={() => setShowScoreForm(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2"
                      >
                        <span>⚽ Submit FIFA Match Result</span>
                      </button>
                    ) : (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                        <h4 className="text-lg font-medium mb-2 flex items-center">
                          ⚽ FIFA Match Result
                        </h4>
                        {scoreFormData.winner && (
                          <div className={`mb-4 p-2 rounded text-sm ${scoreFormData.winner === 'DRAW' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {scoreFormData.winner === 'DRAW' ? (
                              <>
                                🤝 <strong>Result:</strong> Draw
                                <br />
                                📊 <strong>Final Score:</strong> {Object.values(scoreFormData.goals).join(' - ')}
                              </>
                            ) : (
                              <>
                                🏆 <strong>Winner:</strong> {gameSession.participants.find(p => p.user.id === scoreFormData.winner)?.user.username || 'Unknown'}
                                <br />
                                📊 <strong>Final Score:</strong> {Object.values(scoreFormData.goals).join(' - ')}
                              </>
                            )}
                          </div>
                        )}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ⚽ Goals Scored
                            </label>
                            <div className="space-y-3">
                              {gameSession.participants.map((p) => (
                                <div key={p.user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 space-y-2 sm:space-y-0">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium truncate">
                                      {p.user.username || p.user.email}
                                    </span>
                                    {scoreFormData.winner === p.user.id && scoreFormData.winner !== 'DRAW' && (
                                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                        Winner
                                      </span>
                                    )}
                                    {scoreFormData.winner === 'DRAW' && scoreFormData.goals[p.user.id] === Math.max(...Object.values(scoreFormData.goals)) && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Draw
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="20"
                                      value={scoreFormData.goals[p.user.id] || 0}
                                      onChange={(e) => updateGoals(p.user.id, parseInt(e.target.value) || 0)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    />
                                    <span className="text-xs text-gray-500">goals</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ⏱️ Match Duration
                            </label>
                            <select
                              value={scoreFormData.matchDuration}
                              onChange={(e) => setScoreFormData(prev => ({ ...prev, matchDuration: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="90 minutes">90 minutes (Full match)</option>
                              <option value="45 minutes">45 minutes (Half match)</option>
                              <option value="30 minutes">30 minutes (Quick match)</option>
                              <option value="15 minutes">15 minutes (Short match)</option>
                              <option value="6 minutes">6 minutes (Default FIFA)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              📝 Match Notes (optional)
                            </label>
                            <textarea
                              value={scoreFormData.notes}
                              onChange={(e) => setScoreFormData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                              placeholder="Any highlights, cards, or memorable moments from the match..."
                            />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <button
                              onClick={submitScore}
                              disabled={isSubmittingScore || !scoreFormData.winner}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 flex-1 sm:flex-none"
                            >
                              <span>{isSubmittingScore ? 'Submitting...' : '⚽ Submit Match Result'}</span>
                            </button>
                            <button
                              onClick={() => setShowScoreForm(false)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex-1 sm:flex-none"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Score Confirmation */}
                {canConfirmScore && (
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                    <h4 className="text-lg font-medium mb-2">Score Pending Approval</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      A score has been submitted for this session. Please review and approve or reject it.
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => confirmScore('approve')}
                        disabled={isConfirming}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        {isConfirming ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => confirmScore('reject')}
                        disabled={isConfirming}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        {isConfirming ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Result Display */}
                {hasResult && gameSession.result && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-medium">Game Result</h4>
                      {getStatusBadge(gameSession.result.status)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <p>Submitted on: {new Date(gameSession.result.createdAt).toLocaleString()}</p>
                      {gameSession.result.approvedById && (
                        <p>Last updated: {new Date(gameSession.result.updatedAt).toLocaleString()}</p>
                      )}
                    </div>
                    {gameSession.result.scoreData && (
                      <div className="mt-3">
                        <h5 className="font-medium mb-2">Score Details:</h5>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded border dark:border-gray-600">
                          {(() => {
                            const scoreData = gameSession.result.scoreData as any
                            return (
                              <div className="space-y-2">
                                {scoreData.winner === 'DRAW' ? (
                                  <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                                    <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">🤝 Draw</div>
                                    <div className="text-sm text-blue-600 dark:text-blue-300">
                                      Final Score: {Object.values(scoreData.goals || {}).join(' - ')}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                                    <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                                      🏆 Winner: {gameSession.participants.find(p => p.user.id === scoreData.winner)?.user.username || 'Unknown'}
                                    </div>
                                    <div className="text-sm text-green-600 dark:text-green-300">
                                      Final Score: {Object.values(scoreData.goals || {}).join(' - ')}
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                  {Object.entries(scoreData.goals || {}).map(([userId, goals]) => {
                                    const participant = gameSession.participants.find(p => p.user.id === userId)
                                    return (
                                      <div key={userId} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-600 rounded">
                                        <span className="text-sm font-medium">
                                          {participant?.user.username || 'Unknown'}
                                        </span>
                                        <span className="text-sm font-bold">
                                          {goals as number} goals
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                                {scoreData.matchDuration && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    ⏱️ Match Duration: {scoreData.matchDuration}
                                  </div>
                                )}
                                {scoreData.notes && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    📝 Notes: {scoreData.notes}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Participants ({gameSession.participants.length})
                </h3>
                <div className="space-y-3">
                  {gameSession.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(participant.user.username || participant.user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {participant.user.username ? (
                              <Link 
                                href={`/profile/${participant.user.username}`}
                                className="hover:text-indigo-600"
                              >
                                {participant.user.username}
                              </Link>
                            ) : (
                              participant.user.email
                            )}
                            {participant.user.id === gameSession.createdBy.id && (
                              <span className="ml-2 text-xs text-indigo-600">(Creator)</span>
                            )}
                            {participant.user.id === session.user.id && (
                              <span className="ml-2 text-xs text-green-600">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(participant.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* QR Code and Actions */}
            <div className="space-y-4 lg:space-y-6 order-1 lg:order-2">
              <div className="bg-white shadow rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Share Session</h3>
                <div className="text-center">
                  <img
                    src={generateQRCodeUrl(gameSession.code)}
                    alt="Session QR Code"
                    className="mx-auto border rounded-lg mb-2 w-32 h-32 sm:w-auto sm:h-auto"
                  />
                  <p className="text-xs text-gray-500">
                    Scan to join session
                  </p>
                  <div className="mt-4">
                    <input
                      type="text"
                      value={`${window.location.origin}/session/${gameSession.code}`}
                      readOnly
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50 break-all"
                    />
                  </div>
                </div>
              </div>

              {isCreator && (
                <div className="bg-white shadow rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Session Controls</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={endSession}
                      disabled={isEndingSession || !gameSession.isActive}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      {isEndingSession ? 'Ending...' : 'End Session'}
                    </button>
                    <button 
                      onClick={deleteSession}
                      disabled={isDeletingSession}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      {isDeletingSession ? 'Deleting...' : 'Delete Session'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 