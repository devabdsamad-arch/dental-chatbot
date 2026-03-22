import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// ================================================
// NEXTAUTH CONFIG
// ------------------------------------------------
// Only your email can access the dashboard.
// Anyone else gets rejected at the auth level.
// ================================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      // ⚠️ Only allow your email — reject everyone else
      const allowedEmail = process.env.ADMIN_EMAIL;
      if (!allowedEmail) return false;
      return user.email === allowedEmail;
    },

    async session({ session, token }) {
      return session;
    },
  },

  pages: {
    signIn:  "/login",
    error:   "/login",
  },
});