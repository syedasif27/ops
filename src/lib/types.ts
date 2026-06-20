export interface Tag {
  id: string;
  name: string;
}

export interface Article {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  content: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface Command {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  command: string;
  example_output: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface Attachment {
  id: string;
  article_id: string | null;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  gcs_path: string;
  created_at: string;
}

export interface FavoriteItem {
  id: string;
  item_type: "article" | "command" | "runbook" | "project";
  item_id: string;
}

export interface SearchResult {
  id: string;
  type: "article" | "command";
  title: string;
  snippet: string;
  category: string | null;
  rank: number;
}

export interface DashboardStats {
  totalArticles: number;
  totalRunbooks: number;
  totalCommands: number;
  recentlyUpdated: Article[];
  mostViewed: Article[];
  favoriteArticles: Article[];
}
