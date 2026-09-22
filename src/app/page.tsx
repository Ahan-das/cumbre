import { Suspense } from "react";
import Hero from "@/components/hero/Hero";
import FlavourWheel from "@/components/mid/FlavourWheel";
import Visit from "@/components/site/Visit";
import SiteFooter from "@/components/site/SiteFooter";
import MenuLauncher from "@/components/nav/MenuLauncher";

export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* the cold bar rides along on the home page too; /coffee is the same section on its own */}
      <Suspense>
        <FlavourWheel />
      </Suspense>
      <Visit />
      <SiteFooter />
      <MenuLauncher />
    </main>
  );
}
