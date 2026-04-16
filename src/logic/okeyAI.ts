/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Player, Tile, Combination, GameAction, Color } from "../types";
import { isWildcard, getEffectiveTile, calculateSetScore, isValidGroup, isValidRun, findBestSets, findPairs } from "./okeyEngine";
import { canOpenWithSets, canOpenWithPairs } from "./okeyOpening";

// Basic AI logic for making a move
export const aiTakeTurn = (gameState: GameState, aiPlayer: Player): GameAction | null => {
  // 1. Try to open if possible
  // Simplified: check for 101 points or 5 pairs
  if (!aiPlayer.hasOpened) {
    const possibleSets = findBestSets(aiPlayer.hand, gameState.okeyTile);
    const { valid: canOpenSets, totalScore } = canOpenWithSets(possibleSets, gameState);
    if (canOpenSets) {
      return { type: 'OPEN_HAND', combinations: possibleSets, openType: 'sets' };
    }

    const possiblePairs = findPairs(aiPlayer.hand, gameState.okeyTile);
    const { valid: canOpenPairs, count } = canOpenWithPairs(possiblePairs, gameState);
    if (canOpenPairs) {
      const combinations: Combination[] = possiblePairs.map(p => ({ tiles: p, type: 'pair', score: 0 }));
      return { type: 'OPEN_HAND', combinations, openType: 'pairs' };
    }
  }

  // 2. Discard a tile
  // Simple strategy: discard the highest value tile that is not part of any potential set/run
  const hand = aiPlayer.hand.filter((t): t is Tile => t !== null);
  if (hand.length === 0) return null; // Should not happen if AI is discarding

  // Sort tiles by number in descending order
  const sortedHand = [...hand].sort((a, b) => getEffectiveTile(b, gameState.okeyTile).number - getEffectiveTile(a, gameState.okeyTile).number);

  // Find a tile to discard. Prioritize tiles that are not part of any current combinations.
  for (const tile of sortedHand) {
    // For simplicity, just discard the highest tile for now.
    // More advanced AI would check if discarding this tile breaks a potential set/run.
    return { type: 'DISCARD_TILE', tileId: tile.id };
  }

  return null; // Should not reach here
};

// Logic for AI to decide whether to draw from deck or discard pile
export const aiDecideDraw = (gameState: GameState, aiPlayer: Player): GameAction => {
  // Simple strategy: always draw from deck unless discard pile has a very useful tile
  // For now, always draw from deck
  return { type: 'DRAW_TILE' };
};
