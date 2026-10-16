import { Bar, Loading } from "@/components/Skeleton";

export default function CustomersLoading() {
  return (
    <Loading>
      <Bar className="mb-8 h-8 w-48" />
      <div className="skeleton mb-6 h-11 w-full" />
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-4 rounded-xl border border-line bg-pearl px-4 py-3">
            <div className="skeleton h-11 w-11 rounded-full" />
            <div className="flex flex-1 flex-col gap-2"><Bar className="w-40" /><Bar className="h-3 w-28" /></div>
          </li>
        ))}
      </ul>
    </Loading>
  );
}
