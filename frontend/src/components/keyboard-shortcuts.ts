import { useEffect } from 'preact/hooks';
import { toggleLayer, rightPanelOpen, selectCountry, sidebarOpen,
         newsPanelOpen, compareCountries, addToCompare, selectedCountry,
         selectedEntity, graphConnections, cycleBasemap } from '../state/store';
import { api } from '../api/client';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd/Ctrl+/ or Cmd/Ctrl+K — focus search
      if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key === 'k')) {
        e.preventDefault();
        const input = document.querySelector('input[type="text"]') as HTMLInputElement | null;
        if (input) input.focus();
        return;
      }

      switch (e.key) {
        case '1': toggleLayer('riskHeatmap'); break;
        case '2': toggleLayer('tradeRoutes'); break;
        case '3': toggleLayer('chokepoints'); break;
        case '4': toggleLayer('militaryBases'); break;
        case '5': toggleLayer('nsaZones'); break;
        case '6': toggleLayer('conflicts'); break;
        case '7': toggleLayer('elections'); break;

        case 'c':
        case 'C':
          if (compareCountries.value.length > 0) {
            compareCountries.value = [];
          } else if (selectedCountry.value) {
            addToCompare(selectedCountry.value);
          }
          break;

        case 't':
        case 'T':
          newsPanelOpen.value = !newsPanelOpen.value;
          break;

        case 'g':
        case 'G':
          if (graphConnections.value) {
            graphConnections.value = null;
          } else if (selectedEntity.value) {
            const entity = selectedEntity.value;
            api.graphConnections(`${entity.type}:${entity.id}`, 1)
              .then((data: any) => {
                graphConnections.value = { seed: entity, nodes: data.nodes || [], edges: data.edges || [] };
              })
              .catch(() => { /* silently fail */ });
          }
          break;

        case 'l':
        case 'L':
          sidebarOpen.value = !sidebarOpen.value;
          break;

        case 'b':
        case 'B':
          cycleBasemap();
          break;

        case 'Escape':
          rightPanelOpen.value = false;
          selectCountry(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
