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
import { SignOutButton, useClerk } from "@clerk/clerk-react";
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
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Separator } from "../ui/separator";

export default function AppSidebar() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { sessions, loading, deleteSession, updateTitle, isDeleting } =
    useSessions();
  const pathname = usePathname();
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

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
        <SidebarHeader>
          <div className="flex items-center gap-2 w-full justify-between">
            <h1 className=" text-2xl font-bold text-primary font-sans">
              Unifero
            </h1>

            <Link href="/">
              <Button variant={"ghost"} size={"icon"}>
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
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
                    const isHovered = hoveredSession === session.id;

                    return (
                      <SidebarMenuItem
                        key={session.id}
                        onMouseEnter={() => setHoveredSession(session.id)}
                        onMouseLeave={() => setHoveredSession(null)}
                      >
                        <SidebarMenuButton
                          asChild
                          className="flex items-center gap-2"
                          isActive={isActive}
                        >
                          <div className="w-full relative">
                            <Link
                              href={`/${session.id}`}
                              className="flex items-center gap-2 w-full"
                            >
                              <MessageCircle className="size-3 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate flex-1">
                                {session.title || "New Chat"}
                              </span>
                            </Link>
                            <DropdownMenu
                              open={isMenuOpen}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenMenuFor(session.id);
                                } else {
                                  setOpenMenuFor(null);
                                }
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity duration-200",
                                    (isHovered || isActive || isMenuOpen) &&
                                      "opacity-100",
                                    !(isHovered || isActive || isMenuOpen) &&
                                      "opacity-0"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                          </div>
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
          <div className="px-2 flex items-center text-muted-foreground text-sm gap-2 justify-between">
            Theme
            <ModeToggle />
          </div>

          <Separator />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="flex justify-start items-center gap-2"
                size={"lg"}
                variant={"ghost"}
              >
                <Avatar className=" h-6 w-6">
                  <AvatarImage
                    src={user?.imageUrl || undefined}
                    alt={user?.firstName || "User"}
                  />
                  <AvatarFallback>
                    {user?.firstName?.[0] ||
                      user?.emailAddresses?.[0]?.emailAddress?.[0] ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.emailAddresses[0]?.emailAddress}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openUserProfile()}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="w-full">
                <SignOutButton>Sign out</SignOutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
