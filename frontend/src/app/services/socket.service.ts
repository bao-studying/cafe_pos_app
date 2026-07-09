import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private readonly url = 'http://localhost:5000';

  /** Lấy (hoặc tạo mới nếu chưa có) kết nối socket dùng chung toàn app */
  private getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(this.url, { transports: ['websocket'] });
    }
    return this.socket;
  }

  /** Lắng nghe 1 sự kiện, trả về Observable — nhớ unsubscribe khi component huỷ */
  on<T = any>(eventName: string): Observable<T> {
    const socket = this.getSocket();
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      socket.on(eventName, handler);
      return () => socket.off(eventName, handler);
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
