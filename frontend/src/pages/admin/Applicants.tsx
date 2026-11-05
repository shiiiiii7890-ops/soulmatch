import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageTitle } from "@/components/admin/AdminLayout";
import { ApplicantSheet } from "@/components/admin/ApplicantSheet";
import { Avatar, EmailBadge, PaymentBadge } from "@/components/common";
import { SimpleSelect, toOpts } from "@/components/SimpleSelect";
import { apiGet } from "@/lib/api";
import { GENDERS, PAYMENT_LABEL, fmtDate } from "@/lib/options";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAY_OPTS = Object.entries(PAYMENT_LABEL).map(([value, label]) => ({ value, label }));

export default function Applicants() {
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [payment, setPayment] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (gender) p.set("gender", gender);
    if (payment) p.set("payment_status", payment);
    return p.toString();
  }, [q, gender, payment]);
  const { data, isLoading } = useQuery({ queryKey: ["admin-apps", qs], queryFn: () => apiGet<Application[]>(`/admin/applications?${qs}`) });

  return (
    <div className="animate-fade-in">
      <PageTitle title={`All entries${data ? ` (${data.length})` : ""}`}>
        <a href={`/api/admin/applications/export?${qs}`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full")} data-testid="export-csv-button"><Download className="size-4" /> Download CSV</a>
      </PageTitle>
      <div className="mb-4 grid gap-2 rounded-2xl border border-sand bg-white p-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <Input className="h-10 pl-9" placeholder="Search name, email, mobile or ID" value={q} onChange={(e) => setQ(e.target.value)} data-testid="applicants-search-input" />
        </div>
        <SimpleSelect value={gender} onChange={setGender} placeholder="Any gender" options={toOpts(GENDERS)} testId="filter-gender" />
        <SimpleSelect value={payment} onChange={setPayment} placeholder="Any payment" options={PAY_OPTS} testId="filter-payment" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-sand bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-ivory">
              <TableHead>Name</TableHead><TableHead>ID</TableHead><TableHead>Age / Gender</TableHead>
              <TableHead className="hidden md:table-cell">College</TableHead><TableHead>Payment</TableHead>
              <TableHead className="hidden md:table-cell">Matches</TableHead><TableHead className="hidden lg:table-cell">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((a) => (
              <TableRow key={a.id} className="cursor-pointer transition-colors hover:bg-blush/60" onClick={() => setOpenId(a.id)} data-testid={`applicant-row-${a.app_code}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={a.full_name} photoId={a.photo_id} size={36} />
                    <div className="min-w-0"><p className="truncate font-semibold text-ink">{a.full_name}</p><p className="truncate text-xs text-ink-muted">{a.email}</p></div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{a.app_code}</TableCell>
                <TableCell className="text-sm">{a.age} · {a.gender}</TableCell>
                <TableCell className="hidden max-w-40 truncate text-sm md:table-cell">{a.college}</TableCell>
                <TableCell><PaymentBadge status={a.payment.status} testId={`row-payment-${a.app_code}`} /></TableCell>
                <TableCell className="hidden md:table-cell"><div className="flex items-center gap-2"><span className="font-mono text-sm">{a.match_count}</span>{a.match_count > 0 && <EmailBadge status={a.email_status} />}</div></TableCell>
                <TableCell className="hidden text-xs text-ink-muted lg:table-cell">{fmtDate(a.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isLoading && <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-wine" /></div>}
        {data?.length === 0 && <p className="py-12 text-center text-sm text-ink-muted" data-testid="applicants-empty">No entries yet.</p>}
      </div>
      <ApplicantSheet appId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
