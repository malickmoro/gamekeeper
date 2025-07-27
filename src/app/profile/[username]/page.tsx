'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
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
  draws: number
}

interface ProfileStats {
  totalGames: number
  wins: number
  losses: number
  draws: number
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
    switch (outcome) {
      case 'win':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white border border-green-400/30">
            Win
          </span>
        )
      case 'loss':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-pink-500 text-white border border-red-400/30">
            Loss
          </span>
        )
      case 'draw':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white border border-yellow-400/30">
            Draw
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white border border-gray-400/30">
            Unknown
          </span>
        )
    }
  }

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-400'
    if (winRate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-gaming">
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
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <div className="text-xl text-purple-200">Loading profile...</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-gaming">
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
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Profile</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  if (!profileData) {
    return null
  }

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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                @{profileData.user.username}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {session?.user && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {profileData.user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {profileData.user.username}
              </h2>
              <p className="text-purple-200 mb-3">
                Member since {formatDate(profileData.user.createdAt)}
              </p>
              {profileData.user.isPrivate && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 border border-gray-500/30">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Private Profile
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Private Profile Message */}
        {profileData.isPrivate && profileData.message && (
          <div className="glass-light rounded-2xl p-8 text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-9a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Private Profile</h3>
            <p className="text-purple-200">{profileData.message}</p>
          </div>
        )}

        {/* Stats Section */}
        {profileData.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{profileData.stats.totalGames}</div>
              <div className="text-purple-200 text-sm">Total Games</div>
            </div>
            
            <div className="glass rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{profileData.stats.wins}</div>
              <div className="text-purple-200 text-sm">Wins</div>
            </div>
            
            <div className="glass rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">{profileData.stats.losses}</div>
              <div className="text-purple-200 text-sm">Losses</div>
            </div>
            
            <div className="glass rounded-xl p-6 text-center">
              <div className={`text-3xl font-bold mb-2 ${getWinRateColor(profileData.stats.winRate)}`}>
                {profileData.stats.winRate.toFixed(1)}%
              </div>
              <div className="text-purple-200 text-sm">Win Rate</div>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {profileData.recentSessions && profileData.recentSessions.length > 0 && (
          <div className="glass rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Recent Sessions</h3>
            <div className="space-y-4">
              {profileData.recentSessions.map((session) => (
                <div key={session.id} className="glass-light rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{session.game.name}</h4>
                        <p className="text-purple-200 text-sm">Code: {session.code}</p>
                        <p className="text-purple-300 text-xs">{formatDate(session.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getOutcomeBadge(session.outcome)}
                      <span className="text-purple-200 text-sm">
                        {session.participantCount} players
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {profileData.totalSessions && profileData.totalSessions > profileData.recentSessions.length && (
              <div className="text-center mt-6">
                <p className="text-purple-200">
                  Showing {profileData.recentSessions.length} of {profileData.totalSessions} sessions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {(!profileData.recentSessions || profileData.recentSessions.length === 0) && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Sessions Yet</h3>
            <p className="text-purple-200">This user hasn't participated in any game sessions yet.</p>
          </div>
        )}
      </main>
    </div>
  )
} 