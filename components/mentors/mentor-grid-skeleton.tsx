import { Skeleton } from "@/components/ui/skeleton"

export function MentorGridSkeleton() {
  return (
    <div className="mt-6" aria-busy="true" aria-label="Loading mentors">
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-12 rounded-xl md:w-28" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-xl sm:w-2/3" />
      <Skeleton className="mt-6 h-5 w-24" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3 surface p-2 sm:flex-col sm:gap-0">
            <Skeleton className="aspect-4/5 w-28 shrink-0 rounded-xl sm:w-auto" />
            <div className="flex-1 space-y-2 py-1 sm:px-2 sm:pt-4 sm:pb-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
