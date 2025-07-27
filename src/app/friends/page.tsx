'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FriendRequest {
  id: string
  status: string
  createdAt: string
  user: {
    id: string
    username: string
    email: string
    isPrivate: boolean
    createdAt: string
  }
}

interface FriendRequestsData {
  received: FriendRequest[]
  sent: FriendRequest[]
}

interface Friend {
  id: string
  username: string
  email: string
  isPrivate: boolean
  createdAt: string
  friendshipDate: string
}

interface SearchResult {
  id: string
  username: string
  email: string
  isPrivate: boolean
  createdAt: string
  friendshipStatus: 'NONE' | 'PENDING' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'REJECTED'
}

type TabType = 'friends' | 'requests' | 'search'

export default function FriendsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('friends')
  const [friendRequests, setFriendRequests] = useState<FriendRequestsData | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isResponding, setIsResponding] = useState(false)

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
      fetchFriendRequests()
      fetchFriends()
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
    setIsSendingRequest(true)
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
      setIsSendingRequest(false)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch('/api/friends/requests')
      const data = await response.json()

      if (response.ok) {
        setFriendRequests(data)
      } else {
        setError(data.error || 'Failed to load friend requests')
      }
    } catch (error) {
      setError('An error occurred while loading friend requests')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends/list')
      const data = await response.json()

      if (response.ok) {
        setFriends(data.friends || [])
      } else {
        console.error('Failed to load friends:', data.error)
      }
    } catch (error) {
      console.error('An error occurred while loading friends:', error)
    }
  }

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setIsResponding(true)
    setError('')

    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, action }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Friend request ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`)
        fetchFriendRequests() // Refresh the requests list
        if (action === 'accept') {
          fetchFriends() // Refresh the friends list when accepting
        }
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(data.error || `Failed to ${action} friend request`)
      }
    } catch (error) {
      setError(`An error occurred while ${action}ing the friend request`)
    } finally {
      setIsResponding(false)
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

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      ACCEPTED: 'bg-green-500/20 text-green-300 border-green-500/30',
      REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30'
    }
    
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
        {status}
      </span>
    )
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
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'PENDING_RECEIVED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'ACCEPTED':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  }

  const isActionDisabled = (status: string) => {
    return status !== 'NONE' || isSendingRequest
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading friends...</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Friends
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
        {/* Messages */}
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
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              My Friends
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              Friend Requests
              {friendRequests?.received && friendRequests.received.length > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {friendRequests.received.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              Find Friends
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p className="text-purple-200 text-lg">Loading friends...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-500/20">
                  <h2 className="text-xl font-bold text-white">
                    My Friends ({friends.length})
                  </h2>
                </div>
                
                {friends.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-gray-400 mb-6">
                      <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">No Friends Yet</h3>
                    <p className="text-gray-300 mb-6">
                      Start by searching for friends and sending them friend requests.
                    </p>
                    <button
                      onClick={() => setActiveTab('search')}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      Find Friends
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-purple-500/20">
                    {friends.map((friend) => (
                      <div key={friend.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {friend.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-white">
                                {friend.username}
                              </div>
                              <div className="text-gray-300 text-sm">
                                {friend.email}
                              </div>
                              <div className="flex items-center space-x-3 mt-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                                  friend.isPrivate 
                                    ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                                    : 'bg-green-500/20 text-green-300 border-green-500/30'
                                }`}>
                                  {friend.isPrivate ? 'Private Profile' : 'Public Profile'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  Friends since {formatDate(friend.friendshipDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            {!friend.isPrivate && (
                              <Link
                                href={`/profile/${friend.username}`}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105"
                              >
                                View Profile
                              </Link>
                            )}
                            <span className="inline-flex items-center px-4 py-2 text-sm font-semibold text-green-300 bg-green-500/20 border border-green-500/30 rounded-xl">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Friends
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-8">
                {/* Received Friend Requests */}
                <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-xl font-bold text-white">
                      Received Requests ({friendRequests?.received.length || 0})
                    </h2>
                  </div>
                  
                  {friendRequests?.received.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="text-gray-400 mb-4">No pending friend requests</div>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
                      >
                        Find friends to connect with
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-purple-500/20">
                      {friendRequests?.received.map((request) => (
                        <div key={request.id} className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {request.user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-white">
                                  {request.user.username}
                                </div>
                                <div className="text-gray-300 text-sm">
                                  {request.user.email}
                                </div>
                                <div className="flex items-center space-x-3 mt-2">
                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                                    request.user.isPrivate 
                                      ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                                      : 'bg-green-500/20 text-green-300 border-green-500/30'
                                  }`}>
                                    {request.user.isPrivate ? 'Private Profile' : 'Public Profile'}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {formatDate(request.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-3">
                              {!request.user.isPrivate && (
                                <Link
                                  href={`/profile/${request.user.username}`}
                                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                                >
                                  View Profile
                                </Link>
                              )}
                              <button
                                onClick={() => respondToRequest(request.id, 'accept')}
                                disabled={isResponding}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed"
                              >
                                {isResponding ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                onClick={() => respondToRequest(request.id, 'reject')}
                                disabled={isResponding}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed"
                              >
                                {isResponding ? 'Rejecting...' : 'Reject'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sent Friend Requests */}
                <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-xl font-bold text-white">
                      Sent Requests ({friendRequests?.sent.length || 0})
                    </h2>
                  </div>
                  
                  {friendRequests?.sent.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="text-gray-400">No sent friend requests</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-purple-500/20">
                      {friendRequests?.sent.map((request) => (
                        <div key={request.id} className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {request.user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-white">
                                  {request.user.username}
                                </div>
                                <div className="text-gray-300 text-sm">
                                  {request.user.email}
                                </div>
                                <div className="flex items-center space-x-3 mt-2">
                                  {getStatusBadge(request.status)}
                                  <span className="text-xs text-gray-400">
                                    {formatDate(request.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-3">
                              {!request.user.isPrivate && (
                                <Link
                                  href={`/profile/${request.user.username}`}
                                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                                >
                                  View Profile
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-8">
                {/* Search Form */}
                <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Search Users</h2>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by username or email..."
                      className="flex-1 bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-purple-500/20">
                      <h3 className="text-xl font-bold text-white">
                        Search Results ({searchResults.length})
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-purple-500/20">
                      {searchResults.map((user) => (
                        <div key={user.id} className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {(user.username || user.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-white">
                                  {user.username || 'No username'}
                                </div>
                                <div className="text-gray-300 text-sm">
                                  {user.email}
                                </div>
                                <div className="flex items-center space-x-3 mt-2">
                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                                    user.isPrivate 
                                      ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                                      : 'bg-green-500/20 text-green-300 border-green-500/30'
                                  }`}>
                                    {user.isPrivate ? 'Private Profile' : 'Public Profile'}
                                  </span>
                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getFriendshipStatusColor(user.friendshipStatus)}`}>
                                    {getFriendshipStatusText(user.friendshipStatus)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-3">
                              {!user.isPrivate && (
                                <Link
                                  href={`/profile/${user.username}`}
                                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                                >
                                  View Profile
                                </Link>
                              )}
                              <button
                                onClick={() => sendFriendRequest(user.id)}
                                disabled={isActionDisabled(user.friendshipStatus)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                  isActionDisabled(user.friendshipStatus)
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transform hover:scale-105'
                                }`}
                              >
                                {isSendingRequest ? 'Sending...' : getFriendshipStatusText(user.friendshipStatus)}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="bg-black/30 backdrop-blur-lg border border-purple-500/20 rounded-2xl p-12 text-center">
                    <h3 className="text-xl font-bold text-white mb-3">No Users Found</h3>
                    <p className="text-gray-300">
                      No users found matching "{searchQuery}". Try a different search term.
                    </p>
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