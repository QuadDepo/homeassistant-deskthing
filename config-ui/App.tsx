import { useEffect } from "react";
import { useConfigStore, useEnabledCount } from "./stores/configStore";
import EntityList from "./components/EntityList";

const App = () => {
  const loadData = useConfigStore((state) => state.loadData);
  const saveLayout = useConfigStore((state) => state.saveLayout);
  const isLoading = useConfigStore((state) => state.isLoading);
  const isSaving = useConfigStore((state) => state.isSaving);
  const isDirty = useConfigStore((state) => state.isDirty);
  const error = useConfigStore((state) => state.error);
  const enabledCount = useEnabledCount();

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Entity Configuration</h1>
            <p className="text-white/50 text-sm">
              {enabledCount > 0
                ? `${enabledCount} entities enabled - drag to reorder, click to toggle`
                : "Click the circle to enable entities for your DeskThing"}
            </p>
          </div>

          <button
            onClick={saveLayout}
            disabled={!isDirty || isSaving}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isDirty && !isSaving
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
          </div>
        ) : (
          <EntityList />
        )}
      </main>
    </div>
  );
};

export default App;
