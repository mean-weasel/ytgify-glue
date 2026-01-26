import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MockServerConfig {
  port?: number;
  host?: string;
}

// ============================================
// Mock API Types
// ============================================

interface MockUser {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  gifs_count: number;
  total_likes_received: number;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
  google_uid?: string;
}

interface MockAuthState {
  users: Map<string, MockUser & { password?: string }>;
  tokens: Map<string, { userId: string; expiresAt: number }>;
  revokedTokens: Set<string>;
}

// Helper to generate mock JWT
function generateMockJwt(userId: string, expiresInSeconds: number = 900): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    jti: 'jti-' + Math.random().toString(36).substring(2, 15),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    iat: Math.floor(Date.now() / 1000)
  };

  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.${base64UrlEncode({ sig: 'mock' })}`;
}

export interface VideoConfig {
  title: string;
  src: string;
  duration: number;
  width: number;
  height: number;
}

export class MockYouTubeServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private host: string = 'localhost';
  private fixturesPath: string;

  // Mock auth state for API testing
  private authState: MockAuthState = {
    users: new Map(),
    tokens: new Map(),
    revokedTokens: new Set()
  };

  constructor(config: MockServerConfig = {}) {
    this.host = config.host || 'localhost';
    this.port = config.port || 0; // 0 = assign random available port
    this.fixturesPath = path.join(__dirname, '..', 'fixtures');
    this.initializeTestUsers();
  }

  /**
   * Initialize default test users
   */
  private initializeTestUsers(): void {
    const now = new Date().toISOString();

    // Default test user for email/password login
    this.authState.users.set('test@example.com', {
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      bio: 'A test user account',
      avatar_url: null,
      is_verified: false,
      gifs_count: 5,
      total_likes_received: 10,
      follower_count: 20,
      following_count: 15,
      created_at: now,
      updated_at: now,
      password: 'password123'
    });

    // Test user created via Google OAuth
    this.authState.users.set('googleuser@gmail.com', {
      id: 'google-user-456',
      email: 'googleuser@gmail.com',
      username: 'googleuser',
      display_name: 'Google Test User',
      bio: null,
      avatar_url: 'https://lh3.googleusercontent.com/mock-avatar',
      is_verified: true,
      gifs_count: 0,
      total_likes_received: 0,
      follower_count: 0,
      following_count: 0,
      created_at: now,
      updated_at: now,
      google_uid: 'google-oauth-uid-456'
    });
  }

  /**
   * Reset auth state (useful between tests)
   */
  resetAuthState(): void {
    this.authState = {
      users: new Map(),
      tokens: new Map(),
      revokedTokens: new Set()
    };
    this.initializeTestUsers();
  }

  /**
   * Add a test user programmatically
   */
  addTestUser(user: MockUser & { password?: string }): void {
    this.authState.users.set(user.email, user);
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, this.host, () => {
        const addr = this.server!.address() as any;
        this.port = addr.port;
        const url = `http://${this.host}:${this.port}`;
        console.log(`[Mock YouTube Server] Started at ${url}`);
        resolve(url);
      });

      this.server.on('error', (err) => {
        console.error('[Mock YouTube Server] Error:', err);
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[Mock YouTube Server] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      console.log(`[Mock YouTube Server] ${req.method} ${url.pathname}${url.search}`);

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // API Routes
      if (url.pathname.startsWith('/api/v1/auth/')) {
        this.handleAuthApi(req, res, url);
        return;
      }

      // Route: /watch?v=VIDEO_ID - Serve YouTube watch page
      if (url.pathname === '/watch') {
        const videoId = url.searchParams.get('v');
        this.serveWatchPage(videoId, res);
        return;
      }

      // Route: /@CHANNEL/videos - Serve channel page
      if (url.pathname.match(/^\/@[\w-]+\/videos$/)) {
        const channelName = url.pathname.split('/')[1].substring(1);
        this.serveChannelPage(channelName, res);
        return;
      }

      // Route: /results?search_query=... - Serve search results page
      if (url.pathname === '/results') {
        const query = url.searchParams.get('search_query') || 'test';
        this.serveSearchPage(query, res);
        return;
      }

      // Route: /videos/* - Serve video files
      if (url.pathname.startsWith('/videos/')) {
        this.serveVideo(url.pathname, req, res);
        return;
      }

      // Route: /mock-youtube/* - Serve static assets (JS, CSS)
      if (url.pathname.startsWith('/mock-youtube/')) {
        this.serveAsset(url.pathname, res);
        return;
      }

      // Route: /mock-auth-callback - Serve auth callback page for testing
      if (url.pathname === '/mock-auth-callback') {
        this.serveAuthCallbackPage(res);
        return;
      }

      // 404 - Not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (error) {
      console.error('[Mock YouTube Server] Request error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  private serveWatchPage(videoId: string | null, res: http.ServerResponse) {
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing video ID parameter');
      return;
    }

    const videoConfig = this.getVideoConfig(videoId);
    if (!videoConfig) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Video not found: ${videoId}`);
      return;
    }

    const templatePath = path.join(this.fixturesPath, 'mock-youtube', 'youtube-watch.html');

    if (!fs.existsSync(templatePath)) {
      console.error(`[Mock YouTube Server] Template not found at ${templatePath}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Template file not found');
      return;
    }

    try {
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Replace placeholders with video-specific data
      html = html.replace(/\{\{VIDEO_ID\}\}/g, videoId);
      html = html.replace(/\{\{VIDEO_TITLE\}\}/g, videoConfig.title);
      html = html.replace(/\{\{VIDEO_SRC\}\}/g, videoConfig.src);
      html = html.replace(/\{\{VIDEO_DURATION\}\}/g, videoConfig.duration.toString());
      html = html.replace(/\{\{VIDEO_WIDTH\}\}/g, videoConfig.width.toString());
      html = html.replace(/\{\{VIDEO_HEIGHT\}\}/g, videoConfig.height.toString());

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(html);
    } catch (error) {
      console.error('[Mock YouTube Server] Error reading template:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading page template');
    }
  }

  private serveVideo(pathname: string, req: http.IncomingMessage, res: http.ServerResponse) {
    const videoPath = path.join(this.fixturesPath, pathname);

    if (!fs.existsSync(videoPath)) {
      console.warn(`[Mock YouTube Server] Video not found: ${videoPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Video file not found');
      return;
    }

    try {
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Handle range requests for video seeking
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        // Detect content type from file extension
        const ext = path.extname(videoPath).toLowerCase();
        const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });

        const stream = fs.createReadStream(videoPath, { start, end });
        stream.pipe(res);
      } else {
        // Serve entire video
        const ext = path.extname(videoPath).toLowerCase();
        const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';

        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        });

        const stream = fs.createReadStream(videoPath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error('[Mock YouTube Server] Error serving video:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error serving video file');
    }
  }

  private serveAsset(pathname: string, res: http.ServerResponse) {
    const assetPath = path.join(this.fixturesPath, pathname);

    if (!fs.existsSync(assetPath)) {
      console.warn(`[Mock YouTube Server] Asset not found: ${assetPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Asset not found');
      return;
    }

    try {
      const ext = path.extname(assetPath).toLowerCase();
      let contentType = 'text/plain';

      switch (ext) {
        case '.js':
          contentType = 'application/javascript; charset=utf-8';
          break;
        case '.css':
          contentType = 'text/css; charset=utf-8';
          break;
        case '.html':
          contentType = 'text/html; charset=utf-8';
          break;
        case '.json':
          contentType = 'application/json; charset=utf-8';
          break;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      const stream = fs.createReadStream(assetPath);
      stream.pipe(res);
    } catch (error) {
      console.error('[Mock YouTube Server] Error serving asset:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error serving asset');
    }
  }

  private serveChannelPage(channelName: string, res: http.ServerResponse) {
    const templatePath = path.join(this.fixturesPath, 'mock-youtube', 'youtube-channel.html');

    if (!fs.existsSync(templatePath)) {
      console.error(`[Mock YouTube Server] Channel template not found at ${templatePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Channel template not found');
      return;
    }

    try {
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Replace placeholders with channel-specific data
      html = html.replace(/\{\{CHANNEL_NAME\}\}/g, channelName);

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(html);
    } catch (error) {
      console.error('[Mock YouTube Server] Error reading channel template:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading channel template');
    }
  }

  private serveSearchPage(query: string, res: http.ServerResponse) {
    const templatePath = path.join(this.fixturesPath, 'mock-youtube', 'youtube-search.html');

    if (!fs.existsSync(templatePath)) {
      console.error(`[Mock YouTube Server] Search template not found at ${templatePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Search template not found');
      return;
    }

    try {
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Replace placeholders with search-specific data
      html = html.replace(/\{\{SEARCH_QUERY\}\}/g, query);

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(html);
    } catch (error) {
      console.error('[Mock YouTube Server] Error reading search template:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading search template');
    }
  }

  private serveAuthCallbackPage(res: http.ServerResponse) {
    const templatePath = path.join(this.fixturesPath, 'mock-youtube', 'mock-auth-callback.html');

    if (!fs.existsSync(templatePath)) {
      console.error(`[Mock YouTube Server] Auth callback template not found at ${templatePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Auth callback template not found');
      return;
    }

    try {
      const html = fs.readFileSync(templatePath, 'utf-8');

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(html);
    } catch (error) {
      console.error('[Mock YouTube Server] Error reading auth callback template:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading auth callback template');
    }
  }

  // ============================================
  // Auth API Handlers
  // ============================================

  private handleAuthApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): void {
    const endpoint = url.pathname.replace('/api/v1/auth/', '');

    switch (endpoint) {
      case 'register':
        if (req.method === 'POST') {
          this.handleRegister(req, res);
        } else {
          this.sendJsonError(res, 405, 'Method not allowed');
        }
        break;

      case 'login':
        if (req.method === 'POST') {
          this.handleLogin(req, res);
        } else {
          this.sendJsonError(res, 405, 'Method not allowed');
        }
        break;

      case 'google':
        if (req.method === 'POST') {
          this.handleGoogleAuth(req, res);
        } else {
          this.sendJsonError(res, 405, 'Method not allowed');
        }
        break;

      case 'refresh':
        if (req.method === 'POST') {
          this.handleRefresh(req, res);
        } else {
          this.sendJsonError(res, 405, 'Method not allowed');
        }
        break;

      case 'logout':
        if (req.method === 'DELETE') {
          this.handleLogout(req, res);
        } else {
          this.sendJsonError(res, 405, 'Method not allowed');
        }
        break;

      case 'me':
        if (req.method === 'GET') {
          this.handleMe(req, res);
        } else {
          this.sendJsonError(res, 405, 'Method not allowed');
        }
        break;

      default:
        this.sendJsonError(res, 404, 'Endpoint not found');
    }
  }

  private async handleRegister(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.parseJsonBody(req);

      if (!body.user) {
        this.sendJsonError(res, 400, 'Missing user parameter');
        return;
      }

      const userParams = body.user as { email?: string; username?: string; password?: string; password_confirmation?: string };
      const { email, username, password, password_confirmation } = userParams;

      // Validation
      if (!email) {
        this.sendJsonError(res, 422, 'Email is required');
        return;
      }
      if (!username) {
        this.sendJsonError(res, 422, 'Username is required');
        return;
      }
      if (!password || password.length < 6) {
        this.sendJsonError(res, 422, 'Password must be at least 6 characters');
        return;
      }
      if (password !== password_confirmation) {
        this.sendJsonError(res, 422, 'Password confirmation does not match');
        return;
      }

      // Check for duplicates
      if (this.authState.users.has(email)) {
        this.sendJsonError(res, 422, 'Email has already been taken');
        return;
      }

      const existingUsername = Array.from(this.authState.users.values()).find(u => u.username === username);
      if (existingUsername) {
        this.sendJsonError(res, 422, 'Username has already been taken');
        return;
      }

      // Create user
      const now = new Date().toISOString();
      const userId = 'user-' + Math.random().toString(36).substring(2, 15);
      const newUser: MockUser & { password: string } = {
        id: userId,
        email,
        username,
        display_name: null,
        bio: null,
        avatar_url: null,
        is_verified: false,
        gifs_count: 0,
        total_likes_received: 0,
        follower_count: 0,
        following_count: 0,
        created_at: now,
        updated_at: now,
        password
      };

      this.authState.users.set(email, newUser);

      // Generate token
      const token = generateMockJwt(userId);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      this.authState.tokens.set(payload.jti, { userId, expiresAt: payload.exp * 1000 });

      // Return response (exclude password)
      const { password: _, ...userResponse } = newUser;
      this.sendJson(res, 201, { token, user: userResponse });

    } catch (error) {
      console.error('[Mock Server] Register error:', error);
      this.sendJsonError(res, 500, 'Internal server error');
    }
  }

  private async handleLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.parseJsonBody(req) as {
        email?: string;
        password?: string;
        user?: { email?: string; password?: string };
      };

      // Support both { email, password } and { user: { email, password } } formats
      const email = body.email || body.user?.email;
      const password = body.password || body.user?.password;

      if (!email) {
        this.sendJsonError(res, 400, 'Email is required');
        return;
      }
      if (!password) {
        this.sendJsonError(res, 400, 'Password is required');
        return;
      }

      const user = this.authState.users.get(email);

      // Don't reveal if user exists or not
      if (!user || user.password !== password) {
        this.sendJsonError(res, 401, 'Invalid email or password');
        return;
      }

      // Generate token
      const token = generateMockJwt(user.id);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      this.authState.tokens.set(payload.jti, { userId: user.id, expiresAt: payload.exp * 1000 });

      // Return response (exclude password)
      const { password: _, ...userResponse } = user;
      this.sendJson(res, 200, { token, user: userResponse });

    } catch (error) {
      console.error('[Mock Server] Login error:', error);
      this.sendJsonError(res, 500, 'Internal server error');
    }
  }

  private async handleGoogleAuth(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.parseJsonBody(req) as { id_token?: string };
      const { id_token } = body;

      if (!id_token) {
        this.sendJsonError(res, 400, 'id_token is required');
        return;
      }

      // Decode the mock Google ID token
      let googlePayload: { email?: string; sub?: string; email_verified?: boolean; exp?: number; name?: string; picture?: string };
      try {
        const parts = id_token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        googlePayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      } catch {
        this.sendJsonError(res, 401, 'Invalid Google ID token');
        return;
      }

      // Validate token structure
      if (!googlePayload.email || !googlePayload.sub) {
        this.sendJsonError(res, 401, 'Invalid Google ID token');
        return;
      }

      if (googlePayload.email_verified === false) {
        this.sendJsonError(res, 401, 'Email not verified');
        return;
      }

      // Check if token is expired
      if (googlePayload.exp && googlePayload.exp * 1000 < Date.now()) {
        this.sendJsonError(res, 401, 'Google token expired');
        return;
      }

      // Find existing user by Google UID or email
      let user = Array.from(this.authState.users.values()).find(
        u => u.google_uid === googlePayload.sub
      );

      if (!user) {
        // Check if email exists (link accounts)
        user = this.authState.users.get(googlePayload.email);
        if (user) {
          // Link Google account to existing user
          user.google_uid = googlePayload.sub;
          user.avatar_url = user.avatar_url || googlePayload.picture || null;
        }
      }

      const now = new Date().toISOString();

      if (!user) {
        // Create new user from Google data
        const userId = 'user-' + Math.random().toString(36).substring(2, 15);
        const username = googlePayload.email.split('@')[0] + Math.random().toString(36).substring(2, 6);

        user = {
          id: userId,
          email: googlePayload.email,
          username,
          display_name: googlePayload.name || null,
          bio: null,
          avatar_url: googlePayload.picture || null,
          is_verified: true, // Google users are verified
          gifs_count: 0,
          total_likes_received: 0,
          follower_count: 0,
          following_count: 0,
          created_at: now,
          updated_at: now,
          google_uid: googlePayload.sub
        };

        this.authState.users.set(user.email, user);
      }

      // Generate token
      const token = generateMockJwt(user.id);
      const jwtPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      this.authState.tokens.set(jwtPayload.jti, { userId: user.id, expiresAt: jwtPayload.exp * 1000 });

      // Return response (exclude password if exists)
      const { password: _, ...userResponse } = user as MockUser & { password?: string };
      this.sendJson(res, 200, { token, user: userResponse });

    } catch (error) {
      console.error('[Mock Server] Google auth error:', error);
      this.sendJsonError(res, 500, 'Internal server error');
    }
  }

  private async handleRefresh(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.sendJsonError(res, 401, 'Authorization required');
        return;
      }

      const oldToken = authHeader.substring(7);
      let payload;
      try {
        payload = JSON.parse(Buffer.from(oldToken.split('.')[1], 'base64').toString());
      } catch {
        this.sendJsonError(res, 401, 'Invalid token');
        return;
      }

      // Check if token is revoked
      if (this.authState.revokedTokens.has(payload.jti)) {
        this.sendJsonError(res, 401, 'Token has been revoked');
        return;
      }

      // Check if token exists and is valid
      const tokenData = this.authState.tokens.get(payload.jti);
      if (!tokenData) {
        this.sendJsonError(res, 401, 'Invalid token');
        return;
      }

      // Check if token is expired (allow some grace period for refresh)
      const gracePeriod = 60 * 1000; // 1 minute
      if (tokenData.expiresAt + gracePeriod < Date.now()) {
        this.sendJsonError(res, 401, 'Token expired');
        return;
      }

      // Generate new token
      const newToken = generateMockJwt(tokenData.userId);
      const newPayload = JSON.parse(Buffer.from(newToken.split('.')[1], 'base64').toString());
      this.authState.tokens.set(newPayload.jti, { userId: tokenData.userId, expiresAt: newPayload.exp * 1000 });

      // Optionally revoke old token (rotation)
      // this.authState.revokedTokens.add(payload.jti);

      this.sendJson(res, 200, { token: newToken });

    } catch (error) {
      console.error('[Mock Server] Refresh error:', error);
      this.sendJsonError(res, 500, 'Internal server error');
    }
  }

  private handleLogout(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.sendJsonError(res, 401, 'Authorization required');
        return;
      }

      const token = authHeader.substring(7);
      let payload;
      try {
        payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      } catch {
        this.sendJsonError(res, 401, 'Invalid token');
        return;
      }

      // Revoke the token
      this.authState.revokedTokens.add(payload.jti);
      this.authState.tokens.delete(payload.jti);

      this.sendJson(res, 200, { success: true });

    } catch (error) {
      console.error('[Mock Server] Logout error:', error);
      this.sendJsonError(res, 500, 'Internal server error');
    }
  }

  private handleMe(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.sendJsonError(res, 401, 'Authorization required');
        return;
      }

      const token = authHeader.substring(7);
      let payload;
      try {
        payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      } catch {
        this.sendJsonError(res, 401, 'Invalid token');
        return;
      }

      // Check if token is revoked
      if (this.authState.revokedTokens.has(payload.jti)) {
        this.sendJsonError(res, 401, 'Token has been revoked');
        return;
      }

      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        this.sendJsonError(res, 401, 'Token expired');
        return;
      }

      // Find user
      const user = Array.from(this.authState.users.values()).find(u => u.id === payload.sub);
      if (!user) {
        this.sendJsonError(res, 404, 'User not found');
        return;
      }

      // Return user (exclude password)
      const { password: _, ...userResponse } = user as MockUser & { password?: string };
      this.sendJson(res, 200, { user: userResponse });

    } catch (error) {
      console.error('[Mock Server] Me error:', error);
      this.sendJsonError(res, 500, 'Internal server error');
    }
  }

  // ============================================
  // JSON Helpers
  // ============================================

  private async parseJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private sendJsonError(res: http.ServerResponse, status: number, message: string): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  // ============================================
  // Video Config
  // ============================================

  private getVideoConfig(videoId: string): VideoConfig | null {
    // Map video IDs to their configurations
    const videoConfigs: Record<string, VideoConfig> = {
      'mock-short': {
        title: 'Test Short Video (20s)',
        src: '/videos/test-short-20s.webm',
        duration: 20,
        width: 640,
        height: 360
      },
      'mock-medium': {
        title: 'Test Medium Video (10s)',
        src: '/videos/test-medium-10s.webm',
        duration: 10,
        width: 1280,
        height: 720
      },
      'mock-long': {
        title: 'Test Long Video (20s)',
        src: '/videos/test-long-20s.webm',
        duration: 20,
        width: 1920,
        height: 1080
      },
      'mock-hd': {
        title: 'Test HD Video (15s)',
        src: '/videos/test-hd-15s.webm',
        duration: 15,
        width: 1920,
        height: 1080
      }
    };

    return videoConfigs[videoId] || null;
  }

  getUrl(): string {
    if (!this.server || this.port === 0) {
      throw new Error('Server not started yet');
    }
    return `http://${this.host}:${this.port}`;
  }

  getPort(): number {
    return this.port;
  }

  isRunning(): boolean {
    return this.server !== null && this.port > 0;
  }
}

// Singleton instance for global setup/teardown
let serverInstance: MockYouTubeServer | null = null;

export function getMockServer(): MockYouTubeServer {
  if (!serverInstance) {
    serverInstance = new MockYouTubeServer();
  }
  return serverInstance;
}

export function clearMockServer(): void {
  serverInstance = null;
}
