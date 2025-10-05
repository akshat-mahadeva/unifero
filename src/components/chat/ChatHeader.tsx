"use client";

import React, { useState } from "react";
import { SidebarTrigger } from "../ui/sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useSession } from "@/hooks/use-sessions-query";
import { toast } from "sonner";

interface ChatHeaderProps {
  isHomePage?: boolean;
  sessionId?: string;
  sessionTitle?: string;
}

const ChatHeader = ({
  isHomePage = false,
  sessionId,
  sessionTitle: initialTitle,
}: ChatHeaderProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Only fetch session data if we're not on the home page
  // On home page, we have a new session that doesn't exist in DB yet
  const { session, updateTitle, deleteSession, isUpdatingTitle, isDeleting } =
    useSession(isHomePage ? undefined : sessionId);

  // Use the session title from React Query if available, otherwise fall back to initial title
  // After route changes, prioritize the session data from React Query
  const currentTitle = session?.title || initialTitle || "New Chat";

  const handleOpenEditDialog = () => {
    setEditedTitle(currentTitle);
    setShowEditDialog(true);
  };

  const handleSaveTitle = async () => {
    if (!sessionId || !editedTitle.trim()) {
      toast.error("Please enter a valid title");
      return;
    }

    updateTitle({ sessionId, title: editedTitle.trim() });
    setShowEditDialog(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(currentTitle);
    setShowEditDialog(false);
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;

    deleteSession(sessionId);
    setShowDeleteDialog(false);
  };

  if (isHomePage) {
    return (
      <div className="flex items-center gap-4 p-3">
        <SidebarTrigger className=" h-8 w-8" />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold font-sans">Unifero</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 p-3">
        <SidebarTrigger />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-lg font-medium truncate flex-1">
            {currentTitle}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenEditDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Edit title
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Title Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chat Title</DialogTitle>
            <DialogDescription>
              Change the title of this chat conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Enter chat title..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveTitle();
                } else if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTitle}
              disabled={isUpdatingTitle || !editedTitle.trim()}
            >
              {isUpdatingTitle ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setShowDeleteDialog(open);
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
              onClick={handleDeleteSession}
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
};

export default ChatHeader;
