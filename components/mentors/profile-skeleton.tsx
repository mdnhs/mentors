import { Container } from "@/components/site/container"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <Container className="pt-6 sm:pt-8" aria-busy="true" aria-label="Loading mentor profile">
      <Skeleton className="h-5 w-28" />
      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
        <div className="flex gap-5 sm:gap-8 lg:col-span-3">
          <Skeleton className="aspect-4/5 w-28 shrink-0 rounded-2xl sm:w-48 sm:rounded-3xl lg:w-56" />
          <div className="flex-1 space-y-3 sm:pt-2">
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      </div>
    </Container>
  )
}
