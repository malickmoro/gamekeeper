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

export default function FriendsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [friendRequests, setFriendRequests] = useState<FriendRequestsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
    }
  }, [session, status, router])

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
        fetchFriendRequests() // Refresh the list
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
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
        {status}
      </span>
    )
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Friend Requests</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Link
                href="/search"
                className="text-indigo-600 hover:text-indigo-500 text-sm sm:text-base"
              >
                Find Friends
              </Link>
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

          {isLoading ? (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-xl text-gray-600 dark:text-gray-300">Loading friend requests...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Received Friend Requests */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Received Requests ({friendRequests?.received.length || 0})
                  </h2>
                </div>
                
                {friendRequests?.received.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-gray-500 dark:text-gray-400 mb-2">No pending friend requests</div>
                    <Link
                      href="/search"
                      className="text-indigo-600 hover:text-indigo-500 text-sm"
                    >
                      Find friends to connect with
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {friendRequests?.received.map((request) => (
                      <div key={request.id} className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                              {request.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {request.user.username}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {request.user.email}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  request.user.isPrivate 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {request.user.isPrivate ? 'Private Profile' : 'Public Profile'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(request.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {!request.user.isPrivate && (
                              <Link
                                href={`/profile/${request.user.username}`}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                              >
                                View Profile
                              </Link>
                            )}
                            <button
                              onClick={() => respondToRequest(request.id, 'accept')}
                              disabled={isResponding}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium"
                            >
                              {isResponding ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => respondToRequest(request.id, 'reject')}
                              disabled={isResponding}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium"
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
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Sent Requests ({friendRequests?.sent.length || 0})
                  </h2>
                </div>
                
                {friendRequests?.sent.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-gray-500 dark:text-gray-400">No sent friend requests</div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {friendRequests?.sent.map((request) => (
                      <div key={request.id} className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                              {request.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {request.user.username}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {request.user.email}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {getStatusBadge(request.status)}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(request.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {!request.user.isPrivate && (
                              <Link
                                href={`/profile/${request.user.username}`}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
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
        </div>
      </main>
    </div>
  )
} 