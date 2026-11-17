import { useEffect, useState } from "react";

export default function Toast() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer;
    const onToast = (event) => {
      setMessage(event.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(""), 3200);
    };
    window.addEventListener("stockroom:toast", onToast);
    return () => { window.removeEventListener("stockroom:toast", onToast); clearTimeout(timer); };
  }, []);
  return <div className={`toast${message ? " toast-visible" : ""}`} role="status">{message}</div>;
}
