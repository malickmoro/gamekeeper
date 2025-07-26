'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [createdSession, setCreatedSession] = useState<GameSession | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

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
      if (response.ok) {
        const data = await response.json()
        setGames(data.games)
        if (data.games.length > 0) {
          setSelectedGameId(data.games[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  const createSession = async () => {
    if (!selectedGameId) return

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: selectedGameId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCreatedSession(data.session)
      } else {
        setError(data.error || 'Failed to create session')
      }
    } catch (error) {
      setError('An error occurred while creating the session')
    } finally {
      setIsCreating(false)
    }
  }

  const joinSession = async () => {
    if (!joinCode.trim()) return

    setIsJoining(true)
    setError('')

    try {
      const response = await fetch(`/api/session/${joinCode.trim()}/join`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/session/${joinCode.trim()}`)
      } else {
        setError(data.error || 'Failed to join session')
      }
    } catch (error) {
      setError('An error occurred while joining the session')
    } finally {
      setIsJoining(false)
    }
  }

  const generateQRCodeUrl = (sessionCode: string) => {
    const joinUrl = `${window.location.origin}/session/${sessionCode}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`
  }

  if (status === 'loading') {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">GameKeeper</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/history"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                History
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
              </Link>
              <span className="text-gray-700">
                Welcome, {session.user.username || session.user.email}!
              </span>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {createdSession ? (
            /* Session Created - Show QR Code and Details */
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Session Created! 🎉
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Game: {createdSession.game.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Session Code: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{createdSession.code}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Share this code or QR code with other players to join!
                  </p>
                  <div className="space-y-2">
                    <Link
                      href={`/session/${createdSession.id}`}
                      className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Go to Session
                    </Link>
                    <button
                      onClick={() => setCreatedSession(null)}
                      className="ml-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">QR Code</h4>
                  <img
                    src={generateQRCodeUrl(createdSession.code)}
                    alt="Session QR Code"
                    className="border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Scan to join session
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Main Interface - Create or Join Session */
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Session */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Create New Session
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="game" className="block text-sm font-medium text-gray-700 mb-1">
                      Choose a Game
                    </label>
                    <select
                      id="game"
                      value={selectedGameId}
                      onChange={(e) => setSelectedGameId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={createSession}
                    disabled={isCreating || !selectedGameId}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium"
                  >
                    {isCreating ? 'Creating...' : 'Create Session'}
                  </button>
                </div>
              </div>

              {/* Join Session */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Join Session
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Session Code
                    </label>
                    <input
                      id="joinCode"
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Enter session code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={joinSession}
                    disabled={isJoining || !joinCode.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium"
                  >
                    {isJoining ? 'Joining...' : 'Join Session'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
