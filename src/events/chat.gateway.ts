import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { PrismaService } from 'src/prisma/prisma.service'

interface AuthenticatedSocket extends Socket {
  data: {
    clerkId: string
  }
}

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, restrinja para o seu domínio do frontend
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server | undefined

  private connectedUsers = new Map<string, Set<string>>()

  constructor(private prisma: PrismaService) {}

  handleConnection(client: AuthenticatedSocket) {
    // A autenticação será tratada no cliente ao conectar.
    // O cliente deve enviar o token que será validado por um middleware ou no evento de conexão.
    // Por simplicidade aqui, vamos assumir que o `clerkId` é passado nos `auth` headers da conexão.
    const clerkId = client.handshake.auth.clerkId as string
    if (clerkId) {
      client.data.clerkId = clerkId
      console.log(`Cliente conectado: ${client.id} - Clerk ID: ${clerkId}`)

      if (!this.connectedUsers.has(clerkId)) {
        this.connectedUsers.set(clerkId, new Set<string>())
      }
      this.connectedUsers.get(clerkId)?.add(client.id)
    } else {
      console.log(`Cliente ${client.id} conectado sem autenticação.`)
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const clerkId = client.data.clerkId
    if (clerkId && this.connectedUsers.has(clerkId)) {
      const userSockets = this.connectedUsers.get(clerkId)
      userSockets?.delete(client.id)

      if (userSockets?.size === 0) {
        this.connectedUsers.delete(clerkId)
      }
    }
    console.log(`Cliente desconectado: ${client.id}`)
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room)
    console.log(`Cliente ${client.id} entrou na sala: ${room}`)
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room)
    console.log(`Cliente ${client.id} saiu da sala: ${room}`)
  }

  // Este método será chamado pelo `send-message.controller`
  // para notificar os clientes na sala sobre uma nova mensagem.
  handleNewMessage(chatId: string) {
    this.server?.to(`chat_${chatId}`).emit('newMessage')
  }

  // Este método será chamado pelo `start-chat.controller`
  // para notificar um usuário sobre uma nova conversa.
  handleNewConversation(clerkId: string) {
    const userSocketIds = this.connectedUsers.get(clerkId)
    if (userSocketIds) {
      console.log(`Notificando ${clerkId} sobre nova conversa...`)
      userSocketIds.forEach((socketId) =>
        this.server?.to(socketId).emit('newConversation'),
      )
    }
  }
}
