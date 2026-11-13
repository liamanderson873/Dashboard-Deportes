import Link from "next/link";
import { ACTION_PRIMARY, EmptyState } from "@/components/EmptyState";
import { SiteBand } from "@/components/SiteBand";
import { es } from "@/lib/es";

export default function NotFound() {
  return (
    <>
      <SiteBand />
      <div id="contenido" className="pt-8">
        <EmptyState
          level={1}
          title={es.notFound.title}
          action={
            <Link href="/" className={ACTION_PRIMARY}>
              {es.notFound.back}
            </Link>
          }
        >
          <p>{es.notFound.message}</p>
        </EmptyState>
      </div>
    </>
  );
}
