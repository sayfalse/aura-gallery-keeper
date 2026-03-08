import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchContacts, createContact, updateContact, deleteContact, type Contact } from "@/lib/contactService";
import { ArrowLeft, Plus, Trash2, Search, Users, Phone, Mail, Building, Star, X } from "lucide-react";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

const AVATAR_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const ContactsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", company: "", address: "", notes: "",
  });

  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchContacts(user.id);
      setContacts(data);
    } catch {
      toast.error(t("contacts.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleCreate = async () => {
    if (!user || !form.firstName.trim()) {
      toast.error(t("contacts.firstNameRequired"));
      return;
    }
    try {
      const contact = await createContact(user.id, {
        ...form,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        favorite: false,
      });
      setContacts((prev) => [...prev, contact].sort((a, b) => a.firstName.localeCompare(b.firstName)));
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", address: "", notes: "" });
      toast.success(t("contacts.contactAdded"));
    } catch {
      toast.error(t("contacts.failedAdd"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("contacts.deleteConfirm"))) return;
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (activeContact?.id === id) setActiveContact(null);
    try {
      await deleteContact(id);
      toast.success(t("contacts.contactDeleted"));
    } catch {
      toast.error(t("contacts.failedDelete"));
    }
  };

  const handleToggleFavorite = async (contact: Contact) => {
    const newFav = !contact.favorite;
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, favorite: newFav } : c)));
    if (activeContact?.id === contact.id) setActiveContact({ ...contact, favorite: newFav });
    try {
      await updateContact(contact.id, { favorite: newFav });
    } catch {
      toast.error(t("contacts.failedUpdate"));
    }
  };

  const filtered = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const grouped = filtered.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.firstName.charAt(0).toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" />
          <h1 className="font-display text-lg font-bold text-foreground">{t("contacts.title")}</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{contacts.length}</span>
        </div>
        <QuickNavButton />
        <button onClick={() => setShowForm(true)} className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <aside className={`w-full md:w-80 border-r border-border flex flex-col shrink-0 ${activeContact ? "hidden md:flex" : "flex"}`}>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" placeholder={t("contacts.searchContacts")} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("contacts.noContacts")}</p>
              </div>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, letterContacts]) => (
                <div key={letter}>
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">{letter}</div>
                  {letterContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setActiveContact(contact)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors ${
                        activeContact?.id === contact.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                        style={{ backgroundColor: contact.avatarColor }}
                      >
                        {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.firstName} {contact.lastName}</p>
                        {contact.company && <p className="text-xs text-muted-foreground truncate">{contact.company}</p>}
                      </div>
                      {contact.favorite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Detail */}
        <main className={`flex-1 ${!activeContact ? "hidden md:flex md:items-center md:justify-center" : "flex flex-col"}`}>
          {activeContact ? (
            <div className="p-6 md:p-10 max-w-lg mx-auto w-full">
              <button onClick={() => setActiveContact(null)} className="md:hidden p-2 rounded-lg hover:bg-accent mb-4">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex flex-col items-center mb-8">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3"
                  style={{ backgroundColor: activeContact.avatarColor }}
                >
                  {activeContact.firstName.charAt(0)}{activeContact.lastName.charAt(0)}
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">{activeContact.firstName} {activeContact.lastName}</h2>
                {activeContact.company && <p className="text-sm text-muted-foreground">{activeContact.company}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleToggleFavorite(activeContact)} className={`p-2 rounded-xl transition-colors ${activeContact.favorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}>
                    <Star className={`w-5 h-5 ${activeContact.favorite ? "fill-amber-500" : ""}`} />
                  </button>
                  <button onClick={() => handleDelete(activeContact.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {activeContact.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">{t("common.phone")}</p><p className="text-sm text-foreground">{activeContact.phone}</p></div>
                  </div>
                )}
                {activeContact.email && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">{t("common.email")}</p><p className="text-sm text-foreground">{activeContact.email}</p></div>
                  </div>
                )}
                {activeContact.address && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">{t("common.address")}</p><p className="text-sm text-foreground">{activeContact.address}</p></div>
                  </div>
                )}
                {activeContact.notes && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground">{activeContact.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a contact</p>
            </div>
          )}
        </main>
      </div>

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-foreground">New Contact</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" />
                <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" />
              </div>
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" />
              <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground resize-none" />
            </div>
            <button onClick={handleCreate} className="w-full mt-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
              Add Contact
            </button>
          </div>
        </div>
      )}
      <ModuleSwitcher />
    </div>
  );
};

export default ContactsPage;
