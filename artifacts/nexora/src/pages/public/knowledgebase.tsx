import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Knowledgebase() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ["kb-categories"],
    queryFn: () => apiFetch<any[]>("/kb/categories"),
  });

  const { data: articles, isLoading: loadingSearch } = useQuery({
    queryKey: ["kb-articles", q],
    queryFn: () => apiFetch<any[]>(`/kb/articles${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  return (
    <PublicLayout>
      <div className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold mb-4">Knowledge Base</h1>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Find answers to common questions and learn how to get the most out of NexoraHosting.</p>
            <form onSubmit={e => { e.preventDefault(); setQ(search); }} className="max-w-lg mx-auto flex gap-2">
              <Input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 h-12" data-testid="input-kb-search" />
              <Button type="submit" size="lg" disabled={loadingSearch} data-testid="button-kb-search">
                {loadingSearch ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </Button>
            </form>
          </div>

          {q ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Search results for "{q}"</h2>
              <div className="grid gap-4 max-w-3xl mx-auto">
                {(articles?.length ?? 0) === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No articles found.</p>
                ) : (
                  articles?.map((a: any) => (
                    <Link key={a.id} href={`/kb/${a.id}`}>
                      <div className="p-5 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{a.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{a.excerpt}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {loadingCats ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)
              ) : (
                categories?.map((cat: any) => (
                  <Link key={cat.id} href={`/kb?category=${cat.id}`}>
                    <div className="p-6 rounded-xl bg-card border border-card-border hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer" data-testid={`kb-category-${cat.id}`}>
                      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>
                      <p className="text-xs text-primary font-medium">{cat.articleCount} article{cat.articleCount !== 1 ? "s" : ""} →</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
