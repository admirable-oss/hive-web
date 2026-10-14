import { useEffect } from "react";
import { hiveActions } from "@/lib/hive-store";
import TuiDemo from "./TuiDemo";

/** /demo — full-viewport Hive TUI (same layout as `hive ui`, simulated). */
export default function DemoPage() {
  useEffect(() => {
    hiveActions.setDemoOpen(true);
    return () => hiveActions.setDemoOpen(false);
  }, []);

  return <TuiDemo className="h-dvh w-full" fullscreen />;
}
