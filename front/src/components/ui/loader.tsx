// src/components/ui/loader.tsx
export function Loader({ progress }: { progress: number }) {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full">
      <div
        className="transition-all duration-200 absolute h-full w-full rounded-full"
        style={{
          background: `conic-gradient(#1e40af ${progress * 3.6}deg, #d1d5db ${progress * 3.6}deg)`,
        }}
      ></div>
      <div className="relative h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-full bg-background flex items-center justify-center">
        <span className="text-xl font-bold text-foreground">{`${Math.round(
          progress
        )}%`}</span>
      </div>
    </div>
  )
}
