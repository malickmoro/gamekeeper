export const HOURS_24 = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export function getHoursElapsed(startDate: Date | string): number {
  const start = new Date(startDate)
  const now = new Date()
  return (now.getTime() - start.getTime()) / (1000 * 60 * 60)
}

export function shouldAutoApprove(createdAt: Date | string): boolean {
  return getHoursElapsed(createdAt) >= 24
}

export function shouldAutoVoid(createdAt: Date | string): boolean {
  return getHoursElapsed(createdAt) >= 24
}

export function formatTimeElapsed(hours: number): string {
  if (hours < 1) {
    const minutes = Math.floor(hours * 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  if (hours < 24) {
    const roundedHours = Math.floor(hours * 10) / 10
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = Math.floor(hours % 24)
  
  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  
  return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
}

export function getStatusWithTimeLogic(
  sessionCreatedAt: Date | string,
  result: { status: string; createdAt: Date | string } | null,
  isActive: boolean
): string {
  const hoursElapsed = getHoursElapsed(sessionCreatedAt)
  
  // If there's a result
  if (result) {
    if (result.status === 'PENDING' && shouldAutoApprove(result.createdAt)) {
      return 'APPROVED' // Auto-approved
    }
    return result.status
  }
  
  // If no result and session should be voided
  if (shouldAutoVoid(sessionCreatedAt) && isActive) {
    return 'VOID'
  }
  
  // Default status
  return isActive ? 'ACTIVE' : 'INACTIVE'
} 