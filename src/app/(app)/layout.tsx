import AppSidebar from "@/components/sidebar/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="h-dvh w-full flex flex-col overflow-hidden">
        {children}
      </main>
    </SidebarProvider>
  );
}
