import { BackLink } from "@/components/BackLink";
import { CustomerForm } from "@/components/CustomerForm";

export default function NewCustomerPage() {
  return (
    <>
      <BackLink href="/customers" label="Customers" />
      <h1 className="mb-4 text-2xl">New customer</h1>
      <CustomerForm />
    </>
  );
}
