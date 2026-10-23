import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema } from "@/lib/validation/auth";
import { getHomeForUser } from "@/lib/auth/navigation";
import {
  checkRateLimit,
  clearAllAttempts,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  registerFailedAttempt,
  resetAttempts,
} from "@/lib/auth/rate-limit";
import { generateProvisionalPassword } from "@/lib/auth/password";

describe("loginSchema", () => {
  it("normaliza el email a minúsculas y sin espacios", () => {
    const result = loginSchema.parse({ email: "  Alumno@UNLa.edu.ar ", password: "x" });
    expect(result.email).toBe("alumno@unla.edu.ar");
  });

  it("rechaza un email inválido", () => {
    expect(loginSchema.safeParse({ email: "no-es-email", password: "x" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "Provisoria1",
    newPassword: "NuevaClave123",
    confirmPassword: "NuevaClave123",
  };

  it("acepta una contraseña nueva válida", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("exige al menos 8 caracteres", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "corta",
      confirmPassword: "corta",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza que la nueva sea igual a la actual", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "Provisoria1",
      confirmPassword: "Provisoria1",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza confirmaciones distintas", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: "OtraClave123",
    });
    expect(result.success).toBe(false);
  });
});

describe("getHomeForUser", () => {
  it("manda a cambiar la contraseña si es obligatorio", () => {
    expect(getHomeForUser("ADMIN", true)).toBe("/cambiar-password");
    expect(getHomeForUser("STUDENT", true)).toBe("/cambiar-password");
  });

  it("manda al admin a estudiantes y al estudiante al inicio", () => {
    expect(getHomeForUser("ADMIN", false)).toBe("/admin/estudiantes");
    expect(getHomeForUser("STUDENT", false)).toBe("/inicio");
  });
});

describe("rate limit de login", () => {
  it("permite los primeros intentos y bloquea al superar el máximo", () => {
    clearAllAttempts();
    const now = 1_000_000;

    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      expect(checkRateLimit("a@b.com|ip", now).allowed).toBe(true);
      registerFailedAttempt("a@b.com|ip", now);
    }

    expect(checkRateLimit("a@b.com|ip", now).allowed).toBe(false);
  });

  it("vuelve a permitir cuando expira la ventana", () => {
    clearAllAttempts();
    const now = 1_000_000;

    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      registerFailedAttempt("a@b.com|ip", now);
    }
    expect(checkRateLimit("a@b.com|ip", now).allowed).toBe(false);
    expect(checkRateLimit("a@b.com|ip", now + LOGIN_WINDOW_MS + 1).allowed).toBe(true);
  });

  it("reinicia el contador tras un login exitoso", () => {
    clearAllAttempts();
    const now = 1_000_000;
    registerFailedAttempt("a@b.com|ip", now);
    resetAttempts("a@b.com|ip");
    expect(checkRateLimit("a@b.com|ip", now).remaining).toBe(LOGIN_MAX_ATTEMPTS);
  });
});

describe("generateProvisionalPassword", () => {
  it("genera contraseñas del largo pedido y sin caracteres ambiguos", () => {
    const password = generateProvisionalPassword(12);
    expect(password).toHaveLength(12);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});
