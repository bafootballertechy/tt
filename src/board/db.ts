import Dexie, { Table } from 'dexie';
import { Project } from './types';

export class TacticoDatabase extends Dexie {
  projects!: Table<{ id: string; data: Project }, string>;

  constructor() {
    super('TacticoDB');
    this.version(1).stores({
      projects: 'id'
    });
  }
}

export const db = new TacticoDatabase();
