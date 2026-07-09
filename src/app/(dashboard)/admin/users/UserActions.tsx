"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, PowerOff, Loader2, UserPlus, ShieldCheck } from "lucide-react";

type CreateForm = {
  name: string;
  email: string;
  password: string;
  role: string;
};

type EditForm = {
  name: string;
  role: string;
  password: string;
};

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "SALES", label: "Sales" },
  { value: "VIEWER", label: "Viewer" },
];

export function UserActions(props?: {
  userId?: string;
  userName?: string;
  userRole?: string;
  isActive?: boolean;
}) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const createForm = useForm<CreateForm>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "VIEWER",
    },
  });

  const editForm = useForm<EditForm>({
    defaultValues: {
      name: props?.userName ?? "",
      role: props?.userRole ?? "VIEWER",
      password: "",
    },
  });

  useEffect(() => {
    if (editOpen && props?.userId) {
      editForm.reset({
        name: props.userName ?? "",
        role: props.userRole ?? "VIEWER",
        password: "",
      });
    }
  }, [editOpen, props?.userId, props?.userName, props?.userRole, editForm]);

  const onCreateSubmit = async (data: CreateForm) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      createForm.reset({
        name: "",
        email: "",
        password: "",
        role: "VIEWER",
      });
      setCreateOpen(false);
      router.refresh();
    } else {
      const json = await res.json();
      createForm.setError("email", { message: json.error });
    }
  };

  const onEditSubmit = async (data: EditForm) => {
    const payload: any = {
      name: data.name,
      role: data.role,
    };

    if (data.password) {
      payload.password = data.password;
    }

    await fetch(`/api/users/${props?.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setEditOpen(false);
    router.refresh();
  };

  const toggleActive = async () => {
    await fetch(`/api/users/${props?.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !props?.isActive }),
    });
    router.refresh();
  };

  if (props?.userId) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            aria-label={`Edit ${props.userName}`}
          >
            <Pencil size={15} />
          </button>

          <button
            onClick={toggleActive}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              props.isActive
                ? "border-slate-200 bg-white text-slate-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                : "border-slate-200 bg-white text-slate-500 hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-600"
            }`}
            aria-label={props.isActive ? "Deactivate user" : "Activate user"}
          >
            <PowerOff size={15} />
          </button>
        </div>

        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="" className="max-w-2xl">
          <div className="w-full">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    Edit User
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update account details, role access, or reset the password for {props.userName}.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Account details
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-4">
                    <Input
                      label="Full Name"
                      {...editForm.register("name", { required: "Required" })}
                      error={editForm.formState.errors.name?.message}
                    />

                    <Select
                      label="Role"
                      options={ROLES}
                      {...editForm.register("role")}
                    />

                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Leave blank to keep current password"
                      {...editForm.register("password")}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditOpen(false)}
                  className="min-h-[44px] rounded-2xl"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={editForm.formState.isSubmitting}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editForm.formState.isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {editForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setCreateOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus size={16} />
        New User
      </Button>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="" className="max-w-2xl">
        <div className="w-full">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Create System User
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a new team member and assign the appropriate role access.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  User details
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4">
                  <Input
                    label="Full Name *"
                    {...createForm.register("name", { required: "Required" })}
                    error={createForm.formState.errors.name?.message}
                  />

                  <Input
                    label="Email Address *"
                    type="email"
                    {...createForm.register("email", { required: "Required" })}
                    error={createForm.formState.errors.email?.message}
                  />

                  <Input
                    label="Password *"
                    type="password"
                    {...createForm.register("password", {
                      required: "Required",
                      minLength: { value: 8, message: "Min 8 characters" },
                    })}
                    error={createForm.formState.errors.password?.message}
                  />

                  <Select
                    label="Role *"
                    options={ROLES}
                    {...createForm.register("role")}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateOpen(false)}
                className="min-h-[44px] rounded-2xl"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createForm.formState.isSubmitting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createForm.formState.isSubmitting && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {createForm.formState.isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}