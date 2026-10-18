'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { getPatchDownloadUrl } from '../../lib/api';

export interface PatchDownloadButtonProps {
  runId: string;
  hasPatch: boolean;
  repoName?: string;
  issueNumber?: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const PatchDownloadButton: React.FC<PatchDownloadButtonProps> = ({
  runId,
  hasPatch,
  repoName,
  issueNumber,
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
      download
      className={`btn btn-primary patch-download-btn ${className}`.trim()}
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
    >
      <Download size={16} />
      <span>Download Patch (.patch)</span>
    </a>
  );
};
