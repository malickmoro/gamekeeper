import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      username?: string | null
      hasCompletedOnboarding: boolean
    }
  }

  interface User {
    id: string
    email: string
    username?: string | null
    hasCompletedOnboarding: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null
    hasCompletedOnboarding: boolean
  }
} 