import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, ArrowUpIcon, CalendarIcon } from "lucide-react"

import { statusStyles } from "@/components/dashboard/booking-row"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { offerTypeLabels } from "@/lib/categories"
import { bookingHref } from "@/lib/dashboard"
import { bookingForConversation } from "@/lib/data/conversations"
import { formatDate, formatTime } from "@/lib/format"
import { dayLabel, groupByDay, type Conversation } from "@/lib/messaging"
import type { Role } from "@/lib/permissions"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ChatPane({
  conversation,
  role,
  now,
  onBack,
  onSend,
}: {
  conversation: Conversation
  role: Role
  now: Date
  onBack: () => void
  onSend: (body: string) => void
}) {
  const booking = bookingForConversation(conversation)
  const history = useRef<HTMLDivElement>(null)
  const count = conversation.messages.length

  useEffect(() => {
    history.current?.scrollTo({ top: history.current.scrollHeight })
  }, [count])

  return (
    <>
      <header className="flex items-center gap-3 border-b px-3 py-3 sm:px-5">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations" className="lg:hidden">
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
        <MentorAvatar name={conversation.participant.name} photo={conversation.participant.photo} className="size-9" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{conversation.participant.name}</h2>
          <p className="truncate text-xs text-muted-foreground">{conversation.participant.subtitle}</p>
        </div>
      </header>
      {booking && <BookingContext booking={booking} role={role} />}
      <div ref={history} tabIndex={0} aria-label={`Messages with ${conversation.participant.name}`} className="flex-1 overflow-y-auto px-3 py-4 focus-ring sm:px-5">
        {groupByDay(conversation.messages).map((group) => (
          <div key={group.key} role="group" aria-label={dayLabel(group.iso, now)} className="mb-4 space-y-1.5">
            <p className="py-2 text-center text-xs font-medium text-muted-foreground">{dayLabel(group.iso, now)}</p>
            {group.messages.map((message) => (
              <div key={message.id} className={cn("flex", message.from === "me" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-xs rounded-2xl px-3.5 py-2 text-sm sm:max-w-md",
                    message.from === "me" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted"
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">
                    <span className="sr-only">{message.from === "me" ? "You: " : `${conversation.participant.name}: `}</span>
                    {message.body}
                  </p>
                  <time dateTime={message.at} className={cn("mt-0.5 block text-right text-xs", message.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatTime(message.at)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Composer name={conversation.participant.name} onSend={onSend} />
    </>
  )
}

function BookingContext({ booking, role }: { booking: Booking; role: Role }) {
  const style = statusStyles[booking.status]
  const href = role === "mentor" ? "/dashboard/mentor/bookings" : bookingHref(booking)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-3 py-2 text-xs sm:px-5">
      <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Link href={href} className="min-w-0 truncate rounded-sm text-sm font-medium hover:underline focus-ring">
        {booking.title}
      </Link>
      <span className="text-muted-foreground">
        {offerTypeLabels[booking.kind]} · {formatDate(booking.date, booking.timezone)}, {formatTime(booking.date, booking.timezone)}
      </span>
      <span className={cn("rounded-md px-2 py-0.5 font-medium", style.className)}>{style.label}</span>
    </div>
  )
}

function Composer({ name, onSend }: { name: string; onSend: (body: string) => void }) {
  const [draft, setDraft] = useState("")
  const body = draft.trim()

  const submit = () => {
    if (!body) return
    onSend(body)
    setDraft("")
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="border-t p-3 sm:px-5"
    >
      <div className="flex items-end gap-2">
        <Textarea
          aria-label={`Message ${name}`}
          placeholder="Write a message"
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => {
            const field = event.currentTarget
            window.setTimeout(() => field.scrollIntoView({ block: "nearest" }), 300)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button type="submit" size="icon" disabled={!body} aria-label="Send message">
          <ArrowUpIcon aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Prototype: messages stay in this browser tab and aren&apos;t delivered.</p>
    </form>
  )
}
