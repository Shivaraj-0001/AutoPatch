'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { getPatchDownloadUrl } from '../../lib/api';

export interface PatchDownloadButtonProps {
  runId: string;
  hasPatch: boolean;
  repoName?: string;
  issueNumber?: number;
  filename?: string;
  label?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const PatchDownloadButton: React.FC<PatchDownloadButtonProps> = ({
  runId,
  hasPatch,
  repoName,
  issueNumber,
  filename,
  label = 'Download Patch (.patch)',
  className = '',
  style,
  id,
}) => {
  if (!hasPatch) return null;

  const url = getPatchDownloadUrl(runId);
  const title = `Download unified diff patch ${repoName && issueNumber ? `for ${repoName} #${issueNumber}` : ''}`.trim();

  return (
    <a
      id={id}
      href={url}
      download={filename || true}
      className={`btn btn-primary patch-download-btn ${className}`.trim()}
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
    >
      <Download size={16} />
      <span>{label}</span>
    </a>
  );
};
