import { create } from 'zustand';

const useConnectorStore = create((set) => ({
  connectors: [],
  setConnectors: (connectors) => set({ connectors }),

  approvedAI: [],
  setApprovedAI: (services) => set({ approvedAI: services }),

  healthStatus: null,
  setHealthStatus: (status) => set({ healthStatus: status }),
}));

export default useConnectorStore;
