import { useState } from "react";

export function useDebug() {
  const [isDebugStarted, setIsDebugStarted] = useState(false);
  const [logTitle, setLogTitle] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const debug = {
    start: (title?: string) => {
      setLogTitle(title || "");
      setLogs([]);
      setIsDebugStarted(true);
    },
    log: (...messages: any[]) => {
      console.log(...messages);
      setLogs((logs) => [...logs, messages.join(" ")]);
    },
    end: () => {
      setIsDebugStarted(false);
    },
  };

  return { debug, isDebugStarted, logTitle, logs };
}
