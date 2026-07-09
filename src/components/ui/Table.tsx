import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-gray-700 border-t border-gray-100", className)}>{children}</td>;
}

export function Badge({
  label,
  color = "gray",
}: {
  label: string;
  color?: "gray" | "green" | "red" | "blue" | "amber";
}) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", colors[color])}>
      {label}
    </span>
  );
}
