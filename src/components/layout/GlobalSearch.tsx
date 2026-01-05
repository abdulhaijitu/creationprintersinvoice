import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Users, Building2, Package, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'customer' | 'invoice' | 'vendor' | 'quotation';
  title: string;
  subtitle: string;
  url: string;
}

const typeIcons = {
  customer: Users,
  invoice: FileText,
  vendor: Building2,
  quotation: Package,
};

const typeLabels = {
  customer: 'Customer',
  invoice: 'Invoice',
  vendor: 'Vendor',
  quotation: 'Quotation',
};

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, company_name')
          .or(`name.ilike.%${query}%,company_name.ilike.%${query}%`)
          .limit(3);

        customers?.forEach(c => {
          searchResults.push({
            id: c.id,
            type: 'customer',
            title: c.name,
            subtitle: c.company_name || 'No company',
            url: `/customers/${c.id}`,
          });
        });

        // Search invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, total')
          .ilike('invoice_number', `%${query}%`)
          .limit(3);

        invoices?.forEach(i => {
          searchResults.push({
            id: i.id,
            type: 'invoice',
            title: i.invoice_number,
            subtitle: `৳${i.total?.toLocaleString('en-BD')}`,
            url: `/invoices/${i.id}`,
          });
        });

        // Search vendors
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id, name')
          .ilike('name', `%${query}%`)
          .limit(3);

        vendors?.forEach(v => {
          searchResults.push({
            id: v.id,
            type: 'vendor',
            title: v.name,
            subtitle: 'Vendor',
            url: `/vendors/${v.id}`,
          });
        });

        // Search quotations
        const { data: quotations } = await supabase
          .from('quotations')
          .select('id, quotation_number, total')
          .ilike('quotation_number', `%${query}%`)
          .limit(3);

        quotations?.forEach(q => {
          searchResults.push({
            id: q.id,
            type: 'quotation',
            title: q.quotation_number,
            subtitle: `৳${q.total?.toLocaleString('en-BD')}`,
            url: `/quotations/${q.id}`,
          });
        });

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].url);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 w-64 h-9 bg-muted/50 border-muted focus:bg-background transition-colors"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <ul className="py-1">
              {results.map((result, index) => {
                const Icon = typeIcons[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors",
                        index === selectedIndex && "bg-muted"
                      )}
                    >
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {typeLabels[result.type]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
