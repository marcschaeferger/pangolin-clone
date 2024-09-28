import { Request, Response, NextFunction } from 'express';
import { DrizzleError } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sites, Site } from '../../db/schema';
import db from '../../db';

export const getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exitNodeId = req.query.exitNodeId as string;

    if (!db) {
      throw new Error('Database is not attached to the request');
    }

    const results: Site[] = db.select().from(sites).all();

    res.json(results);
  } catch (error) {
    console.error('Error querying database:', error);
    if (error instanceof DrizzleError) {
      res.status(500).json({ error: 'Database query error', message: error.message });
    } else {
      next(error);
    }
  }
};