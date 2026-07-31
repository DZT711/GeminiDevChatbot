import { useState } from "react";

export function useAdmin() {
    const [adminLogs, setAdminLogs] = useState<string[]>([
    "[SYSTEM] SENSING NODE BOOT INITIATED...",
    "[SYSTEM] ATTACHING GLOBAL DIAGNOSTIC BUS CHANNELS...",
    "[DATABASE] REST LINK ESTABLISHED",
    "[READY] DEVGENIE AGENT SHELL READY. ADMINISTRATIVE CHANNEL SECURED.",
  ]);
  const [adminCliInput, setAdminCliInput] = useState("");
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  return {
         adminLogs, setAdminLogs,
    adminCliInput, setAdminCliInput,
    isStateLoaded, setIsStateLoaded,
  };
}
