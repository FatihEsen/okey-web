/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, GameAction, GamePhase, GameMode, Player, Tile, Combination, Color } from "../types";
import { createDeck, shuffle, determineOkey, isRealOkey, isFakeOkey, getEffectiveTile, calculateSetScore, isValidGroup, isValidRun, findBestSets, findPairs, calculatePenalty, isWildcard } from "./okeyEngine";
import { canOpenWithSets, canOpenWithPairs } from "./okeyOpening";

const INITIAL_PLAYER_HAND_SIZE = 14;
const FIRST_PLAYER_HAND_SIZE = 15;

const initializePlayers = (numPlayers: number, isPartnerMode: boolean): Player[] => {
  const players: Player[] = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      id: `player-${i}`,
      name: `Player ${i + 1}`,
      hand: [],
      openedSets: [],
      openedPairs: [],
      score: 0,
      isAI: i > 0, // Player 1 is human, others are AI for now
      hasOpened: false,
      openedWithType: null,
      openedWithPairs: false,
      lastOpenScore: 0,
      canUndoOpen: false,
      hasUndoneThisRound: false,
    });
  }
  return players;
};

const dealTiles = (deck: Tile[], players: Player[], okeyTile: { number: number; color: Color } | null): { updatedDeck: Tile[]; updatedPlayers: Player[] } => {
  let currentDeck = [...deck];
  const updatedPlayers = players.map(p => ({ ...p, hand: [] }));

  // Deal 14 tiles to each player, 15 to the first player
  for (let i = 0; i < FIRST_PLAYER_HAND_SIZE; i++) {
    if (currentDeck.length === 0) break;
    updatedPlayers[0].hand.push(currentDeck.shift()!);
  }

  for (let pIdx = 1; pIdx < updatedPlayers.length; pIdx++) {
    for (let i = 0; i < INITIAL_PLAYER_HAND_SIZE; i++) {
      if (currentDeck.length === 0) break;
      updatedPlayers[pIdx].hand.push(currentDeck.shift()!);
    }
  }

  // Mark real okey tiles in hands
  updatedPlayers.forEach(player => {
    player.hand = player.hand.map(tile => {
      if (tile && isRealOkey(tile, okeyTile)) {
        return { ...tile, isOkey: true };
      }
      return tile;
    });
  });

  return { updatedDeck: currentDeck, updatedPlayers };
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "START_GAME": {
      const newDeck = shuffle(createDeck());
      const indicatorTile = newDeck.shift()!;
      const okey = determineOkey(indicatorTile);

      const initialPlayers = initializePlayers(4, action.mode === GameMode.PARTNER);
      const { updatedDeck, updatedPlayers } = dealTiles(newDeck, initialPlayers, okey);

      return {
        ...state,
        mode: action.mode,
        players: updatedPlayers,
        deck: updatedDeck,
        discardPile: [],
        indicator: indicatorTile,
        okeyTile: okey,
        currentPlayerIndex: 0,
        phase: GamePhase.DRAWING,
        lastOpeningScore: 0,
        lastOpeningPairs: 0,
        winnerId: null,
        logs: ["Game started!"]
      };
    }

    case "DRAW_TILE": {
      if (state.phase !== GamePhase.DRAWING) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer) return state;

      let newDeck = [...state.deck];
      let newHand = [...currentPlayer.hand];
      let drawnTile: Tile | undefined;

      if (newDeck.length > 0) {
        drawnTile = newDeck.shift()!;
        newHand.push(drawnTile);
      } else {
        // Handle empty deck scenario (shouldn't happen in a normal game until very late)
        return { ...state, logs: [...state.logs, "Deck is empty!"] };
      }

      const updatedPlayers = state.players.map((p, idx) =>
        idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      return {
        ...state,
        deck: newDeck,
        players: updatedPlayers,
        phase: GamePhase.DISCARDING,
        logs: [...state.logs, `${currentPlayer.name} drew a tile.`]
      };
    }

    case "TAKE_DISCARD": {
      if (state.phase !== GamePhase.DRAWING || state.discardPile.length === 0) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer) return state;

      const tileToTake = state.discardPile[state.discardPile.length - 1];
      const newDiscardPile = state.discardPile.slice(0, -1);
      const newHand = [...currentPlayer.hand, tileToTake];

      const updatedPlayers = state.players.map((p, idx) =>
        idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      return {
        ...state,
        discardPile: newDiscardPile,
        players: updatedPlayers,
        phase: GamePhase.DISCARDING,
        logs: [...state.logs, `${currentPlayer.name} took a tile from the discard pile.`]
      };
    }

    case "DISCARD_TILE": {
      if (state.phase !== GamePhase.DISCARDING) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer) return state;

      const tileIndex = currentPlayer.hand.findIndex(t => t?.id === action.tileId);
      if (tileIndex === -1 || !currentPlayer.hand[tileIndex]) return state; // Tile not found

      const discardedTile = currentPlayer.hand[tileIndex]!;
      const newHand = currentPlayer.hand.filter(t => t?.id !== action.tileId);

      // Check for win condition after discarding
      if (newHand.length === 0) {
        const finalPlayers = state.players.map((p, idx) => {
          if (idx === state.currentPlayerIndex) {
            return { ...p, hand: newHand };
          }
          return p;
        });
        return {
          ...state,
          players: finalPlayers,
          discardPile: [...state.discardPile, discardedTile],
          phase: GamePhase.FINISHED,
          winnerId: currentPlayer.id,
          logs: [...state.logs, `${currentPlayer.name} finished the game by discarding their last tile!`]
        };
      }

      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

      const updatedPlayers = state.players.map((p, idx) =>
        idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      return {
        ...state,
        players: updatedPlayers,
        discardPile: [...state.discardPile, discardedTile],
        currentPlayerIndex: nextPlayerIndex,
        phase: GamePhase.DRAWING,
        logs: [...state.logs, `${currentPlayer.name} discarded ${discardedTile.color} ${discardedTile.number}.`]
      };
    }

    case "OPEN_HAND": {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer) return state;

      let isValidOpen = false;
      let totalScore = 0;
      let totalPairs = 0;

      if (action.openType === 'sets') {
        const { valid, totalScore: score } = canOpenWithSets(action.combinations, state);
        isValidOpen = valid;
        totalScore = score;
      } else if (action.openType === 'pairs') {
        // Need to convert combinations to pairs for canOpenWithPairs
        const pairs = action.combinations.map(c => c.tiles as [Tile, Tile]);
        const { valid, count } = canOpenWithPairs(pairs, state);
        isValidOpen = valid;
        totalPairs = count;
      }

      if (!isValidOpen) {
        return { ...state, logs: [...state.logs, `${currentPlayer.name} tried to open but it was not valid.`] };
      }

      // Remove opened tiles from hand
      let newHand = [...currentPlayer.hand];
      action.combinations.forEach(combo => {
        combo.tiles.forEach(tile => {
          const index = newHand.findIndex(t => t?.id === tile.id);
          if (index !== -1) {
            newHand.splice(index, 1);
          }
        });
      });

      const updatedPlayer: Player = {
        ...currentPlayer,
        hand: newHand,
        hasOpened: true,
        openedWithType: action.openType,
        openedWithPairs: action.openType === 'pairs',
        openedSets: action.openType === 'sets' ? [...currentPlayer.openedSets, ...action.combinations] : currentPlayer.openedSets,
        openedPairs: action.openType === 'pairs' ? [...currentPlayer.openedPairs, ...(action.combinations.map(c => c.tiles as Tile[]))] : currentPlayer.openedPairs,
        lastOpenScore: action.openType === 'sets' ? totalScore : totalPairs,
      };

      const updatedPlayers = state.players.map((p, idx) =>
        idx === state.currentPlayerIndex ? updatedPlayer : p
      );

      return {
        ...state,
        players: updatedPlayers,
        lastOpeningScore: action.openType === 'sets' ? totalScore : state.lastOpeningScore,
        lastOpeningPairs: action.openType === 'pairs' ? totalPairs : state.lastOpeningPairs,
        logs: [...state.logs, `${currentPlayer.name} opened their hand with ${action.openType === 'sets' ? 'sets' : 'pairs'}.`]
      };
    }

    case "ADD_TO_TABLE": {
      // Logic for adding tiles to existing sets on the table
      // This is more complex and will be implemented later if needed
      return { ...state, logs: [...state.logs, "ADD_TO_TABLE action not fully implemented yet."] };
    }

    case "REORDER_HAND": {
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer) return state;

      const updatedPlayers = state.players.map((p, idx) =>
        idx === state.currentPlayerIndex ? { ...p, hand: action.newHand } : p
      );

      return {
        ...state,
        players: updatedPlayers,
      };
    }

    default:
      return state;
  }
};
