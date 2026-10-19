"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flash } from "@/lib/flash";
import { deletePieces, oneOffPiecesIn } from "@/lib/delete-pieces";
import { createClient } from "@/lib/supabase/server";
import { normalisePhone } from "@/lib/phone";
import { normaliseEmail } from "@/lib/email";

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function saveCustomer(formData: FormData): Promise<{ id: string } | { error: string }> {
  const phoneIn = text(formData, "phone");
  const emailIn = text(formData, "email");
  if (!phoneIn && !emailIn) return { error: "Add a WhatsApp number or an email." };
  const phone = phoneIn ? normalisePhone(phoneIn) : null;
  if (phoneIn && !phone) return { error: "That isn't a valid phone number." };
  const email = emailIn ? normaliseEmail(emailIn) : null;
  if (emailIn && !email) return { error: "That isn't a valid email address." };
  const row = {
    name: text(formData, "name") ?? "",
    phone,
    email,
    deadline: text(formData, "deadline"),
    notes: text(formData, "notes"),
  };
  if (!row.name) return { error: "Enter a name." };

  const supabase = await createClient();
  const id = text(formData, "id");
  const { data, error } = id
    ? await supabase.from("customers").update(row).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(row).select("id").single();
  if (error?.code === "23505") {
    return { error: error.message.includes("email")
      ? "A customer with this email already exists."
      : "A customer with this number already exists." };
  }
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/customers");
  return { id: data.id };
}

// Deletes the customer, their sets (cascade) and the one-off pieces made for those sets.
export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  const { data: sets } = await supabase.from("selection_sets").select("id").eq("customer_id", id);
  const oneOffs = await oneOffPiecesIn(supabase, (sets ?? []).map((s) => s.id));
  await deletePieces(supabase, oneOffs); // first, so a failure can't leave unreachable pieces
  const { data: jobs } = await supabase.from("job_cards").select("job_card_media(path)").eq("customer_id", id);
  const photos = (jobs ?? []).flatMap((j) => j.job_card_media.map((m) => m.path));
  if (photos.length) {
    const files = await supabase.storage.from("media").remove(photos); // job cards themselves go by cascade
    if (files.error) throw files.error;
  }
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/customers");
  await flash("Customer deleted");
  redirect("/customers");
}
