import matter from "gray-matter";

export interface ParsedMarkdownFile {
  filename: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  content: string;
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.mdx?$/i, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleFromHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parses a single uploaded .md/.mdx file into article fields.
 * Supports optional YAML frontmatter:
 *
 * ---
 * title: My Article
 * description: Short summary
 * category: Nextcloud
 * tags: [nextcloud, redis]
 * ---
 *
 * Falls back to the first `# Heading` in the body, then the filename,
 * for the title if no frontmatter title is present. If a `# Heading`
 * matching the resolved title is the very first line of the body, it's
 * stripped so the title isn't duplicated in the rendered content.
 */
export function parseMarkdownFile(filename: string, raw: string): ParsedMarkdownFile {
  const { data, content } = matter(raw);

  const headingTitle = titleFromHeading(content);
  const title =
    (typeof data.title === "string" && data.title.trim()) ||
    headingTitle ||
    titleFromFilename(filename);

  let body = content.trim();
  if (headingTitle && headingTitle === title) {
    body = body.replace(/^#\s+.+\n+/, "");
  }

  return {
    filename,
    title,
    description: typeof data.description === "string" ? data.description : null,
    category: typeof data.category === "string" ? data.category : null,
    tags: normalizeTags(data.tags),
    content: body,
  };
}
