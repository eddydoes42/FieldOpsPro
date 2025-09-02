import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  MapPin, 
  Building2, 
  Calendar,
  User,
  FileText,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: 'work_order' | 'project';
  title: string;
  description?: string;
  location?: string;
  clientCompanyName?: string;
  assignedTo?: string;
  status: string;
  createdAt: string;
  priority?: string;
}

export function SearchPopup({ open, onOpenChange }: SearchPopupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch work orders for search
  const { data: workOrders, isLoading: isLoadingWorkOrders } = useQuery({
    queryKey: ['/api/work-orders'],
    enabled: open
  });

  // Filter and search logic
  const searchResults: SearchResult[] = React.useMemo(() => {
    if (!workOrders || !debouncedQuery.trim() || debouncedQuery.trim().length < 3) {
      return [];
    }

    const query = debouncedQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search through work orders
    (workOrders as any[]).forEach((workOrder: any) => {
      const matchesTitle = workOrder.title?.toLowerCase().includes(query);
      const matchesDescription = workOrder.description?.toLowerCase().includes(query);
      const matchesLocation = workOrder.location?.toLowerCase().includes(query);
      const matchesClientCompany = workOrder.clientCompanyName?.toLowerCase().includes(query);

      if (matchesTitle || matchesDescription || matchesLocation || matchesClientCompany) {
        results.push({
          id: workOrder.id,
          type: 'work_order',
          title: workOrder.title,
          description: workOrder.description,
          location: workOrder.location,
          clientCompanyName: workOrder.clientCompanyName,
          assignedTo: workOrder.assignedTo,
          status: workOrder.status,
          createdAt: workOrder.createdAt,
          priority: workOrder.priority
        });
      }
    });

    return results.slice(0, 20); // Limit to 20 results
  }, [workOrders, debouncedQuery]);

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("completed")) {
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    }
    if (statusLower.includes("in_progress") || statusLower.includes("assigned")) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    }
    if (statusLower.includes("pending") || statusLower.includes("open")) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    }
    if (statusLower.includes("delayed") || statusLower.includes("overdue")) {
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return "";
    const priorityLower = priority.toLowerCase();
    if (priorityLower === "high" || priorityLower === "urgent") {
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    }
    if (priorityLower === "medium") {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    }
    return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const handleResultClick = (result: SearchResult) => {
    // Close popup and potentially navigate to result
    onOpenChange(false);
    // Could add navigation logic here based on result type
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Work Orders & Projects
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, description, location, or client company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
              data-testid="search-input"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                data-testid="clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-96">
          <div className="px-6 py-4">
            {!debouncedQuery.trim() ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Start typing to search work orders and projects</p>
                <p className="text-sm">Type at least 3 characters to begin searching</p>
              </div>
            ) : debouncedQuery.trim().length < 3 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Type at least 3 characters to search</p>
                <p className="text-sm">{3 - debouncedQuery.trim().length} more character{3 - debouncedQuery.trim().length === 1 ? '' : 's'} needed</p>
              </div>
            ) : isLoadingWorkOrders ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No results found for "{debouncedQuery}"</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
                
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                    data-testid={`search-result-${result.id}`}
                  >
                    {/* Mini-card header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {highlightText(result.title, debouncedQuery)}
                        </h4>
                        {result.clientCompanyName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {highlightText(result.clientCompanyName, debouncedQuery)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {result.priority && (
                          <Badge variant="outline" className={cn("text-xs px-1 py-0", getPriorityColor(result.priority))}>
                            {result.priority.charAt(0).toUpperCase()}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-xs px-1 py-0", getStatusColor(result.status))}>
                          {result.status.replace(/_/g, " ").split(" ")[0]}
                        </Badge>
                      </div>
                    </div>

                    {/* Description - limited */}
                    {result.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                        {highlightText(result.description.substring(0, 60) + (result.description.length > 60 ? "..." : ""), debouncedQuery)}
                      </p>
                    )}

                    {/* Compact metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        {result.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-20">{highlightText(result.location, debouncedQuery)}</span>
                          </div>
                        )}
                        {result.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-16">{result.assignedTo}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(result.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}