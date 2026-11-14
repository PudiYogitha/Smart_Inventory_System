import { useEffect, useState } from "react";

export default function Toast() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer;
    const show = (event) => {
      setMessage(event.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(""), 3200);
    };
    window.addEventListener("stockroom:toast", show);
    return () => { window.removeEventListener("stockroom:toast", show); clearTimeout(timer); };
  }, []);
  return <div className={`toast${message ? " toast-visible" : ""}`} role="status">{message}</div>;
}
