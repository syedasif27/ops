import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Single-user mode: only the GitHub username listed in
// ALLOWED_GITHUB_USERNAME is permitted to sign in. Everyone else's
// OAuth callback succeeds at GitHub but is rejected here.
const allowedUsername = process.env.ALLOWED_GITHUB_USERNAME;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!allowedUsername) {
        // No allowlist configured — fail closed rather than open.
        console.error(
          "[auth] ALLOWED_GITHUB_USERNAME is not set; refusing all sign-ins."
        );
        return false;
      }
      const login = (profile as { login?: string } | undefined)?.login;
      return login?.toLowerCase() === allowedUsername.toLowerCase();
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.githubUsername = (profile as { login?: string }).login;
        token.avatarUrl = (profile as { avatar_url?: string }).avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.githubUsername = token.githubUsername as string | undefined;
        session.user.image = (token.avatarUrl as string | undefined) ?? session.user.image;
      }
      return session;
    },
  },
});
