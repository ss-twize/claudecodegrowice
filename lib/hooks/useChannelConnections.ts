import { useEffect, useState, useCallback } from "react";
import { supabase, ORG_UID } from "@/lib/supabase";

export type ChannelStatus =
  | "disconnected"
  | "creating"
  | "pending_auth"
  | "connected"
  | "error";

export interface ChannelConnection {
  id: string;
  channel_code: string;
  status: ChannelStatus;
  display_name: string | null;
  last_checked_at: string | null;
  connected_at: string | null;
  error_message: string | null;
  error_code: string | null;
  webhook_url: string | null;
  meta: Record<string, unknown> | null;
}

// Only safe columns — api_token and api_url are NEVER fetched client-side
const SAFE_COLUMNS =
  "id,channel_code,status,display_name,last_checked_at,connected_at,error_message,error_code,webhook_url,meta";

export function useChannelConnections() {
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("channel_connections")
      .select(SAFE_COLUMNS)
      .eq("org_uid", ORG_UID)
      .neq("status", "disconnected")
      .order("created_at", { ascending: false });
    setConnections((data as ChannelConnection[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("channel_connections_watch")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_connections",
          filter: `org_uid=eq.${ORG_UID}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const getConnection = (channelCode: string): ChannelConnection | null =>
    connections.find((c) => c.channel_code === channelCode) ?? null;

  return { connections, loading, refetch: load, getConnection };
}
