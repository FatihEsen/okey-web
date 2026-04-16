/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tile, Combination, GameState, Player, GameMode } from '../types';

export const canOpenWithSets = (
  combinations: Combination[], 
  gameState: GameState
): { valid: boolean; totalScore: number } => {
  const totalScore = combinations.reduce((sum, c) => sum + c.score, 0);
  
  let requiredScore = 101;
  if (gameState.mode === GameMode.FOLDING && gameState.lastOpeningScore > 0) {
    requiredScore = gameState.lastOpeningScore + 1;
  }

  return {
    valid: totalScore >= requiredScore,
    totalScore
  };
};

export const canOpenWithPairs = (
  pairs: Tile[][], 
  gameState: GameState
): { valid: boolean; count: number } => {
  const count = pairs.length;
  
  let requiredCount = 5;
  if (gameState.mode === GameMode.FOLDING && gameState.lastOpeningPairs > 0) {
    requiredCount = gameState.lastOpeningPairs + 1;
  }

  return {
    valid: count >= requiredCount,
    count
  };
};
