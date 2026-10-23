const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Contraseña provisoria legible, sin caracteres ambiguos (0/O, 1/l/I).
 * Usa criptografía del entorno (navegador o Node).
 */
export function generateProvisionalPassword(length = 10): string {
  const values = new Uint32Array(length);
  globalThis.crypto.getRandomValues(values);

  let password = "";
  for (let index = 0; index < length; index += 1) {
    const value = values[index] ?? 0;
    password += ALPHABET.charAt(value % ALPHABET.length);
  }
  return password;
}
