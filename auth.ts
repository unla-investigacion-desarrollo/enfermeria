import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  checkRateLimit,
  registerFailedAttempt,
  resetAttempts,
} from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

function clientIp(request?: Request): string {
  const forwarded = request?.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "desconocida";
  return request?.headers.get("x-real-ip") ?? "desconocida";
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const rateKey = `${email}|${clientIp(request)}`;

        if (!checkRateLimit(rateKey).allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) {
          registerFailedAttempt(rateKey);
          return null;
        }

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) {
          registerFailedAttempt(rateKey);
          return null;
        }

        resetAttempts(rateKey);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
