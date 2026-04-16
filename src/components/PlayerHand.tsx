/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Cpu, User, LayoutGrid, Copy } from "lucide-react";
import { Color, Tile, TileSet, Player } from "../types";
import { isRealOkey, isValidRun, isValidGroup, calculateSetScore } from "../logic/okeyEngine";
import { TileComponent, SortableTile } from "./TileComponent";
import { calculateHandTotal } from "../logic/okeyEngine";

export const PlayerHand = ({
  player,
  okeyTile,
  onTileClick,
  selectedTiles,
  isCurrentPlayer,
  onHandReorder,
  onSortSets,
  onSortPairs,
  onOpenSets,
  onOpenPairs,
  openedSets,
  }: {
  player: Player;
  okeyTile: { number: number; color: Color } | null;
  onTileClick: (tile: Tile) => void;
  selectedTiles: string[];
  isCurrentPlayer: boolean;
  onHandReorder: (newHand: (Tile | null)[]) => void;
  onSortSets: () => void;
  onSortPairs: () => void;
  onOpenSets: () => void;
  onOpenPairs: () => void;
  openedSets: TileSet[];
  }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "player-hand-drop-zone",
  });

  const arrangedTotal = useMemo(() => {
    const groups: Tile[][] = [];
    let currentGroup: Tile[] = [];

    player.hand.forEach((tile) => {
      if (tile) {
        currentGroup.push(tile);
      } else if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return (
      groups.reduce((total, group) => {
        if (group.length < 3) return total;

        if (isValidRun(group, okeyTile)) {
          const set = { tiles: group, type: "run" as const, score: 0 };
          return total + calculateSetScore(set, okeyTile);
        }

        if (isValidGroup(group, okeyTile)) {
          const set = { tiles: group, type: "group" as const, score: 0 };
          return total + calculateSetScore(set, okeyTile);
        }

        return total;
      }, 0) + player.openedSets.reduce((s, set) => s + set.score, 0)
    );
  }, [player.hand, player.openedSets, okeyTile]);

  const remainingTotal = useMemo(
    () => calculateHandTotal(player.hand, okeyTile),
    [player.hand, okeyTile]
  );

  const items = useMemo(
    () =>
      player.hand.map((tile, index) => ({
        id: tile ? tile.id : `empty-${index}`,
        tile,
      })),
    [player.hand]
  );

  return (
    <div
      ref={setNodeRef}
      className={`
      flex items-center gap-2 p-2 rounded-xl border-2 transition-all
      ${isOver ? "ring-4 ring-blue-500/30" : ""}
      ${
        isCurrentPlayer
          ? "bg-gradient-to-r from-amber-800/90 to-amber-900/90 border-amber-600 shadow-lg"
          : "bg-slate-800/80 border-slate-700 opacity-80"
      }
    `}
    >
      {/* Istaka - taşlar ortada */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Üst bilgi satırı */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            {player.isAI ? (
              <Cpu size={12} className="text-slate-400" />
            ) : (
              <User size={12} className="text-amber-400" />
            )}
            <span
              className={`font-bold text-[10px] uppercase ${
                isCurrentPlayer ? "text-amber-100" : "text-slate-300"
              }`}
            >
              {player.name}
            </span>
            {isCurrentPlayer && (
              <span className="text-amber-400 text-[8px] animate-pulse">•</span>
            )}
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-black/30 rounded-full">
            <span className="text-[8px] font-bold text-slate-500 uppercase">
              {player.hasOpened ? "KALAN" : "PER"}
            </span>
            <span className="text-xs font-black text-amber-400">
              {player.hasOpened ? remainingTotal : arrangedTotal}
            </span>
            {/* Çift açan oyuncu için ×2 badge */}
            {player.openedWithPairs && (
              <span className="text-[7px] font-black text-purple-400 bg-purple-900/40 px-1 rounded">
                ×2
              </span>
            )}
          </div>
        </div>

        {/* Taşlar grid */}
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
              gap: "1px 1px",
            }}
            className="bg-black/40 p-1.5 pb-4 rounded-lg justify-items-center"
          >
            {items.map((item) => (
              <SortableTile
                key={item.id}
                id={item.id}
                tile={item.tile}
                isOkey={item.tile ? isRealOkey(item.tile, okeyTile) : false}
                onClick={() => item.tile && onTileClick(item.tile)}
                isSelected={
                  item.tile ? selectedTiles.includes(item.tile.id) : false
                }
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Sağ taraf - Butonlar 2x2 grid */}
      <div className="grid grid-cols-2 gap-1 shrink-0">
        {/* Seri Diz */}
        <button
          onClick={onSortSets}
          className="flex flex-col items-center justify-center gap-0.5 w-10 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all active:scale-95"
        >
          <div className="flex gap-0.5">
            <div className="w-1.5 h-2 bg-white/80 rounded-sm" />
            <div className="w-1.5 h-2 bg-white/80 rounded-sm" />
            <div className="w-1.5 h-2 bg-white/80 rounded-sm" />
          </div>
          <span className="text-[7px] font-black uppercase">SERİ DİZ</span>
        </button>

        {/* Çift Diz */}
        <button
          onClick={onSortPairs}
          className="flex flex-col items-center justify-center gap-0.5 w-10 h-14 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all active:scale-95"
        >
          <div className="flex gap-0.5">
            <div className="w-1.5 h-2 bg-white/80 rounded-sm" />
            <div className="w-1.5 h-2 bg-white/80 rounded-sm" />
          </div>
          <span className="text-[7px] font-black uppercase">ÇİFT DİZ</span>
        </button>

        {/* Seri Aç - çift açan oyuncu kullanamaz */}
        <button
          onClick={onOpenSets}
          disabled={
            !isCurrentPlayer ||
            player.openedWithPairs ||
            (selectedTiles.length > 0 && selectedTiles.length < 3)
          }
          title={player.openedWithPairs ? "Çift ile açtınız, seri açamazsınız" : ""}
          className="flex flex-col items-center justify-center gap-0.5 w-10 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LayoutGrid size={14} />
          <span className="text-[7px] font-black uppercase">SERİ AÇ</span>
        </button>

        {/* Çift Aç */}
        <button
          onClick={onOpenPairs}
          disabled={
            !isCurrentPlayer ||
            (selectedTiles.length > 0 && selectedTiles.length < 2)
          }
          className="flex flex-col items-center justify-center gap-0.5 w-10 h-14 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all active:scale-95 disabled:opacity-40"
        >
          <Copy size={14} />
          <span className="text-[7px] font-black uppercase">ÇİFT AÇ</span>
        </button>
      </div>
    </div>
  );
};
