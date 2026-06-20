import { supabaseAdmin } from "@/lib/supabase";
import type { Article, Command, DashboardStats, SearchResult } from "@/lib/types";

// ---------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------

/** Ensure each tag name exists in `tags`, return their ids keyed by name. */
async function upsertTags(names: string[]): Promise<Record<string, string>> {
  const clean = Array.from(
    new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))
  );
  if (clean.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("tags")
    .upsert(
      clean.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: false }
    )
    .select("id, name");

  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.name] = row.id;
  return map;
}

async function syncEntityTags(opts: {
  table: "article_tags" | "command_tags";
  idColumn: "article_id" | "command_id";
  entityId: string;
  tagNames: string[];
}) {
  const { table, idColumn, entityId, tagNames } = opts;
  const tagMap = await upsertTags(tagNames);

  await supabaseAdmin.from(table).delete().eq(idColumn, entityId);

  const rows = Object.values(tagMap).map((tag_id) => ({
    [idColumn]: entityId,
    tag_id,
  }));
  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from(table).insert(rows);
    if (error) throw error;
  }
}

async function attachTagsToArticles(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) return articles;
  const ids = articles.map((a) => a.id);
  const { data, error } = await supabaseAdmin
    .from("article_tags")
    .select("article_id, tags(name)")
    .in("article_id", ids);
  if (error) throw error;

  const byId: Record<string, string[]> = {};
  for (const row of (data ?? []) as unknown as { article_id: string; tags: { name: string } | { name: string }[] }[]) {
    const tagNames = Array.isArray(row.tags) ? row.tags.map((t) => t.name) : [row.tags?.name].filter(Boolean) as string[];
    byId[row.article_id] = [...(byId[row.article_id] ?? []), ...tagNames];
  }
  return articles.map((a) => ({ ...a, tags: byId[a.id] ?? [] }));
}

async function attachTagsToCommands(commands: Command[]): Promise<Command[]> {
  if (commands.length === 0) return commands;
  const ids = commands.map((c) => c.id);
  const { data, error } = await supabaseAdmin
    .from("command_tags")
    .select("command_id, tags(name)")
    .in("command_id", ids);
  if (error) throw error;

  const byId: Record<string, string[]> = {};
  for (const row of (data ?? []) as unknown as { command_id: string; tags: { name: string } | { name: string }[] }[]) {
    const tagNames = Array.isArray(row.tags) ? row.tags.map((t) => t.name) : [row.tags?.name].filter(Boolean) as string[];
    byId[row.command_id] = [...(byId[row.command_id] ?? []), ...tagNames];
  }
  return commands.map((c) => ({ ...c, tags: byId[c.id] ?? [] }));
}

// ---------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------

export async function listArticles(opts: { category?: string; tag?: string } = {}): Promise<Article[]> {
  let query = supabaseAdmin
    .from("articles")
    .select("id, title, description, category, content, view_count, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (opts.category) query = query.eq("category", opts.category);

  const { data, error } = await query;
  if (error) throw error;

  let articles = (data ?? []) as Article[];
  articles = await attachTagsToArticles(articles);

  if (opts.tag) {
    articles = articles.filter((a) => a.tags?.includes(opts.tag!.toLowerCase()));
  }
  return articles;
}

export async function getArticle(id: string): Promise<Article | null> {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("id, title, description, category, content, view_count, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withTags] = await attachTagsToArticles([data as Article]);
  return withTags;
}

export async function incrementArticleView(id: string): Promise<void> {
  await supabaseAdmin.rpc("increment_article_view", { row_id: id }).then(
    () => {},
    // rpc may not exist if helper function wasn't created — fall back silently
    () => {}
  );
}

export async function createArticle(input: {
  title: string;
  description?: string;
  category?: string;
  content: string;
  tags?: string[];
}): Promise<Article> {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .insert({
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      content: input.content,
    })
    .select("id, title, description, category, content, view_count, created_at, updated_at")
    .single();
  if (error) throw error;

  if (input.tags?.length) {
    await syncEntityTags({
      table: "article_tags",
      idColumn: "article_id",
      entityId: data.id,
      tagNames: input.tags,
    });
  }
  return { ...(data as Article), tags: input.tags ?? [] };
}

export async function updateArticle(
  id: string,
  input: Partial<{ title: string; description: string; category: string; content: string; tags: string[] }>
): Promise<Article | null> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.content !== undefined) patch.content = input.content;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin.from("articles").update(patch).eq("id", id);
    if (error) throw error;
  }
  if (input.tags) {
    await syncEntityTags({ table: "article_tags", idColumn: "article_id", entityId: id, tagNames: input.tags });
  }
  return getArticle(id);
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("articles").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------

export async function listCommands(opts: { category?: string; tag?: string } = {}): Promise<Command[]> {
  let query = supabaseAdmin
    .from("commands")
    .select("id, name, description, category, command, example_output, view_count, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (opts.category) query = query.eq("category", opts.category);

  const { data, error } = await query;
  if (error) throw error;

  let commands = (data ?? []) as Command[];
  commands = await attachTagsToCommands(commands);

  if (opts.tag) {
    commands = commands.filter((c) => c.tags?.includes(opts.tag!.toLowerCase()));
  }
  return commands;
}

export async function getCommand(id: string): Promise<Command | null> {
  const { data, error } = await supabaseAdmin
    .from("commands")
    .select("id, name, description, category, command, example_output, view_count, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withTags] = await attachTagsToCommands([data as Command]);
  return withTags;
}

export async function incrementCommandView(id: string): Promise<void> {
  await supabaseAdmin.rpc("increment_command_view", { row_id: id }).then(
    () => {},
    () => {}
  );
}

export async function createCommand(input: {
  name: string;
  description?: string;
  category?: string;
  command: string;
  example_output?: string;
  tags?: string[];
}): Promise<Command> {
  const { data, error } = await supabaseAdmin
    .from("commands")
    .insert({
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      command: input.command,
      example_output: input.example_output ?? null,
    })
    .select("id, name, description, category, command, example_output, view_count, created_at, updated_at")
    .single();
  if (error) throw error;

  if (input.tags?.length) {
    await syncEntityTags({
      table: "command_tags",
      idColumn: "command_id",
      entityId: data.id,
      tagNames: input.tags,
    });
  }
  return { ...(data as Command), tags: input.tags ?? [] };
}

export async function updateCommand(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    category: string;
    command: string;
    example_output: string;
    tags: string[];
  }>
): Promise<Command | null> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.command !== undefined) patch.command = input.command;
  if (input.example_output !== undefined) patch.example_output = input.example_output;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin.from("commands").update(patch).eq("id", id);
    if (error) throw error;
  }
  if (input.tags) {
    await syncEntityTags({ table: "command_tags", idColumn: "command_id", entityId: id, tagNames: input.tags });
  }
  return getCommand(id);
}

export async function deleteCommand(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("commands").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------

export async function listFavoriteIds(itemType: "article" | "command"): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("favorites")
    .select("item_id")
    .eq("item_type", itemType);
  if (error) throw error;
  return (data ?? []).map((r) => r.item_id as string);
}

export async function toggleFavorite(
  itemType: "article" | "command",
  itemId: string,
  userId: string | null
): Promise<{ favorited: boolean }> {
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("favorites")
    .select("id")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabaseAdmin.from("favorites").delete().eq("id", existing.id);
    if (error) throw error;
    return { favorited: false };
  }

  const { error } = await supabaseAdmin
    .from("favorites")
    .insert({ item_type: itemType, item_id: itemId, user_id: userId });
  if (error) throw error;
  return { favorited: true };
}

// ---------------------------------------------------------------------
// Search (full text, falls back to ILIKE if FTS RPC unavailable)
// ---------------------------------------------------------------------

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const tsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}:*`)
    .join(" & ");

  const [articlesRes, commandsRes] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("id, title, description, category, content")
      .textSearch("search_vector", tsQuery, { type: "websearch", config: "english" })
      .limit(15),
    supabaseAdmin
      .from("commands")
      .select("id, name, description, category, command")
      .textSearch("search_vector", tsQuery, { type: "websearch", config: "english" })
      .limit(15),
  ]);

  const results: SearchResult[] = [];

  if (!articlesRes.error && articlesRes.data) {
    for (const a of articlesRes.data) {
      results.push({
        id: a.id,
        type: "article",
        title: a.title,
        snippet: a.description ?? a.content.slice(0, 140),
        category: a.category,
        rank: 1,
      });
    }
  } else {
    // Fallback: simple ILIKE fuzzy match if FTS isn't set up yet
    const { data } = await supabaseAdmin
      .from("articles")
      .select("id, title, description, category, content")
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(15);
    for (const a of data ?? []) {
      results.push({
        id: a.id,
        type: "article",
        title: a.title,
        snippet: a.description ?? a.content.slice(0, 140),
        category: a.category,
        rank: 0.5,
      });
    }
  }

  if (!commandsRes.error && commandsRes.data) {
    for (const c of commandsRes.data) {
      results.push({
        id: c.id,
        type: "command",
        title: c.name,
        snippet: c.description ?? c.command,
        category: c.category,
        rank: 1,
      });
    }
  } else {
    const { data } = await supabaseAdmin
      .from("commands")
      .select("id, name, description, category, command")
      .or(`name.ilike.%${q}%,command.ilike.%${q}%`)
      .limit(15);
    for (const c of data ?? []) {
      results.push({
        id: c.id,
        type: "command",
        title: c.name,
        snippet: c.description ?? c.command,
        category: c.category,
        rank: 0.5,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------

export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ count: totalArticles }, { count: totalCommands }, { count: totalRunbooks }] = await Promise.all([
    supabaseAdmin.from("articles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("commands").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("runbooks").select("*", { count: "exact", head: true }),
  ]);

  const { data: recent } = await supabaseAdmin
    .from("articles")
    .select("id, title, description, category, content, view_count, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data: mostViewed } = await supabaseAdmin
    .from("articles")
    .select("id, title, description, category, content, view_count, created_at, updated_at")
    .order("view_count", { ascending: false })
    .limit(5);

  const favIds = await listFavoriteIds("article");
  let favoriteArticles: Article[] = [];
  if (favIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("articles")
      .select("id, title, description, category, content, view_count, created_at, updated_at")
      .in("id", favIds)
      .limit(5);
    favoriteArticles = (data ?? []) as Article[];
  }

  return {
    totalArticles: totalArticles ?? 0,
    totalCommands: totalCommands ?? 0,
    totalRunbooks: totalRunbooks ?? 0,
    recentlyUpdated: (recent ?? []) as Article[],
    mostViewed: (mostViewed ?? []) as Article[],
    favoriteArticles,
  };
}
