import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import EmptyState from './EmptyState';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchKeys = [],
  pageSize = 10,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria.',
  onRowClick = null,
  actions = null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Search Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      if (searchKeys.length > 0) {
        return searchKeys.some((k) => String(row[k] || '').toLowerCase().includes(term));
      }
      return Object.values(row).some((val) =>
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchKeys]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field) => {
    if (!field) return;
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="w-full">
      {/* Table Toolbar */}
      {(searchable || actions) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          {searchable ? (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-app-muted" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-app-border rounded-lg text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary"
              />
            </div>
          ) : <div />}

          {actions && <div className="flex items-center gap-2 w-full sm:w-auto justify-end">{actions}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-app-surface rounded-xl border border-app-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-app-border text-xs text-app-muted uppercase tracking-wider font-semibold">
                {columns.map((col) => {
                  const isSortable = col.sortable !== false && col.field;
                  const isCurrentSort = sortField === col.field;

                  return (
                    <th
                      key={col.header || col.field}
                      onClick={() => isSortable && handleSort(col.field)}
                      className={`px-4 py-3 select-none ${isSortable ? 'cursor-pointer hover:bg-gray-100/70' : ''} ${col.className || ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {isSortable && (
                          <span className="text-gray-400">
                            {isCurrentSort ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-app-primary" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-app-primary" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-app-border text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={row[keyField] || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-blue-50/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`px-4 py-3 text-app-text ${col.cellClassName || ''}`}>
                        {col.render ? col.render(row) : row[col.field]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && sortedData.length > 0 && (
          <div className="px-4 py-3 bg-gray-50/60 border-t border-app-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-app-muted">
            <div className="tabular-nums">
              Showing <span className="font-semibold text-app-text">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-app-text">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{' '}
              <span className="font-semibold text-app-text">{sortedData.length}</span> results
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1 rounded border border-app-border bg-white text-app-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 tabular-nums font-medium text-app-text">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1 rounded border border-app-border bg-white text-app-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
