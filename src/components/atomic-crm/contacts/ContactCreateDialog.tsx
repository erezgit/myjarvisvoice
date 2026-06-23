import { useState, type FormEvent } from "react";
import { useCreate, useGetIdentity, useNotify, useRedirect } from "ra-core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactCreateDialog = ({
  open,
  onOpenChange,
}: ContactCreateDialogProps) => {
  const { identity } = useGetIdentity();
  const [create, { isPending }] = useCreate();
  const redirect = useRedirect();
  const notify = useNotify();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    const now = new Date().toISOString();
    const data = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email_jsonb: [{ email: email.trim(), type: "Work" as const }],
      ...(phone.trim()
        ? { phone_jsonb: [{ phone: phone.trim(), type: "Work" as const }] }
        : {}),
      first_seen: now,
      last_seen: now,
      tags: [],
      lifecycle_stage: "new_lead",
      member_id: identity?.id,
    };

    create(
      "contacts",
      { data },
      {
        onSuccess: (newRecord) => {
          notify("Contact created", { type: "info" });
          resetForm();
          onOpenChange(false);
          redirect("show", "contacts", newRecord.id);
        },
        onError: (error: any) => {
          notify(error?.message || "Error creating contact", {
            type: "error",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-first-name">First name</Label>
                <Input
                  id="create-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last-name">Last name</Label>
                <Input
                  id="create-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+972..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !email.trim()}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
