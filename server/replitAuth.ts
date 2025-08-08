import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function authenticateExistingUser(
  claims: any,
) {
  // Check if user exists in the system
  const existingUser = await storage.getUser(claims["sub"]);
  
  if (!existingUser) {
    // User doesn't exist in our system - deny access
    throw new Error("Access denied: User not found in system. Please contact your administrator to be added to the team.");
  }
  
  // User exists - update their profile information from OAuth
  await storage.updateUser(existingUser.id, {
    email: claims["email"],
    firstName: claims["first_name"] || existingUser.firstName,
    lastName: claims["last_name"] || existingUser.lastName,
    profileImageUrl: claims["profile_image_url"] || existingUser.profileImageUrl,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await authenticateExistingUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      // Pass the error to passport which will handle the authentication failure
      verified(error as Error, false);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Handle both localhost development and Replit domain
    const hostname = req.hostname === 'localhost' ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : 
      req.hostname;
    
    passport.authenticate(`replitauth:${hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Callback route - handle authentication success/failure with custom logic for restricted access
  app.get("/api/callback", (req, res, next) => {
    // Handle both localhost development and Replit domain
    const hostname = req.hostname === 'localhost' ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : 
      req.hostname;
    
    passport.authenticate(`replitauth:${hostname}`, (err: any, user: any, info: any) => {
      if (err) {
        // Authentication failed - redirect with error message
        console.log("Authentication failed:", err.message);
        return res.redirect(`/?error=${encodeURIComponent("Access denied: You must be added to the team by an administrator before you can login.")}`);
      }
      if (!user) {
        return res.redirect(`/?error=${encodeURIComponent("Authentication failed. Please try again.")}`);
      }
      // Authentication successful
      req.logIn(user, (err) => {
        if (err) {
          return res.redirect(`/?error=${encodeURIComponent("Login error. Please try again.")}`);
        }
        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
