export { OutlineFooter } from "@cartesi/vocs-theme/slots";

// The theme's Footer carries a "© The Cartesi Foundation" line, but deroll is
// not theirs (see LICENSE). This footer reuses the theme's public
// `cartesi-footer` classes so it looks the same, with deroll's own legal line.
const links = [
    { href: "https://cartesi.io", text: "cartesi.io" },
    { href: "https://docs.cartesi.io", text: "Cartesi Docs" },
    { href: "https://github.com/tuler/deroll", text: "GitHub" },
    { href: "https://discord.gg/pfXMwXDDfW", text: "Discord" },
];

export const Footer = () => (
    <div className="cartesi-footer">
        <p className="cartesi-footer__tagline">
            Any code. Ethereum's security.
        </p>
        <nav aria-label="Links" className="cartesi-footer__links">
            {links.map(({ href, text }) => (
                <a key={href} href={href}>
                    {text}
                </a>
            ))}
        </nav>
        <p className="cartesi-footer__legal">
            © 2023 Danilo Tuler ·{" "}
            <a href="https://github.com/tuler/deroll/blob/main/LICENSE">
                MIT License
            </a>{" "}
            · Cartesi is a trademark of The Cartesi Foundation, used under its{" "}
            <a href="https://cartesi.io/trademark-usage-policy/">
                Trademark Usage Policy
            </a>
        </p>
    </div>
);
