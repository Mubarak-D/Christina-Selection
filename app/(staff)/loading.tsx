import { Bar, GridSkeleton, Loading } from "@/components/Skeleton";

// Default for staff pages (dashboard, catalogue, sets): heading + piece grid.
export default function StaffLoading() {
  return (
    <Loading>
      <Bar className="mb-8 h-8 w-48" />
      <GridSkeleton />
    </Loading>
  );
}
