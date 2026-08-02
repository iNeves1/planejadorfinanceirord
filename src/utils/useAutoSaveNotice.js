import { useState, useEffect, useRef } from "react";

export function useAutoSaveNotice(formData) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer.current);
  }, [formData]);
  return visible;
}
