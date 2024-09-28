import { Request, Response, NextFunction } from 'express';
import { Database } from 'better-sqlite3';

interface CustomRequest extends Request {
  db?: Database;
}

export const getConfig = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const customReq = req as CustomRequest;
    const db = customReq.db;

    if (!db) {
      throw new Error('Database is not attached to the request');
    }

    const query = 'SELECT * FROM sites';
    const statement = db.prepare(query);
    const results = statement.all();

    res.json(results);
  } catch (error) {
    console.error('Error querying database:', error);
    next(error);
  }
};