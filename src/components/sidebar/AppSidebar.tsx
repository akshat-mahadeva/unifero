"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/clerk-react";
import { useSessions } from "@/hooks/use-sessions-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AppSidebar() {
  const { user } = useUser();
  const { sessions, loading, deleteSession, updateTitle, isDeleting } =
    useSessions();
  const pathname = usePathname();
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const handleStartEdit = (sessionId: string, currentTitle: string) => {
    setEditingSession(sessionId);
    setEditedTitle(currentTitle);
    setIsEditDialogOpen(true);
    // close any open menu
    setOpenMenuFor(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSession || !editedTitle.trim()) return;

    updateTitle({ sessionId: editingSession, title: editedTitle.trim() });
    setIsEditDialogOpen(false);
    setEditingSession(null);
    setEditedTitle("");
  };
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingSession(null);
    setEditedTitle("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSessionId) return;

    // close any open menu before deleting
    setOpenMenuFor(null);
    deleteSession(deleteSessionId);
    setDeleteSessionId(null);
  };
  return (
    <>
      <Sidebar>
        <SidebarHeader className="pt-4">
          <Link href="/">
            <Button className="w-full justify-start">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <SidebarMenu>
                  {sessions.map((session) => {
                    const isActive = pathname === `/${session.id}`;
                    const isMenuOpen = openMenuFor === session.id;

                    return (
                      <SidebarMenuItem key={session.id}>
                        <SidebarMenuButton
                          asChild
                          className="flex items-center gap-2 group"
                          isActive={isActive}
                        >
                          <Link
                            href={`/${session.id}`}
                            className="w-full relative"
                          >
                            {" "}
                            {/* Added relative for positioning if needed */}
                            <MessageSquare className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate flex-1">
                              {session.title || "New Chat"}
                            </span>
                            <DropdownMenu
                              open={isMenuOpen}
                              onOpenChange={(open) => {
                                if (!open) setOpenMenuFor(null); // Reset on close
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" // Opacity-only + positioning like ChatGPT's trailing
                                  )}
                                  onMouseEnter={() =>
                                    setOpenMenuFor(session.id)
                                  } // Open on hover (or remove for click-only)
                                  onMouseLeave={() =>
                                    setOpenMenuFor((prev) =>
                                      prev === session.id ? null : prev
                                    )
                                  }
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onMouseEnter={() => setOpenMenuFor(session.id)} // Keep open on content hover
                                onMouseLeave={() =>
                                  setOpenMenuFor((prev) =>
                                    prev === session.id ? null : prev
                                  )
                                }
                              >
                                <DropdownMenuItem
                                  onClick={() => {
                                    handleStartEdit(
                                      session.id,
                                      session.title || ""
                                    );
                                    setOpenMenuFor(null); // Close after action
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit title
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDeleteSessionId(session.id);
                                    setOpenMenuFor(null);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {sessions.length === 0 && !loading && (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No chats yet. Start a new conversation!
                    </div>
                  )}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="p-2 flex items-center gap-2">
            <UserButton />
            <span className="truncate text-xs text-muted-foreground">
              {user?.emailAddresses[0]?.emailAddress}
            </span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => !isDeleting && setIsEditDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit chat title</DialogTitle>
            <DialogDescription>
              Update the title for this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="ml-2">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteSessionId}
        onOpenChange={(open) => {
          if (!isDeleting && !open) {
            setDeleteSessionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
