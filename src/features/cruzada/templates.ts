export interface Template {
  id: string;
  difficulty: "facil" | "medio" | "dificil" | "especialista";
  rows: number;
  cols: number;
  equation_count: number;
  grid: string[];
}

export const templates: Template[] = [
  {
    id: "facil_01",
    difficulty: "facil",
    rows: 5,
    cols: 5,
    equation_count: 4,
    grid: ["N*N=N", "....-", "N*N=N", "....=", "N/N=N"],
  },
  {
    id: "facil_02",
    difficulty: "facil",
    rows: 5,
    cols: 5,
    equation_count: 4,
    grid: ["N-N=N", "/...*", "N+N=N", "=...=", "N...N"],
  },
  {
    id: "facil_03",
    difficulty: "facil",
    rows: 5,
    cols: 7,
    equation_count: 5,
    grid: ["N-N=N..", "../.+..", "N+N=N..", "..=.=..", "..N+N=N"],
  },
  {
    id: "facil_04",
    difficulty: "facil",
    rows: 7,
    cols: 5,
    equation_count: 5,
    grid: ["N*N=N", "*...-", "N.N.N", "-.*./", "N*N=N", "=.=.=", "N.N.N"],
  },
  {
    id: "medio_01",
    difficulty: "medio",
    rows: 7,
    cols: 7,
    equation_count: 7,
    grid: ["N*N+N=N", "-.*...-", "N-N*N=N", "-.-.*.=", "N.N.N.N", "=.=.=..", "N*N=N.."],
  },
  {
    id: "medio_02",
    difficulty: "medio",
    rows: 7,
    cols: 9,
    equation_count: 7,
    grid: ["..N/N=N..", "..*...+..", "..N.N.N.N", "..+.+.*./", "..N/N+N=N", "..=.=.=.=", "N+N=N.N.N"],
  },
  {
    id: "medio_03",
    difficulty: "medio",
    rows: 9,
    cols: 9,
    equation_count: 8,
    grid: ["..N......", "..+......", "..N/N+N=N", "..-...+.-", "..N+N-N=N", "..=./.=.=", "..N.N/N=N", "....=....", "N+N*N=N.."],
  },
  {
    id: "medio_04",
    difficulty: "medio",
    rows: 9,
    cols: 7,
    equation_count: 8,
    grid: ["..N-N=N", "......*", "N-N*N=N", "+...*.=", "N-N=N.N", "/.../..", "N/N=N..", "=...=..", "N*N/N=N"],
  },
  {
    id: "dificil_01",
    difficulty: "dificil",
    rows: 9,
    cols: 9,
    equation_count: 10,
    grid: ["..N+N=N.N", "......-.+", "..N+N*N=N", "....*.=.=", "N.N/N*N=N", "*.+.=....", "N-N=N....", "=.=......", "N/N=N...."],
  },
  {
    id: "dificil_02",
    difficulty: "dificil",
    rows: 7,
    cols: 11,
    equation_count: 11,
    grid: ["N+N/N=N....", "-./........", "N.N-N*N=N.N", "=./././.*./", "N.N-N=N.N.N", "..=.=.=.=.=", "N*N=N.N-N=N"],
  },
  {
    id: "dificil_03",
    difficulty: "dificil",
    rows: 9,
    cols: 11,
    equation_count: 11,
    grid: ["N*N=N.N+N=N", "-...-...+..", "N...N/N=N..", "=...*.+.=..", "N.N/N=N.N..", "../.=.=....", "..N/N=N....", "..=........", "N+N=N......"],
  },
  {
    id: "dificil_04",
    difficulty: "dificil",
    rows: 11,
    cols: 9,
    equation_count: 12,
    grid: ["N+N-N=N.N", "..*...+.+", "..N.N-N=N", "..=...=.=", "..N/N=N.N", "....+....", "..N/N=N..", "..-.=.-..", "..N*N=N..", "..=...=..", "..N/N+N=N"],
  },
  {
    id: "especialista_01",
    difficulty: "especialista",
    rows: 13,
    cols: 11,
    equation_count: 14,
    grid: ["..N+N-N=N..", "..../......", "N-N=N......", "*.+.+......", "N.N.N*N=N..", "=.-.=./....", "N.N.N*N=N.N", "..=...=.-.-", "..N.N*N+N=N", "....+...=.=", "....N+N-N=N", "....=......", "..N*N+N=N.."],
  },
  {
    id: "especialista_02",
    difficulty: "especialista",
    rows: 11,
    cols: 13,
    equation_count: 15,
    grid: ["......N+N/N=N", "....../.....-", "......N/N=N.N", "......=.+.+.+", "N.N.N*N=N.N.N", "+.*.*...-.=.=", "N.N.N-N=N.N.N", "=.=./.*.=....", "N/N=N.N*N=N..", "....=.=......", "....N+N=N...."],
  },
  {
    id: "especialista_03",
    difficulty: "especialista",
    rows: 13,
    cols: 13,
    equation_count: 15,
    grid: ["..N..........", "../..........", "N/N-N=N......", "..=.../......", "..N.N/N=N....", "....-.=......", "....N/N+N=N.N", "....=...+...*", "..N-N=N.N-N=N", "..-...../.+.=", "..N.....N+N=N", "..=.....=.=..", "..N*N=N.N*N=N"],
  },
];
