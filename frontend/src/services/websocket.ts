import type { BusLocation, Notification } from "@/utils/data";

type MessageHandler = (data: BusLocation | Notification) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private url: string;

  constructor(url?: string) {
    const defaultWs = `ws://${window.location.host}/ws`;
    this.url = url || import.meta.env.VITE_WS_URL || defaultWs;
  }

  connect() {
    // Prevent concurrent connection attempts (fixes reconnection storm)
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);
      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (!parsed || typeof parsed.type !== "string") {
            if (import.meta.env.DEV) {
              console.warn("[WS] Unexpected message shape:", parsed);
            }
            return;
          }
          const { type, data } = parsed;
          this.handlers.get(type)?.forEach((handler) => handler(data));
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error("[WS] Failed to parse message:", err);
          }
        }
      };
      this.ws.onopen = () => {
        this.isConnecting = false;
      };
      this.ws.onclose = () => {
        this.isConnecting = false;
        // Clear any existing timer before scheduling a new one
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      };
      this.ws.onerror = () => {
        this.isConnecting = false;
        this.ws?.close();
      };
    } catch (err) {
      this.isConnecting = false;
      console.error("[WS] Connection failed:", err);
    }
  }

  subscribe(type: string, handler: MessageHandler) {
    const existing = this.handlers.get(type) || [];
    this.handlers.set(type, [...existing, handler]);
  }

  unsubscribe(type: string, handler: MessageHandler) {
    const existing = this.handlers.get(type) || [];
    this.handlers.set(type, existing.filter((h) => h !== handler));
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

}

export const wsService = new WebSocketService();
export default wsService;
