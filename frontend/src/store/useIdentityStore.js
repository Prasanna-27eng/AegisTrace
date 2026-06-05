import { create } from 'zustand';

const useIdentityStore = create((set) => ({
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),

  riskFilter: 0,
  setRiskFilter: (v) => set({ riskFilter: v }),

  itdrAlerts: [],
  setITDRAlerts: (alerts) => set({ itdrAlerts: alerts }),

  shadowAIEvents: [],
  setShadowAIEvents: (events) => set({ shadowAIEvents: events }),
}));

export default useIdentityStore;
