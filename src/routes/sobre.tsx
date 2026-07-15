import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — NeuroTrainer" },
      { name: "description", content: "Como o cálculo mental, memorização e escuta dicótica treinam o cérebro." },
    ],
  }),
  component: Sobre,
});

function Sobre() {
  return (
    <AppShell title="Sobre" back="/">
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 font-display text-lg text-foreground">Por que treinar assim?</h2>
          <p>
            Exercícios cognitivos curtos e desafiadores estimulam a plasticidade neural — a
            capacidade do cérebro de criar e reforçar sinapses. A repetição espaçada com aumento
            gradual de dificuldade é o gatilho mais estudado para neurogênese funcional.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-base text-foreground">Cálculo mental sequencial</h2>
          <p>
            Números aparecendo em ritmo forçado ativam a <span className="text-foreground">memória de trabalho</span>{" "}
            (córtex pré-frontal dorsolateral) e o <span className="text-foreground">sulco intraparietal</span>,
            que representa quantidade. Alternar operações treina flexibilidade cognitiva.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-base text-foreground">Em breve</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="text-foreground">Memorização</span> — buffer fonológico e recall reverso.</li>
            <li><span className="text-foreground">2048 aritmético</span> — flexibilidade e planejamento.</li>
            <li><span className="text-foreground">Escuta dicótica</span> — corpo caloso e integração hemisférica.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
