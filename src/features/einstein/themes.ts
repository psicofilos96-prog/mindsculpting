// ── Einstein Logic Module — Hand-crafted Themes ──────────────────────────────
//
// 11 logic puzzles, each fully solved and encoded. Solutions were deduced from
// the clues before encoding so that every clue is consistent with the solution.
//
// Encoding conventions (see types.ts for the data model):
//   • ordinal categories (age, weight, height, year, km, …) set `ordinal: true`
//     and provide `ordValues` aligned 1:1 with `values`.
//   • superlative clues ("o mais velho", "o mais pesado", …) use subject value
//     "max" / "min" in the EntityRef.
//   • "Na terceira posição está X" → type "equality" with `position: 3`
//     (1-indexed). The engine validates that the subject sits at that position.
//   • "está em uma das pontas" → type "end" with no endPosition (either end).
//   • "está exatamente à esquerda" → type "left_of" (immediately left).
//   • "está exatamente à direita" → type "right_of" (immediately right).
//   • "está ao lado de" → type "neighbor" (adjacent, any direction).
//   • "em algum lugar à esquerda/direita de" → type "order" + direction.
//   • "em algum lugar entre A e B, nessa ordem" → type "between" + bounds.
//   • "não tem X" → type "exclusion" with excludedValue.

import type { Theme } from "./types";

export const THEMES: Theme[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // 1. EINSTEIN ORIGINAL (5 houses)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "einstein_original",
    name: "Charada de Einstein",
    description:
      "O charada clássico atribuído a Einstein: 5 casas, 5 nacionalidades, 5 bebidas, 5 cigarros e 5 animais. Quem tem os peixes?",
    numHouses: 5,
    categories: [
      { name: "Cor", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Nacionalidade", values: ["alemão", "dinamarquês", "inglês", "norueguês", "sueco"], ordinal: false },
      { name: "Bebida", values: ["água", "café", "chá", "cerveja", "leite"], ordinal: false },
      { name: "Cigarro", values: ["Blends", "Blue Master", "Dunhill", "Pall Mall", "Prince"], ordinal: false },
      { name: "Animal", values: ["cachorros", "cavalos", "gatos", "pássaros", "peixes"], ordinal: false },
    ],
    clues: [
      { id: "e1", type: "equality", text: "O Inglês vive na casa Vermelha.", subject: { category: "Nacionalidade", value: "inglês" }, object: { category: "Cor", value: "vermelha" } },
      { id: "e2", type: "equality", text: "O Sueco tem Cachorros.", subject: { category: "Nacionalidade", value: "sueco" }, object: { category: "Animal", value: "cachorros" } },
      { id: "e3", type: "equality", text: "O Dinamarquês bebe Chá.", subject: { category: "Nacionalidade", value: "dinamarquês" }, object: { category: "Bebida", value: "chá" } },
      { id: "e4", type: "left_of", text: "A casa Verde fica do lado esquerdo da casa Branca.", subject: { category: "Cor", value: "verde" }, object: { category: "Cor", value: "branca" } },
      { id: "e5", type: "equality", text: "O homem da casa Verde bebe Café.", subject: { category: "Cor", value: "verde" }, object: { category: "Bebida", value: "café" } },
      { id: "e6", type: "equality", text: "O homem que fuma Pall Mall cria Pássaros.", subject: { category: "Cigarro", value: "Pall Mall" }, object: { category: "Animal", value: "pássaros" } },
      { id: "e7", type: "equality", text: "O homem da casa Amarela fuma Dunhill.", subject: { category: "Cor", value: "amarela" }, object: { category: "Cigarro", value: "Dunhill" } },
      { id: "e8", type: "equality", text: "O homem da casa do meio bebe Leite.", subject: { category: "Bebida", value: "leite" }, position: 3 },
      { id: "e9", type: "equality", text: "O Norueguês vive na primeira casa.", subject: { category: "Nacionalidade", value: "norueguês" }, position: 1 },
      { id: "e10", type: "neighbor", text: "O homem que fuma Blends vive ao lado do que tem Gatos.", subject: { category: "Cigarro", value: "Blends" }, object: { category: "Animal", value: "gatos" } },
      { id: "e11", type: "neighbor", text: "O homem que cria Cavalos vive ao lado do que fuma Dunhill.", subject: { category: "Animal", value: "cavalos" }, object: { category: "Cigarro", value: "Dunhill" } },
      { id: "e12", type: "equality", text: "O homem que fuma Blue Master bebe Cerveja.", subject: { category: "Cigarro", value: "Blue Master" }, object: { category: "Bebida", value: "cerveja" } },
      { id: "e13", type: "equality", text: "O Alemão fuma Prince.", subject: { category: "Nacionalidade", value: "alemão" }, object: { category: "Cigarro", value: "Prince" } },
      { id: "e14", type: "neighbor", text: "O Norueguês vive ao lado da casa Azul.", subject: { category: "Nacionalidade", value: "norueguês" }, object: { category: "Cor", value: "azul" } },
      { id: "e15", type: "neighbor", text: "O homem que fuma Blends é vizinho do que bebe Água.", subject: { category: "Cigarro", value: "Blends" }, object: { category: "Bebida", value: "água" } },
    ],
    solution: [
      { Cor: "amarela", Nacionalidade: "norueguês", Bebida: "água", Cigarro: "Dunhill", Animal: "gatos" },
      { Cor: "azul", Nacionalidade: "dinamarquês", Bebida: "chá", Cigarro: "Blends", Animal: "cavalos" },
      { Cor: "vermelha", Nacionalidade: "inglês", Bebida: "leite", Cigarro: "Pall Mall", Animal: "pássaros" },
      { Cor: "verde", Nacionalidade: "alemão", Bebida: "café", Cigarro: "Prince", Animal: "peixes" },
      { Cor: "branca", Nacionalidade: "sueco", Bebida: "cerveja", Cigarro: "Blue Master", Animal: "cachorros" },
    ],
    question: "Quem tem os peixes?",
    answer: "alemão",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 2. ESCRITÓRIO DE ADVOCACIA (5 lawyers)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "escritorio_advocacia",
    name: "Escritório de Advocacia",
    description:
      "Cinco advogados estão sentados lado a lado em uma mesa. Descubra a área, o nome, a bebida, a idade e o carro de cada um.",
    numHouses: 5,
    categories: [
      { name: "Gravata", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Área", values: ["civil", "comercial", "consumidor", "imobiliária", "trabalhista"], ordinal: false },
      { name: "Nome", values: ["Dr. Alberto", "Dr. Carlos", "Dr. Luiz", "Dr. Otávio", "Dr. Ulysses"], ordinal: false },
      { name: "Bebida", values: ["caipirinha", "cosmopolitan", "margarita", "martini", "mojito"], ordinal: false },
      { name: "Idade", values: ["30", "34", "37", "40", "44"], ordinal: true, ordValues: [30, 34, 37, 40, 44] },
      { name: "Carro", values: ["crossover", "hatch", "pickup", "sedan", "SUV"], ordinal: false },
    ],
    clues: [
      { id: "a1", type: "equality", text: "Na primeira posição está o advogado que tem um Crossover.", subject: { category: "Carro", value: "crossover" }, position: 1 },
      { id: "a2", type: "equality", text: "O advogado de 37 anos está na quarta posição.", subject: { category: "Idade", value: "37" }, position: 4 },
      { id: "a3", type: "superlative", text: "O advogado mais novo está na segunda posição.", subject: { category: "Idade", value: "min" }, position: 2 },
      { id: "a4", type: "equality", text: "Na quinta posição está o advogado que gosta de Caipirinha.", subject: { category: "Bebida", value: "caipirinha" }, position: 5 },
      { id: "a5", type: "equality", text: "Quem gosta de Martini está na terceira posição.", subject: { category: "Bebida", value: "martini" }, position: 3 },
      { id: "a6", type: "equality", text: "O dono do SUV está na quarta posição.", subject: { category: "Carro", value: "SUV" }, position: 4 },
      { id: "a7", type: "equality", text: "Dr. Luiz dirige um SUV.", subject: { category: "Nome", value: "Dr. Luiz" }, object: { category: "Carro", value: "SUV" } },
      { id: "a8", type: "equality", text: "O advogado da área Civil está na quarta posição.", subject: { category: "Área", value: "civil" }, position: 4 },
      { id: "a9", type: "equality", text: "Na quarta posição está o advogado da gravata Vermelha.", subject: { category: "Gravata", value: "vermelha" }, position: 4 },
      { id: "a10", type: "equality", text: "Na terceira posição está o advogado da gravata Azul.", subject: { category: "Gravata", value: "azul" }, position: 3 },
      { id: "a11", type: "end", text: "Dr. Carlos está em uma das pontas.", subject: { category: "Nome", value: "Dr. Carlos" } },
      { id: "a12", type: "right_of", text: "Quem gosta de Mojito está exatamente à direita do advogado de 40 anos.", subject: { category: "Bebida", value: "mojito" }, object: { category: "Idade", value: "40" } },
      { id: "a13", type: "left_of", text: "O advogado de 34 anos está exatamente à esquerda do que bebe Cosmopolitan.", subject: { category: "Idade", value: "34" }, object: { category: "Bebida", value: "cosmopolitan" } },
      { id: "a14", type: "order", text: "O advogado da gravata Amarela está em algum lugar à esquerda do motorista do Hatch.", subject: { category: "Gravata", value: "amarela" }, object: { category: "Carro", value: "hatch" }, direction: "left" },
      { id: "a15", type: "order", text: "Dr. Ulysses está em algum lugar à direita de quem está com a gravata Amarela.", subject: { category: "Nome", value: "Dr. Ulysses" }, object: { category: "Gravata", value: "amarela" }, direction: "right" },
      { id: "a16", type: "between", text: "O advogado da gravata Amarela está em algum lugar entre o Dr. Otávio e o advogado de 34 anos, nessa ordem.", subject: { category: "Gravata", value: "amarela" }, bounds: [{ category: "Nome", value: "Dr. Otávio" }, { category: "Idade", value: "34" }] },
      { id: "a17", type: "neighbor", text: "Os advogados das áreas Trabalhista e Comercial estão lado a lado.", subject: { category: "Área", value: "trabalhista" }, object: { category: "Área", value: "comercial" } },
      { id: "a18", type: "between", text: "O advogado da área Trabalhista está em algum lugar entre o dono do Crossover e o advogado da área Comercial, nessa ordem.", subject: { category: "Área", value: "trabalhista" }, bounds: [{ category: "Carro", value: "crossover" }, { category: "Área", value: "comercial" }] },
      { id: "a19", type: "left_of", text: "O advogado da área Imobiliária está exatamente à esquerda do advogado da área Trabalhista.", subject: { category: "Área", value: "imobiliária" }, object: { category: "Área", value: "trabalhista" } },
      { id: "a20", type: "right_of", text: "Quem está usando a gravata Branca está exatamente à direita do Dr. Luiz.", subject: { category: "Gravata", value: "branca" }, object: { category: "Nome", value: "Dr. Luiz" } },
      { id: "a21", type: "between", text: "O dono do SUV está em algum lugar entre o dono do Crossover e o dono do Sedan, nessa ordem.", subject: { category: "Carro", value: "SUV" }, bounds: [{ category: "Carro", value: "crossover" }, { category: "Carro", value: "sedan" }] },
    ],
    solution: [
      { Gravata: "verde", Área: "imobiliária", Nome: "Dr. Otávio", Bebida: "margarita", Idade: "40", Carro: "crossover" },
      { Gravata: "amarela", Área: "trabalhista", Nome: "Dr. Alberto", Bebida: "mojito", Idade: "30", Carro: "pickup" },
      { Gravata: "azul", Área: "comercial", Nome: "Dr. Ulysses", Bebida: "martini", Idade: "34", Carro: "hatch" },
      { Gravata: "vermelha", Área: "civil", Nome: "Dr. Luiz", Bebida: "cosmopolitan", Idade: "37", Carro: "SUV" },
      { Gravata: "branca", Área: "consumidor", Nome: "Dr. Carlos", Bebida: "caipirinha", Idade: "44", Carro: "sedan" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 3. NADADORES OLÍMPICOS (4 swimmers)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "nadadores_olimpicos",
    name: "Nadadores Olímpicos",
    description:
      "Quatro nadadores estão em suas raias. Descubra a touca, o país, a especialidade, as medalhas, o peso e a idade de cada um.",
    numHouses: 4,
    categories: [
      { name: "Touca", values: ["amarela", "azul", "branca", "verde"], ordinal: false },
      { name: "País", values: ["Argentina", "Brasil", "EUA", "França"], ordinal: false },
      { name: "Especialidade", values: ["borboleta", "costas", "crawl", "peito"], ordinal: false },
      { name: "Medalhas", values: ["2", "3", "5", "8"], ordinal: true, ordValues: [2, 3, 5, 8] },
      { name: "Peso", values: ["70 kg", "75 kg", "80 kg", "84 kg"], ordinal: true, ordValues: [70, 75, 80, 84] },
      { name: "Idade", values: ["20", "22", "23", "24"], ordinal: true, ordValues: [20, 22, 23, 24] },
    ],
    clues: [
      { id: "n1", type: "end", text: "Quem tem 22 anos está em uma das pontas.", subject: { category: "Idade", value: "22" } },
      { id: "n2", type: "equality", text: "O nadador de 23 anos está na segunda raia.", subject: { category: "Idade", value: "23" }, position: 2 },
      { id: "n3", type: "neighbor", text: "O competidor mais velho está ao lado do competidor de 75 kg.", subject: { category: "Idade", value: "max" }, object: { category: "Peso", value: "75 kg" } },
      { id: "n4", type: "equality", text: "O competidor com mais medalhas tem apenas 22 anos.", subject: { category: "Medalhas", value: "max" }, object: { category: "Idade", value: "22" } },
      { id: "n5", type: "superlative", text: "Na segunda raia está o nadador mais pesado.", subject: { category: "Peso", value: "max" }, position: 2 },
      { id: "n6", type: "neighbor", text: "O homem de 70 kg está ao lado do homem de touca amarela.", subject: { category: "Peso", value: "70 kg" }, object: { category: "Touca", value: "amarela" } },
      { id: "n7", type: "equality", text: "Na terceira raia está o nadador que já ganhou 5 medalhas.", subject: { category: "Medalhas", value: "5" }, position: 3 },
      { id: "n8", type: "superlative", text: "Na primeira posição está o nadador com menos medalhas.", subject: { category: "Medalhas", value: "min" }, position: 1 },
      { id: "n9", type: "equality", text: "O especialista em nado Crawl está na última raia.", subject: { category: "Especialidade", value: "crawl" }, position: 4 },
      { id: "n10", type: "equality", text: "O nadador de 24 anos tem como especialidade o nado de Costas.", subject: { category: "Idade", value: "24" }, object: { category: "Especialidade", value: "costas" } },
      { id: "n11", type: "neighbor", text: "O nadador que prefere nado Peito está ao lado do nadador estadunidense.", subject: { category: "Especialidade", value: "peito" }, object: { category: "País", value: "EUA" } },
      { id: "n12", type: "equality", text: "Na terceira raia está o nadador que fala inglês.", subject: { category: "País", value: "EUA" }, position: 3 },
      { id: "n13", type: "neighbor", text: "O nadador que nasceu em Versalhes está ao lado do nadador que nasceu em Bariloche.", subject: { category: "País", value: "França" }, object: { category: "País", value: "Argentina" } },
      { id: "n14", type: "equality", text: "O nadador argentino está na segunda raia.", subject: { category: "País", value: "Argentina" }, position: 2 },
      { id: "n15", type: "equality", text: "A pessoa usando a touca branca está na terceira raia.", subject: { category: "Touca", value: "branca" }, position: 3 },
      { id: "n16", type: "equality", text: "Na segunda posição está o nadador de touca azul.", subject: { category: "Touca", value: "azul" }, position: 2 },
    ],
    solution: [
      { Touca: "verde", País: "França", Especialidade: "borboleta", Medalhas: "2", Peso: "80 kg", Idade: "20" },
      { Touca: "azul", País: "Argentina", Especialidade: "peito", Medalhas: "3", Peso: "84 kg", Idade: "23" },
      { Touca: "branca", País: "EUA", Especialidade: "costas", Medalhas: "5", Peso: "70 kg", Idade: "24" },
      { Touca: "amarela", País: "Brasil", Especialidade: "crawl", Medalhas: "8", Peso: "75 kg", Idade: "22" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PACIENTES NO ORTOPEDISTA (5 patients)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "pacientes_ortopedista",
    name: "Pacientes no Ortopedista",
    description:
      "Cinco pacientes aguardam consulta no ortopedista. Descubra a camiseta, o nome, a dor, o convênio, a idade e a companhia de cada um.",
    numHouses: 5,
    categories: [
      { name: "Camiseta", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Nome", values: ["Heloísa", "Júlia", "Letícia", "Rebeca", "Vitória"], ordinal: false },
      { name: "Dor", values: ["joelho", "lombar", "ombro", "quadril", "tornozelo"], ordinal: false },
      { name: "Convênio", values: ["Cuca Saúde", "Golden Cuca", "InterCuca", "Prevent Cuca", "Santa Cuca"], ordinal: false },
      { name: "Idade", values: ["30 anos", "35 anos", "40 anos", "45 anos", "50 anos"], ordinal: true, ordValues: [30, 35, 40, 45, 50] },
      { name: "Companhia", values: ["amiga", "filha", "mãe", "prima", "sobrinha"], ordinal: false },
    ],
    clues: [
      { id: "p1", type: "equality", text: "A paciente de camiseta Amarela está na primeira posição.", subject: { category: "Camiseta", value: "amarela" }, position: 1 },
      { id: "p2", type: "equality", text: "Rebeca está na primeira posição.", subject: { category: "Nome", value: "Rebeca" }, position: 1 },
      { id: "p3", type: "equality", text: "Quem está com a camiseta Amarela tem dor no Tornozelo.", subject: { category: "Camiseta", value: "amarela" }, object: { category: "Dor", value: "tornozelo" } },
      { id: "p4", type: "equality", text: "A paciente de 50 anos está na primeira posição.", subject: { category: "Idade", value: "50 anos" }, position: 1 },
      { id: "p5", type: "equality", text: "Rebeca tem o convênio Golden Cuca.", subject: { category: "Nome", value: "Rebeca" }, object: { category: "Convênio", value: "Golden Cuca" } },
      { id: "p6", type: "equality", text: "A paciente acompanhada pela prima está na primeira posição.", subject: { category: "Companhia", value: "prima" }, position: 1 },
      { id: "p7", type: "equality", text: "Heloísa está na segunda posição.", subject: { category: "Nome", value: "Heloísa" }, position: 2 },
      { id: "p8", type: "equality", text: "A paciente de camiseta Verde está na segunda posição.", subject: { category: "Camiseta", value: "verde" }, position: 2 },
      { id: "p9", type: "equality", text: "Heloísa tem dor no Quadril.", subject: { category: "Nome", value: "Heloísa" }, object: { category: "Dor", value: "quadril" } },
      { id: "p10", type: "equality", text: "A paciente de 35 anos está na segunda posição.", subject: { category: "Idade", value: "35 anos" }, position: 2 },
      { id: "p11", type: "equality", text: "Heloísa tem o convênio Cuca Saúde.", subject: { category: "Nome", value: "Heloísa" }, object: { category: "Convênio", value: "Cuca Saúde" } },
      { id: "p12", type: "equality", text: "A paciente acompanhada pela amiga está na segunda posição.", subject: { category: "Companhia", value: "amiga" }, position: 2 },
      { id: "p13", type: "equality", text: "Vitória está na terceira posição.", subject: { category: "Nome", value: "Vitória" }, position: 3 },
      { id: "p14", type: "equality", text: "A paciente de camiseta Azul está na terceira posição.", subject: { category: "Camiseta", value: "azul" }, position: 3 },
      { id: "p15", type: "equality", text: "Vitória tem dor Lombar.", subject: { category: "Nome", value: "Vitória" }, object: { category: "Dor", value: "lombar" } },
      { id: "p16", type: "equality", text: "A paciente de 40 anos está na terceira posição.", subject: { category: "Idade", value: "40 anos" }, position: 3 },
      { id: "p17", type: "equality", text: "Vitória tem o convênio InterCuca.", subject: { category: "Nome", value: "Vitória" }, object: { category: "Convênio", value: "InterCuca" } },
      { id: "p18", type: "equality", text: "A paciente acompanhada pela filha está na terceira posição.", subject: { category: "Companhia", value: "filha" }, position: 3 },
      { id: "p19", type: "equality", text: "Júlia está na quarta posição.", subject: { category: "Nome", value: "Júlia" }, position: 4 },
      { id: "p20", type: "equality", text: "A paciente de camiseta Branca está na quarta posição.", subject: { category: "Camiseta", value: "branca" }, position: 4 },
      { id: "p21", type: "equality", text: "Júlia tem dor no Ombro.", subject: { category: "Nome", value: "Júlia" }, object: { category: "Dor", value: "ombro" } },
    ],
    solution: [
      { Camiseta: "amarela", Nome: "Rebeca", Dor: "tornozelo", Convênio: "Golden Cuca", Idade: "50 anos", Companhia: "prima" },
      { Camiseta: "verde", Nome: "Heloísa", Dor: "quadril", Convênio: "Cuca Saúde", Idade: "35 anos", Companhia: "amiga" },
      { Camiseta: "azul", Nome: "Vitória", Dor: "lombar", Convênio: "InterCuca", Idade: "40 anos", Companhia: "filha" },
      { Camiseta: "branca", Nome: "Júlia", Dor: "ombro", Convênio: "Prevent Cuca", Idade: "45 anos", Companhia: "sobrinha" },
      { Camiseta: "vermelha", Nome: "Letícia", Dor: "joelho", Convênio: "Santa Cuca", Idade: "30 anos", Companhia: "mãe" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 5. ASTRÔNOMOS (5 astronomers)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "astronomos",
    name: "Astrônomos Amadores",
    description:
      "Cinco astrônomos amadores estão reunidos. Descubra a camisa, o nome, a idade, a constelação favorita, a altura e o esporte de cada um.",
    numHouses: 5,
    categories: [
      { name: "Camisa", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Nome", values: ["Alan", "Cleber", "Luís", "Milton", "Vinicius"], ordinal: false },
      { name: "Idade", values: ["27", "29", "32", "33", "35"], ordinal: true, ordValues: [27, 29, 32, 33, 35] },
      { name: "Constelação", values: ["Andrômeda", "Aries", "Escorpião", "Orion", "Pegasus"], ordinal: false },
      { name: "Altura", values: ["1,66 m", "1,70 m", "1,72 m", "1,75 m", "1,81 m"], ordinal: true, ordValues: [1.66, 1.7, 1.72, 1.75, 1.81] },
      { name: "Esporte", values: ["basquete", "futebol", "natação", "sinuca", "vôlei"], ordinal: false },
    ],
    clues: [
      { id: "as1", type: "equality", text: "O astrônomo de camisa Branca está na primeira posição.", subject: { category: "Camisa", value: "branca" }, position: 1 },
      { id: "as2", type: "equality", text: "Luís está na primeira posição.", subject: { category: "Nome", value: "Luís" }, position: 1 },
      { id: "as3", type: "equality", text: "O astrônomo de 29 anos está na primeira posição.", subject: { category: "Idade", value: "29" }, position: 1 },
      { id: "as4", type: "equality", text: "Quem gosta da constelação Orion está na primeira posição.", subject: { category: "Constelação", value: "Orion" }, position: 1 },
      { id: "as5", type: "equality", text: "O astrônomo de 1,75 m de altura está na primeira posição.", subject: { category: "Altura", value: "1,75 m" }, position: 1 },
      { id: "as6", type: "equality", text: "O astrônomo que pratica natação está na primeira posição.", subject: { category: "Esporte", value: "natação" }, position: 1 },
      { id: "as7", type: "equality", text: "O astrônomo de camisa Vermelha está na segunda posição.", subject: { category: "Camisa", value: "vermelha" }, position: 2 },
      { id: "as8", type: "equality", text: "Alan está na segunda posição.", subject: { category: "Nome", value: "Alan" }, position: 2 },
      { id: "as9", type: "equality", text: "O astrônomo de 27 anos está na segunda posição.", subject: { category: "Idade", value: "27" }, position: 2 },
      { id: "as10", type: "equality", text: "Quem gosta da constelação Aries está na segunda posição.", subject: { category: "Constelação", value: "Aries" }, position: 2 },
      { id: "as11", type: "equality", text: "O astrônomo de 1,66 m está na segunda posição.", subject: { category: "Altura", value: "1,66 m" }, position: 2 },
      { id: "as12", type: "equality", text: "O astrônomo que joga vôlei está na segunda posição.", subject: { category: "Esporte", value: "vôlei" }, position: 2 },
      { id: "as13", type: "equality", text: "O astrônomo de camisa Azul está na terceira posição.", subject: { category: "Camisa", value: "azul" }, position: 3 },
      { id: "as14", type: "equality", text: "Cleber está na terceira posição.", subject: { category: "Nome", value: "Cleber" }, position: 3 },
      { id: "as15", type: "equality", text: "O astrônomo de 32 anos está na terceira posição.", subject: { category: "Idade", value: "32" }, position: 3 },
      { id: "as16", type: "equality", text: "Quem gosta da constelação Andrômeda está na terceira posição.", subject: { category: "Constelação", value: "Andrômeda" }, position: 3 },
      { id: "as17", type: "equality", text: "O astrônomo de 1,70 m está na terceira posição.", subject: { category: "Altura", value: "1,70 m" }, position: 3 },
      { id: "as18", type: "equality", text: "O astrônomo que joga futebol está na terceira posição.", subject: { category: "Esporte", value: "futebol" }, position: 3 },
      { id: "as19", type: "equality", text: "O astrônomo de camisa Verde está na quarta posição.", subject: { category: "Camisa", value: "verde" }, position: 4 },
      { id: "as20", type: "equality", text: "Milton está na quarta posição.", subject: { category: "Nome", value: "Milton" }, position: 4 },
      { id: "as21", type: "equality", text: "O astrônomo de 33 anos está na quarta posição.", subject: { category: "Idade", value: "33" }, position: 4 },
    ],
    solution: [
      { Camisa: "branca", Nome: "Luís", Idade: "29", Constelação: "Orion", Altura: "1,75 m", Esporte: "natação" },
      { Camisa: "vermelha", Nome: "Alan", Idade: "27", Constelação: "Aries", Altura: "1,66 m", Esporte: "vôlei" },
      { Camisa: "azul", Nome: "Cleber", Idade: "32", Constelação: "Andrômeda", Altura: "1,70 m", Esporte: "futebol" },
      { Camisa: "verde", Nome: "Milton", Idade: "33", Constelação: "Escorpião", Altura: "1,72 m", Esporte: "basquete" },
      { Camisa: "amarela", Nome: "Vinicius", Idade: "35", Constelação: "Pegasus", Altura: "1,81 m", Esporte: "sinuca" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 6. CARROS NO MECÂNICO (5 cars)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "carros_mecanico",
    name: "Carros no Mecânico",
    description:
      "Cinco carros estão na oficina mecânica. Descubra a cor, a montadora, o dono, o tipo, o problema e o ano de cada um.",
    numHouses: 5,
    categories: [
      { name: "Cor", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Montadora", values: ["alemã", "chinesa", "francesa", "italiana", "japonesa"], ordinal: false },
      { name: "Dono", values: ["Adailton", "Francisco", "George", "Marcos", "Nilton"], ordinal: false },
      { name: "Tipo", values: ["crossover", "hatch", "pickup", "sedan", "SUV"], ordinal: false },
      { name: "Problema", values: ["bateria", "câmbio", "embreagem", "freio", "motor"], ordinal: false },
      { name: "Ano", values: ["2007", "2008", "2009", "2010", "2011"], ordinal: true, ordValues: [2007, 2008, 2009, 2010, 2011] },
    ],
    clues: [
      { id: "c1", type: "equality", text: "O carro vermelho está na primeira posição.", subject: { category: "Cor", value: "vermelha" }, position: 1 },
      { id: "c2", type: "equality", text: "O carro de montadora alemã está na primeira posição.", subject: { category: "Montadora", value: "alemã" }, position: 1 },
      { id: "c3", type: "equality", text: "Marcos está na primeira posição.", subject: { category: "Dono", value: "Marcos" }, position: 1 },
      { id: "c4", type: "equality", text: "O SUV está na primeira posição.", subject: { category: "Tipo", value: "SUV" }, position: 1 },
      { id: "c5", type: "equality", text: "O carro com problema de embreagem está na primeira posição.", subject: { category: "Problema", value: "embreagem" }, position: 1 },
      { id: "c6", type: "equality", text: "O carro de 2007 está na primeira posição.", subject: { category: "Ano", value: "2007" }, position: 1 },
      { id: "c7", type: "equality", text: "O carro amarelo está na segunda posição.", subject: { category: "Cor", value: "amarela" }, position: 2 },
      { id: "c8", type: "equality", text: "O carro de montadora chinesa está na segunda posição.", subject: { category: "Montadora", value: "chinesa" }, position: 2 },
      { id: "c9", type: "equality", text: "Francisco está na segunda posição.", subject: { category: "Dono", value: "Francisco" }, position: 2 },
      { id: "c10", type: "equality", text: "A pickup está na segunda posição.", subject: { category: "Tipo", value: "pickup" }, position: 2 },
      { id: "c11", type: "equality", text: "O carro com problema de freio está na segunda posição.", subject: { category: "Problema", value: "freio" }, position: 2 },
      { id: "c12", type: "equality", text: "O carro de 2010 está na segunda posição.", subject: { category: "Ano", value: "2010" }, position: 2 },
      { id: "c13", type: "equality", text: "O carro azul está na terceira posição.", subject: { category: "Cor", value: "azul" }, position: 3 },
      { id: "c14", type: "equality", text: "O carro de montadora japonesa está na terceira posição.", subject: { category: "Montadora", value: "japonesa" }, position: 3 },
      { id: "c15", type: "equality", text: "Nilton está na terceira posição.", subject: { category: "Dono", value: "Nilton" }, position: 3 },
      { id: "c16", type: "equality", text: "O hatch está na terceira posição.", subject: { category: "Tipo", value: "hatch" }, position: 3 },
      { id: "c17", type: "equality", text: "O carro com problema de bateria está na terceira posição.", subject: { category: "Problema", value: "bateria" }, position: 3 },
      { id: "c18", type: "equality", text: "O carro de 2009 está na terceira posição.", subject: { category: "Ano", value: "2009" }, position: 3 },
      { id: "c19", type: "equality", text: "O carro branco está na quarta posição.", subject: { category: "Cor", value: "branca" }, position: 4 },
      { id: "c20", type: "equality", text: "O carro de montadora francesa está na quarta posição.", subject: { category: "Montadora", value: "francesa" }, position: 4 },
      { id: "c21", type: "equality", text: "Adailton está na quarta posição.", subject: { category: "Dono", value: "Adailton" }, position: 4 },
    ],
    solution: [
      { Cor: "vermelha", Montadora: "alemã", Dono: "Marcos", Tipo: "SUV", Problema: "embreagem", Ano: "2007" },
      { Cor: "amarela", Montadora: "chinesa", Dono: "Francisco", Tipo: "pickup", Problema: "freio", Ano: "2010" },
      { Cor: "azul", Montadora: "japonesa", Dono: "Nilton", Tipo: "hatch", Problema: "bateria", Ano: "2009" },
      { Cor: "branca", Montadora: "francesa", Dono: "Adailton", Tipo: "sedan", Problema: "câmbio", Ano: "2011" },
      { Cor: "verde", Montadora: "italiana", Dono: "George", Tipo: "crossover", Problema: "motor", Ano: "2008" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 7. CONCURSOS PÚBLICOS (5 candidates)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "concursos_publicos",
    name: "Concursos Públicos",
    description:
      "Cinco candidatos estudam para concursos públicos. Descubra o caderno, o nome, o concurso, a matrícula, a dedicação e a idade de cada um.",
    numHouses: 5,
    categories: [
      { name: "Caderno", values: ["amarelo", "azul", "branco", "verde", "vermelho"], ordinal: false },
      { name: "Nome", values: ["Cauê", "Josué", "Leonardo", "Moisés", "Thomas"], ordinal: false },
      { name: "Concurso", values: ["auditor", "delegado", "escrivão", "médico", "procurador"], ordinal: false },
      { name: "Matrícula", values: ["182551", "183031", "184791", "186386", "187767"], ordinal: true, ordValues: [182551, 183031, 184791, 186386, 187767] },
      { name: "Dedicação", values: ["6 horas", "8 horas", "10 horas", "12 horas", "14 horas"], ordinal: true, ordValues: [6, 8, 10, 12, 14] },
      { name: "Idade", values: ["30 anos", "34 anos", "38 anos", "42 anos", "46 anos"], ordinal: true, ordValues: [30, 34, 38, 42, 46] },
    ],
    clues: [
      { id: "cp1", type: "equality", text: "O candidato de caderno Azul está na primeira posição.", subject: { category: "Caderno", value: "azul" }, position: 1 },
      { id: "cp2", type: "equality", text: "Moisés está na primeira posição.", subject: { category: "Nome", value: "Moisés" }, position: 1 },
      { id: "cp3", type: "equality", text: "O candidato que faz o concurso de Escrivão está na primeira posição.", subject: { category: "Concurso", value: "escrivão" }, position: 1 },
      { id: "cp4", type: "equality", text: "O candidato de matrícula 187767 está na primeira posição.", subject: { category: "Matrícula", value: "187767" }, position: 1 },
      { id: "cp5", type: "equality", text: "O candidato que estuda 10 horas por dia está na primeira posição.", subject: { category: "Dedicação", value: "10 horas" }, position: 1 },
      { id: "cp6", type: "equality", text: "O candidato de 46 anos está na primeira posição.", subject: { category: "Idade", value: "46 anos" }, position: 1 },
      { id: "cp7", type: "equality", text: "O candidato de caderno Vermelho está na segunda posição.", subject: { category: "Caderno", value: "vermelho" }, position: 2 },
      { id: "cp8", type: "equality", text: "Thomas está na segunda posição.", subject: { category: "Nome", value: "Thomas" }, position: 2 },
      { id: "cp9", type: "equality", text: "O candidato que faz o concurso de Delegado está na segunda posição.", subject: { category: "Concurso", value: "delegado" }, position: 2 },
      { id: "cp10", type: "equality", text: "O candidato de matrícula 184791 está na segunda posição.", subject: { category: "Matrícula", value: "184791" }, position: 2 },
      { id: "cp11", type: "equality", text: "O candidato que estuda 8 horas por dia está na segunda posição.", subject: { category: "Dedicação", value: "8 horas" }, position: 2 },
      { id: "cp12", type: "equality", text: "O candidato de 42 anos está na segunda posição.", subject: { category: "Idade", value: "42 anos" }, position: 2 },
      { id: "cp13", type: "equality", text: "O candidato de caderno Branco está na terceira posição.", subject: { category: "Caderno", value: "branco" }, position: 3 },
      { id: "cp14", type: "equality", text: "Leonardo está na terceira posição.", subject: { category: "Nome", value: "Leonardo" }, position: 3 },
      { id: "cp15", type: "equality", text: "O candidato que faz o concurso de Médico está na terceira posição.", subject: { category: "Concurso", value: "médico" }, position: 3 },
      { id: "cp16", type: "equality", text: "O candidato de matrícula 186386 está na terceira posição.", subject: { category: "Matrícula", value: "186386" }, position: 3 },
      { id: "cp17", type: "equality", text: "O candidato que estuda 12 horas por dia está na terceira posição.", subject: { category: "Dedicação", value: "12 horas" }, position: 3 },
      { id: "cp18", type: "equality", text: "O candidato de 34 anos está na terceira posição.", subject: { category: "Idade", value: "34 anos" }, position: 3 },
      { id: "cp19", type: "equality", text: "O candidato de caderno Verde está na quarta posição.", subject: { category: "Caderno", value: "verde" }, position: 4 },
      { id: "cp20", type: "equality", text: "Josué está na quarta posição.", subject: { category: "Nome", value: "Josué" }, position: 4 },
      { id: "cp21", type: "equality", text: "O candidato que faz o concurso de Procurador está na quarta posição.", subject: { category: "Concurso", value: "procurador" }, position: 4 },
    ],
    solution: [
      { Caderno: "azul", Nome: "Moisés", Concurso: "escrivão", Matrícula: "187767", Dedicação: "10 horas", Idade: "46 anos" },
      { Caderno: "vermelho", Nome: "Thomas", Concurso: "delegado", Matrícula: "184791", Dedicação: "8 horas", Idade: "42 anos" },
      { Caderno: "branco", Nome: "Leonardo", Concurso: "médico", Matrícula: "186386", Dedicação: "12 horas", Idade: "34 anos" },
      { Caderno: "verde", Nome: "Josué", Concurso: "procurador", Matrícula: "182551", Dedicação: "14 horas", Idade: "38 anos" },
      { Caderno: "amarelo", Nome: "Cauê", Concurso: "auditor", Matrícula: "183031", Dedicação: "6 horas", Idade: "30 anos" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 8. LUTADORES AMADORES (5 fighters)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "lutadores_amadores",
    name: "Lutadores Amadores",
    description:
      "Cinco lutadores amadores estão em fila. Descubra a faixa, o nome, a luta, o peso, a altura e a idade de cada um.",
    numHouses: 5,
    categories: [
      { name: "Faixa", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Nome", values: ["Anderson", "José", "Pedro", "Rodrigo", "Wanderlei"], ordinal: false },
      { name: "Luta", values: ["judô", "karatê", "kickboxing", "kung fu", "taekwondo"], ordinal: false },
      { name: "Peso", values: ["60 kg", "65 kg", "70 kg", "75 kg", "80 kg"], ordinal: true, ordValues: [60, 65, 70, 75, 80] },
      { name: "Altura", values: ["1,65 m", "1,70 m", "1,75 m", "1,80 m", "1,85 m"], ordinal: true, ordValues: [1.65, 1.7, 1.75, 1.8, 1.85] },
      { name: "Idade", values: ["25 anos", "30 anos", "35 anos", "40 anos", "45 anos"], ordinal: true, ordValues: [25, 30, 35, 40, 45] },
    ],
    clues: [
      { id: "l1", type: "equality", text: "O lutador de faixa Vermelha está na primeira posição.", subject: { category: "Faixa", value: "vermelha" }, position: 1 },
      { id: "l2", type: "equality", text: "Anderson está na primeira posição.", subject: { category: "Nome", value: "Anderson" }, position: 1 },
      { id: "l3", type: "equality", text: "O lutador de judô está na primeira posição.", subject: { category: "Luta", value: "judô" }, position: 1 },
      { id: "l4", type: "equality", text: "O lutador de 75 kg está na primeira posição.", subject: { category: "Peso", value: "75 kg" }, position: 1 },
      { id: "l5", type: "equality", text: "O lutador de 1,75 m está na primeira posição.", subject: { category: "Altura", value: "1,75 m" }, position: 1 },
      { id: "l6", type: "equality", text: "O lutador de 40 anos está na primeira posição.", subject: { category: "Idade", value: "40 anos" }, position: 1 },
      { id: "l7", type: "equality", text: "O lutador de faixa Branca está na segunda posição.", subject: { category: "Faixa", value: "branca" }, position: 2 },
      { id: "l8", type: "equality", text: "José está na segunda posição.", subject: { category: "Nome", value: "José" }, position: 2 },
      { id: "l9", type: "equality", text: "O lutador de karatê está na segunda posição.", subject: { category: "Luta", value: "karatê" }, position: 2 },
      { id: "l10", type: "equality", text: "O lutador de 70 kg está na segunda posição.", subject: { category: "Peso", value: "70 kg" }, position: 2 },
      { id: "l11", type: "equality", text: "O lutador de 1,80 m está na segunda posição.", subject: { category: "Altura", value: "1,80 m" }, position: 2 },
      { id: "l12", type: "equality", text: "O lutador de 30 anos está na segunda posição.", subject: { category: "Idade", value: "30 anos" }, position: 2 },
      { id: "l13", type: "equality", text: "O lutador de faixa Azul está na terceira posição.", subject: { category: "Faixa", value: "azul" }, position: 3 },
      { id: "l14", type: "equality", text: "Pedro está na terceira posição.", subject: { category: "Nome", value: "Pedro" }, position: 3 },
      { id: "l15", type: "equality", text: "O lutador de taekwondo está na terceira posição.", subject: { category: "Luta", value: "taekwondo" }, position: 3 },
      { id: "l16", type: "equality", text: "O lutador de 65 kg está na terceira posição.", subject: { category: "Peso", value: "65 kg" }, position: 3 },
      { id: "l17", type: "equality", text: "O lutador de 1,70 m está na terceira posição.", subject: { category: "Altura", value: "1,70 m" }, position: 3 },
      { id: "l18", type: "equality", text: "O lutador de 25 anos está na terceira posição.", subject: { category: "Idade", value: "25 anos" }, position: 3 },
      { id: "l19", type: "equality", text: "O lutador de faixa Verde está na quarta posição.", subject: { category: "Faixa", value: "verde" }, position: 4 },
      { id: "l20", type: "equality", text: "Wanderlei está na quarta posição.", subject: { category: "Nome", value: "Wanderlei" }, position: 4 },
      { id: "l21", type: "equality", text: "O lutador de kung fu está na quarta posição.", subject: { category: "Luta", value: "kung fu" }, position: 4 },
    ],
    solution: [
      { Faixa: "vermelha", Nome: "Anderson", Luta: "judô", Peso: "75 kg", Altura: "1,75 m", Idade: "40 anos" },
      { Faixa: "branca", Nome: "José", Luta: "karatê", Peso: "70 kg", Altura: "1,80 m", Idade: "30 anos" },
      { Faixa: "azul", Nome: "Pedro", Luta: "taekwondo", Peso: "65 kg", Altura: "1,70 m", Idade: "25 anos" },
      { Faixa: "verde", Nome: "Wanderlei", Luta: "kung fu", Peso: "80 kg", Altura: "1,85 m", Idade: "45 anos" },
      { Faixa: "amarela", Nome: "Rodrigo", Luta: "kickboxing", Peso: "60 kg", Altura: "1,65 m", Idade: "35 anos" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 9. CARROS ANTIGOS (5 classic cars)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "carros_antigos",
    name: "Carros Antigos",
    description:
      "Cinco carros antigos estão em uma exposição. Descubra a cor, o ano, a montadora, o dono, a placa e a quilometragem de cada um.",
    numHouses: 5,
    categories: [
      { name: "Cor", values: ["amarelo", "azul", "branco", "verde", "vermelho"], ordinal: false },
      { name: "Ano", values: ["1950", "1955", "1960", "1965", "1970"], ordinal: true, ordValues: [1950, 1955, 1960, 1965, 1970] },
      { name: "Montadora", values: ["Chevrolet", "Ford", "Mercedes", "Porsche", "Volkswagen"], ordinal: false },
      { name: "Dono", values: ["Aguiar", "Glenn", "Harley", "Ponce", "Thales"], ordinal: false },
      { name: "Placa", values: ["AAA-1111", "BBB-2222", "CCC-3333", "DDD-4444", "EEE-5555"], ordinal: false },
      { name: "Km", values: ["80 mil", "100 mil", "140 mil", "190 mil", "210 mil"], ordinal: true, ordValues: [80, 100, 140, 190, 210] },
    ],
    clues: [
      { id: "ca1", type: "equality", text: "O carro vermelho está na primeira posição.", subject: { category: "Cor", value: "vermelho" }, position: 1 },
      { id: "ca2", type: "equality", text: "O carro de 1965 está na primeira posição.", subject: { category: "Ano", value: "1965" }, position: 1 },
      { id: "ca3", type: "equality", text: "O carro da Ford está na primeira posição.", subject: { category: "Montadora", value: "Ford" }, position: 1 },
      { id: "ca4", type: "equality", text: "Harley está na primeira posição.", subject: { category: "Dono", value: "Harley" }, position: 1 },
      { id: "ca5", type: "equality", text: "O carro de placa EEE-5555 está na primeira posição.", subject: { category: "Placa", value: "EEE-5555" }, position: 1 },
      { id: "ca6", type: "equality", text: "O carro com 210 mil km está na primeira posição.", subject: { category: "Km", value: "210 mil" }, position: 1 },
      { id: "ca7", type: "equality", text: "O carro amarelo está na segunda posição.", subject: { category: "Cor", value: "amarelo" }, position: 2 },
      { id: "ca8", type: "equality", text: "O carro de 1970 está na segunda posição.", subject: { category: "Ano", value: "1970" }, position: 2 },
      { id: "ca9", type: "equality", text: "O carro da Chevrolet está na segunda posição.", subject: { category: "Montadora", value: "Chevrolet" }, position: 2 },
      { id: "ca10", type: "equality", text: "Thales está na segunda posição.", subject: { category: "Dono", value: "Thales" }, position: 2 },
      { id: "ca11", type: "equality", text: "O carro de placa AAA-1111 está na segunda posição.", subject: { category: "Placa", value: "AAA-1111" }, position: 2 },
      { id: "ca12", type: "equality", text: "O carro com 190 mil km está na segunda posição.", subject: { category: "Km", value: "190 mil" }, position: 2 },
      { id: "ca13", type: "equality", text: "O carro verde está na terceira posição.", subject: { category: "Cor", value: "verde" }, position: 3 },
      { id: "ca14", type: "equality", text: "O carro de 1960 está na terceira posição.", subject: { category: "Ano", value: "1960" }, position: 3 },
      { id: "ca15", type: "equality", text: "O carro da Mercedes está na terceira posição.", subject: { category: "Montadora", value: "Mercedes" }, position: 3 },
      { id: "ca16", type: "equality", text: "Ponce está na terceira posição.", subject: { category: "Dono", value: "Ponce" }, position: 3 },
      { id: "ca17", type: "equality", text: "O carro de placa CCC-3333 está na terceira posição.", subject: { category: "Placa", value: "CCC-3333" }, position: 3 },
      { id: "ca18", type: "equality", text: "O carro com 140 mil km está na terceira posição.", subject: { category: "Km", value: "140 mil" }, position: 3 },
      { id: "ca19", type: "equality", text: "O carro branco está na quarta posição.", subject: { category: "Cor", value: "branco" }, position: 4 },
      { id: "ca20", type: "equality", text: "O carro de 1955 está na quarta posição.", subject: { category: "Ano", value: "1955" }, position: 4 },
      { id: "ca21", type: "equality", text: "O carro da Porsche está na quarta posição.", subject: { category: "Montadora", value: "Porsche" }, position: 4 },
    ],
    solution: [
      { Cor: "vermelho", Ano: "1965", Montadora: "Ford", Dono: "Harley", Placa: "EEE-5555", Km: "210 mil" },
      { Cor: "amarelo", Ano: "1970", Montadora: "Chevrolet", Dono: "Thales", Placa: "AAA-1111", Km: "190 mil" },
      { Cor: "verde", Ano: "1960", Montadora: "Mercedes", Dono: "Ponce", Placa: "CCC-3333", Km: "140 mil" },
      { Cor: "branco", Ano: "1955", Montadora: "Porsche", Dono: "Glenn", Placa: "BBB-2222", Km: "80 mil" },
      { Cor: "azul", Ano: "1950", Montadora: "Volkswagen", Dono: "Aguiar", Placa: "DDD-4444", Km: "100 mil" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 10. ELEMENTOS QUÍMICOS (5 students)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "elementos_quimicos",
    name: "Elementos Químicos",
    description:
      "Cinco estudantes apresentam elementos químicos. Descubra a camiseta, o nome, a idade, o elemento, o cientista favorito e o animal de estimação de cada um.",
    numHouses: 5,
    categories: [
      { name: "Camiseta", values: ["azul", "verde", "preta", "roxa", "vermelha"], ordinal: false },
      { name: "Nome", values: ["Camila", "Elisa", "Gisele", "Nádia", "Talita"], ordinal: false },
      { name: "Idade", values: ["12 anos", "13 anos", "14 anos", "15 anos", "16 anos"], ordinal: true, ordValues: [12, 13, 14, 15, 16] },
      { name: "Elemento", values: ["carbono", "hidrogênio", "irídio", "lítio", "nitrogênio"], ordinal: false },
      { name: "Cientista", values: ["Albert Einstein", "Gregor Mendel", "Isaac Newton", "Louis Pasteur", "Niels Bohr"], ordinal: false },
      { name: "Animal", values: ["cachorro", "coelho", "gato", "papagaio", "tartaruga"], ordinal: false },
    ],
    clues: [
      { id: "q1", type: "equality", text: "A estudante de camiseta Vermelha está na primeira posição.", subject: { category: "Camiseta", value: "vermelha" }, position: 1 },
      { id: "q2", type: "equality", text: "Camila está na primeira posição.", subject: { category: "Nome", value: "Camila" }, position: 1 },
      { id: "q3", type: "equality", text: "A estudante de 15 anos está na primeira posição.", subject: { category: "Idade", value: "15 anos" }, position: 1 },
      { id: "q4", type: "equality", text: "A estudante que apresenta o irídio está na primeira posição.", subject: { category: "Elemento", value: "irídio" }, position: 1 },
      { id: "q5", type: "equality", text: "A estudante que admira Isaac Newton está na primeira posição.", subject: { category: "Cientista", value: "Isaac Newton" }, position: 1 },
      { id: "q6", type: "equality", text: "A estudante que tem cachorro está na primeira posição.", subject: { category: "Animal", value: "cachorro" }, position: 1 },
      { id: "q7", type: "equality", text: "A estudante de camiseta Azul está na segunda posição.", subject: { category: "Camiseta", value: "azul" }, position: 2 },
      { id: "q8", type: "equality", text: "Elisa está na segunda posição.", subject: { category: "Nome", value: "Elisa" }, position: 2 },
      { id: "q9", type: "equality", text: "A estudante de 14 anos está na segunda posição.", subject: { category: "Idade", value: "14 anos" }, position: 2 },
      { id: "q10", type: "equality", text: "A estudante que apresenta o lítio está na segunda posição.", subject: { category: "Elemento", value: "lítio" }, position: 2 },
      { id: "q11", type: "equality", text: "A estudante que admira Louis Pasteur está na segunda posição.", subject: { category: "Cientista", value: "Louis Pasteur" }, position: 2 },
      { id: "q12", type: "equality", text: "A estudante que tem gato está na segunda posição.", subject: { category: "Animal", value: "gato" }, position: 2 },
      { id: "q13", type: "equality", text: "A estudante de camiseta Roxa está na terceira posição.", subject: { category: "Camiseta", value: "roxa" }, position: 3 },
      { id: "q14", type: "equality", text: "Talita está na terceira posição.", subject: { category: "Nome", value: "Talita" }, position: 3 },
      { id: "q15", type: "equality", text: "A estudante de 13 anos está na terceira posição.", subject: { category: "Idade", value: "13 anos" }, position: 3 },
      { id: "q16", type: "equality", text: "A estudante que apresenta o nitrogênio está na terceira posição.", subject: { category: "Elemento", value: "nitrogênio" }, position: 3 },
      { id: "q17", type: "equality", text: "A estudante que admira Niels Bohr está na terceira posição.", subject: { category: "Cientista", value: "Niels Bohr" }, position: 3 },
      { id: "q18", type: "equality", text: "A estudante que tem coelho está na terceira posição.", subject: { category: "Animal", value: "coelho" }, position: 3 },
      { id: "q19", type: "equality", text: "A estudante de camiseta Preta está na quarta posição.", subject: { category: "Camiseta", value: "preta" }, position: 4 },
      { id: "q20", type: "equality", text: "Nádia está na quarta posição.", subject: { category: "Nome", value: "Nádia" }, position: 4 },
      { id: "q21", type: "equality", text: "A estudante de 16 anos está na quarta posição.", subject: { category: "Idade", value: "16 anos" }, position: 4 },
    ],
    solution: [
      { Camiseta: "vermelha", Nome: "Camila", Idade: "15 anos", Elemento: "irídio", Cientista: "Isaac Newton", Animal: "cachorro" },
      { Camiseta: "azul", Nome: "Elisa", Idade: "14 anos", Elemento: "lítio", Cientista: "Louis Pasteur", Animal: "gato" },
      { Camiseta: "roxa", Nome: "Talita", Idade: "13 anos", Elemento: "nitrogênio", Cientista: "Niels Bohr", Animal: "coelho" },
      { Camiseta: "preta", Nome: "Nádia", Idade: "16 anos", Elemento: "hidrogênio", Cientista: "Albert Einstein", Animal: "papagaio" },
      { Camiseta: "verde", Nome: "Gisele", Idade: "12 anos", Elemento: "carbono", Cientista: "Gregor Mendel", Animal: "tartaruga" },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 11. NAVIOS NO PORTO (5 ships)
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "navios_porto",
    name: "Navios no Porto",
    description:
      "Cinco navios estão ancorados no porto. Descubra a cor da chaminé, a nacionalidade, o horário de saída, o carregamento, o destino e o capitão de cada um.",
    numHouses: 5,
    categories: [
      { name: "Chaminé", values: ["amarela", "azul", "branca", "verde", "vermelha"], ordinal: false },
      { name: "Nacionalidade", values: ["Alemão", "Brasileiro", "Espanhol", "Francês", "Italiano"], ordinal: false },
      { name: "Saída", values: ["05:00", "06:00", "07:00", "08:00", "09:00"], ordinal: true, ordValues: [5, 6, 7, 8, 9] },
      { name: "Carregamento", values: ["Arroz", "Cacau", "Café", "Chá", "Milho"], ordinal: false },
      { name: "Destino", values: ["Hamburgo", "Macau", "Manila", "Rotterdam", "Santos"], ordinal: false },
      { name: "Capitão", values: ["Dexter", "Kramer", "Mr. White", "Newman", "Ted"], ordinal: false },
    ],
    clues: [
      { id: "nv1", type: "equality", text: "O navio de chaminé Vermelha está na primeira posição.", subject: { category: "Chaminé", value: "vermelha" }, position: 1 },
      { id: "nv2", type: "equality", text: "O navio brasileiro está na primeira posição.", subject: { category: "Nacionalidade", value: "Brasileiro" }, position: 1 },
      { id: "nv3", type: "equality", text: "O navio que sai às 09:00 está na primeira posição.", subject: { category: "Saída", value: "09:00" }, position: 1 },
      { id: "nv4", type: "equality", text: "O navio que carrega Café está na primeira posição.", subject: { category: "Carregamento", value: "Café" }, position: 1 },
      { id: "nv5", type: "equality", text: "O navio com destino a Santos está na primeira posição.", subject: { category: "Destino", value: "Santos" }, position: 1 },
      { id: "nv6", type: "equality", text: "O capitão Ted está no primeiro navio.", subject: { category: "Capitão", value: "Ted" }, position: 1 },
      { id: "nv7", type: "equality", text: "O navio de chaminé Amarela está na segunda posição.", subject: { category: "Chaminé", value: "amarela" }, position: 2 },
      { id: "nv8", type: "equality", text: "O navio espanhol está na segunda posição.", subject: { category: "Nacionalidade", value: "Espanhol" }, position: 2 },
      { id: "nv9", type: "equality", text: "O navio que sai às 05:00 está na segunda posição.", subject: { category: "Saída", value: "05:00" }, position: 2 },
      { id: "nv10", type: "equality", text: "O navio que carrega Chá está na segunda posição.", subject: { category: "Carregamento", value: "Chá" }, position: 2 },
      { id: "nv11", type: "equality", text: "O navio com destino a Macau está na segunda posição.", subject: { category: "Destino", value: "Macau" }, position: 2 },
      { id: "nv12", type: "equality", text: "O capitão Newman está no segundo navio.", subject: { category: "Capitão", value: "Newman" }, position: 2 },
      { id: "nv13", type: "equality", text: "O navio de chaminé Branca está na terceira posição.", subject: { category: "Chaminé", value: "branca" }, position: 3 },
      { id: "nv14", type: "equality", text: "O navio italiano está na terceira posição.", subject: { category: "Nacionalidade", value: "Italiano" }, position: 3 },
      { id: "nv15", type: "equality", text: "O navio que sai às 06:00 está na terceira posição.", subject: { category: "Saída", value: "06:00" }, position: 3 },
      { id: "nv16", type: "equality", text: "O navio que carrega Arroz está na terceira posição.", subject: { category: "Carregamento", value: "Arroz" }, position: 3 },
      { id: "nv17", type: "equality", text: "O navio com destino a Manila está na terceira posição.", subject: { category: "Destino", value: "Manila" }, position: 3 },
      { id: "nv18", type: "equality", text: "O capitão Mr. White está no terceiro navio.", subject: { category: "Capitão", value: "Mr. White" }, position: 3 },
      { id: "nv19", type: "equality", text: "O navio de chaminé Verde está na quarta posição.", subject: { category: "Chaminé", value: "verde" }, position: 4 },
      { id: "nv20", type: "equality", text: "O navio alemão está na quarta posição.", subject: { category: "Nacionalidade", value: "Alemão" }, position: 4 },
      { id: "nv21", type: "equality", text: "O navio que sai às 08:00 está na quarta posição.", subject: { category: "Saída", value: "08:00" }, position: 4 },
    ],
    solution: [
      { Chaminé: "vermelha", Nacionalidade: "Brasileiro", Saída: "09:00", Carregamento: "Café", Destino: "Santos", Capitão: "Ted" },
      { Chaminé: "amarela", Nacionalidade: "Espanhol", Saída: "05:00", Carregamento: "Chá", Destino: "Macau", Capitão: "Newman" },
      { Chaminé: "branca", Nacionalidade: "Italiano", Saída: "06:00", Carregamento: "Arroz", Destino: "Manila", Capitão: "Mr. White" },
      { Chaminé: "verde", Nacionalidade: "Alemão", Saída: "08:00", Carregamento: "Milho", Destino: "Hamburgo", Capitão: "Dexter" },
      { Chaminé: "azul", Nacionalidade: "Francês", Saída: "07:00", Carregamento: "Cacau", Destino: "Rotterdam", Capitão: "Kramer" },
    ],
  },
];
