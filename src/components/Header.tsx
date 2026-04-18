import { NavLink } from "react-router-dom";
import { APP_NAME } from "../lib/constants";

const links = [
  { to: "/", label: "Timeline" },
  { to: "/itineraries", label: "Itineraries" },
  { to: "/settings", label: "Settings" },
];

export function Header() {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">Shinjuku theaters</p>
        <h1>{APP_NAME}</h1>
      </div>
      <nav className="nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
