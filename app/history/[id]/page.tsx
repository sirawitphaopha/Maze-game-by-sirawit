"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ReplayView = dynamic(() => import("@/components/history/ReplayView"), { ssr: false });

export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  return <ReplayView id={String(params.id ?? "")} />;
}
