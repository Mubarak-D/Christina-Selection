import { Bar, Loading } from "@/components/Skeleton";

export default function CustomersLoading() {
  return (
    <Loading>
      <Bar className="mb-8 h-8 w-48" />
      <div className="skeleton mb-6 h-11 w-full" />
      <ul className="divide-y divide-line">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex justify-between py-4">
            <Bar className="w-40" />
            <Bar className="w-28" />
          </li>
        ))}
      </ul>
    </Loading>
  );
}
