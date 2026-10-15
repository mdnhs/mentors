import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MentorAvatar({ name, photo, className }: { name: string; photo?: string; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      {photo && <AvatarImage src={photo} alt="" className="object-cover" />}
      <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
