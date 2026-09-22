import { Suspense } from "react";
import ShelfChapter from "@/components/menu/ShelfChapter";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MenuLauncher from "@/components/nav/MenuLauncher";

export const metadata = { title: "Pastries · Cumbre", description: "Baked here, out of the case by six." };

export default function PastriesPage() {
  return (
    <main className="page">
      <SiteHeader />
      <Suspense>
        <ShelfChapter />
      </Suspense>
      <SiteFooter />
      <MenuLauncher />
    </main>
  );
}
