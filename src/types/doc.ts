export interface DocItem {
  id: string;          // e.g. "DOC-101"
  clientId: string;    // Client ID
  projectId: string;   // Project ID
  title: string;
  content: string;     // Markdown body
  tags: string[];
  /** Optional parent document for light hierarchy / indentation in the docs list. */
  parentDocId?: string;
  createdAt: string;
  updatedAt: string;
}
