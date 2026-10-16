"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalisePhone } from "@/lib/phone";

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function saveCustomer(formData: FormData): Promise<{ id: string } | { error: string }> {
  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "That isn't a valid phone number." };
  const row = {
    name: text(formData, "name") ?? "",
    phone,
    birthday: text(formData, "birthday"),
    anniversary: text(formData, "anniversary"),
    notes: text(formData, "notes"),
  };
  if (!row.name) return { error: "Enter a name." };

  const supabase = await createClient();
  const id = text(formData, "id");
  const { data, error } = id
    ? await supabase.from("customers").update(row).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(row).select("id").single();
  if (error?.code === "23505") return { error: "A customer with this number already exists." };
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/customers");
  return { id: data.id };
}
