import { SearchIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Input } from "@/components/ui/input"
import { activityLabel, lastMessage, type Conversation } from "@/lib/messaging"
import { cn } from "@/lib/utils"

export function ConversationList({
  conversations,
  selectedId,
  query,
  onQuery,
  onSelect,
  now,
}: {
  conversations: Conversation[]
  selectedId?: string
  query: string
  onQuery: (value: string) => void
  onSelect: (id: string) => void
  now: Date
}) {
  return (
    <>
      <div className="space-y-3 border-b p-4">
        <h1 className="text-lg font-semibold tracking-tight">Messages</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" aria-label="Search conversations" placeholder="Search by name or message" value={query} onChange={(event) => onQuery(event.target.value)} className="pl-9" />
        </div>
      </div>
      {conversations.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">{query ? `No conversations match “${query.trim()}”.` : "No conversations yet."}</p>
      ) : (
        <ul aria-label="Conversations" className="flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => {
            const last = lastMessage(conversation)
            const selected = conversation.id === selectedId
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-ring",
                    selected ? "bg-accent" : "hover:bg-muted"
                  )}
                >
                  <MentorAvatar name={conversation.participant.name} photo={conversation.participant.photo} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", conversation.unread > 0 ? "font-semibold" : "font-medium")}>{conversation.participant.name}</span>
                      <time dateTime={last.at} className="shrink-0 text-xs text-muted-foreground">
                        {activityLabel(last.at, now)}
                      </time>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{conversation.participant.subtitle}</span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", conversation.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                        {last.from === "me" && "You: "}
                        {last.body}
                      </span>
                      {conversation.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
                          <span aria-hidden="true">{conversation.unread}</span>
                          <span className="sr-only">{conversation.unread} unread</span>
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
