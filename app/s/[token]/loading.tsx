import { Bar, Loading } from "@/components/Skeleton";

// Shown the instant a customer opens their link, while photos are signed and fetched.
export default function SelectionLoading() {
  return (
    <main className="mx-auto w-full max-w-xl">
      <p className="wordmark border-b border-line py-5 text-center">Christina Jewellers</p>
      <Loading>
        <div className="flex flex-col items-center gap-3 px-6 pb-12 pt-14">
          <Bar className="h-8 w-56" />
          <Bar className="h-8 w-40" />
          <Bar className="mt-4 h-4 w-64" />
        </div>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="mb-14">
            <div className="skeleton aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-3 px-6 pt-6">
              <Bar className="h-6 w-2/3" />
              <Bar className="w-1/3" />
              <Bar className="h-11 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </Loading>
    </main>
  );
}
