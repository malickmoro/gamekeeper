'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function FriendRequestBadge() {
  const { data: session } = useSession()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (session?.user?.id) {
      fetchPendingCount()
    }
  }, [session])

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/friends/requests')
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.received?.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch pending friend requests:', error)
    }
  }

  if (pendingCount === 0) {
    return null
  }

  return (
    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  )
} 