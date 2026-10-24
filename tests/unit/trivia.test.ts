import { describe, expect, it } from "vitest";
import {
  buildTriviaItem,
  correctTrivia,
  normalizeQuestionCount,
  optionOrder,
  parseOptions,
  questionCountFromConfig,
  scoreTrivia,
  selectTriviaQuestions,
  shuffledCorrectIdx,
  type TriviaQuestionData,
} from "@/lib/games/trivia";
import { questionInputSchema, triviaSubmissionSchema } from "@/lib/validation/trivia";

const questions: TriviaQuestionData[] = Array.from({ length: 14 }, (_, index) => ({
  id: `q-${String(index + 1).padStart(2, "0")}`,
  prompt: `Pregunta ${index + 1}`,
  options: [`A${index + 1}`, `B${index + 1}`, `C${index + 1}`, `D${index + 1}`],
  correctIdx: index % 4,
  explanation: `Explicación ${index + 1}`,
  reviewed: index % 2 === 0,
}));

describe("normalizeQuestionCount", () => {
  it("usa 10 por defecto", () => {
    expect(normalizeQuestionCount(undefined)).toBe(10);
    expect(normalizeQuestionCount("12")).toBe(10);
    expect(normalizeQuestionCount(Number.NaN)).toBe(10);
  });

  it("acota el valor entre 1 y 50", () => {
    expect(normalizeQuestionCount(0)).toBe(1);
    expect(normalizeQuestionCount(7.9)).toBe(7);
    expect(normalizeQuestionCount(500)).toBe(50);
  });

  it("lee config.questionCount sin confiar en la forma", () => {
    expect(questionCountFromConfig({ questionCount: 5 })).toBe(5);
    expect(questionCountFromConfig({ blockSize: 8 })).toBe(10);
    expect(questionCountFromConfig(null)).toBe(10);
    expect(questionCountFromConfig(["10"])).toBe(10);
  });
});

describe("parseOptions", () => {
  it("descarta valores inválidos y limita a seis", () => {
    expect(parseOptions(["uno", 2, "", "dos"])).toEqual(["uno", "dos"]);
    expect(parseOptions(null)).toEqual([]);
    expect(parseOptions(["1", "2", "3", "4", "5", "6", "7"])).toHaveLength(6);
  });
});

describe("selección de preguntas", () => {
  it("elige exactamente la cantidad pedida, sin repetir", () => {
    const selected = selectTriviaQuestions(questions, 10, "semilla-1");
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((question) => question.id)).size).toBe(10);
  });

  it("es determinista y no depende del orden de entrada", () => {
    const first = selectTriviaQuestions(questions, 10, "semilla-1");
    const second = selectTriviaQuestions([...questions].reverse(), 10, "semilla-1");
    expect(second.map((question) => question.id)).toEqual(
      first.map((question) => question.id),
    );
  });

  it("cambia la selección con otra semilla", () => {
    const first = selectTriviaQuestions(questions, 10, "semilla-1");
    const second = selectTriviaQuestions(questions, 10, "semilla-2");
    expect(second.map((question) => question.id)).not.toEqual(
      first.map((question) => question.id),
    );
  });

  it("devuelve todo el banco si hay menos preguntas que las pedidas", () => {
    expect(selectTriviaQuestions(questions.slice(0, 3), 10, "x")).toHaveLength(3);
    expect(selectTriviaQuestions([], 10, "x")).toEqual([]);
  });
});

describe("mezcla de opciones", () => {
  it("devuelve una permutación de todos los índices", () => {
    const order = optionOrder("q-01", 4, "semilla");
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it("es determinista y distinta por pregunta", () => {
    expect(optionOrder("q-01", 4, "semilla")).toEqual(optionOrder("q-01", 4, "semilla"));
    expect(optionOrder("q-01", 4, "semilla")).not.toEqual(optionOrder("q-02", 4, "semilla"));
  });

  it("ubica la opción correcta en la posición mezclada", () => {
    const question = questions[0]!;
    const order = optionOrder(question.id, question.options.length, "semilla");
    expect(shuffledCorrectIdx(question, "semilla")).toBe(
      order.indexOf(question.correctIdx),
    );
  });

  it("la vista pública no incluye respuesta ni explicación", () => {
    const item = buildTriviaItem(questions[0]!, "semilla");
    expect(Object.keys(item).sort()).toEqual(["id", "options", "prompt", "reviewed"]);
    expect(item.options).toEqual(
      optionOrder(questions[0]!.id, 4, "semilla").map(
        (index) => questions[0]!.options[index],
      ),
    );
  });

  it("falla si el índice correcto guardado es inválido", () => {
    const broken = { ...questions[0]!, correctIdx: 9 };
    expect(() => buildTriviaItem(broken, "semilla")).toThrow(/índice correcto inválido/);
  });
});

describe("puntaje", () => {
  it("calcula el porcentaje redondeado", () => {
    expect(scoreTrivia(10, 10)).toBe(100);
    expect(scoreTrivia(7, 10)).toBe(70);
    expect(scoreTrivia(6, 10)).toBe(60);
    expect(scoreTrivia(1, 3)).toBe(33);
    expect(scoreTrivia(0, 0)).toBe(0);
  });

  it("acota valores fuera de rango", () => {
    expect(scoreTrivia(-2, 10)).toBe(0);
    expect(scoreTrivia(15, 10)).toBe(100);
  });
});

describe("corrección", () => {
  it("marca correctas e incorrectas y devuelve la explicación", () => {
    const selected = selectTriviaQuestions(questions, 3, "semilla");
    const answers = selected.map((question) => ({
      questionId: question.id,
      chosenIdx: shuffledCorrectIdx(question, "semilla"),
    }));
    const wrongIdx = (shuffledCorrectIdx(selected[1]!, "semilla") + 1) % 4;
    answers[1] = { questionId: selected[1]!.id, chosenIdx: wrongIdx };

    const corrections = correctTrivia(selected, answers, "semilla");
    expect(corrections).toHaveLength(3);
    expect(corrections[0]?.correct).toBe(true);
    expect(corrections[0]?.item.explanation).toContain("Explicación");
    expect(corrections[1]?.correct).toBe(false);
    expect(corrections[1]?.item.chosenIdx).toBe(wrongIdx);
  });

  it("considera incorrecta una respuesta faltante", () => {
    const selected = selectTriviaQuestions(questions, 2, "semilla");
    const corrections = correctTrivia(selected, [], "semilla");
    expect(corrections.every((correction) => correction.correct === false)).toBe(true);
    expect(corrections[0]?.item.chosenIdx).toBe(-1);
  });
});

describe("validación de preguntas del admin", () => {
  const valid = {
    techniqueId: "tec-1",
    prompt: "¿Cuál es la opción correcta?",
    options: ["Uno", "Dos", "Tres"],
    correctIdx: 1,
    explanation: "La opción dos es la correcta.",
    reviewed: false,
    active: true,
  };

  it("acepta una pregunta completa", () => {
    expect(questionInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza opciones repetidas y respuestas fuera de rango", () => {
    const repeated = questionInputSchema.safeParse({
      ...valid,
      options: ["Uno", "uno"],
    });
    expect(repeated.success).toBe(false);

    const outOfRange = questionInputSchema.safeParse({ ...valid, correctIdx: 5 });
    expect(outOfRange.success).toBe(false);
  });

  it("exige al menos dos opciones y una explicación", () => {
    expect(questionInputSchema.safeParse({ ...valid, options: ["Uno"] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...valid, explanation: "corta" }).success).toBe(
      false,
    );
  });

  it("valida el envío de la trivia", () => {
    expect(
      triviaSubmissionSchema.safeParse({
        techniqueSlug: "via-periferica-adulto",
        seed: "semilla",
        answers: [{ questionId: "q-1", chosenIdx: 2 }],
      }).success,
    ).toBe(true);

    expect(
      triviaSubmissionSchema.safeParse({
        techniqueSlug: "via-periferica-adulto",
        seed: "semilla",
        answers: [{ questionId: "q-1", chosenIdx: 9 }],
      }).success,
    ).toBe(false);
  });
});
