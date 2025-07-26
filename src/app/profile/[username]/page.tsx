'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  username: string
  isPrivate: boolean
  createdAt: string
}

interface GameStats {
  total: number
  wins: number
  losses: number
}

interface ProfileStats {
  totalGames: number
  wins: number
  losses: number
  winRate: number
  gameStats: Record<string, GameStats>
}

interface Session {
  id: string
  code: string
  game: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    username: string
  }
  createdAt: string
  participantCount: number
  result: {
    id: string
    status: string
    scoreData: Record<string, unknown>
  } | null
  isCreator: boolean
  outcome: string
}

interface ProfileData {
  user: User
  isPrivate: boolean
  message?: string
  stats?: ProfileStats
  recentSessions?: Session[]
  totalSessions?: number
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const params = useParams()
  const username = params.username as string

  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch(`/api/profile/${username}`)
      const data = await response.json()

      if (response.ok) {
        setProfileData(data)
      } else {
        setError(data.error || 'Failed to load profile')
      }
    } catch {
      setError('An error occurred while loading the profile')
    } finally {
      setIsLoading(false)
    }
  }, [username])

  useEffect(() => {
    if (username) {
      fetchProfile()
    }
  }, [username, fetchProfile])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getOutcomeBadge = (outcome: string) => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-semibold rounded-full"
    
    switch (outcome) {
      case 'WIN':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'LOSS':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'DRAW':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-600'
    if (winRate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-indigo-600 hover:text-indigo-500">
                  ← Back to Home
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-xl text-gray-600">Loading profile...</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-indigo-600 hover:text-indigo-500">
                  ← Back to Home
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!profileData) {
    return null
  }

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
              <h1 className="text-3xl font-bold text-gray-900">
                @{profileData.user.username}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {session?.user && (
                <>
                  <Link
                    href="/settings"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Settings
                  </Link>
                  <span className="text-gray-700">
                    {session.user.username || session.user.email}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Profile Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profileData.user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profileData.user.username}
                  </h2>
                  <p className="text-gray-600">
                    Member since {formatDate(profileData.user.createdAt)}
                  </p>
                  {profileData.user.isPrivate && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 mt-1">
                      Private Profile
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Private Profile Message */}
          {profileData.isPrivate && profileData.message && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-9a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">This profile is private.</h3>
              <p className="text-gray-600">
                This user has chosen to keep their gaming statistics and session history private.
              </p>
            </div>
          )}

          {/* Public Profile Content */}
          {!profileData.isPrivate && profileData.stats && (
            <div className="space-y-6">
              {/* Statistics Overview */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Gaming Statistics</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{profileData.stats.totalGames}</div>
                      <div className="text-sm text-gray-600">Total Games</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{profileData.stats.wins}</div>
                      <div className="text-sm text-gray-600">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{profileData.stats.losses}</div>
                      <div className="text-sm text-gray-600">Losses</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getWinRateColor(profileData.stats.winRate)}`}>
                        {profileData.stats.winRate}%
                      </div>
                      <div className="text-sm text-gray-600">Win Rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Breakdown */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Performance by Game</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {Object.entries(profileData.stats.gameStats).map(([gameName, stats]) => {
                      const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : '0.0'
                      return (
                        <div key={gameName} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {gameName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{gameName}</div>
                              <div className="text-sm text-gray-600">
                                {stats.total} games played
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex space-x-4 text-sm">
                              <span className="text-green-600">{stats.wins}W</span>
                              <span className="text-red-600">{stats.losses}L</span>
                            </div>
                            <div className={`text-sm font-medium ${getWinRateColor(parseFloat(winRate))}`}>
                              {winRate}% win rate
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Sessions */}
              {profileData.recentSessions && profileData.recentSessions.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Recent Sessions ({profileData.recentSessions.length} of {profileData.totalSessions})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {profileData.recentSessions.map((sessionItem) => (
                          <tr key={sessionItem.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                  {sessionItem.game.name.charAt(0)}
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                  {sessionItem.game.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(sessionItem.createdAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sessionItem.participantCount} players
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                sessionItem.isCreator
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {sessionItem.isCreator ? 'Creator' : 'Participant'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={getOutcomeBadge(sessionItem.outcome)}>
                                {sessionItem.outcome}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/session/${sessionItem.id}`}
                                className="text-indigo-600 hover:text-indigo-900"
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

              {/* Empty State for No Sessions */}
              {profileData.recentSessions && profileData.recentSessions.length === 0 && (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Gaming Sessions</h3>
                  <p className="text-gray-600">
                    This user hasn&apos;t participated in any game sessions yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 