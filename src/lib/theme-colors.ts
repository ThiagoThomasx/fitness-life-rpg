/**
 * Centralized dynamic color system.
 * All feature-specific color mappings live here so pages stay consistent.
 */

export type ThemeColor = {
  bg: string
  border: string
  text: string
  fill: string
}

// ─── Category colors (workout types) ────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, ThemeColor> = {
  strength:    { bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.25)",    text: "#ef4444", fill: "#ef4444" },
  cardio:      { bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)",   text: "#f59e0b", fill: "#f59e0b" },
  agility:     { bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.25)",   text: "#8b5cf6", fill: "#8b5cf6" },
  flexibility: { bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.25)",   text: "#3b82f6", fill: "#3b82f6" },
  dexterity:   { bg: "rgba(236,72,153,0.1)",   border: "rgba(236,72,153,0.25)",   text: "#ec4899", fill: "#ec4899" },
  default:     { bg: "rgba(200,241,105,0.08)",   border: "rgba(200,241,105,0.2)",     text: "#c8f169", fill: "#c8f169" },
}

export function categoryColor(category: string): ThemeColor {
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.default
}

// ─── Attribute colors ────────────────────────────────────────────────────────

export const ATTRIBUTE_COLORS: Record<string, ThemeColor> = {
  strength:     { bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.25)",    text: "#ef4444", fill: "#ef4444" },
  agility:      { bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)",   text: "#f59e0b", fill: "#f59e0b" },
  dexterity:    { bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.25)",   text: "#8b5cf6", fill: "#8b5cf6" },
  constitution: { bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.25)",   text: "#3b82f6", fill: "#3b82f6" },
  vitality:     { bg: "rgba(236,72,153,0.1)",   border: "rgba(236,72,153,0.25)",   text: "#ec4899", fill: "#ec4899" },
}

export function attributeColor(attribute: string): ThemeColor {
  return ATTRIBUTE_COLORS[attribute.toLowerCase()] ?? CATEGORY_COLORS.default
}

// ─── Avatar backdrop colors (Perfil) ─────────────────────────────────────────

export const AVATAR_COLORS: Record<string, string> = {
  "🧙": "rgba(139,92,246,0.5)",
  "⚔️": "rgba(239,68,68,0.45)",
  "🦸": "rgba(59,130,246,0.45)",
  "🏆": "rgba(245,158,11,0.45)",
  "🔥": "rgba(239,68,68,0.5)",
  "🐉": "rgba(200,241,105,0.35)",
  "🦁": "rgba(245,158,11,0.5)",
  "🌟": "rgba(245,158,11,0.4)",
  "💎": "rgba(59,130,246,0.5)",
  "🚀": "rgba(200,241,105,0.3)",
}

export function avatarColor(avatar: string): string {
  return AVATAR_COLORS[avatar] ?? "rgba(200,241,105,0.3)"
}

// ─── Reward / event colors ───────────────────────────────────────────────────

export const REWARD_COLORS: Record<string, ThemeColor> = {
  badge:        { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.4)", text: "#8b5cf6", fill: "#8b5cf6" },
  level_up:     { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b", fill: "#f59e0b" },
  attribute_up: { bg: "rgba(200,241,105,0.12)",  border: "rgba(200,241,105,0.3)",  text: "#c8f169", fill: "#c8f169" },
  xp:           { bg: "rgba(200,241,105,0.1)",   border: "rgba(200,241,105,0.25)", text: "#c8f169", fill: "#c8f169" },
}

export function rewardColor(type: string): ThemeColor {
  return REWARD_COLORS[type] ?? REWARD_COLORS.xp
}

// ─── Mood colors (diary) ─────────────────────────────────────────────────────

export const MOOD_COLORS: Record<number, ThemeColor> = {
  1: { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   text: "#ef4444", fill: "#ef4444" },
  2: { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  text: "#f59e0b", fill: "#f59e0b" },
  3: { bg: "rgba(200,241,105,0.08)",  border: "rgba(200,241,105,0.2)",   text: "#c8f169", fill: "#c8f169" },
  4: { bg: "rgba(200,241,105,0.12)",  border: "rgba(200,241,105,0.3)",   text: "#c8f169", fill: "#c8f169" },
  5: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",  text: "#8b5cf6", fill: "#8b5cf6" },
}

export function moodColor(mood: number): ThemeColor {
  return MOOD_COLORS[mood] ?? MOOD_COLORS[3]
}

// ─── Nutrition / macro colors ────────────────────────────────────────────────

export const MACRO_COLORS = {
  protein:  "#3b82f6",
  carbs:    "#f59e0b",
  fat:      "#ec4899",
  calories: "#c8f169",
}

// ─── Status colors ───────────────────────────────────────────────────────────

export function statusColor(
  value: number,
  max: number,
  thresholds = { warn: 0.5, ok: 0.8 }
): string {
  const pct = max > 0 ? value / max : 0
  if (pct >= thresholds.ok) return "#c8f169"
  if (pct >= thresholds.warn) return "#f59e0b"
  return "#ef4444"
}

// ─── Pie chart palette ───────────────────────────────────────────────────────

export const PIE_PALETTE = [
  "#c8f169", "#f59e0b", "#8b5cf6", "#3b82f6", "#ec4899", "#ef4444",
]
