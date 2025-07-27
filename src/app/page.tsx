'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/QRScanner'

interface Game {
  id: string
  name: string
  isActive: boolean
}

interface GameSession {
  id: string
  code: string
  game: {
    name: string
  }
  participants: {
    user: {
      username: string
      email: string
    }
  }[]
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [createdSession, setCreatedSession] = useState<GameSession | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user && !session.user.hasCompletedOnboarding) {
      router.push('/auth/onboard')
      return
    }

    fetchGames()
  }, [session, status, router])

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      const data = await response.json()
      if (response.ok) {
        setGames(data.games)
        if (data.games.length > 0) {
          setSelectedGameId(data.games[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch games:', error)
    }
  }

  const createSession = async () => {
    if (!selectedGameId) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId: selectedGameId }),
      })

      const data = await response.json()
      if (response.ok) {
        setCreatedSession(data.session)
      } else {
        console.error('Failed to create session:', data.error)
      }
    } catch (error) {
      console.error('An error occurred while creating session:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const joinSession = async () => {
    if (!joinCode.trim()) return
    await joinSessionWithCode(joinCode.trim())
  }

  const generateQRCodeUrl = (sessionCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/session/${sessionCode}`)}`
  }

  const handleQRScan = (scannedCode: string) => {
    setJoinCode(scannedCode)
    setShowQRScanner(false)
    joinSessionWithCode(scannedCode)
  }

  const joinSessionWithCode = async (code: string) => {
    setIsJoining(true)
    try {
      const response = await fetch(`/api/session/${code}/join`, {
        method: 'POST',
      })

      const data = await response.json()
      if (response.ok) {
        router.push(`/session/${code}`)
      } else {
        console.error('Failed to join session:', data.error)
        alert(data.error || 'Failed to join session')
      }
    } catch (error) {
      console.error('An error occurred while joining session:', error)
      alert('An error occurred while joining session')
    } finally {
      setIsJoining(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading GameKeeper...</p>
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">GK</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  GameKeeper
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </a>
                
                <a
                  href={`/profile/${session.user.username || session.user.email?.split('@')[0]}`}
                  className="p-2 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                  title="My Profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
        {createdSession ? (
          /* Session Created View */
          <div className="max-w-2xl mx-auto">
            <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Session Created!</h2>
                <p className="text-purple-200">Share this code with your friends to start gaming</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">{createdSession.game.name}</h3>
                  <div className="text-3xl font-mono font-bold text-purple-400 tracking-wider bg-gray-900/50 rounded-lg py-3 px-6">
                    {createdSession.code}
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <img
                    src={generateQRCodeUrl(createdSession.code)}
                    alt="Session QR Code"
                    className="border-2 border-purple-500/30 rounded-xl w-32 h-32 sm:w-40 sm:h-40"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push(`/session/${createdSession.code}`)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Enter Session
                </button>
                <button
                  onClick={() => setCreatedSession(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  Create Another
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Interface - Create or Join Session */
          <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    activeTab === 'create'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
                  }`}
                >
                  Create Session
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
                  }`}
                >
                  Join Session
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Session */}
              {activeTab === 'create' && (
                <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Create New Session</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-purple-200 mb-3">
                        Choose Your Game
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {games.map((game) => (
                          <button
                            key={game.id}
                            onClick={() => setSelectedGameId(game.id)}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                              selectedGameId === game.id
                                ? 'border-purple-500 bg-purple-500/20 text-white'
                                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/10'
                            }`}
                          >
                            <div className="font-semibold">{game.name}</div>
                            <div className="text-sm opacity-75">Ready to play</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={createSession}
                      disabled={isCreating || !selectedGameId}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                    >
                      {isCreating ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Creating Session...</span>
                        </div>
                      ) : (
                        'Launch Session'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Join Session */}
              {activeTab === 'join' && (
                <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Join Session</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-purple-200 mb-3">
                        Enter Session Code
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="flex-1 bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                          maxLength={6}
                        />
                        <button
                          onClick={() => setShowQRScanner(true)}
                          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105"
                          title="Scan QR Code"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={joinSession}
                      disabled={isJoining || !joinCode.trim()}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                    >
                      {isJoining ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Joining Session...</span>
                        </div>
                      ) : (
                        'Join Session'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  )
}
