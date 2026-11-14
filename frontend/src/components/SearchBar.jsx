import { Search } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "Search…" }) {
  return (
    <label className="search-wrap">
      <Search size={16} aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
