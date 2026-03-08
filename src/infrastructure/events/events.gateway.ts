import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../modules/message/entities/message.entity.js';
import { Order } from '../../modules/order/entities/order.entity.js';
import { Offer } from '../../modules/offer/entities/offer.entity.js';
import { MessageType } from '../../common/enums/index.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface JwtPayload {
  sub: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    // Auth happens via 'auth' event, not on connection
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string },
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(data.token);
      client.userId = payload.sub;

      // Track user's sockets
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // Join user-specific room
      await client.join(`user:${payload.sub}`);

      return { success: true };
    } catch {
      return { success: false, message: 'Invalid token' };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { order_id: string; content?: string; image_url?: string },
  ): Promise<{ success: boolean; message?: string | object }> {
    if (!client.userId) {
      return { success: false, message: 'Not authenticated' };
    }

    const order = await this.orderRepo.findOne({
      where: { id: data.order_id },
    });
    if (
      !order ||
      (order.traveler_id !== client.userId &&
        order.requester_id !== client.userId)
    ) {
      return { success: false, message: 'Not your order' };
    }

    const message = this.messageRepo.create({
      order_id: data.order_id,
      sender_id: client.userId,
      content: data.content || null,
      image_url: data.image_url || null,
      message_type: data.image_url ? MessageType.IMAGE : MessageType.TEXT,
    });

    const saved = await this.messageRepo.save(message);
    const fullMessage = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });

    // Emit to other party
    const otherUserId =
      order.traveler_id === client.userId
        ? order.requester_id
        : order.traveler_id;
    this.server.to(`user:${otherUserId}`).emit('new_message', {
      order_id: data.order_id,
      message: fullMessage,
    });

    return { success: true, message: fullMessage ?? undefined };
  }

  @SubscribeMessage('send_offer_message')
  async handleSendOfferMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { offer_id: string; content?: string; image_url?: string },
  ): Promise<{ success: boolean; message?: string | object }> {
    if (!client.userId) {
      return { success: false, message: 'Not authenticated' };
    }

    const offer = await this.offerRepo.findOne({
      where: { id: data.offer_id },
    });
    if (
      !offer ||
      (offer.from_user_id !== client.userId &&
        offer.to_user_id !== client.userId)
    ) {
      return { success: false, message: 'Not your offer' };
    }

    const message = this.messageRepo.create({
      offer_id: data.offer_id,
      sender_id: client.userId,
      content: data.content || null,
      image_url: data.image_url || null,
      message_type: data.image_url ? MessageType.IMAGE : MessageType.TEXT,
    });

    const saved = await this.messageRepo.save(message);
    const fullMessage = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });

    const otherUserId =
      offer.from_user_id === client.userId
        ? offer.to_user_id
        : offer.from_user_id;
    this.server.to(`user:${otherUserId}`).emit('new_offer_message', {
      offer_id: data.offer_id,
      message: fullMessage,
    });

    return { success: true, message: fullMessage ?? undefined };
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { order_id: string },
  ): Promise<{ success: boolean }> {
    if (!client.userId) return { success: false };

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .where('order_id = :orderId', { orderId: data.order_id })
      .andWhere('sender_id != :userId', { userId: client.userId })
      .andWhere('is_read = false')
      .execute();

    return { success: true };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { order_id: string },
  ): Promise<void> {
    if (!client.userId) return;

    const order = await this.orderRepo.findOne({
      where: { id: data.order_id },
    });
    if (!order) return;

    const otherUserId =
      order.traveler_id === client.userId
        ? order.requester_id
        : order.traveler_id;
    this.server.to(`user:${otherUserId}`).emit('typing', {
      order_id: data.order_id,
      user_id: client.userId,
    });
  }

  // --- Server-to-client methods (called by other services) ---

  emitOrderUpdate(userId: string, orderId: string, status: string): void {
    this.server
      .to(`user:${userId}`)
      .emit('order_update', { order_id: orderId, status });
  }

  emitOfferUpdate(userId: string, offerId: string, status: string): void {
    this.server
      .to(`user:${userId}`)
      .emit('offer_update', { offer_id: offerId, status });
  }

  emitNotification(userId: string, notification: object): void {
    this.server.to(`user:${userId}`).emit('notification', { notification });
  }
}
