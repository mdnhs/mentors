"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { MessagesSquareIcon } from "lucide-react"

import { ChatPane } from "@/components/messages/chat-pane"
import { ConversationList } from "@/components/messages/conversation-list"
import { Skeleton } from "@/components/ui/skeleton"
import { conversationsFor } from "@/lib/data/conversations"
import { filterConversations, sortByActivity, type Conversation, type Message } from "@/lib/messaging"
import type { Role } from "@/lib/permissions"
import { useNow } from "@/lib/store"
import { cn } from "@/lib/utils"

// Frontend-only: threads live in component state, so a reload restores the sample history and nothing is delivered.
export function Inbox({ role }: { role: Extract<Role, "learner" | "mentor"> }) {
  const now = useNow()
  if (!now) return <Skeleton aria-label="Loading your messages" className="h-96 rounded-2xl" />
  return <InboxBody role={role} now={now} />
}

function InboxBody({ role, now }: { role: Extract<Role, "learner" | "mentor">; now: Date }) {
  const router = useRouter()
  const pathname = usePathname()
  const selectedId = useSearchParams().get("c")
  const [conversations, setConversations] = useState<Conversation[]>(() => conversationsFor(role))
  const [query, setQuery] = useState("")
  const [read, setRead] = useState<ReadonlySet<string>>(new Set())

  const selected = conversations.find((conversation) => conversation.id === selectedId)
  if (selected && selected.unread > 0 && !read.has(selected.id)) setRead(new Set(read).add(selected.id))

  const visible = sortByActivity(filterConversations(conversations, query)).map((conversation) => (read.has(conversation.id) ? { ...conversation, unread: 0 } : conversation))

  const send = (conversationId: string, body: string) => {
    const message: Message = { id: `local-${Date.now()}`, from: "me", body, at: new Date().toISOString() }
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? { ...conversation, messages: [...conversation.messages, message] } : conversation)))
  }

  return (
    <div className="-mb-24 flex h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom))] min-h-96 overflow-hidden rounded-2xl border bg-card lg:mb-0 lg:h-[calc(100dvh-10rem)]">
      <div className={cn("min-w-0 flex-col border-r lg:flex lg:w-80 lg:shrink-0 xl:w-96", selected ? "hidden" : "flex flex-1")}>
        <ConversationList
          conversations={visible}
          selectedId={selected?.id}
          query={query}
          onQuery={setQuery}
          now={now}
          onSelect={(id) => router.push(`${pathname}?c=${id}`)}
        />
      </div>
      <section aria-label="Conversation" className={cn("min-w-0 flex-1 flex-col lg:flex", selected ? "flex" : "hidden")}>
        {selected ? (
          <ChatPane key={selected.id} conversation={selected} role={role} now={now} onBack={() => router.push(pathname)} onSend={(body) => send(selected.id, body)} />
        ) : (
          <div className="m-auto flex flex-col items-center px-6 text-center">
            <MessagesSquareIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 font-semibold">Select a conversation</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {role === "learner" ? "Ask your mentor a question or get ready for an upcoming session." : "Reply to learners and prepare for upcoming sessions."}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
