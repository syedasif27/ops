"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({ itemType, itemId }: { itemType: "article" | "command"; itemId: string }) {
  const [favorited, setFavorited] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/favorites?itemType=${itemType}`)
      .then((r) => r.json())
      .then((data) => {
        setFavorited((data.ids ?? []).includes(itemId));
        setLoaded(true);
      });
  }, [itemType, itemId]);

  async function toggle() {
    setFavorited((v) => !v); // optimistic
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId }),
    });
    if (res.ok) {
      const data = await res.json();
      setFavorited(data.favorited);
    }
  }

  return (
    <Button variant="outline" size="icon" onClick={toggle} disabled={!loaded} title="Toggle favorite">
      <Star className={cn("h-4 w-4", favorited && "fill-primary text-primary")} />
    </Button>
  );
}
