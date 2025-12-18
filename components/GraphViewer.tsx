
import React, { useEffect, useRef, useState } from 'react';
import { 
  select, 
  forceSimulation, 
  forceLink, 
  forceManyBody, 
  forceCenter, 
  forceCollide, 
  forceY,
  forceX,
  drag,
  zoom,
  zoomIdentity,
  ZoomBehavior
} from 'd3';
import { GraphData, GraphNode, NodeType } from '../types';

interface GraphViewerProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  width?: number; // Optional initial width
  height?: number; // Optional initial height
  className?: string; // Allow passing classes for layout
}

type LayoutMode = 'force' | 'hierarchical';

const GraphViewer: React.FC<GraphViewerProps> = ({ data, onNodeClick, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  
  // Store previous nodes to preserve positions during layout transitions
  const nodesRef = useRef<any[]>([]);

  // 1. Responsive Resizing Logic
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    // Initial measure
    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // 2. D3 Rendering Logic
  useEffect(() => {
    if (!svgRef.current || !zoomGroupRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const { width, height } = dimensions;
    const svg = select(svgRef.current);
    const g = select(zoomGroupRef.current);
    
    g.selectAll("*").remove(); 

    // Zoom Setup
    const zoomed = (event: any) => {
      g.attr("transform", event.transform);
    };

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", zoomed);
    
    zoomBehaviorRef.current = zoomBehavior;
    // Only bind zoom if it hasn't been bound, or just re-call to ensure updates? 
    // Usually calling it again is fine.
    svg.call(zoomBehavior);

    // -- Data Preparation with Position Persistence --
    // Map previous positions to new data to avoid "exploding" resets
    const nodeMap = new Map(nodesRef.current.map((n: any) => [n.id, n]));
    
    const nodes = data.nodes.map(d => {
      const existing = nodeMap.get(d.id);
      if (existing) {
        return { 
          ...d, 
          x: existing.x, 
          y: existing.y,
          vx: existing.vx,
          vy: existing.vy,
          fx: existing.fx,
          fy: existing.fy
        };
      }
      return { ...d }; // New nodes start undefined (D3 will init them)
    });
    
    const links = data.links.map(d => ({ ...d }));
    
    // Update ref for next render
    nodesRef.current = nodes;

    // -- Simulation Setup --
    const simulation = forceSimulation(nodes as any)
      .force("link", forceLink(links).id((d: any) => d.id).distance(layoutMode === 'hierarchical' ? 60 : 50))
      .force("charge", forceManyBody().strength(layoutMode === 'hierarchical' ? -200 : -120))
      .force("collide", forceCollide(30));

    if (layoutMode === 'force') {
      // Standard Force Directed
      simulation.force("center", forceCenter(width / 2, height / 2));
    } else {
      // Hierarchical Layout (Depts Top -> Scenes Middle -> Docs Bottom)
      const getLevelY = (node: any) => {
         const marginTop = height * 0.1;
         const availableHeight = height * 0.8;
         
         if (node.type === NodeType.DEPT) return marginTop;
         if (node.type === NodeType.SCENE) return marginTop + availableHeight * 0.4;
         // SOP and TABLE at bottom
         return marginTop + availableHeight * 0.9;
      };

      simulation
        .force("y", forceY(getLevelY).strength(1.5)) // Strong vertical pull
        .force("x", forceX(width / 2).strength(0.08)); // Weak horizontal centering to keep tree shape
    }

    // -- Render Links --
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    // Define Arrowhead
    const defs = svg.select('defs');
    if (defs.empty()) {
        svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#cbd5e1");
    }

    // Color Helper
    const color = (type: NodeType) => {
      switch (type) {
        case NodeType.SCENE: return "#3b82f6";
        case NodeType.SOP: return "#10b981";
        case NodeType.TABLE: return "#f59e0b";
        case NodeType.DEPT: return "#8b5cf6";
        default: return "#6b7280";
      }
    };

    // -- Render Nodes --
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("id", (d: any) => `node-${d.id}`)
      .attr("class", "node")
      .attr("cursor", "pointer")
      .on("click", (event, d) => onNodeClick(d as unknown as GraphNode))
      .on("mouseenter", function(event, d: any) {
          const currentNode = select(this);
          currentNode.raise(); // Bring to front

          currentNode.select("circle")
            .transition().duration(300)
            .attr("r", 30)
            .attr("stroke-width", 4)
            .attr("stroke", "#94a3b8");
            
          currentNode.select("text")
             .transition().duration(300)
             .style("font-size", "16px")
             .style("font-weight", "bold")
             .style("fill", "#1e293b");

          const connectedLinkNodes = links
            .filter((l: any) => l.source.id === d.id || l.target.id === d.id);
          const neighborIds = new Set(connectedLinkNodes.flatMap((l: any) => [l.source.id, l.target.id]));
          
          g.selectAll(".node").filter((n: any) => !neighborIds.has(n.id) && n.id !== d.id)
             .transition().duration(200)
             .style("opacity", 0.15);
             
          g.selectAll(".link").filter((l: any) => l.source.id !== d.id && l.target.id !== d.id)
             .transition().duration(200)
             .style("opacity", 0.05);

          g.selectAll(".link").filter((l: any) => l.source.id === d.id || l.target.id === d.id)
             .transition().duration(200)
             .attr("stroke", "#64748b")
             .attr("stroke-width", 2.5)
             .style("opacity", 1);
      })
      .on("mouseleave", function(event, d) {
          const currentNode = select(this);
          currentNode.select("circle")
            .transition().duration(300)
            .attr("r", 18)
            .attr("stroke-width", 2)
            .attr("stroke", "#fff");
            
          currentNode.select("text")
             .transition().duration(300)
             .style("font-size", "10px")
             .style("font-weight", "500")
             .style("fill", "#475569");

          g.selectAll(".node")
             .transition().duration(200)
             .style("opacity", 1);
             
          g.selectAll(".link")
             .transition().duration(200)
             .style("opacity", 1)
             .attr("stroke", "#cbd5e1")
             .attr("stroke-width", 1.5);
      })
      .call(drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append("circle")
      .attr("r", 18)
      .attr("fill", (d: any) => color(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "shadow-sm transition-all");

    node.append("text")
      .text((d: any) => d.name)
      .attr("x", 24)
      .attr("y", 4)
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("font-family", "sans-serif")
      .style("fill", "#475569")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.9)");

    node.append("text")
      .text((d: any) => {
        if (d.type === NodeType.SCENE) return "业";
        if (d.type === NodeType.SOP) return "文";
        if (d.type === NodeType.TABLE) return "表";
        if (d.type === NodeType.DEPT) return "部";
        return "?";
      })
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("font-size", "9px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, onNodeClick, layoutMode]); // Re-run when layoutMode changes

  // Actions
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
        select(svgRef.current).transition().call(zoomBehaviorRef.current.transform, zoomIdentity);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNode = nodesRef.current.find(n => n.name.includes(searchTerm));
    if (targetNode && svgRef.current && zoomBehaviorRef.current) {
        const svg = select(svgRef.current);
        const scale = 1.5;
        const x = -targetNode.x * scale + dimensions.width / 2;
        const y = -targetNode.y * scale + dimensions.height / 2;
        const transform = zoomIdentity.translate(x, y).scale(scale);

        svg.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
        
        const g = select(zoomGroupRef.current);
        const nodeSel = g.select(`#node-${targetNode.id}`);
        
        nodeSel.raise();
        nodeSel.select("circle")
           .transition().duration(500).attr("stroke", "#f59e0b").attr("stroke-width", 6).attr("r", 30)
           .transition().delay(1000).duration(500).attr("stroke", "#fff").attr("stroke-width", 2).attr("r", 18);
    }
  };

  return (
    <div ref={containerRef} className={`w-full h-full bg-[#f8fafc] relative overflow-hidden group ${className || ''}`}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} className="cursor-grab active:cursor-grabbing block">
         <defs></defs>
         <g ref={zoomGroupRef}></g>
      </svg>
      
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10">
        <form onSubmit={handleSearch} className="flex gap-2 bg-white/90 backdrop-blur p-1 rounded-lg shadow-md border border-gray-200">
           <input 
             type="text" 
             placeholder="搜索知识节点..." 
             className="bg-transparent text-sm px-2 py-1 outline-none w-32 md:w-40 text-gray-700"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           <button type="submit" className="text-blue-600 hover:bg-blue-50 p-1 rounded">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </button>
        </form>
      </div>

      {/* Controls Container */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-10">
        
        {/* Layout Switcher */}
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-md border border-gray-200 p-1 flex gap-1">
          <button 
            onClick={() => setLayoutMode('force')}
            className={`p-2 rounded text-xs font-medium transition flex items-center gap-1 ${layoutMode === 'force' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
            title="力导向布局 (Force-Directed)"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
             网状
          </button>
          <button 
            onClick={() => setLayoutMode('hierarchical')}
            className={`p-2 rounded text-xs font-medium transition flex items-center gap-1 ${layoutMode === 'hierarchical' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
            title="层级布局 (Hierarchical)"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             树状
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-md border border-gray-200 p-1 flex flex-col gap-2">
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 text-gray-600 rounded" title="放大">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 text-gray-600 rounded" title="缩小">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <button onClick={handleReset} className="p-2 hover:bg-gray-100 text-gray-600 rounded" title="复位">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GraphViewer;
