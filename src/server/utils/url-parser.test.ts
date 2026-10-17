import { describe, it, expect } from 'vitest';
import {
  parseGitHubUrl,
  parseIssueInput,
  buildRepoUrl,
  parseShorthandRepo,
  formatIssueIdentifier,
} from './url-parser';


describe('url-parser', () => {
  describe('parseGitHubUrl', () => {
    it('parses standard repo URL', () => {
      const result = parseGitHubUrl('https://github.com/facebook/react');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: undefined,
      });
    });

    it('parses repo URL with trailing slash', () => {
      const result = parseGitHubUrl('https://github.com/facebook/react/');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: undefined,
      });
    });

    it('parses repo URL with .git suffix', () => {
      const result = parseGitHubUrl('https://github.com/facebook/react.git');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: undefined,
      });
    });

    it('parses issue URL', () => {
      const result = parseGitHubUrl('https://github.com/facebook/react/issues/12345');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: 12345,
      });
    });

    it('parses pull request URL', () => {
      const result = parseGitHubUrl('https://github.com/facebook/react/pull/456');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: 456,
      });
    });

    it('returns null for non-github URLs', () => {
      expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(parseGitHubUrl('https://google.com')).toBeNull();
    });

    it('returns null for invalid URLs', () => {
      expect(parseGitHubUrl('not-a-url')).toBeNull();
      expect(parseGitHubUrl('https://github.com')).toBeNull();
      expect(parseGitHubUrl('https://github.com/onlyowner')).toBeNull();
    });
  });

  describe('parseShorthandRepo', () => {
    it('parses owner/repo format', () => {
      expect(parseShorthandRepo('facebook/react')).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: undefined,
      });
    });

    it('parses owner/repo#issue format', () => {
      expect(parseShorthandRepo('facebook/react#123')).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: 123,
      });
    });

    it('handles .git suffix in shorthand', () => {
      expect(parseShorthandRepo('facebook/react.git#123')).toEqual({
        owner: 'facebook',
        repo: 'react',
        issueNumber: 123,
      });
    });

    it('returns null for invalid shorthand', () => {
      expect(parseShorthandRepo('invalid')).toBeNull();
      expect(parseShorthandRepo('invalid/format/extra')).toBeNull();
    });
  });

  describe('parseIssueInput', () => {
    it('parses plain numbers', () => {
      expect(parseIssueInput('42')).toBe(42);
      expect(parseIssueInput('  123  ')).toBe(123);
    });

    it('parses #number format', () => {
      expect(parseIssueInput('#99')).toBe(99);
      expect(parseIssueInput('  #1024  ')).toBe(1024);
    });

    it('parses full issue URL', () => {
      expect(parseIssueInput('https://github.com/owner/repo/issues/777')).toBe(777);
    });

    it('parses full pull request URL', () => {
      expect(parseIssueInput('https://github.com/owner/repo/pull/888')).toBe(888);
    });

    it('parses shorthand owner/repo#issue format', () => {
      expect(parseIssueInput('facebook/react#999')).toBe(999);
    });

    it('returns null for invalid inputs', () => {
      expect(parseIssueInput('abc')).toBeNull();
      expect(parseIssueInput('-5')).toBeNull();
      expect(parseIssueInput('0')).toBeNull();
    });
  });

  describe('buildRepoUrl', () => {
    it('constructs canonical URL', () => {
      expect(buildRepoUrl('torvalds', 'linux')).toBe('https://github.com/torvalds/linux');
    });
  });

  describe('formatIssueIdentifier', () => {
    it('formats owner, repo, and issue into canonical shorthand', () => {
      expect(formatIssueIdentifier('facebook', 'react', 123)).toBe('facebook/react#123');
    });
  });
});
