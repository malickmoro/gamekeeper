import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          select: {
            id: true,
            email: true,
            username: true,
            password: true,
            hasCompletedOnboarding: true,
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.username = user.username
        token.hasCompletedOnboarding = user.hasCompletedOnboarding
      }
      
      // Refresh user data from database when session is updated
      if (trigger === "update" || (token.sub && !token.hasCompletedOnboarding)) {
        try {
          const refreshedUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              username: true,
              hasCompletedOnboarding: true,
            }
          })
          
          if (refreshedUser) {
            token.username = refreshedUser.username
            token.hasCompletedOnboarding = refreshedUser.hasCompletedOnboarding
          }
        } catch (error) {
          console.error("Error refreshing user data:", error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.username = token.username
        session.user.hasCompletedOnboarding = token.hasCompletedOnboarding
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
} 