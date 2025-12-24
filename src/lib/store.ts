import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { 
  TrackingPackage, 
  UserPreferences, 
  TrackingStatus
} from "./types";

interface PackageStore {
  packages: TrackingPackage[];
  selectedIds: string[];
  searchQuery: string;
  statusFilter: TrackingStatus | "all";
  carrierFilter: string | "all";
  tagFilter: string | "all";
  showArchived: boolean;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  
  addPackage: (pkg: TrackingPackage) => void;
  updatePackage: (id: string, updates: Partial<TrackingPackage>) => void;
  deletePackage: (id: string) => void;
  archivePackage: (id: string) => void;
  restorePackage: (id: string) => void;
  
  selectPackage: (id: string) => void;
  deselectPackage: (id: string) => void;
  toggleSelectPackage: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: TrackingStatus | "all") => void;
  setCarrierFilter: (carrier: string | "all") => void;
  setTagFilter: (tag: string | "all") => void;
  setShowArchived: (show: boolean) => void;
  clearFilters: () => void;
  
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  
  getFilteredPackages: () => TrackingPackage[];
  getPackageById: (id: string) => TrackingPackage | undefined;
  getPackageByTrackingNumber: (trackingNumber: string) => TrackingPackage | undefined;
  getAllTags: () => string[];
  getAllCarriers: () => string[];
}

export const usePackageStore = create<PackageStore>()(
  persist(
    (set, get) => ({
      packages: [],
      selectedIds: [],
      searchQuery: "",
      statusFilter: "all",
      carrierFilter: "all",
      tagFilter: "all",
      showArchived: false,
      isSidebarOpen: true,
      isCommandPaletteOpen: false,
      
      addPackage: (pkg) => set((state) => ({ 
        packages: [pkg, ...state.packages] 
      })),
      
      updatePackage: (id, updates) => set((state) => ({
        packages: state.packages.map((pkg) =>
          pkg.id === id ? { ...pkg, ...updates, updatedAt: new Date().toISOString() } : pkg
        ),
      })),
      
      deletePackage: (id) => set((state) => ({
        packages: state.packages.filter((pkg) => pkg.id !== id),
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
      })),
      
      archivePackage: (id) => set((state) => ({
        packages: state.packages.map((pkg) =>
          pkg.id === id ? { ...pkg, isArchived: true, updatedAt: new Date().toISOString() } : pkg
        ),
      })),
      
      restorePackage: (id) => set((state) => ({
        packages: state.packages.map((pkg) =>
          pkg.id === id ? { ...pkg, isArchived: false, updatedAt: new Date().toISOString() } : pkg
        ),
      })),
      
      selectPackage: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id) 
          ? state.selectedIds 
          : [...state.selectedIds, id],
      })),
      
      deselectPackage: (id) => set((state) => ({
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
      })),
      
      toggleSelectPackage: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      })),
      
      selectAll: () => set(() => ({
        selectedIds: get().getFilteredPackages().map((pkg) => pkg.id),
      })),
      
      deselectAll: () => set({ selectedIds: [] }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      setCarrierFilter: (carrier) => set({ carrierFilter: carrier }),
      setTagFilter: (tag) => set({ tagFilter: tag }),
      setShowArchived: (show) => set({ showArchived: show }),
      clearFilters: () => set({ 
        searchQuery: "", 
        statusFilter: "all", 
        carrierFilter: "all",
        tagFilter: "all",
        showArchived: false,
      }),
      
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      
      getFilteredPackages: () => {
        const state = get();
        let filtered = state.showArchived 
          ? state.packages.filter((pkg) => pkg.isArchived)
          : state.packages.filter((pkg) => !pkg.isArchived);
        
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (pkg) =>
              pkg.trackingNumber.toLowerCase().includes(query) ||
              pkg.merchantName?.toLowerCase().includes(query) ||
              pkg.itemDescription?.toLowerCase().includes(query) ||
              pkg.carrierName.toLowerCase().includes(query)
          );
        }
        
        if (state.statusFilter !== "all") {
          filtered = filtered.filter((pkg) => pkg.status === state.statusFilter);
        }
        
        if (state.carrierFilter !== "all") {
          filtered = filtered.filter((pkg) => pkg.carrier === state.carrierFilter);
        }
        
        if (state.tagFilter !== "all") {
          filtered = filtered.filter((pkg) => pkg.tags.includes(state.tagFilter));
        }
        
        return filtered;
      },
      
      getPackageById: (id) => get().packages.find((pkg) => pkg.id === id),
      
      getPackageByTrackingNumber: (trackingNumber) => 
        get().packages.find((pkg) => pkg.trackingNumber.toUpperCase() === trackingNumber.toUpperCase()),
      
      getAllTags: () => {
        const tags = new Set<string>();
        get().packages.forEach((pkg) => pkg.tags.forEach((tag) => tags.add(tag)));
        return Array.from(tags).sort();
      },
      
      getAllCarriers: () => {
        const carriers = new Set<string>();
        get().packages.forEach((pkg) => carriers.add(pkg.carrier));
        return Array.from(carriers).sort();
      },
    }),
    {
      name: "parcel-ai-packages",
      partialize: (state) => ({ packages: state.packages }),
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await idbGet(name);
          return value ?? null;
        },
        setItem: async (name, value) => {
          await idbSet(name, value);
        },
        removeItem: async (name) => {
          await idbDel(name);
        },
      })),
    }
  )
);

interface PreferencesStore {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: "system",
  defaultView: "compact",
  notificationsEnabled: false,
  notifyOnExceptionsOnly: true,
  emailAlertsEnabled: false,
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      
      setPreference: (key, value) => set((state) => ({
        preferences: { ...state.preferences, [key]: value },
      })),
      
      resetPreferences: () => set({ preferences: defaultPreferences }),
    }),
    {
      name: "parcel-ai-preferences",
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await idbGet(name);
          return value ?? null;
        },
        setItem: async (name, value) => {
          await idbSet(name, value);
        },
        removeItem: async (name) => {
          await idbDel(name);
        },
      })),
    }
  )
);
