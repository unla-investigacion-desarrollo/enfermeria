import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  logger: {
    error(error) {
      // Las credenciales inválidas son parte del flujo normal: no ensuciamos el log.
      if (error.name === "CredentialsSignin") return;
      console.error(error);
    },
  },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role ?? "STUDENT";
        token.mustChangePassword = user.mustChangePassword ?? false;
      }

      if (trigger === "update" && session?.user) {
        const updated = session.user as { mustChangePassword?: boolean };
        if (typeof updated.mustChangePassword === "boolean") {
          token.mustChangePassword = updated.mustChangePassword;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role | undefined) ?? "STUDENT";
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
