import { Suspense } from "react";
import FlavourWheel from "@/components/mid/FlavourWheel";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MenuLauncher from "@/components/nav/MenuLauncher";

export const metadata = { title: "Coffee · Cumbre", description: "The cold bar: four iced coffees, poured to order." };

export default function CoffeePage() {
  return (
    <main className="page">
      <SiteHeader />
      <Suspense>
        <FlavourWheel />
      </Suspense>
      <SiteFooter />
      <MenuLauncher />
    </main>
  );
}
