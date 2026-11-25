import { useState } from 'preact/hooks';
import { IslandLedgerSheet } from './components/deck/IslandLedgerSheet';
import { resolveInitialDate, resolveInitialMonth } from './components/deck/deckUtils';
import { HUD } from './components/header/HUD';
import { VoyageIntro } from './components/intro/VoyageIntro';
import { WorldMap, type MapScene } from './components/map/WorldMap';
import { Import2026Modal } from './components/modals/Import2026Modal';
import { SyncRoomModal } from './components/modals/SyncRoomModal';
import { useIponStore } from './store/useIponStore';
import type { DateKey, MonthNumber } from './types/ipon';
import { isValidDateKey, parseDateKey, toDateKey } from './utils/calendar2026';

/**
 * Midnight Grand Line — Interactive 4-Scene Flow:
 * - Scene 1: Voyage Launch (2.0s Thousand Sunny intro + Skip →)
 * - Scene 2: Midnight World Chart centered on the Red Line
 * - Scene 3: Vertical 12-Island Grand Line Journey (Jan–Dec)
 * - Scene 4: Island Ledger Sheet (Split-Coin Calendar, Nami Arrears, Robin Logbook)
 */
export function App() {
  const store = useIponStore();
  const today = store.today.value;

  const [introDone, setIntroDone] = useState(false);
  const [mapScene, setMapScene] = useState<MapScene>('world');
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const [activeMonth, setActiveMonth] = useState<MonthNumber>(() => resolveInitialMonth(today));
  const [selectedDate, setSelectedDate] = useState<DateKey>(() => resolveInitialDate(today));

  const [syncOpen, setSyncOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const selectMonth = (month: MonthNumber) => {
    setActiveMonth(month);
    if (isValidDateKey(today) && parseDateKey(today).month === month) {
      setSelectedDate(today);
    } else {
      setSelectedDate(toDateKey(month, 1));
    }
  };

  const handleSelectIsland = (month: MonthNumber) => {
    selectMonth(month);
    setLedgerOpen(true);
  };

  const handleSelectDate = (key: DateKey) => {
    setSelectedDate(key);
    const { month } = parseDateKey(key);
    if (month !== activeMonth) setActiveMonth(month);
  };

  const handleOpenTodaySheet = () => {
    const targetMonth = resolveInitialMonth(today);
    const targetDate = resolveInitialDate(today);
    setActiveMonth(targetMonth);
    setSelectedDate(targetDate);
    setMapScene('grandline');
    setLedgerOpen(true);
  };

  return (
    <div class="min-h-dvh flex flex-col bg-sea-abyss text-ink-ivory overflow-x-hidden">
      {/* Scene 1: Voyage Launch */}
      {!introDone && <VoyageIntro onComplete={() => setIntroDone(true)} />}

      {/* Top Safe-Area HUD & Floating 'Today's Log Pose' Dock */}
      <HUD
        store={store}
        onOpenSync={() => setSyncOpen(true)}
        onOpenImport={() => setImportOpen(true)}
        onOpenTodaySheet={handleOpenTodaySheet}
      />

      {/* Scene 2 & 3: Midnight World Chart & 12-Island Grand Line Journey */}
      <main class="flex-1 flex flex-col">
        <WorldMap
          store={store}
          scene={mapScene}
          activeMonth={activeMonth}
          onEnterGrandLine={() => setMapScene('grandline')}
          onReturnToWorld={() => setMapScene('world')}
          onSelectIsland={handleSelectIsland}
        />
      </main>

      {/* Scene 4: Island Ledger Sheet */}
      <IslandLedgerSheet
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        store={store}
        activeMonth={activeMonth}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onSelectMonth={selectMonth}
      />

      {/* Utility Modals (Midnight Grand Line themed) */}
      <SyncRoomModal open={syncOpen} onClose={() => setSyncOpen(false)} store={store} />
      <Import2026Modal open={importOpen} onClose={() => setImportOpen(false)} store={store} />
    </div>
  );
}
