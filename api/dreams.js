
import { MongoClient } from 'mongodb';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { configureMongoDNS } from './lib/mongo-dns.js';

// ======================================
// MONGODB CONNECTION
// ======================================

let mongoClient = null;
let mongoPromise = null;

async function getCollection() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing on the server');
  }

  // Apply DNS workaround before connecting.
  // Use only for local development.
  if (process.env.NODE_ENV !== 'production') {
    configureMongoDNS();
  }

  if (!mongoPromise) {
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });

    mongoPromise = mongoClient.connect().catch((error) => {
      mongoPromise = null;
      mongoClient = null;
      throw error;
    });
  }

  const client = await mongoPromise;

  return client
    .db(process.env.MONGODB_DB || 'dreamcontinuator')
    .collection('dreams');
}

// ======================================
// FIREBASE ADMIN AUTHENTICATION
// ======================================

function getFirebaseAuth() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin credentials are not configured'
      );
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  }

  return getAuth();
}

// ======================================
// DREAMS API
// ======================================

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE'];

  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // ----------------------------------
    // VERIFY FIREBASE USER
    // ----------------------------------

    const bearer = req.headers.authorization || '';

    if (!bearer.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Sign in to access your dreams'
      });
    }

    const token = bearer.slice(7);

    const { uid } = await getFirebaseAuth().verifyIdToken(token);

    // ----------------------------------
    // CONNECT TO MONGODB
    // ----------------------------------

    const col = await getCollection();

    // ----------------------------------
    // GET USER DREAMS
    // ----------------------------------

    if (req.method === 'GET') {
      const dreams = await col
        .find({ uid })
        .sort({ createdAt: -1 })
        .limit(500)
        .project({
          _id: 0,
          uid: 0
        })
        .toArray();

      return res.status(200).json({
        dreams
      });
    }

    const body = req.body || {};

    // ----------------------------------
    // SAVE DREAM
    // ----------------------------------

    if (req.method === 'POST') {
      const d = body.dream;

      if (
        !d ||
        typeof d.id !== 'string' ||
        typeof d.dream !== 'string' ||
        typeof d.continuation !== 'string' ||
        d.dream.length > 6000 ||
        d.continuation.length > 15000
      ) {
        return res.status(400).json({
          error: 'Invalid dream'
        });
      }

      const clean = {
        id: d.id.slice(0, 100),
        title: String(d.title || 'Untitled').slice(0, 90),
        dream: d.dream,
        continuation: d.continuation,
        mood: String(d.mood || '').slice(0, 40),
        genre: String(d.genre || '').slice(0, 40),
        language: String(d.language || '').slice(0, 40),
        createdAt: new Date().toISOString(),
        favorite: Boolean(d.favorite)
      };

      await col.updateOne(
        {
          uid,
          id: clean.id
        },
        {
          $set: {
            uid,
            ...clean
          }
        },
        {
          upsert: true
        }
      );

      return res.status(201).json({
        ok: true
      });
    }

    // ----------------------------------
    // VALIDATE DREAM ID
    // ----------------------------------

    if (
      typeof body.id !== 'string' ||
      !body.id.trim() ||
      body.id.length > 100
    ) {
      return res.status(400).json({
        error: 'Invalid dream ID'
      });
    }

    // ----------------------------------
    // DELETE DREAM
    // ----------------------------------

    if (req.method === 'DELETE') {
      await col.deleteOne({
        uid,
        id: body.id
      });

      return res.status(200).json({
        ok: true
      });
    }

    // ----------------------------------
    // UPDATE FAVORITE
    // ----------------------------------

    if (req.method === 'PATCH') {
      if (typeof body.change?.favorite !== 'boolean') {
        return res.status(400).json({
          error: 'Only favorite status can be changed'
        });
      }

      await col.updateOne(
        {
          uid,
          id: body.id
        },
        {
          $set: {
            favorite: body.change.favorite
          }
        }
      );

      return res.status(200).json({
        ok: true
      });
    }

  } catch (error) {
    console.error('Dream API error:', error);

    if (error.code?.startsWith?.('auth/')) {
      return res.status(401).json({
        error: 'Your sign-in expired. Sign in again.'
      });
    }

    const configurationError =
      error.message?.includes('missing') ||
      error.message?.includes('configured');

    return res.status(503).json({
      error: configurationError
        ? 'Server configuration missing. Check MongoDB and Firebase Admin environment variables.'
        : 'Dream service unavailable. Check your MongoDB connection and server logs.'
    });
  }
}
