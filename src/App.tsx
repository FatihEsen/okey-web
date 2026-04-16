import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Settings, 
  Info, 
  ChevronRight, 
  User, 
  Cpu, 
  CheckCircle2, 
  AlertCircle,
  ArrowDown,
  Hash,
  Layers,
  ArrowLeftRight,
  LayoutGrid,
  Copy,
  GripVertical,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Color, 
  Tile, 
  Player, 
  TileSet, 
  GameMode, 
  GameState, 
  GamePhase 
} from "./types";
import { 
  createDeck, 
  shuffle, 
  determineOkey, 
  COLORS, 
  isRealOkey,
  getEffectiveTile,
  findBestSets, 
  findPairs,
  aiTakeTurn,
  canProcessTile,
  canSwapOkey,
  canProcessPair,
  checkWin,
  calculateHandTotal,
  calculateSetScore,
  calculateFinalScores,
  getScoreExplanation,
  sortBySets,
  sortByPairs,
  isWildcard,
  isOkeyLike,
  isValidRun,
  isValidGroup,
  isPlayableAnywhere
} from "./logic/okeyEngine";
import { TileComponent, SortableTile } from "./components/TileComponent";
import { PlayerHand } from "./components/PlayerHand";
import { Board } from "./components/Board";
import {
  DraggableDeck,
  DroppableDiscard,
  DraggableDiscard,
  DisplayIndicator,
  ReturnDiscardButton,
} from "./components/GameControls";


// --- Toast Notification ---
const Toast = ({ message, type, onClose }: { message: string; type: "error" | "warning" | "info"; onClose: () => void }) => {
  const colors = {
    error: "bg-red-600 border-red-500",
    warning: "bg-amber-600 border-amber-500",
    info: "bg-blue-600 border-blue-500",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      onClick={onClose}
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl border text-white text-sm font-bold shadow-2xl cursor-pointer select-none max-w-sm text-center ${colors[type]}`}
    >
      <AlertCircle size={18} className="shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.STANDARD);
  const [toast, setToast] = useState<{ message: string; type: "error" | "warning" | "info" } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      return savedTheme !== "light";
    }
    return true;
  });

  const showToast = useCallback((message: string, type: "error" | "warning" | "info" = "warning") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const activeDragTile = useMemo(() => {
    if (!activeDragId || !gameState) return null;
    
    // Check in player hand
    const handTile = gameState.players[0].hand.find(t => t?.id === activeDragId);
    if (handTile) return handTile;

    // Check if it's the discard tile
    if (activeDragId === "discard-draggable" && gameState.discardPile.length > 0) {
      return gameState.discardPile[gameState.discardPile.length - 1];
    }

    return null;
  }, [activeDragId, gameState]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id.toString();
    setActiveDragId(null);

    if (!over || !gameState) return;
    const overId = over.id.toString();

    if (activeId === overId) return;

    // --- NEW: Draw from Deck/Discard (to Hand) ---
    if (overId === "player-hand-drop-zone") {
      if (activeId === "deck-draggable") {
        drawFromDeck();
      } else if (activeId === "discard-draggable") {
        drawFromDiscard();
      }
      return;
    }

    // --- NEW: Discard (from Hand to Discard Pile) ---
    if (overId === "discard-drop-zone") {
      const tile = gameState.players[0].hand.find(t => t?.id === activeId);
      if (tile) {
        setSelectedTiles([tile.id]);
        setTimeout(() => discardTile(), 0);
      }
      return;
    }

    // --- NEW: Set Drop Logic (Process Tile / Swap Okey) ---
    if (overId.startsWith("drop-set-")) {
      const data = over.data.current as { playerId: string, setIdx: number, type: "set" | "pair" };
      const tile = gameState.players[0].hand.find(t => t?.id === activeId);
      
      if (tile && data) {
        setSelectedTiles([tile.id]);
        setTimeout(() => {
          processTile(data.playerId, data.setIdx, data.type);
        }, 0);
      }
      return;
    }

    const player = gameState.players[0];
    const items = player.hand.map((tile, index) => ({
      id: tile ? tile.id : `empty-${index}`,
      tile
    }));

    const oldIndex = items.findIndex((item) => item.id === activeId);
    const newIndex = items.findIndex((item) => item.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    // Handle multi-tile move
    if (selectedTiles.length > 1 && selectedTiles.includes(active.id as string)) {
      const selectedIndices = selectedTiles
        .map(id => player.hand.findIndex(t => t?.id === id))
        .filter(idx => idx !== -1)
        .sort((a, b) => a - b);

      const selectedTilesObjects = selectedIndices.map(idx => player.hand[idx]);
      const handWithoutSelected = player.hand.filter((_, idx) => !selectedIndices.includes(idx));
      const removedBeforeOver = selectedIndices.filter(idx => idx < newIndex).length;
      const targetIndexInFiltered = Math.max(0, newIndex - removedBeforeOver);
      const finalHand = [...handWithoutSelected];

      finalHand.splice(targetIndexInFiltered, 0, ...selectedTilesObjects as (Tile | null)[]);
      while (finalHand.length < player.hand.length) finalHand.push(null);
      if (finalHand.length > player.hand.length) finalHand.splice(player.hand.length);

      const newPlayers = gameState.players.map((p, i) => i === 0 ? { ...p, hand: finalHand } : p);
      setGameState({ ...gameState, players: newPlayers });
      return;
    }

    // Single tile move
    const newHand = arrayMove(player.hand, oldIndex, newIndex);
    const newPlayers = gameState.players.map((p, i) => i === 0 ? { ...p, hand: newHand } : p);
    setGameState({ ...gameState, players: newPlayers });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Sanitize hand to fix any 14s that might have been saved in previous states
  useEffect(() => {
    if (gameState) {
      let needsFix = false;
      const newPlayers = gameState.players.map(p => {
        let playerNeedsFix = false;
        const newHand = p.hand.map(t => {
          if (t && t.number > 13) {
            playerNeedsFix = true;
            needsFix = true;
            return { ...t, number: t.number === 14 ? 1 : t.number % 13 || 13 };
          }
          return t;
        });
        return playerNeedsFix ? { ...p, hand: newHand } : p;
      });
      if (needsFix) {
        setGameState({ ...gameState, players: newPlayers });
      }
    }
  }, [gameState]);

  const initGame = useCallback(() => {
    const deck = shuffle(createDeck());
    const nonJokerIndices = deck
      .map((tile, index) => (tile.color === Color.JOKER ? null : index))
      .filter((index): index is number => index !== null);
    const indicatorIndex = nonJokerIndices[Math.floor(Math.random() * nonJokerIndices.length)];
    const [indicator] = deck.splice(indicatorIndex, 1);
    const okeyTile = determineOkey(indicator);

    const players: Player[] = [
      { id: "p1", name: "Sen", hand: [], openedSets: [], openedPairs: [], score: 0, isAI: false, hasOpened: false, openedWithType: null, openedWithPairs: false, lastOpenScore: 0, canUndoOpen: false, hasUndoneThisRound: false },
      { id: "p2", name: "AI 1", hand: [], openedSets: [], openedPairs: [], score: 0, isAI: true, hasOpened: false, openedWithType: null, openedWithPairs: false, lastOpenScore: 0, canUndoOpen: false, hasUndoneThisRound: false },
      { id: "p3", name: "AI 2", hand: [], openedSets: [], openedPairs: [], score: 0, isAI: true, hasOpened: false, openedWithType: null, openedWithPairs: false, lastOpenScore: 0, canUndoOpen: false, hasUndoneThisRound: false },
      { id: "p4", name: "AI 3", hand: [], openedSets: [], openedPairs: [], score: 0, isAI: true, hasOpened: false, openedWithType: null, openedWithPairs: false, lastOpenScore: 0, canUndoOpen: false, hasUndoneThisRound: false },
    ];

    // Deal tiles
    players[0].hand = sortBySets([...deck.splice(0, 22)], okeyTile);
    players[1].hand = [...deck.splice(0, 21), ...Array(9).fill(null)];
    players[2].hand = [...deck.splice(0, 21), ...Array(9).fill(null)];
    players[3].hand = [...deck.splice(0, 21), ...Array(9).fill(null)];

    setGameState({
      mode: gameMode,
      players,
      currentPlayerIndex: 0,
      deck,
      discardPile: [],
      indicator,
      okeyTile,
      phase: GamePhase.PLAYING,
      currentOpenScore: 0,
      currentOpenPairs: 0,
      winnerId: null,
      logs: ["Oyun başladı!"],
      hasDoubleOpen: false,
      hasOkeyDiscard: false,
      hasContinuationDiscard: false,
      hasHandFinish: false,
      noOneOpened: false,
    });
    setSelectedTiles([]);
  }, [gameMode]);

  useEffect(() => {
    if (!gameState) initGame();
  }, [gameState, initGame]);

  // AI Turn Effect
  useEffect(() => {
    if (gameState && gameState.players[gameState.currentPlayerIndex].isAI && gameState.phase !== GamePhase.FINISHED) {
      const timer = setTimeout(() => {
        const update = aiTakeTurn(gameState);
        if (update) {
          setGameState(prev => prev ? { ...prev, ...update } : null);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleTileClick = (tile: Tile) => {
    if (gameState?.phase === GamePhase.PLAYING || gameState?.phase === GamePhase.DISCARDING) {
      setSelectedTiles(prev => 
        prev.includes(tile.id) ? prev.filter(id => id !== tile.id) : [...prev, tile.id]
      );
    }
  };

  const autoSortSets = () => {
    if (!gameState) return;
    const newPlayers = [...gameState.players];
    newPlayers[0].hand = sortBySets(newPlayers[0].hand, gameState.okeyTile);
    setGameState({ ...gameState, players: newPlayers });
    setSelectedTiles([]);
  };

  const autoSortPairs = () => {
    if (!gameState) return;
    const newPlayers = [...gameState.players];
    newPlayers[0].hand = sortByPairs(newPlayers[0].hand, gameState.okeyTile);
    setGameState({ ...gameState, players: newPlayers });
    setSelectedTiles([]);
  };

  const drawFromDeck = () => {
    if (!gameState || gameState.phase !== GamePhase.DRAWING || gameState.players[gameState.currentPlayerIndex].isAI) return;

    const newDeck = [...gameState.deck];
    const drawn = newDeck.pop();
    if (!drawn) {
      setGameState({
        ...gameState,
        phase: GamePhase.FINISHED,
        logs: [...gameState.logs, `Deste bitti. Oyun sona erdi.`]
      });
      return;
    }

    const newPlayers = gameState.players.map((p, i) => 
      i === gameState.currentPlayerIndex ? { ...p, hand: [...p.hand] } : p
    );
    const player = newPlayers[gameState.currentPlayerIndex];
    
    // Yeni taşı ıstakanın en sonuna yerleştir
    let targetIdx = 29;
    while (targetIdx >= 0 && player.hand[targetIdx] !== null) {
      targetIdx--;
    }
    
    if (targetIdx !== -1) {
      player.hand[targetIdx] = drawn;
    } else {
      const nullIdx = player.hand.indexOf(null);
      if (nullIdx !== -1) player.hand[nullIdx] = drawn;
      else player.hand.push(drawn);
    }

    setGameState({
      ...gameState,
      deck: newDeck,
      players: newPlayers,
      phase: GamePhase.PLAYING,
      logs: [...gameState.logs, `${player.name} desteden çekti.`]
    });
  };

  const drawFromDiscard = () => {
    if (!gameState || gameState.phase !== GamePhase.DRAWING || gameState.players[gameState.currentPlayerIndex].isAI || gameState.discardPile.length === 0) return;

    const newDiscard = [...gameState.discardPile];
    const drawn = newDiscard.pop()!;

    const newPlayers = gameState.players.map((p, i) => 
      i === gameState.currentPlayerIndex ? { ...p, hand: [...p.hand], mustOpen: true, drawnFromDiscardTile: drawn } : p
    );
    const player = newPlayers[gameState.currentPlayerIndex];

    // Yeni taşı ıstakanın en sonuna yerleştir
    let targetIdx = 29;
    while (targetIdx >= 0 && player.hand[targetIdx] !== null) {
      targetIdx--;
    }
    
    if (targetIdx !== -1) {
      player.hand[targetIdx] = drawn;
    } else {
      const nullIdx = player.hand.indexOf(null);
      if (nullIdx !== -1) player.hand[nullIdx] = drawn;
      else player.hand.push(drawn);
    }

    setGameState({
      ...gameState,
      discardPile: newDiscard,
      players: newPlayers,
      phase: GamePhase.PLAYING,
      logs: [...gameState.logs, `${player.name} yerden aldı. (Açmak zorunda)`]
    });
  };

  const discardTile = (tileToDiscard?: Tile) => {
    if (!gameState || gameState.phase !== GamePhase.PLAYING) return;

    const player = gameState.players[gameState.currentPlayerIndex];
    
    // Determine which tile to discard
    let tile: Tile | undefined;
    let tileIdx: number;
    
    if (tileToDiscard) {
      // Tile provided directly (from click handler)
      tileIdx = player.hand.findIndex(t => t?.id === tileToDiscard.id);
      tile = player.hand[tileIdx];
    } else {
      // Use selected tiles (from drag-drop)
      if (selectedTiles.length !== 1) return;
      tileIdx = player.hand.findIndex(t => t?.id === selectedTiles[0]);
      tile = player.hand[tileIdx];
    }
    
    if (!tile || tileIdx === -1) return;
    
    if (player.mustOpen && !player.hasOpened) {
      showToast("Yerden aldığınız için önce açmalısınız. Açamazsanız \"Geri Bırak\" butonuna basın.", "warning");
      return;
    }

    // --- NEW: Penalty Checks ---
    let extraLogs: string[] = [];
    let penaltyScore = 0;
    
    // Check if discarded tile is "İşler" (playable anywhere)
    const isPlayable = isPlayableAnywhere(tile, gameState.players, gameState.okeyTile);
    if (isPlayable) {
      penaltyScore += 101;
      extraLogs.push(`${player.name} işler taş attığı için 101 ceza aldı!`);
    }

    // Check if discarded tile is Okey (Only Real Okey has penalty)
    if (isRealOkey(tile, gameState.okeyTile)) {
      penaltyScore += 101;
      extraLogs.push(`${player.name} OKEY attığı için 101 ceza aldı!`);
    }

    // Check if player undid open and is discarding without re-opening
    if (player.canUndoOpen && !player.hasOpened) {
      penaltyScore += 101;
      extraLogs.push(`${player.name} açtığını geri alıp açmadığı için 101 ceza aldı!`);
    }

    const newPlayers = gameState.players.map((p, i) => 
      i === gameState.currentPlayerIndex ? { ...p, hand: [...p.hand], lastDiscardedTile: tile, mustOpen: false, score: p.score + penaltyScore } : p
    );
    newPlayers[gameState.currentPlayerIndex].hand[tileIdx] = null;
    // --- END: Penalty Checks ---

    const isWin = newPlayers[gameState.currentPlayerIndex].hand.every(t => t === null);
    const isOkeyFinish = isWin && isOkeyLike(tile, gameState.okeyTile);
    const isPairFinish = isWin && player.openedWithPairs;
    let winMsg = `${player.name} ${tile.number} ${tile.color} attı.`;
    if (isWin) {
      if (isOkeyFinish) winMsg += " OKEY ile bitirdi! (Çift ceza)";
      else if (isPairFinish) winMsg += " ÇİFT ile bitirdi! (Çift ceza)";
      else winMsg += " OYUN BİTTİ!";
    }

    // --- Katlama durumu takibi ---
    const isOkeyDiscard = isRealOkey(tile, gameState.okeyTile);
    const hasAnyoneOpened = gameState.players.some(p => p.hasOpened);
    
    // Devam atma kontrolü: Aynı sayıda farklı renk taş var mı açık perlerde
    const isContinuationDiscard = gameState.players.some(p => 
      p.openedSets.some(s => 
        s.tiles.some(t => t.number === tile.number && t.color !== tile.color && !isWildcard(t, gameState.okeyTile))
      )
    );

    // Elden bitiş: Hiç taş işlememişse (openedSets ve openedPairs boş ve açtıysa bile)
    const hasHandFinish = isWin && player.openedSets.length === 0 && player.openedPairs.length === 0;

    const newHasDoubleOpen = gameState.hasDoubleOpen || gameState.players.some(p => p.openedWithPairs && p.hasOpened);
    const newHasOkeyDiscard = gameState.hasOkeyDiscard || isOkeyDiscard;
    const newHasContinuationDiscard = gameState.hasContinuationDiscard || isContinuationDiscard;
    const newHasHandFinish = gameState.hasHandFinish || hasHandFinish;
    const newNoOneOpened = !hasAnyoneOpened;

    setGameState({
      ...gameState,
      players: newPlayers,
      discardPile: [...gameState.discardPile, tile],
      currentPlayerIndex: isWin ? gameState.currentPlayerIndex : (gameState.currentPlayerIndex + 1) % 4,
      phase: isWin ? GamePhase.FINISHED : GamePhase.DRAWING,
      winnerId: isWin ? player.id : null,
      logs: [...gameState.logs, winMsg, ...extraLogs],
      hasDoubleOpen: newHasDoubleOpen,
      hasOkeyDiscard: newHasOkeyDiscard,
      hasContinuationDiscard: newHasContinuationDiscard,
      hasHandFinish: newHasHandFinish,
      noOneOpened: newNoOneOpened,
    });
    setSelectedTiles([]);
  };

  const tryToOpen = () => {
    if (!gameState || gameState.phase !== GamePhase.PLAYING) return;
    const player = gameState.players[gameState.currentPlayerIndex];

    // Çift ile açan oyuncu seri/per açamaz
    if (player.openedWithPairs) {
      showToast("Çift ile açtınız. Seri açamazsınız, yalnızca işleme yapabilirsiniz.", "warning");
      return;
    }

    let setsToOpen: TileSet[] = [];
    const minScore = player.hasOpened ? 0 : (gameState.mode === GameMode.FOLDING ? gameState.currentOpenScore + 1 : 101);


    if (selectedTiles.length > 0) {
      const tilesToProcess = player.hand.filter((t): t is Tile => t !== null && selectedTiles.includes(t.id));
      setsToOpen = findBestSets(tilesToProcess, gameState.okeyTile);
    } else {
      // Parse physical arrangement
      const groups: Tile[][] = [];
      let currentGroup: Tile[] = [];
      
      for (const t of player.hand) {
        if (t !== null) {
          currentGroup.push(t);
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
            currentGroup = [];
          }
        }
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      const arrangedSets: TileSet[] = [];
      for (const group of groups) {
        if (group.length >= 3) {
          if (isValidRun(group, gameState.okeyTile)) {
            const set = { tiles: group, type: "run" as const } as TileSet;
            set.score = calculateSetScore(set, gameState.okeyTile);
            arrangedSets.push(set);
          } else if (isValidGroup(group, gameState.okeyTile)) {
            const set = { tiles: group, type: "group" as const } as TileSet;
            set.score = calculateSetScore(set, gameState.okeyTile);
            arrangedSets.push(set);
          }
        }
      }

      const arrangedScore = arrangedSets.reduce((s, set) => s + set.score, 0);
      
      if (arrangedScore >= minScore) {
        setsToOpen = arrangedSets;
      } else {
        // Do not fallback to findBestSets on the entire hand
        setsToOpen = [];
      }
    }

    const totalScore = setsToOpen.reduce((s, set) => s + set.score, 0);

    if (totalScore >= minScore && setsToOpen.length > 0) {
      const newPlayers = gameState.players.map((p, i) => 
        i === gameState.currentPlayerIndex ? { ...p, hand: [...p.hand], openedSets: [...p.openedSets], mustOpen: false, drawnFromDiscardTile: undefined } : p
      );
      const p = newPlayers[gameState.currentPlayerIndex];
      p.hasOpened = true;
      p.openedSets = [...p.openedSets, ...setsToOpen];
      p.lastOpenScore = totalScore;
      
      // Remove from hand by setting to null
      const tilesToRemove = setsToOpen.flatMap(s => s.tiles);
      tilesToRemove.forEach(t => {
        const idx = p.hand.findIndex(ht => ht?.id === t.id);
        if (idx !== -1) p.hand[idx] = null;
      });

      const remainingScore = calculateHandTotal(p.hand, gameState.okeyTile);

      setGameState({
        ...gameState,
        players: newPlayers,
        currentOpenScore: Math.max(gameState.currentOpenScore, totalScore),
        logs: [...gameState.logs, `${p.name} elini açtı. Kalan puan: ${remainingScore}`]
      });
      setSelectedTiles([]);
    } else {
      if (totalScore < minScore) {
        showToast(`Açmak için en az ${minScore} puan gerekiyor. Şu an: ${totalScore}`, "error");
      } else {
        showToast("Açılacak geçerli bir per bulunamadı.", "error");
      }
    }
  };

  // Geri alma: Son açılan seti/perleri geri al
  const undoOpen = (setType: "set" | "pair", setIdx?: number) => {
    if (!gameState || gameState.phase !== GamePhase.PLAYING) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.hasOpened) return;

    const newPlayers = gameState.players.map(p => ({
      ...p,
      hand: [...p.hand],
      openedSets: p.openedSets.map(s => ({ ...s, tiles: [...s.tiles] })),
      openedPairs: p.openedPairs.map(pr => [...pr])
    }));
    const p = newPlayers[gameState.currentPlayerIndex];

    if (setType === "set") {
      if (p.openedWithPairs) {
        showToast("Çift ile açtığınız için seri geri alamazsınız.", "error");
        return;
      }
      if (p.openedSets.length === 0) {
        showToast("Geri alınacak seri yok.", "info");
        return;
      }

      if (setIdx !== undefined) {
        // Belirli bir seti geri al
        const setToUndo = p.openedSets[setIdx];
        setToUndo.tiles.forEach(t => {
          const nullIdx = p.hand.indexOf(null);
          if (nullIdx !== -1) {
            p.hand[nullIdx] = t;
          } else {
            p.hand.push(t);
          }
        });
        p.openedSets.splice(setIdx, 1);
      } else {
        // Son seti geri al
        const lastSetIdx = p.openedSets.length - 1;
        const setToUndo = p.openedSets[lastSetIdx];
        setToUndo.tiles.forEach(t => {
          const nullIdx = p.hand.indexOf(null);
          if (nullIdx !== -1) {
            p.hand[nullIdx] = t;
          } else {
            p.hand.push(t);
          }
        });
        p.openedSets.pop();
      }

      // Eğer hiç set kalmadıysa hasOpened = false
      if (p.openedSets.length === 0 && !p.openedWithPairs) {
        p.hasOpened = false;
      }
    } else if (setType === "pair") {
      if (p.openedPairs.length === 0) {
        showToast("Geri alınacak çift yok.", "info");
        return;
      }

      if (setIdx !== undefined) {
        // Belirli bir çifti geri al
        const pairToUndo = p.openedPairs[setIdx];
        pairToUndo.forEach(t => {
          const nullIdx = p.hand.indexOf(null);
          if (nullIdx !== -1) {
            p.hand[nullIdx] = t;
          } else {
            p.hand.push(t);
          }
        });
        p.openedPairs.splice(setIdx, 1);
      } else {
        // Son çifti geri al
        const lastPairIdx = p.openedPairs.length - 1;
        const pairToUndo = p.openedPairs[lastPairIdx];
        pairToUndo.forEach(t => {
          const nullIdx = p.hand.indexOf(null);
          if (nullIdx !== -1) {
            p.hand[nullIdx] = t;
          } else {
            p.hand.push(t);
          }
        });
        p.openedPairs.pop();
      }

      if (p.openedPairs.length === 0 && p.openedWithPairs && p.openedSets.length === 0) {
        p.hasOpened = false;
      }
    }

    // Geri aldıktan sonra tekrar açma şansı var ama bu turda tekrar açamazsa ceza alır
    p.canUndoOpen = true;

    setGameState({
      ...gameState,
      players: newPlayers,
      logs: [...gameState.logs, `${p.name} açtığı ${setType === "set" ? "seriyi" : "çifti"} geri aldı.`]
    });
  };

  // Toplu geri alma: Tüm açılanları geri al
  const undoAllOpens = () => {
    if (!gameState || gameState.phase !== GamePhase.PLAYING) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.hasOpened) return;

    const newPlayers = gameState.players.map(p => ({
      ...p,
      hand: [...p.hand],
      openedSets: p.openedSets.map(s => ({ ...s, tiles: [...s.tiles] })),
      openedPairs: p.openedPairs.map(pr => [...pr])
    }));
    const p = newPlayers[gameState.currentPlayerIndex];

    // Tüm setleri geri al
    p.openedSets.forEach(set => {
      set.tiles.forEach(t => {
        const nullIdx = p.hand.indexOf(null);
        if (nullIdx !== -1) {
          p.hand[nullIdx] = t;
        } else {
          p.hand.push(t);
        }
      });
    });
    p.openedSets = [];

    // Tüm çiftleri geri al
    p.openedPairs.forEach(pair => {
      pair.forEach(t => {
        const nullIdx = p.hand.indexOf(null);
        if (nullIdx !== -1) {
          p.hand[nullIdx] = t;
        } else {
          p.hand.push(t);
        }
      });
    });
    p.openedPairs = [];

    p.hasOpened = false;
    p.openedWithPairs = false;
    p.canUndoOpen = true;

    setGameState({
      ...gameState,
      players: newPlayers,
      logs: [...gameState.logs, `${p.name} tüm açtıklarını geri aldı.`]
    });
  };

  const tryToOpenPairs = () => {
    if (!gameState || gameState.phase !== GamePhase.PLAYING) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    
    const tilesToProcess = selectedTiles.length > 0 
      ? player.hand.filter((t): t is Tile => t !== null && selectedTiles.includes(t.id))
      : player.hand.filter((t): t is Tile => t !== null);

    const pairs = findPairs(tilesToProcess, gameState.okeyTile);
    
    // If already opened with sets, can lay down pairs if anyone else opened pairs
    const minPairs = player.hasOpened 
      ? (gameState.currentOpenPairs > 0 ? 1 : 5)
      : (gameState.mode === GameMode.FOLDING ? gameState.currentOpenPairs + 1 : 5);

    if (pairs.length >= minPairs) {
      const newPlayers = gameState.players.map((p, i) => 
        i === gameState.currentPlayerIndex ? { ...p, hand: [...p.hand], openedPairs: [...p.openedPairs], mustOpen: false, drawnFromDiscardTile: undefined } : p
      );
      const p = newPlayers[gameState.currentPlayerIndex];
      
      if (!p.hasOpened) {
        p.openedWithPairs = true;
      }
      p.hasOpened = true;
      p.openedPairs = [...p.openedPairs, ...pairs];
      p.lastOpenScore = pairs.length;

      // Remove from hand
      pairs.forEach(pair => {
        pair.forEach(t => {
          const idx = p.hand.findIndex(ht => ht?.id === t.id);
          if (idx !== -1) p.hand[idx] = null;
        });
      });

      setGameState({
        ...gameState,
        players: newPlayers,
        currentOpenPairs: Math.max(gameState.currentOpenPairs, pairs.length),
        logs: [...gameState.logs, `${p.name} ${pairs.length} çift ile açtı.`]
      });
      setSelectedTiles([]);
    } else {
      showToast(`Çift açmak için en az ${minPairs} çift gerekiyor. Şu an: ${pairs.length}`, "error");
    }
  };

  const processTile = (targetPlayerId: string, setIdx: number, type: "set" | "pair") => {
    if (!gameState || (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.DISCARDING) || selectedTiles.length === 0) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.hasOpened) {
      showToast("Taş işlemek için önce elinizi açmalısınız.", "warning");
      return;
    }

    const newPlayers = gameState.players.map(p => ({
      ...p,
      hand: [...p.hand],
      openedSets: p.openedSets.map(s => ({ ...s, tiles: [...s.tiles] })),
      openedPairs: p.openedPairs.map(pr => [...pr])
    }));
    const p = newPlayers[gameState.currentPlayerIndex];
    const tp = newPlayers.find(np => np.id === targetPlayerId);
    if (!tp) return;

    if (type === "set" && selectedTiles.length === 1) {
      const tile = p.hand.find(t => t?.id === selectedTiles[0]);
      if (!tile) return;
      
      const targetSet = tp.openedSets[setIdx];
      if (!targetSet) return;

      // Check for Okey swapping first
      if (canSwapOkey(tile, targetSet, gameState.okeyTile)) {
        const okeyIdx = targetSet.tiles.findIndex(t => isWildcard(t, gameState.okeyTile));
        const okeyTileInSet = targetSet.tiles[okeyIdx];
        
        // Swap
        targetSet.tiles[okeyIdx] = tile;
        // Okey goes to player's hand
        const handIdx = p.hand.findIndex(ht => ht?.id === tile.id);
        p.hand[handIdx] = okeyTileInSet;
        
        // Update score
        targetSet.score = calculateSetScore(targetSet, gameState.okeyTile);

        setGameState({
          ...gameState,
          players: newPlayers,
          logs: [...gameState.logs, `${p.name}, ${tp.name}'in perinden okeyi aldı.`]
        });
        setSelectedTiles([]);
        return;
      }

      if (canProcessTile(tile, targetSet, gameState.okeyTile)) {
        targetSet.tiles.push(tile);
        // Sort the set so it displays correctly
        if (targetSet.type === "run") {
          // 101 Okey: Ace is always low (1) since 13-1 is forbidden.
          targetSet.tiles.sort((a, b) => {
            const valA = getEffectiveTile(a, gameState.okeyTile).number;
            const valB = getEffectiveTile(b, gameState.okeyTile).number;
            return valA - valB;
          });
        } else if (targetSet.type === "group") {
          // Sort groups by color for consistent display
          const colorOrder = [Color.RED, Color.YELLOW, Color.BLACK, Color.BLUE, Color.JOKER];
          targetSet.tiles.sort((a, b) => {
            const isAWild = isWildcard(a, gameState.okeyTile);
            const isBWild = isWildcard(b, gameState.okeyTile);
            if (isAWild && isBWild) return 0;
            if (isAWild) return 1;
            if (isBWild) return -1;
            return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
          });
        }
        
        // Update score
        targetSet.score = calculateSetScore(targetSet, gameState.okeyTile);
        
        const idx = p.hand.findIndex(ht => ht?.id === tile.id);
        p.hand[idx] = null;

        setGameState({
          ...gameState,
          players: newPlayers,
          logs: [...gameState.logs, `${p.name}, ${tp.name}'in perine taş işledi.`]
        });
        setSelectedTiles([]);
        if (checkWin(p)) {
          setGameState(prev => prev ? { ...prev, phase: GamePhase.FINISHED, winnerId: p.id, logs: [...prev.logs, `${p.name} oyunu kazandı!`] } : null);
        }
      } else {
        showToast("Bu taş bu pere işlenemez.", "error");
      }
    } else if (type === "pair" && selectedTiles.length === 1) {
      const tile = p.hand.find(t => t?.id === selectedTiles[0]);
      if (!tile) return;
      
      const targetPair = tp.openedPairs[setIdx];
      if (!targetPair) return;
      
      const isOkey = (t: Tile) => isWildcard(t, gameState.okeyTile);

      if (targetPair.some(isOkey)) {
        const normalTile = targetPair.find(t => !isOkey(t));
        if (normalTile && tile.number === normalTile.number && tile.color === normalTile.color) {
          const okeyIdx = targetPair.findIndex(isOkey);
          const okeyTileInPair = targetPair[okeyIdx];
          
          targetPair[okeyIdx] = tile;
          const handIdx = p.hand.findIndex(ht => ht?.id === tile.id);
          p.hand[handIdx] = okeyTileInPair;

          setGameState({
            ...gameState,
            players: newPlayers,
            logs: [...gameState.logs, `${p.name}, ${tp.name}'in çiftinden okeyi aldı.`]
          });
          setSelectedTiles([]);
          return;
        }
      }
      showToast("Bu taş bu çifte işlenemez.", "error");
    } else if (type === "pair" && selectedTiles.length === 2) {
      const selectedObjects = p.hand.filter((t): t is Tile => t !== null && selectedTiles.includes(t.id));
      const pairs = findPairs(selectedObjects, gameState.okeyTile);
      const pair = pairs.length > 0 ? pairs[0] : null;

      if (pair && canProcessPair(pair, gameState.okeyTile)) {
        p.openedPairs.push(pair);
        pair.forEach(t => {
          const idx = p.hand.findIndex(ht => ht?.id === t.id);
          if (idx !== -1) p.hand[idx] = null;
        });

        setGameState({
          ...gameState,
          players: newPlayers,
          logs: [...gameState.logs, `${p.name} çift işledi.`]
        });
        setSelectedTiles([]);
        if (checkWin(p)) {
          setGameState(prev => prev ? { ...prev, phase: GamePhase.FINISHED, winnerId: p.id, logs: [...prev.logs, `${p.name} oyunu kazandı!`] } : null);
        }
      } else {
        showToast("Seçilen taşlar geçerli bir çift değil.", "error");
      }
    }
  };

  const autoProcessTile = () => {
    if (!gameState || (gameState.phase !== GamePhase.PLAYING && gameState.phase !== GamePhase.DISCARDING) || selectedTiles.length !== 1) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.hasOpened) {
      showToast("Taş işlemek için önce elinizi açmalısınız.", "warning");
      return;
    }

    const tile = player.hand.find(t => t?.id === selectedTiles[0]);
    if (!tile) return;

    // Check all players' sets for a valid placement
    for (const targetPlayer of gameState.players) {
      for (let sIdx = 0; sIdx < targetPlayer.openedSets.length; sIdx++) {
        const set = targetPlayer.openedSets[sIdx];
        
        // First try to swap okey
        if (canSwapOkey(tile, set, gameState.okeyTile)) {
          processTile(targetPlayer.id, sIdx, "set");
          return;
        }
        
        // Then try to process normally
        if (canProcessTile(tile, set, gameState.okeyTile)) {
          processTile(targetPlayer.id, sIdx, "set");
          return;
        }
      }
      
      // Also check pairs for okey swapping
      for (let pIdx = 0; pIdx < targetPlayer.openedPairs.length; pIdx++) {
        const pair = targetPlayer.openedPairs[pIdx];
        const isOkey = (t: Tile) => isWildcard(t, gameState.okeyTile);
        if (pair.some(isOkey)) {
          const normalTile = pair.find(t => !isOkey(t));
          if (normalTile && tile.number === normalTile.number && tile.color === normalTile.color) {
            processTile(targetPlayer.id, pIdx, "pair");
            return;
          }
        }
      }
    }

    showToast("Bu taş hiçbir yere işlenemez.", "error");
  };

  const returnDrawnTile = useCallback(() => {
    if (!gameState) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.drawnFromDiscardTile) return;
    const drawnTileId = player.drawnFromDiscardTile.id;
    const tileIdx = player.hand.findIndex(t => t?.id === drawnTileId);
    if (tileIdx === -1) return;
    const newPlayers = gameState.players.map((p, i) => {
      if (i === gameState.currentPlayerIndex) {
        const newHand = [...p.hand];
        newHand[tileIdx] = null;
        return { ...p, hand: newHand, mustOpen: false, drawnFromDiscardTile: undefined };
      }
      return p;
    });
    setGameState({
      ...gameState,
      players: newPlayers,
      discardPile: [...gameState.discardPile, player.drawnFromDiscardTile],
      phase: GamePhase.DRAWING,
      logs: [...gameState.logs, `${player.name} aldığı taşı geri bıraktı.`]
    });
    setSelectedTiles([]);
  }, [gameState]);

  if (!gameState) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
        <div className="absolute top-6 right-6">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-full transition-all shadow-lg ${isDarkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden text-center p-12 ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"}`}
        >
          <div className="mb-8 flex justify-center">
            <div className={`w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-lg ${isDarkMode ? "shadow-blue-900/20" : "shadow-blue-200"}`}>
              <Play size={48} className="text-white" />
            </div>
          </div>
          <h1 className={`text-4xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Okey 101</h1>
          <p className={`text-xl mb-8 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Hoş geldiniz! Oyuna başlamak için aşağıdaki butona tıklayın.</p>
          
          <div className="flex flex-col gap-4">
            <div className={`flex p-1.5 rounded-2xl mb-4 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <button 
                onClick={() => setGameMode(GameMode.STANDARD)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${gameMode === GameMode.STANDARD ? (isDarkMode ? 'bg-slate-700 shadow-md text-blue-400' : 'bg-white shadow-md text-blue-600') : (isDarkMode ? 'text-slate-500' : 'text-slate-500')}`}
              >
                Standart
              </button>
              <button 
                onClick={() => setGameMode(GameMode.FOLDING)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${gameMode === GameMode.FOLDING ? (isDarkMode ? 'bg-slate-700 shadow-md text-blue-400' : 'bg-white shadow-md text-blue-600') : (isDarkMode ? 'text-slate-500' : 'text-slate-500')}`}
              >
                Katlamalı
              </button>
            </div>
            
            <button 
              onClick={initGame}
              className={`w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isDarkMode ? "shadow-blue-900/20 hover:bg-blue-500" : "shadow-blue-200 hover:bg-blue-700"}`}
            >
              <Play size={20} /> Oyunu Başlat
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"} font-sans selection:bg-blue-100`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"} px-6 py-4 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">101 Okey Pro</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                {gameState.mode === GameMode.FOLDING ? "Katlamalı" : "Katlamasız"} Mod
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className={`hidden md:flex items-center gap-6 px-6 py-2 rounded-full border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-blue-500" />
                <span className="text-sm font-bold">{gameState.currentOpenScore || 101}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Baraj</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-purple-500" />
                <span className="text-sm font-bold">{gameState.currentOpenPairs || 5}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Çift</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={initGame}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-bold"
              >
                <Play size={16} /> Yeni Oyun
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-bold"
              >
                <Settings size={16} /> Ayarlar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 flex flex-col gap-4">
        {/* Board Area - Full Width */}
        <div className="w-full">
          <Board gameState={gameState} onSetClick={processTile} />
        </div>

        {/* Horizontal Controls Bar */}
        <div className={`rounded-xl p-2 shadow-sm border flex items-center justify-between gap-3 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-2">
            {/* Tile discarded to me */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-bold text-slate-500 uppercase">Bana Atılan</span>
              <DraggableDiscard 
                tile={gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null} 
                isDarkMode={isDarkMode}
                isDisabled={gameState.phase !== GamePhase.DRAWING || currentPlayer.isAI}
                onClick={drawFromDiscard}
              />
            </div>

            <div className={`w-px h-10 ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />

            {/* Deck */}
            <DraggableDeck 
              count={gameState.deck.length} 
              isDisabled={gameState.phase !== GamePhase.DRAWING || currentPlayer.isAI}
              onClick={drawFromDeck}
            />

            {currentPlayer.mustOpen && !currentPlayer.hasOpened && (
              <ReturnDiscardButton
                onReturn={returnDrawnTile}
                disabled={gameState.phase !== GamePhase.PLAYING || currentPlayer.isAI}
              />
            )}
          </div>

          {/* Indicator */}
          <DisplayIndicator indicator={gameState.indicator!} isDarkMode={isDarkMode} />

          {/* Discarded count */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-bold text-slate-500 uppercase">ATILANLAR</span>
              <div className="flex gap-2">
                {[Color.RED, Color.YELLOW, Color.BLUE, Color.BLACK].map(color => (
                  <div key={color} className="flex flex-col items-center">
                    <div className={`w-2 h-1 rounded-full mb-0.5 ${
                      color === Color.RED ? "bg-red-500" :
                      color === Color.YELLOW ? "bg-yellow-500" :
                      color === Color.BLUE ? "bg-blue-500" : "bg-slate-900 dark:bg-slate-100"
                    }`} />
                    <div className="text-[8px] font-black text-slate-500 leading-none">
                      {gameState.discardPile.filter(t => t.color === color).length}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`w-px h-10 ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />

            {/* My discard */}
            <DroppableDiscard 
              id="discard-drop-zone"
              label="Taş At"
              lastDiscard={gameState.players[0].lastDiscardedTile}
              isDarkMode={isDarkMode}
              disabled={gameState.phase !== GamePhase.PLAYING || currentPlayer.isAI || selectedTiles.length !== 1}
              onClick={() => {
                if (selectedTiles.length === 1) {
                  const player = gameState.players[gameState.currentPlayerIndex];
                  const tile = player.hand.find(t => t?.id === selectedTiles[0]);
                  if (tile) {
                    discardTile(tile);
                  }
                }
              }}
            />
          </div>
        </div>


        {/* Bottom: Player Rack & Game Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <PlayerHand 
              player={gameState.players[0]} 
              okeyTile={gameState.okeyTile}
              onTileClick={handleTileClick}
              selectedTiles={selectedTiles}
              isCurrentPlayer={gameState.currentPlayerIndex === 0}
              onHandReorder={(newHand) => {
                const newPlayers = gameState.players.map((p, i) => i === 0 ? { ...p, hand: newHand } : p);
                setGameState({ ...gameState, players: newPlayers });
              }}
              onSortSets={autoSortSets}
              onSortPairs={autoSortPairs}
              onOpenSets={tryToOpen}
              onOpenPairs={tryToOpenPairs}
              openedSets={gameState.players[0].openedSets}
            />
          </div>
          
          <div className={`lg:col-span-1 rounded-2xl p-4 shadow-sm border flex flex-col h-full ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ChevronRight size={14} /> OYUN AKIŞI
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar max-h-[150px] mb-4">
              {gameState.logs.slice().reverse().map((log, i) => {
                const isPenalty = log.includes("ceza") || log.includes("Ceza");
                return (
                  <div key={i} className={`text-[10px] p-1.5 rounded-lg ${
                    i === 0 
                      ? (isPenalty 
                        ? "bg-red-900/30 text-red-400 font-bold" 
                        : (isDarkMode ? "bg-blue-900/30 text-blue-400 font-bold" : "bg-blue-50 text-blue-700 font-bold"))
                      : (isPenalty ? "text-red-500" : "text-slate-500")
                  }`}>
                    {log}
                  </div>
                );
              })}
            </div>

            <div className={`w-full h-px mb-4 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />

            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Trophy size={14} className="text-yellow-500" /> ANLIK CEZA PUANLARI
            </h3>
            <div className="space-y-2 mb-4">
              {gameState.players.map(p => (
                <div key={p.id} className={`flex items-center justify-between p-2 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{p.name}</span>
                    <div className="flex gap-1 mt-0.5">
                      {p.hasOpened ? (
                        <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-full font-black border border-blue-500/20">AÇTI</span>
                      ) : (
                        <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full font-black border border-red-500/20">AÇMADI</span>
                      )}
                      {p.openedWithPairs && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/10 text-purple-500 rounded-full font-black border border-purple-500/20">ÇİFT</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black ${p.score > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {p.score > 0 ? `+${p.score}` : p.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
            >
              <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                <h2 className="text-lg font-bold">Oyun Ayarları</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                  <RotateCcw size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Oyun Modu</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setGameMode(GameMode.STANDARD)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${gameMode === GameMode.STANDARD ? (isDarkMode ? "border-blue-500 bg-blue-900/20" : "border-blue-500 bg-blue-50") : (isDarkMode ? "border-slate-800 hover:border-slate-700" : "border-slate-100 hover:border-slate-200")}`}
                    >
                      <p className={`font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>Katlamasız</p>
                      <p className="text-xs text-slate-500 mt-1">Standart 101 puan barajı.</p>
                    </button>
                    <button 
                      onClick={() => setGameMode(GameMode.FOLDING)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${gameMode === GameMode.FOLDING ? (isDarkMode ? "border-blue-500 bg-blue-900/20" : "border-blue-500 bg-blue-50") : (isDarkMode ? "border-slate-800 hover:border-slate-700" : "border-slate-100 hover:border-slate-200")}`}
                    >
                      <p className={`font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>Katlamalı</p>
                      <p className="text-xs text-slate-500 mt-1">Her açan barajı yükseltir.</p>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    initGame();
                    setShowSettings(false);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Play size={20} /> Yeni Oyun Başlat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Over / Winner Modal */}
      <AnimatePresence>
        {gameState.phase === GamePhase.FINISHED && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className={`relative w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden text-center p-8 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
            >
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-200 animate-bounce">
                  <Trophy size={40} className="text-white" />
                </div>
              </div>
              <h2 className={`text-3xl font-black mb-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                {gameState.winnerId ? "Tebrikler!" : "Oyun Bitti!"}
              </h2>
              <p className="text-lg text-slate-500 mb-6">
                {gameState.winnerId ? (
                  <>
                    <span className="font-bold text-blue-600">
                      {gameState.players.find(p => p.id === gameState.winnerId)?.name}
                    </span> oyunu kazandı!
                  </>
                ) : (
                  "Destede taş kalmadı."
                )}
              </p>

              <div className={`rounded-2xl p-4 mb-8 border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Skor Tablosu</h3>
                <div className="space-y-2">
                  {(() => {
                    const discardedTile = gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null;
                    const finalScores = calculateFinalScores(gameState, gameState.winnerId, discardedTile);
                    return gameState.players.map(p => {
                      const score = finalScores[p.id];
                      const isWinner = p.id === gameState.winnerId;
                      const explanation = getScoreExplanation(score, isWinner, p.hasOpened);
                      return (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${isWinner ? (isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-100 border-yellow-200') : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}`}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{p.name}</span>
                              {isWinner && <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-bold border border-yellow-500/30">KAZANDI</span>}
                            </div>
                            <span className="text-[9px] text-slate-500 mt-0.5">{explanation}</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-black text-lg ${score < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {score > 0 ? `+${score}` : score}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              <button 
                onClick={initGame}
                className="w-full py-4 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                Yeni Oyun Başlat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      <DragOverlay dropAnimation={null}>
        {activeDragId === "deck-draggable" ? (
          <div className="bg-blue-600 p-4 rounded-xl shadow-2xl text-white flex items-center gap-2 scale-110">
            <Layers size={24} />
            <span className="font-bold">Taş Çekiliyor...</span>
          </div>
        ) : activeDragTile ? (
          <div className="rotate-3 scale-105 shadow-2xl shadow-black/30">
            <TileComponent tile={activeDragTile} size="md" />
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
