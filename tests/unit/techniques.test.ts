import { describe, expect, it } from "vitest";
import seedData from "../../prisma/seed-data/via-periferica.json";
import { slugify } from "@/lib/techniques/slugify";
import { techniquePayloadSchema, youtubeVideoId, youtubeUrlSchema } from "@/lib/validation/techniques";

describe("slugify", () => {
  it("quita acentos, espacios y mayúsculas", () => {
    expect(slugify("Colocación de Vía Periférica en Adulto")).toBe(
      "colocacion-de-via-periferica-en-adulto",
    );
  });

  it("recorta guiones sobrantes", () => {
    expect(slugify("  --Hola, mundo--  ")).toBe("hola-mundo");
  });
});

describe("youtubeVideoId", () => {
  it("extrae el id de un enlace de YouTube", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=E7rOztgH7Q8")).toBe("E7rOztgH7Q8");
  });

  it("acepta youtu.be, embed y shorts", () => {
    expect(youtubeVideoId("https://youtu.be/E7rOztgH7Q8")).toBe("E7rOztgH7Q8");
    expect(youtubeVideoId("https://www.youtube.com/embed/E7rOztgH7Q8")).toBe("E7rOztgH7Q8");
    expect(youtubeVideoId("https://www.youtube.com/shorts/E7rOztgH7Q8")).toBe("E7rOztgH7Q8");
  });

  it("rechaza dominios y rutas que no son de YouTube", () => {
    expect(youtubeVideoId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/watch?v=")).toBeNull();
    expect(youtubeVideoId("no es una url")).toBeNull();
  });

  it("el schema solo acepta URLs de YouTube", () => {
    expect(youtubeUrlSchema.safeParse("https://vimeo.com/123").success).toBe(false);
    expect(youtubeUrlSchema.safeParse("https://youtu.be/E7rOztgH7Q8").success).toBe(true);
  });
});

describe("seed de vía periférica", () => {
  it("tiene el contenido completo del Apéndice A", () => {
    expect(seedData.steps).toHaveLength(29);
    expect(seedData.materials).toHaveLength(6);
    expect(seedData.checklist).toHaveLength(15);
    expect(seedData.objectives).toHaveLength(3);
    expect(seedData.images).toHaveLength(5);
    expect(seedData.videos).toHaveLength(1);
    expect(seedData.activities).toHaveLength(2);
  });

  it("cumple el schema del editor", () => {
    const payload = {
      title: seedData.title,
      slug: seedData.slug,
      summary: seedData.summary,
      definition: seedData.definition,
      objectives: seedData.objectives,
      materials: seedData.materials,
      steps: seedData.steps.map((step) => ({
        text: step.text,
        emphasis: step.emphasis ?? false,
      })),
      images: seedData.images,
      videos: seedData.videos,
      checklist: seedData.checklist,
    };

    const result = techniquePayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rechaza imágenes sin alt o crédito", () => {
    const result = techniquePayloadSchema.safeParse({
      title: "Técnica de prueba",
      slug: "tecnica-de-prueba",
      definition: "Una definición suficientemente larga para el schema.",
      objectives: [],
      materials: [],
      steps: [{ text: "Un paso", emphasis: false }],
      images: [{ url: "/uploads/foto.jpg", alt: "", credit: "" }],
      videos: [],
      checklist: [],
    });
    expect(result.success).toBe(false);
  });
});
