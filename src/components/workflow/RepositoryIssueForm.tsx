'use client';

import React, { useState } from 'react';
import { Search, Play, BookOpen, GitBranch, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchIssueDetails } from '../../lib/api';
import type { GitHubIssue } from '../../lib/types';

export interface RepositoryIssueFormProps {
  onIssueLoaded: (data: { issue: GitHubIssue; repoUrl: string; issueNumber: number }) => void;
  onStartRun: (params: {
    repoUrl: string;
    issueNumber: number;
    additionalInstructions?: string;
    targetBranch?: string;
  }) => void;
  isLoading: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  initialRepoUrl?: string;
  initialIssueNumber?: number | string;
  initialInstructions?: string;
  initialTargetBranch?: string;
}

export const RepositoryIssueForm: React.FC<RepositoryIssueFormProps> = ({
  onIssueLoaded,
  onStartRun,
  isLoading,
  className = '',
  style,
  id,
  initialRepoUrl = '',
  initialIssueNumber = '',
  initialInstructions = '',
  initialTargetBranch = '',
}) => {
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl);
  const [issueNumber, setIssueNumber] = useState(
    initialIssueNumber !== undefined && initialIssueNumber !== '' ? String(initialIssueNumber) : ''
  );
  const [additionalInstructions, setAdditionalInstructions] = useState(initialInstructions);
  const [targetBranch, setTargetBranch] = useState(initialTargetBranch);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialInstructions || initialTargetBranch));
  const [fetchingIssue, setFetchingIssue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect issue number if user pastes full issue URL
  const handleUrlChange = (value: string) => {
    setRepoUrl(value);
    const match = value.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
    if (match) {
      setIssueNumber(match[3]);
      // Also normalize base repo URL
      setRepoUrl(`https://github.com/${match[1]}/${match[2]}`);
    }
  };

  const handleFetchPreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    const num = parseInt(issueNumber, 10);
    if (isNaN(num) || num <= 0) {
      setError('Please provide a valid issue number');
      return;
    }

    try {
      setFetchingIssue(true);
      setError(null);
      const data = await fetchIssueDetails(repoUrl.trim(), num);
      onIssueLoaded({
        issue: data.issue,
        repoUrl: repoUrl.trim(),
        issueNumber: num,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch issue from GitHub');
    } finally {
      setFetchingIssue(false);
    }
  };

  const handleStartWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(issueNumber, 10);
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    if (isNaN(num) || num <= 0) {
      setError('Please provide a valid issue number');
      return;
    }

    setError(null);
    onStartRun({
      repoUrl: repoUrl.trim(),
      issueNumber: num,
      additionalInstructions: additionalInstructions.trim() || undefined,
      targetBranch: targetBranch.trim() || undefined,
    });
  };

  // Quick preset loader
  const loadDemoPreset = () => {
    setRepoUrl('https://github.com/expressjs/express');
    setIssueNumber('5920');
    setAdditionalInstructions('Focus on backward compatibility and edge cases.');
  };

  return (
    <div
      id={id}
      className={`glass-panel repository-issue-form ${className}`.trim()}
      style={{ padding: '20px 24px', marginBottom: '20px', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Target Open-Source Issue
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Enter any public GitHub repository and issue to resolve
          </p>
        </div>

        <button
          type="button"
          onClick={loadDemoPreset}
          className="btn btn-ghost"
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          <BookOpen size={13} />
          <span>Load Sample (Express #5920)</span>
        </button>
      </div>

      <form onSubmit={handleStartWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
          <div>
            <label
              htmlFor="repo-url-input"
              style={{ display: 'block', fontSize: '0.775rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Repository URL
            </label>
            <input
              id="repo-url-input"
              aria-label="Repository URL"
              type="text"
              className="input-field"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isLoading || fetchingIssue}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label
              htmlFor="issue-number-input"
              style={{ display: 'block', fontSize: '0.775rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}
            >
              Issue #
            </label>
            <input
              id="issue-number-input"
              aria-label="Issue Number"
              type="number"
              className="input-field"
              placeholder="e.g. 42"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              disabled={isLoading || fetchingIssue}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Collapsible Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-form-options"
            className="btn btn-ghost"
            style={{
              padding: '4px 0',
              fontSize: '0.75rem',
              color: showAdvanced ? 'var(--accent-primary)' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Advanced options (branch, custom instructions)</span>
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAdvanced && (
            <div
              id="advanced-form-options"
              style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px', marginTop: '10px' }}
              className="animate-fade-in"
            >
              <div>
                <label
                  htmlFor="custom-instructions-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}
                >
                  Custom Constraints / Instructions
                </label>
                <input
                  id="custom-instructions-input"
                  aria-label="Custom Constraints or Instructions"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Ensure backward compatibility, do not edit exports..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  disabled={isLoading || fetchingIssue}
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div>
                <label
                  htmlFor="target-branch-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}
                >
                  Target Branch
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="target-branch-input"
                    aria-label="Target Branch"
                    type="text"
                    className="input-field"
                    placeholder="main / master"
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    disabled={isLoading || fetchingIssue}
                    style={{ paddingLeft: '30px', fontSize: '0.825rem' }}
                  />
                  <GitBranch
                    size={13}
                    color="var(--text-dim)"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={() => handleFetchPreview()}
            disabled={isLoading || fetchingIssue || !repoUrl || !issueNumber}
            className="btn btn-secondary"
            style={{ fontSize: '0.825rem', padding: '6px 14px' }}
          >
            <Search size={14} />
            <span>{fetchingIssue ? 'Fetching...' : 'Inspect Issue'}</span>
          </button>

          <button
            type="submit"
            disabled={isLoading || fetchingIssue || !repoUrl || !issueNumber}
            className="btn btn-primary"
            style={{ minWidth: '150px', fontSize: '0.825rem', padding: '6px 16px' }}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Start Run</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
