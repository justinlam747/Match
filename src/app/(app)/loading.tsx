import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
    </div>
  );
}
