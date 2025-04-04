import React from 'react';
import Button from '../../../ui/Button';
import { GitHubCommitOptions } from '../types';

interface GitHubOptionsProps {
  options: GitHubCommitOptions;
  onOptionsChange: (options: GitHubCommitOptions) => void;
  onSave: () => void;
}

const GitHubOptions: React.FC<GitHubOptionsProps> = ({
  options,
  onOptionsChange,
  onSave
}) => {
  return (
    <div className="github-options">
      <h3>GitHub Options</h3>
      <div className="form-group">
        <label>Repository</label>
        <input
          type="text"
          value={options.repo}
          onChange={(e) => onOptionsChange({ ...options, repo: e.target.value })}
          placeholder="owner/repo"
        />
      </div>
      <div className="form-group">
        <label>Branch</label>
        <input
          type="text"
          value={options.branch}
          onChange={(e) => onOptionsChange({ ...options, branch: e.target.value })}
          placeholder="branch name"
        />
      </div>
      <div className="form-group">
        <label>Commit Message</label>
        <input
          type="text"
          value={options.message}
          onChange={(e) => onOptionsChange({ ...options, message: e.target.value })}
          placeholder="commit message"
        />
      </div>
      <div className="form-group">
        <label>File Path</label>
        <input
          type="text"
          value={options.filePath}
          onChange={(e) => onOptionsChange({ ...options, filePath: e.target.value })}
          placeholder="path/to/file.json"
        />
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={options.createPR}
            onChange={(e) => onOptionsChange({ ...options, createPR: e.target.checked })}
          />
          Create Pull Request
        </label>
      </div>
      {options.createPR && (
        <>
          <div className="form-group">
            <label>PR Title</label>
            <input
              type="text"
              value={options.prTitle}
              onChange={(e) => onOptionsChange({ ...options, prTitle: e.target.value })}
              placeholder="PR title"
            />
          </div>
          <div className="form-group">
            <label>PR Description</label>
            <textarea
              value={options.prDescription}
              onChange={(e) => onOptionsChange({ ...options, prDescription: e.target.value })}
              placeholder="PR description"
            />
          </div>
        </>
      )}
      <Button onClick={onSave}>Save to GitHub</Button>
    </div>
  );
};

export default GitHubOptions; 