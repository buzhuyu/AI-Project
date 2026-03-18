const API_BASE_URL = '/api';

export interface CreateProjectParams {
  name: string;
  description?: string;
  novelType: string;
  targetWords: number;
  chapterCount: number;
  aiWriteCount?: number;
  background: any;
  powerSystem?: string;
  characterInfo?: string;
  plotOutline?: string;
  characters: any[];
  userId: string;
}

export const api = {
  updateProjectSettings: async (id: string, updates: any) => {
      // updates can contain { settings, name, description }
      const response = await fetch(`${API_BASE_URL}/projects/${id}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
      });
      return response.json();
  },

  getWorldview: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/worldview`);
      return response.json();
  },

  addWorldviewEntry: async (id: string, entry: any) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/worldview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
      });
      return response.json();
  },

  deleteWorldviewEntry: async (projectId: string, entryId: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/worldview/${entryId}`, {
          method: 'DELETE',
      });
      return response.json();
  },

  getPlotThreads: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/plot-threads`);
      return response.json();
  },

  addPlotThread: async (id: string, thread: any) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/plot-threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(thread),
      });
      return response.json();
  },

  updatePlotThread: async (projectId: string, threadId: string, updates: any) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/plot-threads/${threadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
      });
      return response.json();
  },

  deletePlotThread: async (projectId: string, threadId: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/plot-threads/${threadId}`, {
          method: 'DELETE',
      });
      return response.json();
  },

  startFullAnalysis: async (projectId: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analyze-all`, {
          method: 'POST',
      });
      return response.json();
  },

  stopFullAnalysis: async (projectId: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analyze-stop`, {
          method: 'POST',
      });
      return response.json();
  },

  getAnalysisProgress: async (projectId: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analysis-progress`);
      return response.json();
  },

  createProject: async (params: CreateProjectParams) => {
      const response = await fetch(`${API_BASE_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
      });
      return response.json();
  },

  importProject: async (name: string, content: string, userId: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content, userId }),
      });
      return response.json();
  },

  getProjects: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/projects?userId=${userId}`);
    return response.json();
  },

  getProject: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`);
    return response.json();
  },

  getChapter: async (id: string) => {
      // We need to implement this endpoint in backend or reuse existing query if flexible
      // For now let's add the endpoint in backend project routes
      const response = await fetch(`${API_BASE_URL}/chapters/${id}`);
      return response.json();
  },

  startProject: async (id: string, chapterNumber: number = 1) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNumber }),
    });
    return response.json();
  },

  startNextChapter: async (id: string, currentChapterNumber: number) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}/start-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentChapterNumber }),
    });
    return response.json();
  },

  stopProject: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/stop`, {
          method: 'POST',
      });
      return response.json();
  },

  deleteProject: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
          method: 'DELETE',
      });
      return response.json();
  },

  stopChapterGeneration: async (projectId: string, chapterNumber: number) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/chapters/${chapterNumber}/stop`, {
          method: 'POST',
      });
      return response.json();
  },

  continueChapterGeneration: async (projectId: string, chapterNumber: number, content: string, instruction?: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/chapters/${chapterNumber}/continue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, instruction }),
      });
      return response.json();
  },

  confirmChapter: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/chapters/${id}/confirm`, {
          method: 'POST',
      });
      return response.json();
  },

  updateChapter: async (id: string, content: string, title?: string) => {
      const body: any = { content };
      if (title !== undefined) body.title = title;
      const response = await fetch(`${API_BASE_URL}/chapters/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
      });
      return response.json();
  },

  proofreadChapter: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/chapters/${id}/proofread`, {
          method: 'POST',
      });
      return response.json();
  },

  getReviews: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/chapters/${id}/reviews`);
      return response.json();
  },

  login: async (username: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
      });
      return response.json();
  },

  checkAI: async () => {
      const response = await fetch(`${API_BASE_URL}/ai/status`);
      return response.json();
  },

  fetchArticleContent: async (url: string) => {
      const response = await fetch(`${API_BASE_URL}/ai/fetch-article`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
      });
      return response.json();
  }
};
