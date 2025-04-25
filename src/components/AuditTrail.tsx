"use client";

import React, { useState } from 'react';
import { AuditLog } from '@/types/database.types';
import { formatDistanceToNow } from 'date-fns';

interface AuditTrailProps {
  logs: AuditLog[];
  maxItems?: number;
  showFilters?: boolean;
  entityId?: string;
  className?: string;
}

export default function AuditTrail({
  logs,
  maxItems = 10,
  showFilters = true,
  entityId,
  className = ''
}: AuditTrailProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filter logs by action type if filter is set
  const filteredLogs = logs
    .filter(log => !entityId || log.entity_id === entityId)
    .filter(log => !filter || log.action === filter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Limit the number of logs shown unless showAll is true
  const displayedLogs = showAll ? filteredLogs : filteredLogs.slice(0, maxItems);

  // Get unique actions for the filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        );
      case 'update':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-9.5A2.25 2.25 0 014 18.75V8.25A2.25 2.25 0 016.25 6H11" />
          </svg>
        );
      case 'delete':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        );
      case 'publish':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
          </svg>
        );
      case 'review':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'approve':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        );
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900';
      case 'publish':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900';
      case 'approve':
        return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-900';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const formatActionName = (action: string) => {
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  const getEntityName = (log: AuditLog) => {
    switch (log.entity_type) {
      case 'sop':
        return 'SOP';
      case 'step':
        return 'Step';
      case 'media':
        return 'Media';
      case 'user':
        return 'User';
      default:
        return log.entity_type;
    }
  };

  const renderChanges = (log: AuditLog) => {
    if (!log.changes || Object.keys(log.changes).length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-1 text-sm">
        {Object.entries(log.changes).map(([field, value]) => (
          <div key={field} className="flex items-start">
            <span className="font-medium text-gray-600 dark:text-gray-300 min-w-[100px]">{field}:</span>
            <span className="text-gray-700 dark:text-gray-200 ml-2">{
              typeof value === 'object' 
                ? JSON.stringify(value, null, 2) 
                : String(value)
            }</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Audit Trail</h3>
        
        {showFilters && uniqueActions.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={filter || ''}
              onChange={(e) => setFilter(e.target.value || null)}
              className="text-xs rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-1 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Filter by action"
            >
              <option value="">All actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{formatActionName(action)}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {displayedLogs.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {displayedLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 p-1.5 mt-1 rounded-full ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {formatActionName(log.action)} {getEntityName(log)}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {log.metadata?.description || 
                     `${getEntityName(log)} ${log.entity_id.substring(0, 8)}... was ${log.action}d`}
                  </p>
                  
                  {/* Changed fields */}
                  {renderChanges(log)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p>No audit logs available</p>
        </div>
      )}
      
      {!showAll && filteredLogs.length > maxItems && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Show all {filteredLogs.length} entries
          </button>
        </div>
      )}
    </div>
  );
} 