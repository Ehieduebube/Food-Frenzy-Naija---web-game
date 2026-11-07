import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FoodFrenzyNaija } from './games/food-frenzy-naija';
import { createVatarPlatform } from './vatar/vatarPlatform';
import './main.css';

// LagosLife Games: index.html loads the Vatar SDK. Per the docs, Vatar.init() is called first,
// before the game renders. The game never waits for it, so it also plays on its own.
const platform = createVatarPlatform(window.Vatar);
void platform.connect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FoodFrenzyNaija platform={platform} />
  </StrictMode>,
);
