
export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export enum NodeType {
  SCENE = 'SCENE',
  SOP = 'SOP',
  TABLE = 'TABLE',
  DEPT = 'DEPT'
}

export enum NodeStatus {
  ACTIVE = 'ACTIVE',
  LEGACY = 'LEGACY',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
  TRASH = 'TRASH' // New: For Recycle Bin
}

export interface TableField {
  name: string;
  required: boolean;
  description: string; // "How to fill" guide
  example?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  description?: string;
  content?: string; 
  fileUrl?: string; 
  publishDate?: string; // New: Publish date
  department?: string; // New: Owner department
  fields?: TableField[]; // New: For table filling guide
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'REQUIRES' | 'GUIDES' | 'BELONGS_TO';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  groundingSources?: { title: string; uri: string }[];
}

// New Types for Server-Side File Storage
export interface FileAttachment {
  fileId: string;
  originalName: string;
  storagePath: string; // Physical path on server disk (e.g., /var/data/uploads/...)
  publicUrl: string;   // Accessible HTTP URL
  mimeType: string;
  size: number;
  uploadTime: string;
}

// New Types for Backend Management
export interface StandardDoc {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  status: NodeStatus;
  type: NodeType;
  content: string;
  department: string; // Mandatory now
  history?: StandardDocVersion[]; // For diff
  fileAttachment?: FileAttachment; // Link to the physical file on server
}

export interface StandardDocVersion {
  version: string;
  date: string;
  changes: string;
  diffContent?: {
    original: string;
    modified: string;
  };
}
