'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  id: string
  username: string
  email: string
  isPrivate: boolean
  createdAt: string
  friendshipStatus: 'NONE' | 'PENDING' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'REJECTED'
}

export default function SearchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user && !session.user.hasCompletedOnboarding) {
      router.push('/auth/onboard')
      return
    }
  }, [session, status, router])

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters long')
      return
    }

    setIsSearching(true)
    setError('')

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.users)
      } else {
        setError(data.error || 'Failed to search users')
      }
    } catch (error) {
      setError('An error occurred while searching')
    } finally {
      setIsSearching(false)
    }
  }

  const sendFriendRequest = async (userId: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toUserId: userId }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Friend request sent successfully!')
        // Update the search results to reflect the new status
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, friendshipStatus: 'PENDING' as const }
              : user
          )
        )
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to send friend request')
      }
    } catch (error) {
      setError('An error occurred while sending friend request')
    } finally {
      setIsLoading(false)
    }
  }

  const getFriendshipStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Request Sent'
      case 'PENDING_RECEIVED':
        return 'Request Received'
      case 'ACCEPTED':
        return 'Friends'
      case 'REJECTED':
        return 'Request Rejected'
      default:
        return 'Add Friend'
    }
  }

  const getFriendshipStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'PENDING_RECEIVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    }
  }

  const isActionDisabled = (status: string) => {
    return status !== 'NONE' || isLoading
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-indigo-600 hover:text-indigo-500 text-sm sm:text-base">
                ← Back to Home
              </Link>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Find Friends</h1>
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
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {/* Search Form */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Search Users</h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or email..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Search Results ({searchResults.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((user) => (
                  <div key={user.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                          {(user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.username || 'No username'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isPrivate 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {user.isPrivate ? 'Private Profile' : 'Public Profile'}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFriendshipStatusColor(user.friendshipStatus)}`}>
                              {getFriendshipStatusText(user.friendshipStatus)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {!user.isPrivate && (
                          <Link
                            href={`/profile/${user.username}`}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                          >
                            View Profile
                          </Link>
                        )}
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          disabled={isActionDisabled(user.friendshipStatus)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${
                            isActionDisabled(user.friendshipStatus)
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isLoading ? 'Sending...' : getFriendshipStatusText(user.friendshipStatus)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Users Found</h3>
              <p className="text-gray-600 dark:text-gray-300">
                No users found matching "{searchQuery}". Try a different search term.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 