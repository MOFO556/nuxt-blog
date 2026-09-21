export default defineTask({
  meta: { name: 'db:backup', description: 'Snapshot the SQLite file' },
  async run() {
    const stamp = new Date().toISOString().slice(0, 10)
    await useDb().$client.backup(`./.data/backups/stash-${stamp}.db`)
    return { result: 'ok' as const }
  },
});