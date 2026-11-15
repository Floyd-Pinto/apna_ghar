import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, ShieldCheck, ShieldOff, ShieldPlus, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { adminAPI, type AdminUser } from "@/services/adminAPI";

type PendingChange = { user: AdminUser; makeAdmin: boolean } | null;

const PAGE_SIZE = 10; // matches DRF PAGE_SIZE

export default function AdminPanel() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admins">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listUsers({ search: debouncedSearch, page, adminsOnly: filter === "admins" });
      setUsers(data.results);
      setCount(data.count);
    } catch (err) {
      toast({ title: "Couldn't load users", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const applyChange = async () => {
    if (!pending) return;
    const { user, makeAdmin } = pending;
    setPending(null);
    setBusyId(user.id);
    try {
      const res = makeAdmin ? await adminAPI.promote(user.id) : await adminAPI.demote(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      toast({ title: res.message, description: user.email });
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const name = (u: AdminUser) => `${u.first_name} ${u.last_name}`.trim() || u.username;

  return (
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Administration"
        title="Admins & users"
        description="Admins can manage every booking, payment and support ticket. Promote trusted people to admin; everyone else stays a regular buyer or builder account."
      />

      <div className="container space-y-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email or username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "admins")}>
            <TabsList>
              <TabsTrigger value="all">
                <Users className="h-4 w-4" /> Everyone
              </TabsTrigger>
              <TabsTrigger value="admins">
                <ShieldCheck className="h-4 w-4" /> Admins
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0 sm:p-0 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No users match your search.</div>
            ) : (
              <ul className="divide-y divide-border">
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                            {(u.first_name?.[0] ?? u.email[0]).toUpperCase()}
                            {u.last_name?.[0]?.toUpperCase() ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{name(u)}</span>
                            {isMe && <Badge variant="outline">You</Badge>}
                          </div>
                          <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:w-64 sm:justify-end">
                        <Badge variant="secondary" className="capitalize">
                          {u.role}
                        </Badge>
                        {u.is_admin ? (
                          <Badge variant="success">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            User
                          </Badge>
                        )}
                      </div>

                      <div className="sm:w-36 sm:text-right">
                        {u.is_admin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={isMe || busyId === u.id}
                            title={isMe ? "You can't remove your own admin rights" : undefined}
                            onClick={() => setPending({ user: u, makeAdmin: false })}
                          >
                            {busyId === u.id ? <Loader2 className="animate-spin" /> : <ShieldOff />}
                            Remove admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={busyId === u.id}
                            onClick={() => setPending({ user: u, makeAdmin: true })}
                          >
                            {busyId === u.id ? <Loader2 className="animate-spin" /> : <ShieldPlus />}
                            Make admin
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {count} {count === 1 ? "user" : "users"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.makeAdmin ? "Make this user an admin?" : "Remove admin rights?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.makeAdmin
                ? `${pending && name(pending.user)} will be able to see and manage all bookings, payments and support tickets, and promote other admins.`
                : `${pending && name(pending.user)} will go back to being a regular ${pending?.user.role} account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={applyChange}
              className={pending?.makeAdmin ? undefined : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {pending?.makeAdmin ? "Make admin" : "Remove admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
