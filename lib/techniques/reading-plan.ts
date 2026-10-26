/**
 * Plan de lectura guiada por fases.
 *
 * El contenido clínico sigue siendo el documento oficial. Las fases, los
 * objetivos didácticos y los checkpoints son una capa de interacción derivada
 * de los 29 pasos y del check list: no agregan información clínica nueva.
 *
 * TODO(enfermería): validar los cortes de fase, los enunciados de los
 * checkpoints y las opciones. Mientras tanto quedan marcados como revisables.
 */

export type PhaseTone = "navy" | "sky" | "bordo" | "amber" | "emerald";

export type PhaseIcon = "clipboard" | "users" | "syringe" | "link" | "check";

export type ReadingCheckpoint = {
  id: string;
  /** Orden 0-based del paso después del cual aparece el checkpoint. */
  afterStep: number;
  /** Paso 1-based que se cita en la explicación. */
  sourceStep: number;
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
};

export type ReadingPhase = {
  id: string;
  title: string;
  shortTitle: string;
  goal: string;
  icon: PhaseIcon;
  tone: PhaseTone;
  /** Rango 0-based, inclusivo en ambos extremos. */
  from: number;
  to: number;
  checkpoints: ReadingCheckpoint[];
};

export type ReadingPlan = {
  phases: ReadingPhase[];
  totalSteps: number;
  checkpointCount: number;
  specific: boolean;
};

const VIA_PERIFERICA_PHASES: ReadingPhase[] = [
  {
    id: "preparacion",
    title: "Antes de entrar",
    shortTitle: "Preparación",
    goal: "Dejá la bandeja y el equipo listos antes de entrar a la unidad.",
    icon: "clipboard",
    tone: "navy",
    from: 0,
    to: 7,
    checkpoints: [
      {
        id: "purga",
        afterStep: 7,
        sourceStep: 8,
        question: "Después de purgar la guía, ¿qué hacés con el regulador?",
        options: [
          "Lo dejo abierto para que corra la solución.",
          "Lo cierro y dejo el equipo preparado en la bandeja.",
          "Lo desconecto del suero.",
        ],
        correctIdx: 1,
        explanation:
          "El paso 8 indica purgar, verificar que no haya aire, cerrar el regulador y colocar el equipo preparado en la bandeja.",
      },
    ],
  },
  {
    id: "unidad",
    title: "En la unidad",
    shortTitle: "Identificación",
    goal: "Identificá al paciente, explicá el procedimiento y elegí el sitio.",
    icon: "users",
    tone: "sky",
    from: 8,
    to: 12,
    checkpoints: [
      {
        id: "zonas-contraindicadas",
        afterStep: 12,
        sourceStep: 13,
        question: "¿Qué zonas hay que evitar al valorar los miembros superiores?",
        options: [
          "Fístula arteriovenosa, mastectomía o vaciamiento ganglionar, lesiones y dispositivos previos.",
          "Solo las zonas con vello.",
          "Cualquier vena visible del antebrazo.",
        ],
        correctIdx: 0,
        explanation:
          "El paso 13 pide valorar integridad de la piel, circulación, movilidad, dolor, edema, hematomas, flebitis, infección, fístula arteriovenosa, mastectomía o vaciamiento ganglionar, lesiones y dispositivos previos, y evitar las zonas contraindicadas.",
      },
    ],
  },
  {
    id: "puncion",
    title: "La punción",
    shortTitle: "Punción",
    goal: "Realizá la punción con técnica aséptica y verificá el retorno.",
    icon: "syringe",
    tone: "bordo",
    from: 13,
    to: 21,
    checkpoints: [
      {
        id: "antisepsia",
        afterStep: 16,
        sourceStep: 17,
        question: "Después de aplicar el antiséptico, ¿qué NO se debe hacer?",
        options: [
          "Esperar que seque por completo.",
          "Soplar, abanicar o volver a palpar la zona.",
          "Respetar el tiempo de contacto.",
        ],
        correctIdx: 1,
        explanation:
          "El paso 17 indica respetar el tiempo de contacto y dejar secar por completo. No se debe soplar, abanicar ni volver a palpar la zona.",
      },
      {
        id: "retorno",
        afterStep: 19,
        sourceStep: 20,
        question:
          "Si no hay retorno sanguíneo, ¿se puede reintroducir la aguja dentro del catéter?",
        options: [
          "Sí, para buscar la vena.",
          "No: no se reintroduce ni se avanza la aguja dentro del catéter.",
          "Solo si el catéter es calibre 24.",
        ],
        correctIdx: 1,
        explanation:
          "El paso 20 es explícito: no reintroducir ni avanzar la aguja dentro del catéter.",
      },
      {
        id: "descarte-aguja",
        afterStep: 21,
        sourceStep: 22,
        question: "¿Cómo se descarta la aguja recta?",
        options: [
          "Reencapuchándola para no lastimarse.",
          "De inmediato, sin reencapuchar, en el contenedor de punzocortantes.",
          "Dejándola en la bandeja hasta el final.",
        ],
        correctIdx: 1,
        explanation:
          "El paso 22 indica retirar la aguja recta y desecharla de inmediato, sin reencapuchar, en el contenedor de punzocortantes.",
      },
    ],
  },
  {
    id: "conexion",
    title: "Conexión y fijación",
    shortTitle: "Fijación",
    goal: "Conectá, fijá y asegurá la permeabilidad del acceso.",
    icon: "link",
    tone: "amber",
    from: 22,
    to: 24,
    checkpoints: [
      {
        id: "fijacion",
        afterStep: 23,
        sourceStep: 24,
        question: "¿Con qué se fija el catéter?",
        options: [
          "Con cinta adhesiva común.",
          "Con Tegaderm o gasa estéril y cintas, según el protocolo institucional.",
          "No hace falta fijarlo si la vía está permeable.",
        ],
        correctIdx: 1,
        explanation:
          "El paso 24 indica fijar con Tegaderm o gasa estéril y cintas según el protocolo de la institución.",
      },
    ],
  },
  {
    id: "cierre",
    title: "Control y registro",
    shortTitle: "Cierre",
    goal: "Regulá, educá y registrá la intervención.",
    icon: "check",
    tone: "emerald",
    from: 25,
    to: 28,
    checkpoints: [
      {
        id: "velocidad",
        afterStep: 25,
        sourceStep: 26,
        question: "¿Cómo se regula la velocidad prescrita?",
        options: [
          "Abriendo el regulador al máximo.",
          "Contando las gotas durante un minuto con reloj o configurando la bomba de infusión.",
          "Calculando a ojo según el tamaño de la vena.",
        ],
        correctIdx: 1,
        explanation:
          "El paso 26 indica contar las gotas durante un minuto con reloj o configurar la bomba de infusión si corresponde, y comprobar el factor de goteo del equipo.",
      },
    ],
  },
];

/** Plan genérico para técnicas que todavía no tienen fases propias. */
function genericPlan(totalSteps: number): ReadingPlan {
  const safeTotal = Math.max(1, totalSteps);
  return {
    phases: [
      {
        id: "tecnica",
        title: "Técnica completa",
        shortTitle: "Técnica",
        goal: "Recorré los pasos de la técnica y marcá tu avance.",
        icon: "clipboard",
        tone: "navy",
        from: 0,
        to: safeTotal - 1,
        checkpoints: [],
      },
    ],
    totalSteps: safeTotal,
    checkpointCount: 0,
    specific: false,
  };
}

function clampPhasesToTotal(phases: ReadingPhase[], totalSteps: number): ReadingPhase[] {
  if (totalSteps <= 0) return genericPlan(totalSteps).phases;

  return phases
    .map((phase) => {
      const from = Math.min(phase.from, totalSteps - 1);
      const to = Math.min(phase.to, totalSteps - 1);
      return {
        ...phase,
        from,
        to,
        checkpoints: phase.checkpoints.filter(
          (checkpoint) => checkpoint.afterStep >= from && checkpoint.afterStep <= to,
        ),
      };
    })
    .filter((phase) => phase.from <= phase.to);
}

export function getReadingPlan(slug: string, totalSteps: number): ReadingPlan {
  if (slug !== "via-periferica-adulto") return genericPlan(totalSteps);

  const phases = clampPhasesToTotal(VIA_PERIFERICA_PHASES, totalSteps);
  return {
    phases,
    totalSteps: Math.max(1, totalSteps),
    checkpointCount: phases.reduce((sum, phase) => sum + phase.checkpoints.length, 0),
    specific: true,
  };
}

export function clampPhaseIndex(plan: ReadingPlan, phaseIndex: number): number {
  if (!Number.isFinite(phaseIndex)) return 0;
  return Math.min(Math.max(0, Math.trunc(phaseIndex)), plan.phases.length - 1);
}

export function clampStepToPhase(
  plan: ReadingPlan,
  phaseIndex: number,
  stepIndex: number,
): number {
  const phase = plan.phases[clampPhaseIndex(plan, phaseIndex)] ?? plan.phases[0];
  if (!phase) return 0;
  const safeStep = Number.isFinite(stepIndex) ? Math.trunc(stepIndex) : phase.from;
  return Math.min(Math.max(phase.from, safeStep), phase.to);
}

export function phaseIndexForStep(plan: ReadingPlan, stepIndex: number): number {
  const found = plan.phases.findIndex(
    (phase) => stepIndex >= phase.from && stepIndex <= phase.to,
  );
  return found >= 0 ? found : Math.max(0, plan.phases.length - 1);
}

export function checkpointForStep(
  phase: ReadingPhase,
  stepIndex: number,
): ReadingCheckpoint | null {
  return phase.checkpoints.find((checkpoint) => checkpoint.afterStep === stepIndex) ?? null;
}

export type DailyCheckpoint = {
  checkpoint: ReadingCheckpoint;
  phase: ReadingPhase;
  phaseIndex: number;
};

/** Elige un checkpoint estable para el día, sin azar entre renders. */
export function dailyCheckpoint(plan: ReadingPlan, dateKey: string): DailyCheckpoint | null {
  const entries: DailyCheckpoint[] = plan.phases.flatMap((phase, phaseIndex) =>
    phase.checkpoints.map((checkpoint) => ({ checkpoint, phase, phaseIndex })),
  );

  if (entries.length === 0) return null;

  let hash = 0;
  for (const char of dateKey) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return entries[hash % entries.length] ?? null;
}
