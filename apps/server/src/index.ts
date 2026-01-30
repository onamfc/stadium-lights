import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  IGroupRepository,
  IParticipantRepository,
} from '@stadium-lights/shared';
import { container, ServiceTokens } from './container';
import { ZoneService } from './services/ZoneService';
import { GroupService } from './services/GroupService';
import { ParticipantService } from './services/ParticipantService';
import { PatternService } from './services/PatternService';
import { InMemoryGroupRepository } from './repositories/InMemoryGroupRepository';
import { InMemoryParticipantRepository } from './repositories/InMemoryParticipantRepository';
import { PostgresGroupRepository } from './repositories/PostgresGroupRepository';
import { PostgresParticipantRepository } from './repositories/PostgresParticipantRepository';
import { initializeDatabase } from './db/client';
import { runMigrations } from './db/migrate';
import { HandlerRegistry } from './handlers/HandlerRegistry';
import { GroupHandler } from './handlers/GroupHandler';
import { LocationHandler } from './handlers/LocationHandler';
import { PatternHandler } from './handlers/PatternHandler';
import { MockParticipantHandler } from './handlers/MockParticipantHandler';
import { VisualizerHandler } from './handlers/VisualizerHandler';

dotenv.config();

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
const isProduction = process.env.NODE_ENV === 'production';

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
};

// Rate limiting configuration
const httpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Express
const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(httpLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Visualizer shortcut route
app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/visualizer.html'));
});

// Privacy policy route
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacy.html'));
});


// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: corsOptions,
});

// Socket.io rate limiting - track events per socket
const socketEventCounts = new Map<string, { count: number; resetTime: number }>();
const SOCKET_RATE_LIMIT = 50; // events per window
const SOCKET_RATE_WINDOW = 10 * 1000; // 10 seconds

function checkSocketRateLimit(socketId: string): boolean {
  const now = Date.now();
  const record = socketEventCounts.get(socketId);

  if (!record || now > record.resetTime) {
    socketEventCounts.set(socketId, { count: 1, resetTime: now + SOCKET_RATE_WINDOW });
    return true;
  }

  if (record.count >= SOCKET_RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// ============================================
// Database & Repository Initialization
// ============================================

async function initializeRepositories(): Promise<{
  groupRepository: IGroupRepository;
  participantRepository: IParticipantRepository;
}> {
  if (DATABASE_URL) {
    console.log('Initializing PostgreSQL database...');
    initializeDatabase(DATABASE_URL);
    await runMigrations();
    console.log('Using PostgreSQL repositories');
    return {
      groupRepository: new PostgresGroupRepository(),
      participantRepository: new PostgresParticipantRepository(),
    };
  } else {
    console.log('No DATABASE_URL found, using in-memory repositories');
    return {
      groupRepository: new InMemoryGroupRepository(),
      participantRepository: new InMemoryParticipantRepository(),
    };
  }
}

// ============================================
// Composition Root - Wire up dependencies
// ============================================

async function bootstrap(): Promise<void> {
  const { groupRepository, participantRepository } = await initializeRepositories();

  // Register repositories
  container.registerInstance(ServiceTokens.GroupRepository, groupRepository);
  container.registerInstance(ServiceTokens.ParticipantRepository, participantRepository);

  // Register services
  container.registerFactory(ServiceTokens.ZoneService, () => new ZoneService());

  container.registerFactory(
    ServiceTokens.GroupService,
    () =>
      new GroupService(
        container.resolve(ServiceTokens.GroupRepository),
        container.resolve(ServiceTokens.ZoneService)
      )
  );

  container.registerFactory(
    ServiceTokens.ParticipantService,
    () =>
      new ParticipantService(
        container.resolve(ServiceTokens.ParticipantRepository),
        container.resolve(ServiceTokens.ZoneService)
      )
  );

  container.registerFactory(
    ServiceTokens.PatternService,
    () => new PatternService()
  );

  // Register Socket.io server
  container.registerInstance(ServiceTokens.SocketServer, io);

  // ============================================
  // Socket Event Handlers
  // ============================================

  const handlerRegistry = new HandlerRegistry(io);

  // Register handlers
  handlerRegistry.register(
    new GroupHandler(
      container.resolve(ServiceTokens.GroupService),
      container.resolve(ServiceTokens.ParticipantService),
      container.resolve(ServiceTokens.ZoneService)
    )
  );

  handlerRegistry.register(
    new LocationHandler(
      container.resolve(ServiceTokens.ParticipantService)
    )
  );

  handlerRegistry.register(
    new PatternHandler(
      container.resolve(ServiceTokens.GroupService),
      container.resolve(ServiceTokens.PatternService),
      container.resolve(ServiceTokens.ZoneService)
    )
  );

  handlerRegistry.register(
    new MockParticipantHandler(
      container.resolve(ServiceTokens.GroupService),
      container.resolve(ServiceTokens.ParticipantService),
      container.resolve(ServiceTokens.ZoneService),
      io
    )
  );

  handlerRegistry.register(
    new VisualizerHandler(
      container.resolve(ServiceTokens.GroupService),
      container.resolve(ServiceTokens.ParticipantService),
      container.resolve(ServiceTokens.ZoneService)
    )
  );

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send time sync on connection
    socket.emit('time_sync', { serverTime: Date.now() });

    // Add rate limiting middleware for all events
    socket.use((event, next) => {
      if (!checkSocketRateLimit(socket.id)) {
        console.warn(`Rate limit exceeded for socket ${socket.id}`);
        socket.emit('error', { message: 'Too many requests, please slow down.', code: 'RATE_LIMIT' });
        return;
      }
      next();
    });

    // Register all handlers for this socket
    handlerRegistry.attachToSocket(socket);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Clean up rate limit tracking
      socketEventCounts.delete(socket.id);
    });
  });

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`Stadium Lights server running on port ${PORT}`);
  });
}

// Bootstrap the server
bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { app, io, httpServer };
