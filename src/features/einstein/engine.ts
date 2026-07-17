import type {
  Category,
  Clue,
  ClueType,
  Difficulty,
  EntityRef,
  Hint,
  Puzzle,
  Theme,
} from "./types";

// ── Seeded RNG (mulberry32) ──────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

// ── Solution representation ──────────────────────────────────────────────────
//
// A solution is an array of N houses. Each house is a Record<categoryName, value>.
// Within each category, each value appears exactly once across all houses.

export type Solution = Record<string, string>[];

// ── Generate a random complete solution ──────────────────────────────────────

export function generateSolution(
  categories: Category[],
  numHouses: number,
  rng: () => number,
): Solution {
  const solution: Solution = [];
  for (let i = 0; i < numHouses; i++) {
    const house: Record<string, string> = {};
    for (const cat of categories) {
      house[cat.name] = ""; // placeholder
    }
    solution.push(house);
  }

  for (const cat of categories) {
    const values = shuffleArray(cat.values, rng);
    for (let i = 0; i < numHouses; i++) {
      solution[i]![cat.name] = values[i]!;
    }
  }

  return solution;
}

// ── Entity resolution (including superlatives) ────────────────────────────────

/** Find the position (0-indexed) of a value within a category in the solution */
function findPosition(
  solution: Solution,
  category: string,
  value: string,
): number {
  for (let i = 0; i < solution.length; i++) {
    if (solution[i]![category] === value) return i;
  }
  return -1;
}

/** Resolve an EntityRef to an actual value, handling superlative refs ("max"/"min") */
function resolveEntity(
  ref: EntityRef,
  solution: Solution,
  categories: Category[],
): { category: string; value: string } | null {
  if (ref.value === "max" || ref.value === "min") {
    const cat = categories.find((c) => c.name === ref.category);
    if (!cat || !cat.ordinal || !cat.ordValues) return null;

    let targetIdx = 0;
    if (ref.value === "max") {
      let maxVal = -Infinity;
      for (let i = 0; i < cat.values.length; i++) {
        if (cat.ordValues[i]! > maxVal) {
          maxVal = cat.ordValues[i]!;
          targetIdx = i;
        }
      }
    } else {
      let minVal = Infinity;
      for (let i = 0; i < cat.values.length; i++) {
        if (cat.ordValues[i]! < minVal) {
          minVal = cat.ordValues[i]!;
          targetIdx = i;
        }
      }
    }
    return { category: ref.category, value: cat.values[targetIdx]! };
  }

  return { category: ref.category, value: ref.value };
}

// ── Clue evaluation ───────────────────────────────────────────────────────────

/** Check if a clue is satisfied by the given solution. */
export function evaluateClue(
  clue: Clue,
  solution: Solution,
  categories: Category[],
): boolean {
  const subject = resolveEntity(clue.subject, solution, categories);
  if (!subject) return false;

  const subjectPos = findPosition(solution, subject.category, subject.value);

  // Position-direct clue: "Na posição X está Y" — subject must be at position (1-indexed)
  if (clue.position !== undefined) {
    return subjectPos === clue.position - 1;
  }

  switch (clue.type) {
    case "equality": {
      const object = clue.object ? resolveEntity(clue.object, solution, categories) : null;
      if (!object) return false;
      const objectPos = findPosition(solution, object.category, object.value);
      return subjectPos === objectPos && subjectPos !== -1;
    }

    case "neighbor": {
      const object = clue.object ? resolveEntity(clue.object, solution, categories) : null;
      if (!object) return false;
      const objectPos = findPosition(solution, object.category, object.value);
      return Math.abs(subjectPos - objectPos) === 1;
    }

    case "left_of": {
      const object = clue.object ? resolveEntity(clue.object, solution, categories) : null;
      if (!object) return false;
      const objectPos = findPosition(solution, object.category, object.value);
      return subjectPos === objectPos - 1;
    }

    case "right_of": {
      const object = clue.object ? resolveEntity(clue.object, solution, categories) : null;
      if (!object) return false;
      const objectPos = findPosition(solution, object.category, object.value);
      return subjectPos === objectPos + 1;
    }

    case "end": {
      if (clue.endPosition === "first") return subjectPos === 0;
      if (clue.endPosition === "last") return subjectPos === solution.length - 1;
      return subjectPos === 0 || subjectPos === solution.length - 1;
    }

    case "exclusion": {
      const object = clue.object ? resolveEntity(clue.object, solution, categories) : null;
      if (!object) return false;
      const objectPos = findPosition(solution, object.category, object.value);
      return subjectPos !== objectPos && subjectPos !== -1 && objectPos !== -1;
    }

    case "order": {
      const object = clue.object ? resolveEntity(clue.object, solution, categories) : null;
      if (!object) return false;
      const objectPos = findPosition(solution, object.category, object.value);
      if (clue.direction === "left") return subjectPos < objectPos;
      if (clue.direction === "right") return subjectPos > objectPos;
      return false;
    }

    case "between": {
      if (!clue.bounds || clue.bounds.length !== 2) return false;
      const left = resolveEntity(clue.bounds[0]!, solution, categories);
      const right = resolveEntity(clue.bounds[1]!, solution, categories);
      if (!left || !right) return false;
      const leftPos = findPosition(solution, left.category, left.value);
      const rightPos = findPosition(solution, right.category, right.value);
      return leftPos < subjectPos && subjectPos < rightPos;
    }

    case "superlative": {
      // Superlative is resolved during entity resolution; the clue itself
      // is just a marker. If we reach here, the superlative was resolved.
      return true;
    }

    default:
      return true;
  }
}

// ── Solver (backtracking with pruning) ────────────────────────────────────────

/**
 * Find all solutions consistent with the given clues.
 * Returns up to maxSolutions solutions.
 */
export function solve(
  categories: Category[],
  numHouses: number,
  clues: Clue[],
  maxSolutions: number = 2,
): Solution[] {
  const solutions: Solution[] = [];

  // Initialize grid: each house has empty values
  const grid: Solution = [];
  for (let i = 0; i < numHouses; i++) {
    const house: Record<string, string> = {};
    for (const cat of categories) {
      house[cat.name] = "";
    }
    grid.push(house);
  }

  // For each category, track which values are used
  const usedValues: Record<string, Set<string>> = {};
  for (const cat of categories) {
    usedValues[cat.name] = new Set();
  }

  // Build a list of all (house, category) slots to fill
  const slots: { house: number; category: string }[] = [];
  for (let h = 0; h < numHouses; h++) {
    for (const cat of categories) {
      slots.push({ house: h, category: cat.name });
    }
  }

  // Pre-evaluate position-direct clues to set fixed values
  const fixedPositions: Record<string, { category: string; value: string; position: number }[]> = {};
  for (const cat of categories) {
    fixedPositions[cat.name] = [];
  }

  for (const clue of clues) {
    if (clue.position !== undefined && clue.subject) {
      fixedPositions[clue.subject.category].push({
        category: clue.subject.category,
        value: clue.subject.value,
        position: clue.position - 1, // convert to 0-indexed
      });
    }
  }

  function canPlace(house: number, category: string, value: string): boolean {
    // Check uniqueness within category
    if (usedValues[category]!.has(value)) return false;
    // Check no duplicate in the same house for the same category (shouldn't happen by construction)
    if (grid[house]![category] !== "") return false;
    return true;
  }

  function checkPartialClues(): boolean {
    // Check all clues that can be evaluated with the current partial grid
    for (const clue of clues) {
      if (clue.type === "superlative") continue;

      // Check if all referenced entities are placed
      const subject = resolveEntity(clue.subject, grid, categories);
      if (!subject) continue;
      const subjectVal = grid.find((h) => h[subject.category] === subject.value);
      if (!subjectVal) continue;

      const subjectPos = findPosition(grid, subject.category, subject.value);
      if (subjectPos === -1) continue;

      switch (clue.type) {
        case "equality": {
          const object = clue.object ? resolveEntity(clue.object, grid, categories) : null;
          if (!object) continue;
          const objectPos = findPosition(grid, object.category, object.value);
          if (objectPos === -1) continue;
          if (subjectPos !== objectPos) return false;
          break;
        }
        case "neighbor": {
          const object = clue.object ? resolveEntity(clue.object, grid, categories) : null;
          if (!object) continue;
          const objectPos = findPosition(grid, object.category, object.value);
          if (objectPos === -1) continue;
          if (Math.abs(subjectPos - objectPos) !== 1) return false;
          break;
        }
        case "left_of": {
          const object = clue.object ? resolveEntity(clue.object, grid, categories) : null;
          if (!object) continue;
          const objectPos = findPosition(grid, object.category, object.value);
          if (objectPos === -1) continue;
          if (subjectPos !== objectPos - 1) return false;
          break;
        }
        case "right_of": {
          const object = clue.object ? resolveEntity(clue.object, grid, categories) : null;
          if (!object) continue;
          const objectPos = findPosition(grid, object.category, object.value);
          if (objectPos === -1) continue;
          if (subjectPos !== objectPos + 1) return false;
          break;
        }
        case "end": {
          if (clue.endPosition === "first" && subjectPos !== 0) return false;
          if (clue.endPosition === "last" && subjectPos !== numHouses - 1) return false;
          break;
        }
        case "exclusion": {
          const object = clue.object ? resolveEntity(clue.object, grid, categories) : null;
          if (!object) continue;
          const objectPos = findPosition(grid, object.category, object.value);
          if (objectPos === -1) continue;
          if (subjectPos === objectPos) return false;
          break;
        }
        case "order": {
          const object = clue.object ? resolveEntity(clue.object, grid, categories) : null;
          if (!object) continue;
          const objectPos = findPosition(grid, object.category, object.value);
          if (objectPos === -1) continue;
          if (clue.direction === "left" && !(subjectPos < objectPos)) return false;
          if (clue.direction === "right" && !(subjectPos > objectPos)) return false;
          break;
        }
        case "between": {
          if (!clue.bounds) continue;
          const left = resolveEntity(clue.bounds[0]!, grid, categories);
          const right = resolveEntity(clue.bounds[1]!, grid, categories);
          if (!left || !right) continue;
          const leftPos = findPosition(grid, left.category, left.value);
          const rightPos = findPosition(grid, right.category, right.value);
          if (leftPos === -1 || rightPos === -1) continue;
          if (!(leftPos < subjectPos && subjectPos < rightPos)) return false;
          break;
        }
      }
    }
    return true;
  }

  function backtrack(slotIdx: number): boolean {
    if (solutions.length >= maxSolutions) return true;

    if (slotIdx >= slots.length) {
      // All slots filled — verify all clues
      for (const clue of clues) {
        if (!evaluateClue(clue, grid, categories)) return false;
      }
      solutions.push(grid.map((h) => ({ ...h })));
      return solutions.length >= maxSolutions;
    }

    const slot = slots[slotIdx]!;
    const cat = categories.find((c) => c.name === slot.category)!;

    // Check if this slot has a fixed value
    const fixed = fixedPositions[slot.category]?.find(
      (f) => f.position === slot.house,
    );

    if (fixed) {
      if (!canPlace(slot.house, slot.category, fixed.value)) return false;
      grid[slot.house]![slot.category] = fixed.value;
      usedValues[slot.category]!.add(fixed.value);
      if (checkPartialClues()) {
        backtrack(slotIdx + 1);
      }
      grid[slot.house]![slot.category] = "";
      usedValues[slot.category]!.delete(fixed.value);
      return solutions.length >= maxSolutions;
    }

    for (const value of cat.values) {
      if (!canPlace(slot.house, slot.category, value)) continue;

      grid[slot.house]![slot.category] = value;
      usedValues[slot.category]!.add(value);

      if (checkPartialClues()) {
        backtrack(slotIdx + 1);
        if (solutions.length >= maxSolutions) {
          grid[slot.house]![slot.category] = "";
          usedValues[slot.category]!.delete(value);
          return true;
        }
      }

      grid[slot.house]![slot.category] = "";
      usedValues[slot.category]!.delete(value);
    }

    return false;
  }

  backtrack(0);
  return solutions;
}

/** Check if clues produce a unique solution */
export function hasUniqueSolution(
  categories: Category[],
  numHouses: number,
  clues: Clue[],
): boolean {
  const sols = solve(categories, numHouses, clues, 2);
  return sols.length === 1;
}

// ── Clue minimizer ────────────────────────────────────────────────────────────

/** Remove redundant clues while maintaining unique solution */
export function minimizeClues(
  categories: Category[],
  numHouses: number,
  clues: Clue[],
): Clue[] {
  const result = [...clues];

  // Try removing each clue one at a time
  for (let i = result.length - 1; i >= 0; i--) {
    const reduced = result.filter((_, idx) => idx !== i);
    if (hasUniqueSolution(categories, numHouses, reduced)) {
      result.splice(i, 1);
    }
  }

  return result;
}

// ── Procedural puzzle generation ──────────────────────────────────────────────

const DIFFICULTY_HOUSES: Record<Difficulty, [number, number]> = {
  easy: [3, 4],
  medium: [4, 5],
  hard: [5, 5],
  expert: [5, 7],
};

const DIFFICULTY_CLUE_RATIO: Record<Difficulty, number> = {
  easy: 1.5,
  medium: 1.2,
  hard: 1.0,
  expert: 0.85,
};

/** Generate a random clue that is true for the given solution */
function generateRandomClue(
  solution: Solution,
  categories: Category[],
  rng: () => number,
): Clue | null {
  const numHouses = solution.length;
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

  const types: ClueType[] = [
    "equality", "neighbor", "left_of", "right_of",
    "end", "exclusion", "order", "between",
  ];

  // Add superlative if ordinal categories exist
  const ordinalCats = categories.filter((c) => c.ordinal);
  if (ordinalCats.length > 0) types.push("superlative");

  const type = pick(types);
  const id = `clue-${Math.floor(rng() * 1e9)}`;

  switch (type) {
    case "equality": {
      const cat1 = pick(categories);
      const cat2 = pick(categories.filter((c) => c.name !== cat1.name));
      if (!cat2) return null;
      const houseIdx = Math.floor(rng() * numHouses);
      const val1 = solution[houseIdx]![cat1.name]!;
      const val2 = solution[houseIdx]![cat2.name]!;
      return {
        id, type: "equality",
        subject: { category: cat1.name, value: val1 },
        object: { category: cat2.name, value: val2 },
        text: `Quem tem ${val1} também tem ${val2}.`,
      };
    }

    case "neighbor": {
      const cat1 = pick(categories);
      const cat2 = pick(categories);
      const houseIdx = 1 + Math.floor(rng() * (numHouses - 2));
      if (houseIdx < 0 || houseIdx >= numHouses) return null;
      const neighborIdx = rng() < 0.5 ? houseIdx - 1 : houseIdx + 1;
      if (neighborIdx < 0 || neighborIdx >= numHouses) return null;
      const val1 = solution[houseIdx]![cat1.name]!;
      const val2 = solution[neighborIdx]![cat2.name]!;
      return {
        id, type: "neighbor",
        subject: { category: cat1.name, value: val1 },
        object: { category: cat2.name, value: val2 },
        text: `Quem tem ${val1} está ao lado de quem tem ${val2}.`,
      };
    }

    case "left_of": {
      const cat1 = pick(categories);
      const cat2 = pick(categories);
      const leftIdx = Math.floor(rng() * (numHouses - 1));
      const rightIdx = leftIdx + 1;
      const val1 = solution[leftIdx]![cat1.name]!;
      const val2 = solution[rightIdx]![cat2.name]!;
      return {
        id, type: "left_of",
        subject: { category: cat1.name, value: val1 },
        object: { category: cat2.name, value: val2 },
        text: `Quem tem ${val1} está exatamente à esquerda de quem tem ${val2}.`,
      };
    }

    case "right_of": {
      const cat1 = pick(categories);
      const cat2 = pick(categories);
      const rightIdx = Math.floor(rng() * (numHouses - 1));
      const leftIdx = rightIdx + 1;
      const val1 = solution[leftIdx]![cat1.name]!;
      const val2 = solution[rightIdx]![cat2.name]!;
      return {
        id, type: "right_of",
        subject: { category: cat1.name, value: val1 },
        object: { category: cat2.name, value: val2 },
        text: `Quem tem ${val1} está exatamente à direita de quem tem ${val2}.`,
      };
    }

    case "end": {
      const cat = pick(categories);
      const endPos: "first" | "last" = rng() < 0.5 ? "first" : "last";
      const houseIdx = endPos === "first" ? 0 : numHouses - 1;
      const val = solution[houseIdx]![cat.name]!;
      return {
        id, type: "end",
        subject: { category: cat.name, value: val },
        endPosition: endPos,
        text: endPos === "first"
          ? `Quem tem ${val} está na primeira posição.`
          : `Quem tem ${val} está na última posição.`,
      };
    }

    case "exclusion": {
      const cat1 = pick(categories);
      const cat2 = pick(categories.filter((c) => c.name !== cat1.name));
      if (!cat2) return null;
      const houseIdx = Math.floor(rng() * numHouses);
      const val1 = solution[houseIdx]![cat1.name]!;
      // Pick a value from cat2 that is NOT in this house
      const otherVal = pick(cat2.values.filter((v) => v !== solution[houseIdx]![cat2.name]));
      return {
        id, type: "exclusion",
        subject: { category: cat1.name, value: val1 },
        object: { category: cat2.name, value: otherVal },
        text: `Quem tem ${val1} não tem ${otherVal}.`,
      };
    }

    case "order": {
      const cat1 = pick(categories);
      const cat2 = pick(categories);
      const pos1 = Math.floor(rng() * numHouses);
      let pos2 = Math.floor(rng() * numHouses);
      if (pos1 === pos2) return null;
      const direction = pos1 < pos2 ? "left" : "right";
      const val1 = solution[pos1]![cat1.name]!;
      const val2 = solution[pos2]![cat2.name]!;
      return {
        id, type: "order",
        subject: { category: cat1.name, value: val1 },
        object: { category: cat2.name, value: val2 },
        direction,
        text: direction === "left"
          ? `Quem tem ${val1} está em algum lugar à esquerda de quem tem ${val2}.`
          : `Quem tem ${val1} está em algum lugar à direita de quem tem ${val2}.`,
      };
    }

    case "between": {
      const cat = pick(categories);
      const catA = pick(categories);
      const catB = pick(categories);
      const mid = 1 + Math.floor(rng() * (numHouses - 2));
      const left = Math.floor(rng() * mid);
      const right = mid + 1 + Math.floor(rng() * (numHouses - mid - 1));
      if (left >= mid || mid >= right) return null;
      const valMid = solution[mid]![cat.name]!;
      const valLeft = solution[left]![catA.name]!;
      const valRight = solution[right]![catB.name]!;
      return {
        id, type: "between",
        subject: { category: cat.name, value: valMid },
        bounds: [
          { category: catA.name, value: valLeft },
          { category: catB.name, value: valRight },
        ],
        text: `Quem tem ${valMid} está em algum lugar entre quem tem ${valLeft} e quem tem ${valRight}, nessa ordem.`,
      };
    }

    case "superlative": {
      const cat = pick(ordinalCats);
      if (!cat || !cat.ordValues) return null;
      const sup: "max" | "min" = rng() < 0.5 ? "max" : "min";
      // The superlative clue needs a secondary association
      const cat2 = pick(categories.filter((c) => c.name !== cat.name));
      if (!cat2) return null;
      // Find the house with max/min ordValue
      let targetIdx = 0;
      if (sup === "max") {
        let maxVal = -Infinity;
        for (let i = 0; i < numHouses; i++) {
          const v = solution[i]![cat.name]!;
          const vi = cat.values.indexOf(v);
          if (cat.ordValues[vi]! > maxVal) {
            maxVal = cat.ordValues[vi]!;
            targetIdx = i;
          }
        }
      } else {
        let minVal = Infinity;
        for (let i = 0; i < numHouses; i++) {
          const v = solution[i]![cat.name]!;
          const vi = cat.values.indexOf(v);
          if (cat.ordValues[vi]! < minVal) {
            minVal = cat.ordValues[vi]!;
            targetIdx = i;
          }
        }
      }
      const val2 = solution[targetIdx]![cat2.name]!;
      const supLabel = sup === "max" ? "o maior" : "o menor";
      return {
        id, type: "equality",
        subject: { category: cat.name, value: sup },
        object: { category: cat2.name, value: val2 },
        text: `Quem tem ${supLabel} de ${cat.name} também tem ${val2}.`,
      };
    }

    default:
      return null;
  }
}

/** Generate a procedural puzzle with unique solution */
export function generatePuzzle(
  theme: Theme,
  difficulty: Difficulty,
  seed?: number,
): Puzzle {
  const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(actualSeed);

  const [minH, maxH] = DIFFICULTY_HOUSES[difficulty];
  const numHouses = minH + Math.floor(rng() * (maxH - minH + 1));

  // Use a subset of categories if numHouses < theme.categories.length
  // For simplicity, use all categories but only numHouses values per category
  const categories: Category[] = theme.categories.map((cat) => ({
    ...cat,
    values: cat.values.slice(0, numHouses),
    ordValues: cat.ordValues?.slice(0, numHouses),
  }));

  const solution = generateSolution(categories, numHouses, rng);

  // Generate clues
  const targetClueCount = Math.ceil(numHouses * categories.length * DIFFICULTY_CLUE_RATIO[difficulty]);
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const clues: Clue[] = [];
    const seenIds = new Set<string>();

    let genAttempts = 0;
    while (clues.length < targetClueCount && genAttempts < 100) {
      genAttempts++;
      const clue = generateRandomClue(solution, categories, rng);
      if (clue && !seenIds.has(clue.id)) {
        clues.push(clue);
        seenIds.add(clue.id);
      }
    }

    if (clues.length < 2) {
      attempts++;
      continue;
    }

    // Check uniqueness
    if (hasUniqueSolution(categories, numHouses, clues)) {
      // Minimize
      const minimized = minimizeClues(categories, numHouses, clues);
      return {
        id: `einstein-proc-${theme.id}-${difficulty}-${actualSeed}`,
        themeId: theme.id,
        themeName: theme.name,
        difficulty,
        numHouses,
        categories,
        clues: minimized,
        solution,
        seed: actualSeed,
        isProcedural: true,
      };
    }

    attempts++;
  }

  // Fallback: keep adding clues until unique
  const clues: Clue[] = [];
  const seenIds = new Set<string>();
  let genAttempts = 0;
  while (genAttempts < 300) {
    genAttempts++;
    const clue = generateRandomClue(solution, categories, rng);
    if (clue && !seenIds.has(clue.id)) {
      clues.push(clue);
      seenIds.add(clue.id);
      if (hasUniqueSolution(categories, numHouses, clues)) {
        const minimized = minimizeClues(categories, numHouses, clues);
        return {
          id: `einstein-proc-${theme.id}-${difficulty}-${actualSeed}`,
          themeId: theme.id,
          themeName: theme.name,
          difficulty,
          numHouses,
          categories,
          clues: minimized,
          solution,
          seed: actualSeed,
          isProcedural: true,
        };
      }
    }
  }

  // Last resort: reveal positions as clues
  for (let h = 0; h < numHouses; h++) {
    for (const cat of categories) {
      const val = solution[h]![cat.name]!;
      clues.push({
        id: `fixed-${h}-${cat.name}`,
        type: "equality",
        subject: { category: cat.name, value: val },
        position: h + 1,
        text: `Na posição ${h + 1} está ${val}.`,
      });
      if (hasUniqueSolution(categories, numHouses, clues)) {
        return {
          id: `einstein-proc-${theme.id}-${difficulty}-${actualSeed}`,
          themeId: theme.id,
          themeName: theme.name,
          difficulty,
          numHouses,
          categories,
          clues,
          solution,
          seed: actualSeed,
          isProcedural: true,
        };
      }
    }
  }

  // Should never reach here
  return {
    id: `einstein-proc-${theme.id}-${difficulty}-${actualSeed}`,
    themeId: theme.id,
    themeName: theme.name,
    difficulty,
    numHouses,
    categories,
    clues,
    solution,
    seed: actualSeed,
    isProcedural: true,
  };
}

export function generateDailyPuzzle(themes: Theme[]): Puzzle {
  const theme = themes[Math.floor(dateSeed() % themes.length)]!;
  return generatePuzzle(theme, "medium", dateSeed());
}

// ── Hint engine ───────────────────────────────────────────────────────────────

/** Find a cell that can be deduced from the current state */
export function generateHint(
  playerGrid: Record<string, string>[],
  categories: Category[],
  numHouses: number,
  clues: Clue[],
  solution: Solution,
): Hint | null {
  // Find an empty cell that has only one possible value
  for (let h = 0; h < numHouses; h++) {
    for (const cat of categories) {
      if (playerGrid[h]![cat.name] !== "") continue;

      const possible: string[] = [];
      for (const val of cat.values) {
        // Check if val is already used in this category
        let used = false;
        for (let hh = 0; hh < numHouses; hh++) {
          if (hh !== h && playerGrid[hh]![cat.name] === val) {
            used = true;
            break;
          }
        }
        if (used) continue;
        possible.push(val);
      }

      if (possible.length === 1) {
        return {
          category: cat.name,
          position: h,
          value: possible[0]!,
          explanation: `Por eliminação, ${cat.name} na posição ${h + 1} só pode ser ${possible[0]}.`,
        };
      }
    }
  }

  // Fallback: reveal a correct cell from the solution
  for (let h = 0; h < numHouses; h++) {
    for (const cat of categories) {
      if (playerGrid[h]![cat.name] === "") {
        return {
          category: cat.name,
          position: h,
          value: solution[h]![cat.name]!,
          explanation: `A posição ${h + 1} tem ${solution[h]![cat.name]!} em ${cat.name}.`,
        };
      }
    }
  }

  return null;
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Check if the player's grid matches the solution */
export function checkSolution(
  playerGrid: Record<string, string>[],
  solution: Solution,
): boolean {
  if (playerGrid.length !== solution.length) return false;
  for (let i = 0; i < solution.length; i++) {
    for (const key in solution[i]) {
      if (playerGrid[i]![key] !== solution[i]![key]) return false;
    }
  }
  return true;
}

/** Check if the player's grid is complete (all cells filled) */
export function isGridComplete(
  playerGrid: Record<string, string>[],
  categories: Category[],
  numHouses: number,
): boolean {
  for (let h = 0; h < numHouses; h++) {
    for (const cat of categories) {
      if (!playerGrid[h]?.[cat.name]) return false;
    }
  }
  return true;
}

/** Check if the grid is valid (no duplicates within a category) */
export function isGridValid(
  playerGrid: Record<string, string>[],
  categories: Category[],
  numHouses: number,
): boolean {
  for (const cat of categories) {
    const seen = new Set<string>();
    for (let h = 0; h < numHouses; h++) {
      const val = playerGrid[h]?.[cat.name];
      if (!val) continue;
      if (seen.has(val)) return false;
      seen.add(val);
    }
  }
  return true;
}

/** Check which clues are currently violated */
export function findViolatedClues(
  playerGrid: Record<string, string>[],
  clues: Clue[],
  categories: Category[],
): Clue[] {
  return clues.filter((clue) => {
    // Only check if all referenced entities are placed
    const subject = resolveEntity(clue.subject, playerGrid, categories);
    if (!subject) return false;
    const subjectPos = findPosition(playerGrid, subject.category, subject.value);
    if (subjectPos === -1) return false;

    if (clue.object) {
      const object = resolveEntity(clue.object, playerGrid, categories);
      if (!object) return false;
      const objectPos = findPosition(playerGrid, object.category, object.value);
      if (objectPos === -1) return false;
    }

    if (clue.bounds) {
      for (const b of clue.bounds) {
        const resolved = resolveEntity(b, playerGrid, categories);
        if (!resolved) return false;
        const pos = findPosition(playerGrid, resolved.category, resolved.value);
        if (pos === -1) return false;
      }
    }

    return !evaluateClue(clue, playerGrid, categories);
  });
}

// ── Theme-to-puzzle conversion ────────────────────────────────────────────────

export function themeToPuzzle(theme: Theme, difficulty: Difficulty = "medium"): Puzzle {
  return {
    id: `einstein-theme-${theme.id}`,
    themeId: theme.id,
    themeName: theme.name,
    difficulty,
    numHouses: theme.numHouses,
    categories: theme.categories,
    clues: theme.clues,
    solution: theme.solution,
    question: theme.question,
    answer: theme.answer,
    seed: 0,
    isProcedural: false,
  };
}
