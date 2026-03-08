import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  avatarColor: string;
  favorite: boolean;
  createdAt: Date;
}

export const fetchContacts = async (userId: string): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name || "",
    email: r.email || "",
    phone: r.phone || "",
    company: r.company || "",
    address: r.address || "",
    notes: r.notes || "",
    avatarColor: r.avatar_color || "#3b82f6",
    favorite: r.favorite,
    createdAt: new Date(r.created_at),
  }));
};

export const createContact = async (userId: string, contact: Omit<Contact, "id" | "createdAt">): Promise<Contact> => {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      address: contact.address,
      notes: contact.notes,
      avatar_color: contact.avatarColor,
      favorite: contact.favorite,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name || "",
    email: data.email || "",
    phone: data.phone || "",
    company: data.company || "",
    address: data.address || "",
    notes: data.notes || "",
    avatarColor: data.avatar_color || "#3b82f6",
    favorite: data.favorite,
    createdAt: new Date(data.created_at),
  };
};

export const updateContact = async (id: string, updates: Partial<Omit<Contact, "id" | "createdAt">>) => {
  const dbUpdates: Record<string, any> = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.company !== undefined) dbUpdates.company = updates.company;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.favorite !== undefined) dbUpdates.favorite = updates.favorite;
  
  const { error } = await supabase.from("contacts").update(dbUpdates).eq("id", id);
  if (error) throw error;
};

export const deleteContact = async (id: string) => {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
};
