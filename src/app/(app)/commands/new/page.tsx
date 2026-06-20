import { CommandForm } from "@/components/kb/command-form";

export default function NewCommandPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Command</h1>
        <p className="text-sm text-muted-foreground">
          Add a command to your reusable library.
        </p>
      </div>
      <CommandForm />
    </div>
  );
}
