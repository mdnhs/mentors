export type MeetingDetails = { url: string; passcode: string }

// Placeholder rooms on example.com. In a real build these live on the server and are sent only to
// confirmed attendees; here they are bundled with the page, so the gate is a UI rule, not security.
export function getMeetingDetails(sessionId: string): MeetingDetails {
  return { url: `https://meet.example.com/mentorbridge/${sessionId}`, passcode: sessionId.replace(/[^a-z]/g, "").slice(0, 6).toUpperCase() }
}
