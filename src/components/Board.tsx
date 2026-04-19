/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { useDroppable } from "@dnd-kit/core";
import { Color, Tile, TileSet, GameState } from "../types";
import { TileComponent } from "./TileComponent";

// --- DroppableSet ---
export const DroppableSet = ({
  playerId,
  setIdx,
  type,
  tiles,
  onSetClick,
}: {
  key?: string;
  playerId: string;
  setIdx: number;
  type: "set" | "pair";
  tiles: Tile[];
  onSetClick: (playerId: string, setIdx: number, type: "set" | "pair") => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-set-${playerId}-${type}-${setIdx}`,
    data: { playerId, setIdx, type },
  });

  return (
    <motion.div
      ref={setNodeRef}
      whileHover={{ scale: 1.02 }}
      onClick={() => onSetClick(playerId, setIdx, type)}
      className={`flex gap-0.5 p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-all relative group border border-slate-700/50 bg-slate-800/30 ${
        isOver
          ? "bg-blue-500/30 ring-2 ring-blue-400 scale-105 z-10 border-blue-400/50"
          : ""
      }`}
    >
      {tiles.map((t) => (
        <TileComponent key={t.id} tile={t} size="sm" />
      ))}
      <div className="absolute -inset-1 border-2 border-dashed border-blue-400/0 group-hover:border-blue-400/50 rounded-lg pointer-events-none transition-all" />
      {isOver && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap animate-bounce">
          BURAYA İŞLE / OKEY AL
        </div>
      )}
    </motion.div>
  );
};

// --- Board ---
export const Board = ({
  gameState,
  onSetClick,
}: {
  gameState: GameState;
  onSetClick: (playerId: string, setIdx: number, type: "set" | "pair") => void;
}) => {
  return (
    <div className="flex gap-3 w-full h-full">
      {/* Seri 1 */}
      <div className="flex-1 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-xl border-2 border-emerald-500/30 p-3 min-h-[180px] h-full overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 text-center">
          SERİ 1
        </div>
        <div className="flex flex-col gap-2">
          {gameState.players
            .filter((p) => p.openedSets.length > 0)
            .map((player) => (
              <div key={player.id} className="flex flex-col gap-1">
                <div className="text-[8px] font-bold text-slate-400 uppercase">
                  {player.name}
                </div>
                <div className="flex flex-wrap gap-1">
                  {player.openedSets
                    .slice(0, Math.ceil(player.openedSets.length / 2))
                    .map((s, i) => (
                      <DroppableSet
                        key={`set1-${player.id}-${i}`}
                        playerId={player.id}
                        setIdx={i}
                        type="set"
                        tiles={s.tiles}
                        onSetClick={onSetClick}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Seri 2 */}
      <div className="flex-1 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-xl border-2 border-emerald-500/30 p-3 min-h-[180px] h-full overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 text-center">
          SERİ 2
        </div>
        <div className="flex flex-col gap-2">
          {gameState.players
            .filter((p) => p.openedSets.length > 0)
            .map((player) => (
              <div key={player.id} className="flex flex-col gap-1">
                <div className="text-[8px] font-bold text-slate-400 uppercase">
                  {player.name}
                </div>
                <div className="flex flex-wrap gap-1">
                  {player.openedSets
                    .slice(Math.ceil(player.openedSets.length / 2))
                    .map((s, i) => (
                      <DroppableSet
                        key={`set2-${player.id}-${i}`}
                        playerId={player.id}
                        setIdx={Math.ceil(player.openedSets.length / 2) + i}
                        type="set"
                        tiles={s.tiles}
                        onSetClick={onSetClick}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export const PairsBoard = ({
  gameState,
  onSetClick,
}: {
  gameState: GameState;
  onSetClick: (playerId: string, setIdx: number, type: "set" | "pair") => void;
}) => {
  return (
    <div className="flex-1 bg-purple-500/20 dark:bg-purple-500/10 rounded-xl border-2 border-purple-500/30 p-3 min-h-[180px] h-full overflow-y-auto custom-scrollbar">
      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 text-center">
        ÇİFTLER
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {gameState.players
          .filter((p) => p.openedPairs.length > 0)
          .flatMap((player) =>
            player.openedPairs.map((pair, i) => ({ player, pair, i }))
          )
          .map(({ player, pair, i }) => (
            <div
              key={`pair-${player.id}-${i}`}
              className="flex flex-col items-center gap-1"
            >
              <DroppableSet
                playerId={player.id}
                setIdx={i}
                type="pair"
                tiles={pair}
                onSetClick={onSetClick}
              />
            </div>
          ))}
        {gameState.players.every((p) => p.openedPairs.length === 0) && (
          <div className="col-span-full text-slate-600 text-xs text-center py-8">
            Henüz çift yok
          </div>
        )}
      </div>
    </div>
  );
};
