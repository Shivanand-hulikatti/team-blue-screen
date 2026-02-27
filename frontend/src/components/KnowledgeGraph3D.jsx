import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { getProjectKnowledgeGraph } from '../api';
import './KnowledgeGraph3D.css';

const TYPE_COLORS = {
  project: '#f97316',
  document: '#22d3ee',
  entity: '#8b5cf6',
};

const LINK_COLORS = {
  contains: 'rgba(245, 158, 11, 0.55)',
  mentions: 'rgba(34, 211, 238, 0.44)',
  related: 'rgba(139, 92, 246, 0.56)',
};

function nodeSummary(node) {
  if (!node) return 'Click a node to inspect details.';
  if (node.type === 'project') return 'Root project node connecting all processed documents.';
  if (node.type === 'document') return 'Document node linked to the most relevant entities only.';
  return `Entity node · mentions: ${node.mentionCount || 0} · documents: ${node.docCount || 0}`;
}

function edgeCurve(link) {
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
  const seed = `${sourceId || ''}:${targetId || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const direction = hash % 2 === 0 ? 1 : -1;
  if (link.type === 'contains') return 0.05 * direction;
  if (link.type === 'mentions') return 0.1 * direction;
  return 0.16 * direction;
}

export default function KnowledgeGraph3D({ projectId, projectName }) {
  const fgRef = useRef(null);
  const mountRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 620 });
  const [graph, setGraph] = useState({ nodes: [], links: [], meta: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (mountRef.current) {
        setDimensions({
          width: mountRef.current.clientWidth,
          height: 620,
        });
      }
    });

    if (mountRef.current) {
      observer.observe(mountRef.current);
      setDimensions({
        width: mountRef.current.clientWidth,
        height: 620,
      });
    }

    return () => observer.disconnect();
  }, []);

  const fetchGraph = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProjectKnowledgeGraph(projectId);
      const data = response.data;
      setGraph({
        nodes: data.nodes || [],
        links: data.links || [],
        meta: data.meta || null,
      });
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate knowledge graph.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [projectId]);

  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force('charge').strength(-240);
    fgRef.current.d3Force('link').distance((link) => {
      if (link.type === 'contains') return 165;
      if (link.type === 'mentions') return 130;
      return 120;
    });

    const controls = fgRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
    }
  }, [graph.nodes.length, graph.links.length]);

  const graphData = useMemo(() => ({
    nodes: graph.nodes.map((node) => ({ ...node })),
    links: graph.links.map((link) => ({ ...link })),
  }), [graph]);

  const handleNodeClick = (node) => {
    setSelected(node);
    if (!fgRef.current) return;

    const distance = 110;
    const ratio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);

    fgRef.current.cameraPosition(
      { x: (node.x || 1) * ratio, y: (node.y || 1) * ratio, z: (node.z || 1) * ratio },
      node,
      900,
    );
  };

  return (
    <div className="graph-shell">
      <div className="graph-head">
        <div>
          <p className="graph-title">Knowledge Constellation</p>
          <p className="graph-subtitle">{projectName} · sparse project graph</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="graph-stats">
            <span className="graph-chip">{graph.meta?.documentCount || 0} docs</span>
            <span className="graph-chip">{graph.meta?.entityCount || 0} entities</span>
            <span className="graph-chip">{graph.meta?.linkCount || 0} links</span>
          </div>
          <button className="btn btn-ghost" onClick={fetchGraph} disabled={loading}>
            {loading ? 'Refreshing…' : 'Regenerate'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="graph-empty">{error}</div>
      ) : graphData.nodes.length <= 1 ? (
        <div className="graph-empty">Upload and process at least one document to generate a knowledge graph.</div>
      ) : (
        <div className="graph-body">
          <div ref={mountRef} className="graph-canvas">
            <ForceGraph3D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              backgroundColor="rgba(0,0,0,0)"
              cooldownTicks={120}
              nodeLabel={(node) => `${node.label} (${node.type})`}
              nodeRelSize={6}
              nodeColor={(node) => TYPE_COLORS[node.type] || '#ffffff'}
              nodeVal={(node) => node.val || 5}
              nodeThreeObject={(node) => {
                const color = TYPE_COLORS[node.type] || '#ffffff';
                const radius = node.type === 'project' ? 8.4 : node.type === 'document' ? 6.2 : 5.4;
                const group = new THREE.Group();

                const sphere = new THREE.Mesh(
                  new THREE.SphereGeometry(radius, 20, 20),
                  new THREE.MeshStandardMaterial({
                    color,
                    metalness: 0.15,
                    roughness: 0.35,
                    emissive: color,
                    emissiveIntensity: 0.16,
                  }),
                );

                const label = new SpriteText(node.label);
                label.color = '#e9ebff';
                label.textHeight = node.type === 'project' ? 5.6 : 4.4;
                label.backgroundColor = 'rgba(10, 11, 18, 0.62)';
                label.padding = 2;
                label.position.set(0, radius + 6, 0);

                group.add(sphere);
                group.add(label);
                return group;
              }}
              linkColor={(link) => LINK_COLORS[link.type] || 'rgba(255,255,255,0.35)'}
              linkWidth={(link) => {
                if (link.type === 'contains') return 0.45;
                return Math.min(1.25, 0.35 + (link.weight || 1) * 0.08);
              }}
              linkOpacity={0.92}
              linkCurvature={edgeCurve}
              linkCurveRotation={(link) => edgeCurve(link) > 0 ? 0.55 : -0.55}
              onNodeClick={handleNodeClick}
            />
          </div>

          <aside className="graph-sidebar">
            <p className="graph-panel-title">Node Types</p>
            <div className="graph-legend-item">
              <span className="graph-dot" style={{ background: TYPE_COLORS.project }} />
              Project
            </div>
            <div className="graph-legend-item">
              <span className="graph-dot" style={{ background: TYPE_COLORS.document }} />
              Document
            </div>
            <div className="graph-legend-item">
              <span className="graph-dot" style={{ background: TYPE_COLORS.entity }} />
              Entity
            </div>

            <p className="graph-panel-title" style={{ marginTop: 18 }}>Link Types</p>
            <div className="graph-legend-item">Contains · Project → Document</div>
            <div className="graph-legend-item">Mentions · Document → Entity</div>
            <div className="graph-legend-item">Related · Entity ↔ Entity</div>

            <div className="graph-selected">
              <h4>{selected?.label || 'Selection'}</h4>
              <p>{nodeSummary(selected)}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
