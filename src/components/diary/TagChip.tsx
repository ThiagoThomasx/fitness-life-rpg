"use client"

type Props = {
  tag: string
}

export function TagChip({ tag }: Props) {
  return <span className="tag-chip">#{tag}</span>
}
