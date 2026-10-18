import { DHAKA_TZ } from "@/lib/format"

export type Message = {
  id: string
  from: "me" | "them"
  body: string
  at: string
}

export type Participant = {
  name: string
  // Role label shown next to the name, e.g. "Mentor · Software engineering".
  subtitle: string
  photo?: string
}

export type Conversation = {
  id: string
  participant: Participant
  bookingId?: string
  unread: number
  messages: Message[]
}

export const lastMessage = (conversation: Conversation) => conversation.messages[conversation.messages.length - 1]

export function sortByActivity(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => lastMessage(b).at.localeCompare(lastMessage(a).at))
}

export function filterConversations(conversations: Conversation[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return conversations
  return conversations.filter(
    (conversation) =>
      conversation.participant.name.toLowerCase().includes(needle) || conversation.messages.some((message) => message.body.toLowerCase().includes(needle))
  )
}

const dayKey = (iso: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA_TZ }).format(new Date(iso))

const dayDiff = (iso: string, now: Date) => Math.round((Date.parse(dayKey(now)) - Date.parse(dayKey(iso))) / 86_400_000)

export function dayLabel(iso: string, now: Date) {
  const diff = dayDiff(iso, now)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return new Intl.DateTimeFormat("en-US", { timeZone: DHAKA_TZ, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso))
}

// Compact stamp for the list: a time today, "Yesterday", a weekday within the week, otherwise the date.
export function activityLabel(iso: string, now: Date) {
  const diff = dayDiff(iso, now)
  if (diff === 0) return new Intl.DateTimeFormat("en-US", { timeZone: DHAKA_TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso))
  if (diff === 1) return "Yesterday"
  const options: Intl.DateTimeFormatOptions = diff > 0 && diff < 7 ? { weekday: "short" } : { month: "short", day: "numeric" }
  return new Intl.DateTimeFormat("en-US", { timeZone: DHAKA_TZ, ...options }).format(new Date(iso))
}

export type DayGroup = { key: string; iso: string; messages: Message[] }

export function groupByDay(messages: Message[]) {
  const groups: DayGroup[] = []
  for (const message of messages) {
    const key = dayKey(message.at)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.messages.push(message)
    else groups.push({ key, iso: message.at, messages: [message] })
  }
  return groups
}
