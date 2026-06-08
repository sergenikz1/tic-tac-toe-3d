import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSnapshot,
  PublicUser,
} from '@ttt3d/game-core';
import { config } from './config.js';
import { verifySession } from './auth.js';
import { getPublicUser } from './db.js';
import { GameRoom } from './gameRoom.js';
import { Matchmaker } from './matchmaking.js';

interface SocketData {
  user: PublicUser;
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

const matchmaker = new Matchmaker();
/** roomId -> room */
const rooms = new Map<string, GameRoom>();
/** userId -> roomId (their current active room) */
const userRoom = new Map<string, string>();

export function attachSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(
    httpServer,
    { cors: { origin: config.webUrl, credentials: true } },
  );

  // Authenticate every socket from the JWT in the handshake.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const session = token ? verifySession(token) : null;
    if (!session) return next(new Error('unauthorized'));
    const user = await getPublicUser(session.userId);
    if (!user) return next(new Error('unauthorized'));
    (socket as AppSocket).data.user = user;
    next();
  });

  io.on('connection', (socket: AppSocket) => {
    const user = socket.data.user;

    // If this user is already in a live room, re-attach and resync.
    const existingRoomId = userRoom.get(user.id);
    if (existingRoomId) {
      const room = rooms.get(existingRoomId);
      if (room && !room.isOver()) {
        socket.join(room.id);
        room.resend();
      }
    }

    socket.on('queue:join', () => {
      if (userRoom.has(user.id)) return; // already in a game
      const opponent = matchmaker.enqueue({ user, socketId: socket.id });
      if (!opponent) {
        socket.emit('queue:waiting');
        return;
      }
      startRoom(io, { user, socketId: socket.id }, opponent);
    });

    socket.on('queue:leave', () => matchmaker.remove(user.id));

    socket.on('private:create', (cb) => {
      if (userRoom.has(user.id)) return;
      const code = matchmaker.createPrivate({ user, socketId: socket.id });
      cb(code);
    });

    socket.on('private:join', (code, cb) => {
      if (userRoom.has(user.id)) {
        cb({ ok: false, error: 'Вы уже в игре' });
        return;
      }
      const host = matchmaker.joinPrivate(code, user.id);
      if (!host) {
        cb({ ok: false, error: 'Комната не найдена' });
        return;
      }
      cb({ ok: true });
      startRoom(io, { user, socketId: socket.id }, host);
    });

    socket.on('private:cancel', () => matchmaker.cancelPrivateByUser(user.id));

    socket.on('game:move', (move) => {
      const room = currentRoom(user.id);
      if (!room) return;
      const err = room.move(user.id, move);
      if (err) socket.emit('game:error', err);
      maybeCleanup(room);
    });

    socket.on('game:resign', () => {
      const room = currentRoom(user.id);
      if (!room) return;
      room.resign(user.id);
      maybeCleanup(room);
    });

    socket.on('game:rematch', () => {
      const room = currentRoom(user.id);
      if (!room || !room.isOver()) return;
      if (room.rematchOfferBy && room.rematchOfferBy !== user.id) {
        // Both players agreed -> start a fresh room with the same opponents.
        const [p1, p2] = room.players;
        cleanupRoom(room);
        startRoom(io, { user: p1.user, socketId: '' }, { user: p2.user, socketId: '' });
      } else {
        room.rematchOfferBy = user.id;
        io.to(room.id).emit('rematch:offered', user.id);
      }
    });

    socket.on('profile:get', async (cb) => {
      const fresh = await getPublicUser(user.id);
      if (fresh) cb(fresh);
    });

    socket.on('disconnect', () => {
      matchmaker.removeSocket(socket.id);
      // Leave the active room intact so the player can reconnect within their
      // clock; the turn timer keeps running server-side.
    });
  });

  return io;
}

function currentRoom(userId: string): GameRoom | null {
  const roomId = userRoom.get(userId);
  if (!roomId) return null;
  return rooms.get(roomId) ?? null;
}

function startRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>,
  a: { user: PublicUser; socketId: string },
  b: { user: PublicUser; socketId: string },
) {
  const emit = (snapshot: GameSnapshot) => {
    io.to(snapshot.roomId).emit('game:update', snapshot);
  };
  const room = new GameRoom({ user: a.user }, { user: b.user }, emit);
  rooms.set(room.id, room);
  userRoom.set(a.user.id, room.id);
  userRoom.set(b.user.id, room.id);

  // Join both players' current sockets to the room channel.
  for (const sid of [a.socketId, b.socketId]) {
    if (sid) io.sockets.sockets.get(sid)?.join(room.id);
  }
  // Also join any other live sockets for these users (multi-tab / reconnect).
  joinUserSockets(io, a.user.id, room.id);
  joinUserSockets(io, b.user.id, room.id);

  io.to(room.id).emit('match:found', room.snapshot());
}

function joinUserSockets(
  io: Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>,
  userId: string,
  roomId: string,
) {
  for (const s of io.sockets.sockets.values()) {
    if ((s as AppSocket).data.user?.id === userId) s.join(roomId);
  }
}

function maybeCleanup(room: GameRoom) {
  // Keep finished rooms around briefly so rematch can reference the opponents.
  if (room.isOver()) {
    setTimeout(() => {
      if (rooms.get(room.id) === room) cleanupRoom(room);
    }, 60_000);
  }
}

function cleanupRoom(room: GameRoom) {
  room.dispose();
  rooms.delete(room.id);
  for (const p of room.players) {
    if (userRoom.get(p.user.id) === room.id) userRoom.delete(p.user.id);
  }
}
