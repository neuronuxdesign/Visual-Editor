import React from 'react';
import { GitHubCommitOptions } from '../types';

interface GitHubModalProps {
  isOpen: boolean;
  options: GitHubCommitOptions;
  onClose: () => void;
  onOptionsChange: (options: GitHubCommitOptions) => void;
  onSave: () => void;
}

const GitHubModal: React.FC<GitHubModalProps> = ({
  isOpen,
  options,
  onClose,
  onOptionsChange,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div className="github-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>GitHub Options</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

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

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="save-button" onClick={onSave}>Save to GitHub</button>
        </div>
      </div>
    </div>
  );
};

export default GitHubModal; 