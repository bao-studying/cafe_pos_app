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
      this.socket = io(this.url, { transports: ['websocket'] });
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

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
