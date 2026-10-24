import { z } from "zod";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/games/trivia";

const techniqueIdSchema = z.string().trim().min(1).max(64);

export const questionInputSchema = z
  .object({
    techniqueId: techniqueIdSchema,
    questionId: z.string().trim().min(1).max(64).optional(),
    prompt: z
      .string()
      .trim()
      .min(10, "El enunciado es demasiado corto")
      .max(500, "El enunciado es demasiado largo"),
    options: z
      .array(z.string().trim().min(1, "Completá todas las opciones").max(300))
      .min(MIN_OPTIONS, "La pregunta necesita al menos dos opciones")
      .max(MAX_OPTIONS, "La pregunta admite hasta seis opciones"),
    correctIdx: z.coerce.number().int().min(0, "Elegí la opción correcta"),
    explanation: z
      .string()
      .trim()
      .min(10, "La explicación es obligatoria")
      .max(2000, "La explicación es demasiado larga"),
    reviewed: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.correctIdx >= value.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["correctIdx"],
        message: "La opción correcta no existe entre las opciones cargadas.",
      });
    }

    const normalized = value.options.map((option) => option.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "No repitas opciones en la misma pregunta.",
      });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export const questionIdSchema = z.object({
  techniqueId: techniqueIdSchema,
  questionId: z.string().trim().min(1).max(64),
});

export const triviaSubmissionSchema = z.object({
  techniqueSlug: z.string().trim().min(1).max(80),
  seed: z.string().trim().min(1).max(100),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(64),
        chosenIdx: z.number().int().min(0).max(MAX_OPTIONS - 1),
      }),
    )
    .min(1)
    .max(50),
});

export type TriviaSubmission = z.infer<typeof triviaSubmissionSchema>;
