import OrderDesk from "@/components/order/OrderDesk";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MenuLauncher from "@/components/nav/MenuLauncher";

export const metadata = { title: "Your order · Cumbre", description: "What is in your bag, and how to collect it." };

export default function OrderPage() {
  return (
    <main className="page">
      <SiteHeader />
      <OrderDesk />
      <SiteFooter />
      <MenuLauncher />
    </main>
  );
}
