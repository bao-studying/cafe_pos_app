import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  // Production: apiBaseUrl rỗng (cùng domain) -> dùng luôn origin hiện tại của trình duyệt
  private readonly url =
    environment.apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  private getSocket(): Socket {
    if (!this.socket) {
      // ĐÃ SỬA: bỏ ép transports:['websocket'] — một số mạng di động/wifi công cộng
      // chặn nâng cấp WebSocket trực tiếp, khiến socket không bao giờ kết nối được.
      // Để mặc định (polling trước, tự nâng cấp lên websocket khi có thể) ổn định hơn nhiều.
      this.socket = io(this.url);

      // Log rõ nguyên nhân khi không kết nối được (mở Console trên điện thoại/máy tính để xem)
      this.socket.on('connect', () => console.log('🔌 Socket đã kết nối:', this.socket?.id));
      this.socket.on('connect_error', (err) =>
        console.error('🔌 Socket lỗi kết nối:', err.message),
      );
      this.socket.on('disconnect', (reason) => console.warn('🔌 Socket ngắt kết nối:', reason));
    }
    return this.socket;
  }

  on<T = any>(eventName: string): Observable<T> {
    const socket = this.getSocket();
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      socket.on(eventName, handler);
      return () => socket.off(eventName, handler);
    });
  }

  /** Theo dõi trạng thái kết nối socket (true = đã kết nối, false = mất kết nối) */
  connectionStatus(): Observable<boolean> {
    const socket = this.getSocket();
    return new Observable<boolean>((subscriber) => {
      subscriber.next(socket.connected);
      const onConnect = () => subscriber.next(true);
      const onDisconnect = () => subscriber.next(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
