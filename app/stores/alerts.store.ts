import { defineStore } from "pinia";

export const useAlertsStore = defineStore('AlertsStore', {
  state: (): { alerts: Alert[] } => ({
    alerts: []
  }),
  getters: {
  },
  actions: {
    addAlert(text: string, hideAfter?: number) {
      const id = this.alerts.length + 1;
      this.alerts.push({ id, text, hideAfter });
      if (!!hideAfter)
        setTimeout(() => this.removeAlert(id), hideAfter)
    },
    removeAlert(id: number) {
      const index = this.alerts.findIndex(a => a.id === id);
      if (index > -1)
        this.alerts.splice(index, 1);
    }
  }
});
