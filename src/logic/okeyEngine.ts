/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Color, Tile, Player, Combination, GameMode, GameState, GamePhase } from "../types";

export const COLORS = [Color.RED, Color.YELLOW, Color.BLACK, Color.BLUE];

/**
 * Generates a standard 106 tile deck
 */
export const createDeck = (): Tile[] => {
  const deck: Tile[] = [];
  let id = 0;
  for (const color of COLORS) {
    for (let num = 1; num <= 13; num++) {
      deck.push({ id: `tile-${id++}`, number: num, color, isOkey: false, isIndicator: false });
      deck.push({ id: `tile-${id++}`, number: num, color, isOkey: false, isIndicator: false });
    }
  }
  deck.push({ id: `tile-${id++}`, number: 0, color: Color.JOKER, isOkey: false, isIndicator: false });
  deck.push({ id: `tile-${id++}`, number: 0, color: Color.JOKER, isOkey: false, isIndicator: false });
  return deck;
};

export const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const determineOkey = (indicator: Tile) => {
  let okeyNum = indicator.number + 1;
  if (okeyNum > 13) okeyNum = 1;
  return { number: okeyNum, color: indicator.color };
};

export const isRealOkey = (tile: Tile, okeyTile: { number: number; color: Color } | null): boolean => {
  return !!(okeyTile && tile.number === okeyTile.number && tile.color === okeyTile.color);
};

export const isFakeOkey = (tile: Tile): boolean => {
  return tile.color === Color.JOKER;
};

export const isWildcard = (tile: Tile, okeyTile: { number: number; color: Color } | null): boolean => {
  return isRealOkey(tile, okeyTile);
};

export const isOkeyLike = isWildcard;

export const getEffectiveTile = (tile: Tile, okeyTile: { number: number; color: Color } | null): { number: number, color: Color } => {
  if (tile.color === Color.JOKER && okeyTile) {
    return { number: okeyTile.number, color: okeyTile.color };
  }
  return { number: tile.number, color: tile.color };
};

export const getTileScore = (tile: Tile, okeyTile: { number: number; color: Color } | null): number => {
  if (isRealOkey(tile, okeyTile)) return 101;
  const effective = getEffectiveTile(tile, okeyTile);
  return effective.number === 1 ? 11 : effective.number;
};

const getRunCandidateNumbers = (startNum: number, length: number): number[] | null => {
  if (length < 3 || length > 13) return null;
  const endNum = startNum + length - 1;
  if (endNum <= 13) {
    return Array.from({ length }, (_, idx) => startNum + idx);
  }
  return null;
};

export const calculateDiscardPenalty = (tile: Tile, gameState: GameState, player: Player): { penalty: number; reason: string | null } => {
  let penalty = 0;
  let reason = null;

  if (isPlayableAnywhere(tile, gameState.players, gameState.okeyTile)) {
    penalty += 101;
    reason = `${player.name} işler taş attığı için 101 ceza aldı!`;
  }

  if (isRealOkey(tile, gameState.okeyTile)) {
    penalty += 101;
    const okeyReason = `${player.name} OKEY attığı için 101 ceza aldı!`;
    reason = reason ? `${reason}\n${okeyReason}` : okeyReason;
  }

  return { penalty, reason };
};

export const calculateSetScore = (set: Combination, okeyTile: { number: number; color: Color } | null): number => {
    if (set.type === "group") {
        const normalTile = set.tiles.find(t => !isWildcard(t, okeyTile));
        if (!normalTile) return 0;
        const effective = getEffectiveTile(normalTile, okeyTile);
        let val = effective.number === 1 ? 11 : effective.number;
        return val * set.tiles.length;
    } else {
        const normalTiles = set.tiles.filter(t => !isWildcard(t, okeyTile));
        if (normalTiles.length === 0) return 0;
        const effTiles = normalTiles.map(t => getEffectiveTile(t, okeyTile));
        const nums = effTiles.map(t => t.number);
        
        const minNum = Math.min(...nums);
        const firstNormalIdx = set.tiles.findIndex(t => !isWildcard(t, okeyTile) && getEffectiveTile(t, okeyTile).number === minNum);
        const startNum = minNum - firstNormalIdx;
        
        let sum = 0;
        for (let i = 0; i < set.tiles.length; i++) {
            sum += (startNum + i);
        }
        return sum;
    }
};

export const isValidGroup = (tiles: Tile[], okeyTile: { number: number; color: Color } | null): boolean => {
  if (tiles.length < 3 || tiles.length > 4) return false;
  const normalTiles = tiles.filter(t => !isWildcard(t, okeyTile)).map(t => getEffectiveTile(t, okeyTile));
  if (normalTiles.length === 0) return true;
  const number = normalTiles[0].number;
  if (normalTiles.some(t => t.number !== number)) return false;
  const colors = normalTiles.map(t => t.color);
  if (new Set(colors).size !== colors.length) return false;
  return true;
};

export const isValidRun = (tiles: Tile[], okeyTile: { number: number; color: Color } | null): boolean => {
  if (tiles.length < 3) return false;
  const normalTiles = tiles.filter(t => !isWildcard(t, okeyTile));
  if (normalTiles.length === 0) return true;
  const effNormal = normalTiles.map(t => getEffectiveTile(t, okeyTile));
  const color = effNormal[0].color;
  if (effNormal.some(t => t.color !== color)) return false;
  const nums = effNormal.map(t => t.number);
  if (new Set(nums).size !== nums.length) return false;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return (max - min + 1) <= tiles.length;
};

export const findBestSets = (hand: (Tile | null)[], okeyTile: { number: number; color: Color } | null): Combination[] => {
  const tiles = hand.filter((t): t is Tile => t !== null);
  const allCandidates: Combination[] = [];
  const wildcards = tiles.filter(t => isWildcard(t, okeyTile));

  for (let num = 1; num <= 13; num++) {
    const groupCandidates = tiles.filter(t => !isWildcard(t, okeyTile) && getEffectiveTile(t, okeyTile).number === num);
    const uniqueColors: Tile[] = [];
    const colorsSeen = new Set<Color>();
    groupCandidates.forEach(t => {
      const color = getEffectiveTile(t, okeyTile).color;
      if (!colorsSeen.has(color)) { uniqueColors.push(t); colorsSeen.add(color); }
    });

    for (let len = 3; len <= 4; len++) {
      if (uniqueColors.length + wildcards.length >= len) {
        const usedNormal = uniqueColors.slice(0, Math.min(uniqueColors.length, len));
        const neededWildcards = len - usedNormal.length;
        if (wildcards.length >= neededWildcards) {
          const setTiles = [...usedNormal, ...wildcards.slice(0, neededWildcards)];
          const score = calculateSetScore({ tiles: setTiles, type: "group", score: 0 }, okeyTile);
          allCandidates.push({ tiles: setTiles, type: "group", score });
        }
      }
    }
  }

  for (const color of COLORS) {
    const colorTiles = tiles.filter(t => !isWildcard(t, okeyTile) && getEffectiveTile(t, okeyTile).color === color)
      .sort((a, b) => getEffectiveTile(a, okeyTile).number - getEffectiveTile(b, okeyTile).number);

    for (let len = 3; len <= 13; len++) {
      for (let startNum = 1; startNum <= 13 - len + 1; startNum++) {
        const runNumbers = Array.from({ length: len }, (_, i) => startNum + i);
        let currentRun: Tile[] = [];
        let usedWildcardsCount = 0;
        let possible = true;

        for (const targetNum of runNumbers) {
          const available = colorTiles.find(t => getEffectiveTile(t, okeyTile).number === targetNum && !currentRun.some(rt => rt.id === t.id));
          if (available) { currentRun.push(available); }
          else if (usedWildcardsCount < wildcards.length) { currentRun.push(wildcards[usedWildcardsCount++]); }
          else { possible = false; break; }
        }

        if (possible) {
          const score = calculateSetScore({ tiles: currentRun, type: "run", score: 0 }, okeyTile);
          allCandidates.push({ tiles: currentRun, type: "run", score });
        }
      }
    }
  }

  allCandidates.sort((a, b) => b.score - a.score);
  let bestResult: Combination[] = [];
  let bestScore = 0;
  const usedIds = new Set<string>();
  const suffixMax = new Array(allCandidates.length + 1).fill(0);
  for (let i = allCandidates.length - 1; i >= 0; i--) suffixMax[i] = suffixMax[i + 1] + allCandidates[i].score;

  function backtrack(idx: number, current: Combination[], score: number) {
    if (score > bestScore) { bestScore = score; bestResult = [...current]; }
    if (idx >= allCandidates.length || score + suffixMax[idx] <= bestScore) return;
    for (let i = idx; i < allCandidates.length; i++) {
      const candidate = allCandidates[i];
      if (candidate.tiles.some(t => usedIds.has(t.id))) continue;
      candidate.tiles.forEach(t => usedIds.add(t.id));
      current.push(candidate);
      backtrack(i + 1, current, score + candidate.score);
      current.pop();
      candidate.tiles.forEach(t => usedIds.delete(t.id));
    }
  }
  backtrack(0, [], 0);
  return bestResult;
};

export const findPairs = (hand: (Tile | null)[], okeyTile: { number: number; color: Color } | null): Tile[][] => {
  const tiles = hand.filter((t): t is Tile => t !== null);
  const pairs: Tile[][] = [];
  const usedIds = new Set<string>();
  const normalTiles = tiles.filter(t => !isWildcard(t, okeyTile));

  for (let i = 0; i < normalTiles.length; i++) {
    if (usedIds.has(normalTiles[i].id)) continue;
    for (let j = i + 1; j < normalTiles.length; j++) {
      if (usedIds.has(normalTiles[j].id)) continue;
      const t1 = getEffectiveTile(normalTiles[i], okeyTile);
      const t2 = getEffectiveTile(normalTiles[j], okeyTile);
      if (t1.number === t2.number && t1.color === t2.color) {
        pairs.push([normalTiles[i], normalTiles[j]]);
        usedIds.add(normalTiles[i].id);
        usedIds.add(normalTiles[j].id);
        break;
      }
    }
  }
  return pairs;
};

export const calculateHandTotal = (hand: (Tile | null)[], okeyTile: { number: number; color: Color } | null): number => {
  return hand.reduce((sum, tile) => sum + (tile ? getTileScore(tile, okeyTile) : 0), 0);
};

export const sortByStandard = (hand: (Tile | null)[]): (Tile | null)[] => {
  const tiles = hand.filter((t): t is Tile => t !== null);
  const sorted = [...tiles].sort((a, b) => {
    if (a.color !== b.color) {
      const colorOrder = [Color.RED, Color.YELLOW, Color.BLACK, Color.BLUE, Color.JOKER];
      return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
    }
    return a.number - b.number;
  });
  const result: (Tile | null)[] = new Array(30).fill(null);
  sorted.forEach((t, i) => { if (i < 30) result[i] = t; });
  return result;
};

export const sortByPairs = (hand: (Tile | null)[], okeyTile: { number: number; color: Color } | null): (Tile | null)[] => {
  const tiles = hand.filter((t): t is Tile => t !== null);
  const pairs = findPairs(tiles, okeyTile);
  const pairedIds = new Set(pairs.flat().map(t => t.id));
  const remainingTiles = tiles.filter(t => !pairedIds.has(t.id)).sort((a,b) => a.number - b.number);
  
  const result: (Tile | null)[] = new Array(30).fill(null);
  let pos = 0;
  pairs.forEach(pair => {
    if (pos + 1 < 30) {
      result[pos++] = pair[0];
      result[pos++] = pair[1];
      pos++; 
    }
  });
  
  remainingTiles.forEach(t => {
    if (pos < 30) result[pos++] = t;
  });
  return result;
};

export const sortBySets = (hand: (Tile | null)[], okeyTile: { number: number; color: Color } | null): (Tile | null)[] => {
  const tiles = hand.filter((t): t is Tile => t !== null);
  const sets = findBestSets(tiles, okeyTile);
  const usedIds = new Set(sets.flatMap(s => s.tiles).map(t => t.id));
  const remainingTiles = tiles.filter(t => !usedIds.has(t.id));
  
  const result: (Tile | null)[] = new Array(30).fill(null);
  let pos = 0;
  
  sets.forEach((set) => {
    if (pos + set.tiles.length >= 30) return;
    set.tiles.forEach(t => { result[pos++] = t; });
    pos++; 
  });

  if (pos < 15) pos = 15; 
  else pos++;

  const leftovers = [...remainingTiles].sort((a, b) => {
    const effA = getEffectiveTile(a, okeyTile);
    const effB = getEffectiveTile(b, okeyTile);
    if (effA.color !== effB.color) return COLORS.indexOf(effA.color) - COLORS.indexOf(effB.color);
    return effA.number - effB.number;
  });

  leftovers.forEach(t => {
    if (pos < 30) result[pos++] = t;
  });
  
  return result;
};

export const calculatePenalty = (player: Player, isHandFinished: boolean, gameState: GameState): number => {
  if (!player.hasOpened) return 202;
  const sum = player.hand.reduce((s, t) => s + (t ? getTileScore(t, gameState.okeyTile) : 0), 0);
  return player.openedWithType === 'pairs' ? sum * 2 : sum;
};

export const canProcessTile = (tile: Tile, set: Combination, okeyTile: { number: number; color: Color } | null): boolean => {
  const newTiles = [...set.tiles, tile];
  return set.type === "group" ? isValidGroup(newTiles, okeyTile) : isValidRun(newTiles, okeyTile);
};

export const canSwapOkey = (tile: Tile, set: Combination, okeyTile: { number: number; color: Color } | null): boolean => {
  if (isWildcard(tile, okeyTile)) return false;
  if (!set.tiles.some(t => isWildcard(t, okeyTile))) return false;
  if (set.type === "group") {
    if (set.tiles.length !== 4) return false;
    const normalTiles = set.tiles.filter(t => !isWildcard(t, okeyTile));
    const existingColors = normalTiles.map(t => t.color);
    if (existingColors.includes(tile.color)) return false;
    return true;
  }
  for (let i = 0; i < set.tiles.length; i++) {
    if (isWildcard(set.tiles[i], okeyTile)) {
      const testTiles = [...set.tiles];
      testTiles[i] = tile;
      if (set.type === "run" && isValidRun(testTiles, okeyTile)) return true;
    }
  }
  return false;
};

export const canProcessPair = (pair: Tile[], okeyTile: { number: number; color: Color } | null): boolean => {
  if (pair.length !== 2) return false;
  const eff1 = getEffectiveTile(pair[0], okeyTile);
  const eff2 = getEffectiveTile(pair[1], okeyTile);
  return eff1.number === eff2.number && eff1.color === eff2.color;
};

export const isPlayableAnywhere = (tile: Tile, players: Player[], okeyTile: { number: number; color: Color } | null): boolean => {
  for (const player of players) {
    for (const set of player.openedSets) if (canProcessTile(tile, set, okeyTile)) return true;
    for (const pair of player.openedPairs) if (canSwapOkey(tile, { tiles: pair, type: "group", score: 0 }, okeyTile)) return true;
  }
  return false;
};

export const checkWin = (player: Player): boolean => player.hand.every(t => t === null);

export const aiTakeTurn = (gameState: GameState): Partial<GameState> | null => {
  const player = gameState.players[gameState.currentPlayerIndex];
  if (!player.isAI) return null;

  const logs = [...gameState.logs];
  const deck = [...gameState.deck];
  const discardPile = [...gameState.discardPile];
  const players = [...gameState.players];
  const currentPlayer = { ...players[gameState.currentPlayerIndex] };

  const topDiscard = discardPile[discardPile.length - 1];
  let drewFromDiscard = false;

  if (topDiscard && !currentPlayer.hasOpened) {
     const currentTiles = currentPlayer.hand.filter((t): t is Tile => t !== null);
     const tempHand = [...currentTiles, topDiscard];
     const sets = findBestSets(tempHand, gameState.okeyTile);
     const totalScore = sets.reduce((s, set) => s + set.score, 0);
     const minScore = gameState.mode === GameMode.FOLDING ? gameState.currentOpenScore + 1 : 101;
     
     if (totalScore >= minScore) {
        drewFromDiscard = true;
        discardPile.pop();
        const emptyIdx = currentPlayer.hand.indexOf(null);
        if (emptyIdx !== -1) currentPlayer.hand[emptyIdx] = topDiscard;
        else currentPlayer.hand.push(topDiscard);
        logs.push(`${currentPlayer.name} yerden ${topDiscard.number} ${topDiscard.color} aldı.`);
     }
  }

  if (!drewFromDiscard) {
    const drawn = deck.pop();
    if (drawn) {
      const emptyIdx = currentPlayer.hand.indexOf(null);
      if (emptyIdx !== -1) currentPlayer.hand[emptyIdx] = drawn;
      else currentPlayer.hand.push(drawn);
      logs.push(`${currentPlayer.name} desteden taş çekti.`);
    } else {
      return {
        phase: GamePhase.FINISHED,
        logs: [...logs, `Deste bitti. Oyun sona erdi.`]
      };
    }
  }

  const currentTiles = currentPlayer.hand.filter((t): t is Tile => t !== null);
  const sets = findBestSets(currentTiles, gameState.okeyTile);
  const totalScore = sets.reduce((s, set) => s + set.score, 0);
  const pairs = findPairs(currentTiles, gameState.okeyTile);

  const minScore = currentPlayer.hasOpened ? 0 : (gameState.mode === GameMode.FOLDING ? gameState.currentOpenScore + 1 : 101);
  const minPairs = currentPlayer.hasOpened 
    ? (gameState.currentOpenPairs > 0 ? 1 : 5)
    : (gameState.mode === GameMode.FOLDING ? gameState.currentOpenPairs + 1 : 5);

  if (totalScore >= minScore && sets.length > 0 && currentPlayer.openedWithType !== 'pairs') {
    if (!currentPlayer.hasOpened) {
      currentPlayer.hasOpened = true;
      currentPlayer.openedWithType = 'sets';
      currentPlayer.openedSets = sets;
      currentPlayer.lastOpenScore = totalScore;
    } else {
      currentPlayer.openedSets = [...currentPlayer.openedSets, ...sets];
    }
    sets.forEach(set => {
      set.tiles.forEach(t => {
        const idx = currentPlayer.hand.findIndex(ht => ht?.id === t.id);
        if (idx !== -1) currentPlayer.hand[idx] = null;
      });
    });
    const remainingScore = calculateHandTotal(currentPlayer.hand, gameState.okeyTile);
    logs.push(`${currentPlayer.name} elini açtı. Kalan puan: ${remainingScore}`);
  } else if (pairs.length >= minPairs) {
    if (!currentPlayer.hasOpened) {
      currentPlayer.hasOpened = true;
      currentPlayer.openedWithType = 'pairs';
      currentPlayer.openedPairs = pairs;
      currentPlayer.lastOpenScore = pairs.length;
    } else {
      currentPlayer.openedPairs = [...currentPlayer.openedPairs, ...pairs];
    }
    pairs.forEach(pair => {
      pair.forEach(t => {
        const idx = currentPlayer.hand.findIndex(ht => ht?.id === t.id);
        if (idx !== -1) currentPlayer.hand[idx] = null;
      });
    });
    logs.push(`${currentPlayer.name} ${pairs.length} çift ile el açtı.`);
  }

  if (currentPlayer.hasOpened) {
    players.forEach((targetPlayer) => {
      if (currentPlayer.openedWithType !== 'pairs') {
        targetPlayer.openedSets.forEach((set) => {
          currentPlayer.hand.forEach((tile, hIdx) => {
            if (tile && canProcessTile(tile, set, gameState.okeyTile)) {
              set.tiles.push(tile);
              currentPlayer.hand[hIdx] = null;
              logs.push(`${currentPlayer.name}, ${targetPlayer.name}'in perine taş işledi.`);
            }
          });
        });
      }

      targetPlayer.openedPairs.forEach((pair) => {
        currentPlayer.hand.forEach((tile, hIdx) => {
          if (tile) {
            const isOkeyInPair = pair.some(t => isWildcard(t, gameState.okeyTile));
            if (isOkeyInPair) {
              const normalTile = pair.find(t => !isWildcard(t, gameState.okeyTile));
              if (normalTile && tile.number === normalTile.number && tile.color === normalTile.color) {
                const okeyIdx = pair.findIndex(t => isWildcard(t, gameState.okeyTile));
                const okeyTileInPair = pair[okeyIdx];
                pair[okeyIdx] = tile;
                currentPlayer.hand[hIdx] = okeyTileInPair;
                logs.push(`${currentPlayer.name}, ${targetPlayer.name}'in çiftinden okeyi aldı.`);
              }
            }
          }
        });
      });
    });
  }

  let discardIdx = -1;
  const handTiles = currentPlayer.hand.filter((t): t is Tile => t !== null);
  const safeTiles = handTiles.filter(t => !isWildcard(t, gameState.okeyTile) && !isPlayableAnywhere(t, players, gameState.okeyTile));
  
  if (safeTiles.length > 0) {
    const highestSafeTile = safeTiles.reduce((max, t) => {
      const maxVal = max.number === 1 ? 11 : max.number;
      const tVal = t.number === 1 ? 11 : t.number;
      return tVal > maxVal ? t : max;
    });
    discardIdx = currentPlayer.hand.findIndex(t => t?.id === highestSafeTile.id);
  } else {
    discardIdx = currentPlayer.hand.findIndex(t => t !== null && !isWildcard(t, gameState.okeyTile));
    if (discardIdx === -1) discardIdx = currentPlayer.hand.findIndex(t => t !== null);
  }
  
  const discarded = currentPlayer.hand[discardIdx]!;
  currentPlayer.hand[discardIdx] = null;
  currentPlayer.lastDiscardedTile = discarded;
  discardPile.push(discarded);
  logs.push(`${currentPlayer.name} ${discarded.number} ${discarded.color} attı.`);

  const penalty = calculateDiscardPenalty(discarded, gameState, currentPlayer);
  if (penalty.penalty > 0) {
    currentPlayer.score += penalty.penalty;
    if (penalty.reason) logs.push(penalty.reason);
  }

  players[gameState.currentPlayerIndex] = currentPlayer;

  if (currentPlayer.hand.every(t => t === null)) {
    const isOkeyFinish = isWildcard(discarded, gameState.okeyTile);
    const isPairFinish = currentPlayer.openedWithType === 'pairs';
    let winMsg = `${currentPlayer.name} oyunu bitirdi!`;
    if (isOkeyFinish) winMsg = `${currentPlayer.name} OKEY ile bitirdi! (Çift ceza)`;
    else if (isPairFinish) winMsg = `${currentPlayer.name} ÇİFT ile bitirdi! (Çift ceza)`;

    return {
      players,
      discardPile,
      logs: [...logs, winMsg],
      phase: GamePhase.FINISHED,
      winnerId: currentPlayer.id,
      hasOkeyDiscard: gameState.hasOkeyDiscard || isRealOkey(discarded, gameState.okeyTile),
      hasHandFinish: currentPlayer.openedSets.length === 0 && currentPlayer.openedPairs.length === 0,
      noOneOpened: !players.some(p => p.hasOpened && p.id !== currentPlayer.id),
    };
  }

  return {
    players,
    deck,
    discardPile,
    logs,
    currentPlayerIndex: (gameState.currentPlayerIndex + 1) % 4,
    phase: GamePhase.DRAWING,
    currentOpenScore: Math.max(gameState.currentOpenScore, currentPlayer.hasOpened && currentPlayer.openedWithType === 'sets' ? currentPlayer.lastOpenScore : 0),
    currentOpenPairs: Math.max(gameState.currentOpenPairs, currentPlayer.hasOpened && currentPlayer.openedWithType === 'pairs' ? currentPlayer.lastOpenScore : 0),
    hasDoubleOpen: gameState.hasDoubleOpen || players.some(p => p.openedWithType === 'pairs' && p.hasOpened),
    hasOkeyDiscard: gameState.hasOkeyDiscard || isRealOkey(discarded, gameState.okeyTile),
  };
};

export interface FinalScores { [playerId: string]: number; }

export const calculateFinalScores = (gameState: GameState, finisherId: string | null, discardedTile: Tile | null): FinalScores => {
  const scores: FinalScores = {};
  const okeyTile = gameState.okeyTile;
  let finishType: "normal" | "okey" | "pair" | "continuation" | "noOneContinuation" = "normal";
  
  if (finisherId && discardedTile) {
    const finisher = gameState.players.find(p => p.id === finisherId);
    const isOkeyDiscard = isWildcard(discardedTile, okeyTile);
    const isPairFinish = finisher?.openedWithType === 'pairs';
    const isContinuationDiscard = discardedTile && !isOkeyDiscard &&
      gameState.players.some(p => p.openedSets.some(s => s.tiles.some(t => t.number === discardedTile.number && t.color !== discardedTile.color && !isWildcard(t, okeyTile))));

    if (gameState.noOneOpened && isContinuationDiscard) finishType = "noOneContinuation";
    else if (isContinuationDiscard) finishType = "continuation";
    else if (isOkeyDiscard) finishType = "okey";
    else if (isPairFinish) finishType = "pair";
  }

  const winnerScore = (() => {
    switch (finishType) {
      case "noOneContinuation": return -808;
      case "continuation": return -404;
      case "okey": case "pair": return -202;
      default: return -101;
    }
  })();

  let multiplier = 1;
  if (gameState.mode === GameMode.FOLDING) {
    if (gameState.hasDoubleOpen) multiplier *= 2;
    if (gameState.hasOkeyDiscard) multiplier *= 2;
    if (gameState.hasContinuationDiscard) multiplier *= 4;
    if (gameState.hasHandFinish) multiplier *= 2;
  }

  gameState.players.forEach(player => {
    const pairMultiplier = player.openedWithType === 'pairs' ? 2 : 1;
    if (!player.hasOpened) scores[player.id] = 202 * multiplier;
    else {
      let handTotal = calculateHandTotal(player.hand, okeyTile);
      const hasOkeyInHand = player.hand.some(t => t && isWildcard(t, okeyTile));
      if (hasOkeyInHand) handTotal += 101;
      scores[player.id] = handTotal * multiplier * pairMultiplier;
    }
    if (player.score > 0) scores[player.id] = (scores[player.id] || 0) + (player.score * multiplier * pairMultiplier);
  });
  return scores;
};

export const getScoreExplanation = (score: number, isWinner: boolean, hasOpened: boolean, finishType?: string): string => {
  if (isWinner) {
    switch (finishType) {
      case "noOneContinuation": return "Kimse açmadan devam atarak bitirdi!";
      case "continuation": return "Devam atarak bitirdi!";
      case "okey": return "OKEY ile bitirdi!";
      case "pair": return "Çift ile bitirdi!";
      default: return "Oyunu bitirdi!";
    }
  }
  return hasOpened ? "Elindeki taşlar (ceza)" : "Açamadı (ceza)";
};
