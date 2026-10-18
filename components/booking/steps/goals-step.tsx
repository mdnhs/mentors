import { GoalsField } from "@/components/booking/steps/goals-field"

export function GoalsStep({ firstName, note, onNote }: { firstName: string; note: string; onNote: (value: string) => void }) {
  return (
    <div>
      <h2 tabIndex={-1} className="text-subheading outline-none">
        What do you want from this session?
      </h2>
      <GoalsField
        id="session-goals"
        value={note}
        onChange={onNote}
        placeholder={`Share your background and what you'd like ${firstName} to help with, so the session starts fast.`}
        className="mt-3"
      />
    </div>
  )
}
