import { AppBar } from "@/ui/AppBar";
import { NAV } from "@/ui/messages";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <AppBar backHref="/sites" backName={NAV.sites} />
      <main>
        <h1>Page not found</h1>
        <p>That page does not exist.</p>
      </main>
    </>
  );
}
