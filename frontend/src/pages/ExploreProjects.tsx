import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ProjectCard, { ProjectCardSkeleton } from "@/components/ProjectCard";
import { useSavedProjects } from "@/hooks/useSavedProjects";
import { useToast } from "@/hooks/use-toast";
import type { ProjectSummary } from "@/types/project";
import { API_BASE_URL } from "@/lib/config";


type Project = ProjectSummary;

export default function ExploreProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { savedIds, toggleSaved } = useSavedProjects();
  const { toast } = useToast();

  // Wait for typing to pause before hitting the API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Read URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const typeParam = urlParams.get('type');
    const cityParam = urlParams.get('city');
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    if (cityParam) {
      setCityFilter(cityParam);
    }
    // Property type from homepage maps to search query or city
    if (typeParam && typeParam !== 'all') {
      // You could add a project_type filter if needed
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [cityFilter, statusFilter, sortBy, debouncedSearch]);

  const fetchProjects = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      let url = loadMore && nextPage ? nextPage : `${API_BASE_URL}/api/projects/projects/`;
      
      if (!loadMore || !nextPage) {
        const params = new URLSearchParams();
        
        if (cityFilter !== "all") params.append("city", cityFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (debouncedSearch) params.append("search", debouncedSearch);
        if (priceMin) params.append("min_price", priceMin);
        if (priceMax) params.append("max_price", priceMax);
        
        // Apply sorting
        if (sortBy === "price_low") params.append("ordering", "starting_price");
        else if (sortBy === "price_high") params.append("ordering", "-starting_price");
        else if (sortBy === "newest") params.append("ordering", "-created_at");
        else if (sortBy === "popular") params.append("ordering", "popular");
        
        if (params.toString()) url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      
      // Handle paginated response from DRF
      const projectsList = data.results || data;
      
      if (loadMore) {
        setProjects(prev => [...prev, ...projectsList]);
      } else {
        setProjects(projectsList);
      }
      
      setNextPage(data.next || null);
      setTotalCount(data.count || projectsList.length);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const cities = ["Mumbai", "Pune", "Bangalore", "Delhi", "Hyderabad"];

  return (
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Explore"
        title="Find a verified project"
        description={`Browse ${totalCount ? totalCount.toLocaleString("en-IN") : ""} projects with on-chain construction records.`}
      />

      <div className="container py-8">
        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, location, or developer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>
                <Button type="submit">Search</Button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {showFilters ? "Hide" : "Show"} Advanced
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">City</label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Min Price (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Max Price (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 10000000"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setCityFilter("all");
                    setStatusFilter("all");
                    setPriceMin("");
                    setPriceMax("");
                    setSortBy("newest");
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset All Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No projects found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                saved={savedIds.has(project.id)}
                onToggleSave={(id) =>
                  toggleSaved(id).catch(() =>
                    toast({ title: "Couldn't update saved projects", variant: "destructive" }),
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Load More Button and Count Info */}
        {!loading && projects.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Showing {projects.length} of {totalCount} projects
            </div>
            
            {nextPage && (
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => fetchProjects(true)}
                  disabled={loadingMore}
                  className="min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load More Projects'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
