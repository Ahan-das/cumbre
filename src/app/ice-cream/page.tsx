import { Suspense } from "react";
import ScoopChapter from "@/components/menu/ScoopChapter";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MenuLauncher from "@/components/nav/MenuLauncher";

export const metadata = { title: "Ice cream · Cumbre", description: "Scooped to order, cone or cup." };

export default function IceCreamPage() {
  return (
    <main className="page">
      <SiteHeader />
      <Suspense>
        <ScoopChapter />
      </Suspense>
      <SiteFooter />
      <MenuLauncher />
    </main>
  );
}
