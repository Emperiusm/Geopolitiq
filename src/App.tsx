import { useState, useCallback } from 'preact/hooks';
import { Globe } from './components/Globe';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import type { Country } from './data/countries';

export function App() {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const handleCountryClick = useCallback((country: Country) => {
    setSelectedCountry(country);
  }, []);

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
  }, []);

  return (
    <div class="app-layout">
      <Sidebar
        selectedCountry={selectedCountry}
        onCountrySelect={handleCountrySelect}
      />
      <div class="globe-container">
        <Globe
          onCountryClick={handleCountryClick}
          selectedCountry={selectedCountry}
        />
      </div>
      <RightPanel selectedCountry={selectedCountry} />
    </div>
  );
}
