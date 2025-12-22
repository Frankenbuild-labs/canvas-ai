import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { SupabaseAdapter } from "@next-auth/supabase-adapter"
import { supabaseAdmin } from "./supabaseClient"
import { DatabaseService } from "./database"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ""

const isDev = process.env.NODE_ENV === "development"

export const authOptions: AuthOptions = {
  adapter: SupabaseAdapter({ url: SUPABASE_URL, secret: SUPABASE_SERVICE_ROLE_KEY }),
  providers: isDev
    ? [
        CredentialsProvider({
          name: "EmailDev",
          credentials: {
            email: { label: "Email", type: "text" },
          },
          async authorize(credentials) {
            const email = credentials?.email
            if (!email) return null
            const id = await DatabaseService.getOrCreateUserByEmail(email)
            return { id, email }
          },
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as any).id) token.sub = (user as any).id
      return token
    },
    async session({ session, token }) {
      if (token?.sub) (session as any).user = { id: token.sub }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.TOKEN_ENCRYPTION_KEY,
}

export default authOptions
