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
  
  // Score form state
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [scoreFormData, setScoreFormData] = useState({
    winner: '',
    scores: {} as Record<string, number>,
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
          const initialScores: any = {}
          data.session.participants.forEach((p: Participant) => {
            initialScores[p.user.id] = 0
          })
          setScoreFormData(prev => ({ ...prev, scores: initialScores }))
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
        fetchSession() // Refresh session data
      } else {
        setError(data.error || `Failed to ${action} score`)
      }
    } catch (error) {
      setError(`An error occurred while ${action}ing the score`)
    } finally {
      setIsConfirming(false)
    }
  }

  const updateScore = (userId: string, score: number) => {
    setScoreFormData(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [userId]: score
      }
    }))
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      VOID: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-blue-100 text-blue-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
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
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-indigo-600 hover:text-indigo-500">
                ← Back to Home
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">GameKeeper</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {session.user.username || session.user.email}
              </span>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Session Info */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {gameSession.game.name} Session
                    </h2>
                    <p className="text-sm text-gray-600">
                      Created by {gameSession.createdBy.username || gameSession.createdBy.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      Session Code: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{gameSession.code}</span>
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
                      >
                        Submit Score
                      </button>
                    ) : (
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                        <h4 className="text-lg font-medium mb-4">Submit Score</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Winner
                            </label>
                            <select
                              value={scoreFormData.winner}
                              onChange={(e) => setScoreFormData(prev => ({ ...prev, winner: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="">Select winner</option>
                              {gameSession.participants.map((p) => (
                                <option key={p.user.id} value={p.user.id}>
                                  {p.user.username || p.user.email}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Scores
                            </label>
                            <div className="space-y-2">
                              {gameSession.participants.map((p) => (
                                <div key={p.user.id} className="flex items-center space-x-3">
                                  <span className="w-32 text-sm">
                                    {p.user.username || p.user.email}
                                  </span>
                                  <input
                                    type="number"
                                    value={scoreFormData.scores[p.user.id] || 0}
                                    onChange={(e) => updateScore(p.user.id, parseInt(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes (optional)
                            </label>
                            <textarea
                              value={scoreFormData.notes}
                              onChange={(e) => setScoreFormData(prev => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Add any notes about the game..."
                            />
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={submitScore}
                              disabled={isSubmittingScore || !scoreFormData.winner}
                              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              {isSubmittingScore ? 'Submitting...' : 'Submit Score'}
                            </button>
                            <button
                              onClick={() => setShowScoreForm(false)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
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
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="text-lg font-medium mb-2">Score Pending Approval</h4>
                    <p className="text-sm text-gray-600 mb-3">
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
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-medium">Game Result</h4>
                      {getStatusBadge(gameSession.result.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Submitted on: {new Date(gameSession.result.createdAt).toLocaleString()}</p>
                      {gameSession.result.approvedById && (
                        <p>Last updated: {new Date(gameSession.result.updatedAt).toLocaleString()}</p>
                      )}
                    </div>
                    {gameSession.result.scoreData && (
                      <div className="mt-3">
                        <h5 className="font-medium mb-2">Score Details:</h5>
                        <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                          {JSON.stringify(gameSession.result.scoreData, null, 2)}
                        </pre>
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
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Share Session</h3>
                <div className="text-center">
                  <img
                    src={generateQRCodeUrl(gameSession.code)}
                    alt="Session QR Code"
                    className="mx-auto border rounded-lg mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Scan to join session
                  </p>
                  <div className="mt-4">
                    <input
                      type="text"
                      value={`${window.location.origin}/session/${gameSession.code}`}
                      readOnly
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {isCreator && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Session Controls</h3>
                  <div className="space-y-2">
                    <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                      End Session
                    </button>
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                      Delete Session
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