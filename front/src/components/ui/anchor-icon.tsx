import { cn } from "@/lib/utils"

interface AnchorEmojiProps {
  className?: string
}

export function AnchorEmoji({ className }: AnchorEmojiProps) {
  return (
    <span className={cn("text-blue-700", className)}>
      ⚓
    </span>
  )
}