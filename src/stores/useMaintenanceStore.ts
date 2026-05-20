import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MaintenanceState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isBypassed: boolean;
  setMaintenanceMode: (active: boolean, message?: string) => void;
  setBypassed: (bypassed: boolean) => void;
  toggleMaintenance: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set) => ({
      isMaintenanceMode: false,
      maintenanceMessage:
        "We are performing scheduled core upgrades to offer you a faster and smoother cinematic experience. Lenzorah will be back online shortly!",
      isBypassed: false,
      setMaintenanceMode: (active, message) =>
        set((state) => ({
          isMaintenanceMode: active,
          maintenanceMessage:
            message !== undefined ? message : state.maintenanceMessage,
        })),
      setBypassed: (bypassed) => set({ isBypassed: bypassed }),
      toggleMaintenance: () =>
        set((state) => ({ isMaintenanceMode: !state.isMaintenanceMode })),
    }),
    {
      name: "rf-maintenance",
    },
  ),
);
