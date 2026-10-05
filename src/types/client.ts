import type { ColumnDefinition } from "./task";

export interface ContactPerson {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface Client {
  id: string;        // e.g. "cli-acme"
  name: string;      // e.g. "Acme Corp"
  color: string;     // subtle branding color
  code: string;      // short tag e.g. "ACM"
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  taxId?: string;    // USt-IdNr.
  notes?: string;
  contacts?: ContactPerson[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;        // e.g. "prj-web-redesign"
  clientId: string;  // belongs to client
  name: string;      // e.g. "Web Redesign 2026"
  description?: string;
  color?: string;
  /** Short project tag for issue keys, e.g. "WEB" → ACM-WEB-12 */
  code?: string;
  /** Optional project-specific kanban columns; falls back to default 4 when absent. */
  statuses?: ColumnDefinition[];
}
