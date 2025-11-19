"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"

interface SearchSuggestion {
  id: string
  title: string
  type: 'product' | 'category' | 'supplier'
  category?: string
}

interface SearchWithSuggestionsProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  className?: string
}

export function SearchWithSuggestions({ 
  placeholder, 
  onSearch, 
  onSuggestionSelect,
  className = "" 
}: SearchWithSuggestionsProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  // Mock suggestions - replace with actual API call
  const mockSuggestions: SearchSuggestion[] = [
    { id: '1', title: 'Cement', type: 'product', category: 'Building Materials' },
    { id: '2', title: 'Steel Rebar', type: 'product', category: 'Building Materials' },
    { id: '3', title: 'Concrete Blocks', type: 'product', category: 'Building Materials' },
    { id: '4', title: 'Roofing Sheets', type: 'product', category: 'Building Materials' },
    { id: '5', title: 'Paint', type: 'product', category: 'Finishes & Interiors' },
    { id: '6', title: 'Tiles', type: 'product', category: 'Finishes & Interiors' },
    { id: '7', title: 'PVC Pipes', type: 'product', category: 'MEP' },
    { id: '8', title: 'Electrical Wires', type: 'product', category: 'MEP' },
    { id: '9', title: 'Building Materials', type: 'category' },
    { id: '10', title: 'Finishes & Interiors', type: 'category' },
    { id: '11', title: 'MEP (Mechanical, Electrical, Plumbing)', type: 'category' },
    { id: '12', title: 'Construction Chemicals', type: 'category' },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length >= 2) {
      setIsLoading(true)

      const searchAPI = async () => {
        try {
          // Try to fetch from Next.js API route first
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
          if (response.ok) {
            const data = await response.json()
            const apiSuggestions = [
              ...data.products?.map((p: any) => ({
                id: p.id,
                title: p.name,
                type: 'product' as const,
                category: p.category?.name
              })) || [],
              ...data.categories?.map((c: any) => ({
                id: c.id,
                title: c.name,
                type: 'category' as const
              })) || []
            ]
            setSuggestions(apiSuggestions.slice(0, 8))
          } else {
            // Fallback to mock data
            const filtered = mockSuggestions.filter(suggestion =>
              suggestion.title.toLowerCase().includes(query.toLowerCase())
            )
            setSuggestions(filtered.slice(0, 8))
          }
        } catch (error) {
          // Fallback to mock data on error
          const filtered = mockSuggestions.filter(suggestion =>
            suggestion.title.toLowerCase().includes(query.toLowerCase())
          )
          setSuggestions(filtered.slice(0, 8))
        }

        setShowSuggestions(true)
        setIsLoading(false)
        setSelectedIndex(-1)
      }

      const timer = setTimeout(searchAPI, 300)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [query])

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query.trim())
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex])
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const clearSearch = () => {
    setQuery("")
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder || t("header.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearch}
            className="h-8 px-3 text-xs"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full px-4 py-2 text-left transition-colors ${
                      index === selectedIndex ? 'bg-muted' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {suggestion.type === 'category' ? (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        ) : suggestion.type === 'supplier' ? (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {suggestion.title}
                        </div>
                        {suggestion.category && (
                          <div className="text-xs text-muted-foreground truncate">
                            in {suggestion.category}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground capitalize">
                        {suggestion.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
