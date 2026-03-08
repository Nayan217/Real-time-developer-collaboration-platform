export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  status: string;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  color: string;
  activeFile: string;
}

export interface OpenTab {
  id: string;
  path: string;
  name: string;
  isDirty: boolean;
  language: string;
}

export interface RoomFile {
  id: string;
  room_id: string;
  file_path: string;
  content: string;
  language: string;
  version: number;
  updated_at: string;
  github_sha?: string;
}

export interface RoomBranch {
  id: string;
  room_id: string;
  branch_name: string;
  last_commit_sha: string | null;
}
