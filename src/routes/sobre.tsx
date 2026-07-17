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
          <h2 className="mb-2 font-display text-base text-foreground">Escuta dicótica</h2>
          <p>
            Dois sons diferentes chegam simultaneamente a cada ouvido. O <span className="text-foreground">corpo caloso</span>{" "}
            precisa transferir a informação entre os hemisférios para que o cérebro identifique e
            separe os dois estímulos. Esse paradigma é usado há décadas para estudar lateralização
            e integração interhemisférica.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-base text-foreground">Memory Sequence</h2>
          <p>
            Repetir sequências crescentes de estímulos visuais e auditivos recruta o{" "}
            <span className="text-foreground">córtex pré-frontal dorsolateral</span> e o{" "}
            <span className="text-foreground">córtex parietal</span>, fundamentais para a memória de
            trabalho. A ligação áudio-visual fortalece circuitos de integração multissensorial.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-base text-foreground">Em breve</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="text-foreground">2048 aritmético</span> — flexibilidade e planejamento.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
