import { func } from 'prop-types';
import React, { useMemo, useState, createContext } from 'react';
import { PreviewPane } from './EditableBlock.jsx';
function App() {
  return (
    <div className="App mt-3 h-full mix-blend-overlay">
      <PreviewPane />
    </div>
  );
}

export default App;
