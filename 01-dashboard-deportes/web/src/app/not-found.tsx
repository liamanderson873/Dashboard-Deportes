import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { es } from "@/lib/es";

export default function NotFound() {
  return (
    <EmptyState level={1} title={es.notFound.title}>
      <p>{es.notFound.message}</p>
      <p className="mt-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-medium text-accent underline"
        >
          {es.notFound.back}
        </Link>
      </p>
    </EmptyState>
  );
}
