import { describe, expect, it } from "vitest";
import { techniqueUpdateCopy } from "@/lib/notifications/technique-updates";

describe("techniqueUpdateCopy", () => {
  it("arma un aviso con la técnica, la versión y el enlace de relectura", () => {
    const copy = techniqueUpdateCopy({
      id: "tec-1",
      slug: "via-periferica-adulto",
      title: "Colocación de vía periférica en adulto",
      version: 4,
    });

    expect(copy.title).toBe(
      "Nueva versión de Colocación de vía periférica en adulto",
    );
    expect(copy.body).toContain("versión 4");
    expect(copy.href).toBe("/tecnicas/via-periferica-adulto?fase=1&paso=1");
  });
});
