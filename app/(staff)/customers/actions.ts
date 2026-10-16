"use server";

import { revalidatePath } from "next/cache";
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
