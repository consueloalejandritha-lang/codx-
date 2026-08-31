import { useEffect, useRef, useState } from 'react';
import { softwareIconSheet, softwareTools } from '../data/software';
import { attachSoftwareLoop } from './softwareLoop';

function ToolIcons() {
  return softwareTools.map(tool => (
    <li key={tool.id} title={tool.name}>
      <svg className="software-icon" viewBox={tool.crop.join(' ')} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <image href={softwareIconSheet} width="1536" height="1024" />
      </svg>
      <span>{tool.name}</span>
    </li>
  ));
}

export default function SoftwareTools() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    if (viewportRef.current && listRef.current) return attachSoftwareLoop(viewportRef.current, listRef.current, setOverflow);
  }, []);
  return (
    <section className="software-strip" aria-labelledby="software-title">
      <div className="shell">
        <header className="software-heading">
          <h2 id="software-title">CREATIVE TOOLKIT <span>/ 创作工具</span></h2>
          <span>13 TOOLS · ONE WORKFLOW</span>
        </header>
        <div ref={viewportRef} className="software-scroll" tabIndex={0} role="region" aria-label="创作软件列表，可横向滚动">
          <div className="software-track">
            <ul ref={listRef} className="software-list"><ToolIcons /></ul>
            {overflow && <ul className="software-list software-loop-copy" aria-hidden="true"><ToolIcons /></ul>}
          </div>
        </div>
      </div>
    </section>
  );
}
