'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserSettings {
  id: string
  email: string
  username: string
  isPrivate: boolean
  hasCompletedOnboarding: boolean
  createdAt: string
  updatedAt: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
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

    fetchSettings()
  }, [session, status, router])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/settings')
      
      if (response.ok) {
        const data = await response.json()
        setUserSettings(data.user)
      } else {
        setError('Failed to load settings')
      }
    } catch (error) {
      setError('An error occurred while loading settings')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePrivacySetting = async (isPrivate: boolean) => {
    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPrivate }),
      })

      const data = await response.json()

      if (response.ok) {
        setUserSettings(data.user)
        setSuccessMessage('Privacy setting updated successfully!')
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to update settings')
      }
    } catch (error) {
      setError('An error occurred while updating settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrivacyToggle = () => {
    if (userSettings && !isSaving) {
      updatePrivacySetting(!userSettings.isPrivate)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session || !userSettings) {
    return null
  }

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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 text-sm sm:text-base truncate">
                {session.user.username || session.user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
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

          {/* Profile Information */}
          <div className="bg-white shadow rounded-lg mb-4 sm:mb-6">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 text-sm text-gray-900">{userSettings.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <div className="mt-1 text-sm text-gray-900">{userSettings.username}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Since</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(userSettings.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(userSettings.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Privacy Settings</h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">Private Profile</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, your gaming sessions and statistics will be hidden from other users. 
                    Only you and session participants will be able to see your activity.
                  </p>
                </div>
                <div className="sm:ml-6 flex justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handlePrivacyToggle}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      userSettings.isPrivate ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={userSettings.isPrivate}
                  >
                    <span className="sr-only">Toggle private profile</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        userSettings.isPrivate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {isSaving && (
                <div className="mt-4 text-sm text-gray-500">
                  Updating privacy setting...
                </div>
              )}

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900">What does this mean?</h4>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• <strong>Public Profile:</strong> Other users can see your username and session history</li>
                  <li>• <strong>Private Profile:</strong> Your profile is hidden from other users outside of active sessions</li>
                  <li>• Session participants can always see your username during active games</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Account Actions</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Change Password
                  </button>
                  <p className="text-sm text-gray-500 mt-1">Update your account password</p>
                </div>
                <div>
                  <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Export Data
                  </button>
                  <p className="text-sm text-gray-500 mt-1">Download a copy of your session data</p>
                </div>
                <div>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Delete Account
                  </button>
                  <p className="text-sm text-gray-500 mt-1">Permanently delete your account and all data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 