"use client";

import { SessionWithMessages } from "@/hooks/use-sessions-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: SessionWithMessages[];
  loading: boolean;
  onEdit: (sessionId: string, title: string) => void;
  onDelete: (sessionId: string) => void;
};

export default function HistoryDialog({
  open,
  onOpenChange,
  sessions,
  loading,
  onEdit,
  onDelete,
}: Props) {
  const webSessions = sessions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>History</DialogTitle>
          <DialogDescription>Browse past chats by source.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="web">
          <TabsList>
            <TabsTrigger value="web">Web Search</TabsTrigger>
            <TabsTrigger value="deep" className="opacity-50" disabled>
              Deep Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="web">
            <div className="mt-2">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : webSessions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No web search chats yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {webSessions.map((session) => (
                    <Link
                      key={session.id}
                      className="flex items-center justify-between gap-2 text-muted-foreground  group hover:text-foreground hover:bg-secondary/50 rounded-md px-2 py-1"
                      href={`/chat/${session.id}`}
                    >
                      <span className="truncate text-sm hover:text-foreground">
                        {session.title || "New Chat"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted/10"
                            aria-label="Open actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              onEdit(session.id, session.title || "")
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit title
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(session.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deep">
            <div className="p-4 text-sm text-muted-foreground">
              Deep Search is currently disabled.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
