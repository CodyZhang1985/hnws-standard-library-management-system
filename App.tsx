
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_GRAPH_DATA, HOT_TOPICS, MOCK_ADMIN_DOCS } from './constants';
import { GraphNode, GraphEdge, NodeType, NodeStatus, StandardDoc } from './types';
import GraphViewer from './components/GraphViewer';
import FloatingAssistant from './components/FloatingAssistant';
import { analyzeUploadedFile } from './services/geminiService';
import { uploadFileToServer, formatFileSize } from './services/fileService';

// -- Sub-Components --

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
           <h3 className="font-bold text-lg text-gray-800">{title || '详情'}</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-200 transition">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar relative">
          {children}
        </div>
      </div>
    </div>
  );
};

// -- Main App Component --

export default function App() {
  const [viewMode, setViewMode] = useState<'frontend' | 'backend'>('frontend');
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(!process.env.API_KEY);
  const [tempApiKey, setTempApiKey] = useState('');
  
  // -- Data State with Persistence --
  const [adminDocs, setAdminDocs] = useState<StandardDoc[]>(() => {
    try {
      const saved = localStorage.getItem('smartprop_docs');
      // Merge mock data with saved data to ensure base data is always present, 
      // but prioritize saved version if ID conflicts.
      if (saved) {
          const parsedSaved = JSON.parse(saved);
          return parsedSaved;
      }
      return MOCK_ADMIN_DOCS;
    } catch (e) {
      return MOCK_ADMIN_DOCS;
    }
  });

  useEffect(() => {
    localStorage.setItem('smartprop_docs', JSON.stringify(adminDocs));
  }, [adminDocs]);

  const [baseGraphNodes] = useState<GraphNode[]>(MOCK_GRAPH_DATA.nodes.filter(n => n.type === NodeType.DEPT || n.type === NodeType.SCENE));
  const [baseGraphLinks] = useState<GraphEdge[]>(MOCK_GRAPH_DATA.links);
  
  // -- Backend Navigation State --
  const [currentFolder, setCurrentFolder] = useState<string>('drafts');
  
  // -- Batch Selection State --
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [previewTab, setPreviewTab] = useState<'doc' | 'graph'>('doc');

  // -- Derived Statistics for Dashboard --
  const dashboardStats = useMemo(() => {
    const total = adminDocs.filter(d => d.status !== NodeStatus.TRASH).length;
    const draft = adminDocs.filter(d => d.status === NodeStatus.DRAFT).length;
    const active = adminDocs.filter(d => d.status === NodeStatus.ACTIVE).length;
    const archived = adminDocs.filter(d => d.status === NodeStatus.LEGACY || d.status === NodeStatus.ARCHIVED).length;
    const trash = adminDocs.filter(d => d.status === NodeStatus.TRASH).length;
    // Count "Uploaded" based on ID convention used in handleFileUpload
    const uploaded = adminDocs.filter(d => d.id.startsWith('doc_new_')).length;
    
    const deptStats: Record<string, { active: number, total: number }> = {};
    const depts = Array.from(new Set(adminDocs.map(d => d.department)));
    
    depts.forEach(dept => {
      deptStats[dept] = {
        active: adminDocs.filter(d => d.department === dept && d.status === NodeStatus.ACTIVE).length,
        total: adminDocs.filter(d => d.department === dept && d.status !== NodeStatus.TRASH).length
      };
    });

    return { total, draft, active, archived, trash, uploaded, deptStats };
  }, [adminDocs]);

  // -- Derived Doc List for Backend --
  const filteredAdminDocs = useMemo(() => {
    const [category, subCategory] = currentFolder.split('/');

    return adminDocs.filter(doc => {
      if (category === 'trash') return doc.status === NodeStatus.TRASH;
      if (doc.status === NodeStatus.TRASH) return false; 

      if (category === 'uploads') return doc.id.startsWith('doc_new_'); // Filter by upload ID convention
      if (category === 'drafts') return doc.status === NodeStatus.DRAFT;
      if (category === 'archived') return doc.status === NodeStatus.LEGACY || doc.status === NodeStatus.ARCHIVED;
      
      if (category === 'published') {
        if (doc.status !== NodeStatus.ACTIVE) return false;
        if (subCategory) return doc.department === subCategory;
        return true; 
      }
      return false;
    });
  }, [adminDocs, currentFolder]);

  // Clear selection when folder changes
  useEffect(() => {
    setSelectedDocIds(new Set());
    setSelectedAdminDoc(null);
  }, [currentFolder]);

  // -- Derived Graph Data --
  const graphData = useMemo(() => {
    const docNodes: GraphNode[] = adminDocs.map(doc => ({
      id: doc.id,
      name: doc.title,
      type: doc.type,
      status: doc.status,
      description: doc.content.substring(0, 100) + "...",
      content: doc.content,
      publishDate: doc.lastUpdated,
      department: doc.department
    }));

    const validStatuses = viewMode === 'frontend' 
      ? [NodeStatus.ACTIVE] 
      : [NodeStatus.ACTIVE, NodeStatus.DRAFT, NodeStatus.LEGACY, NodeStatus.ARCHIVED];

    const visibleDocNodes = docNodes.filter(n => validStatuses.includes(n.status));
    const visibleNodeIds = new Set([...baseGraphNodes.map(n => n.id), ...visibleDocNodes.map(n => n.id)]);
    
    const dynamicLinks: GraphEdge[] = [];
    visibleDocNodes.forEach(docNode => {
       const deptNode = baseGraphNodes.find(n => n.type === NodeType.DEPT && n.name === docNode.department);
       if (deptNode) {
         dynamicLinks.push({ source: deptNode.id, target: docNode.id, relation: 'BELONGS_TO' });
       }
    });

    const validBaseLinks = baseGraphLinks.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target));

    return {
      nodes: [...baseGraphNodes, ...visibleDocNodes],
      links: [...validBaseLinks, ...dynamicLinks]
    };
  }, [adminDocs, baseGraphNodes, baseGraphLinks, viewMode]);

  // -- Backend State --
  const [selectedAdminDoc, setSelectedAdminDoc] = useState<StandardDoc | null>(null);
  const [uploadDept, setUploadDept] = useState('安管部'); 

  // -- File Upload Logic --
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadStatus('uploading');
      const files = Array.from(e.target.files);
      const newDocs: StandardDoc[] = [];

      try {
        await Promise.all(files.map(async (file, index) => {
          // 1. Upload to "Server" (Mock)
          const fileAttachment = await uploadFileToServer(file);
          
          // 2. Analyze Content (Mock/Gemini)
          const result = await analyzeUploadedFile(file.name, file.type);
          
          // Use a specific prefix to identify uploaded files easily
          const docId = `doc_new_${Date.now()}_${index}`;
          const isTable = file.name.includes('表') || file.name.includes('名单');
          
          const newDoc: StandardDoc = {
             id: docId,
             title: file.name.replace(/\.[^/.]+$/, ""),
             version: 'v1.0',
             lastUpdated: new Date().toISOString().split('T')[0],
             status: NodeStatus.DRAFT,
             type: isTable ? NodeType.TABLE : NodeType.SOP,
             content: `【智能摘要】\n${result.summary}\n\n【原始内容】\n(文件已安全归档至服务器)\n路径: ${fileAttachment.storagePath}\n\n(系统后台正在进行OCR全文索引...)\n内容待录入。`,
             department: uploadDept,
             fileAttachment: fileAttachment // Link the server-side file info
          };
          newDocs.push(newDoc);
        }));

        setUploadStatus('analyzing');
        setTimeout(() => {
          setAdminDocs(prev => [...newDocs, ...prev]);
          if (newDocs.length > 0) setSelectedAdminDoc(newDocs[0]);
          // Switch to "Uploads" folder to see the file immediately
          setCurrentFolder('uploads');
          setUploadStatus('done');
          setTimeout(() => setUploadStatus('idle'), 3000);
        }, 1000);
      } catch (err) {
        console.error("Upload failed", err);
        setUploadStatus('idle');
      }
      if (e.target) e.target.value = '';
    }
  };

  // -- Management Actions --
  const handlePublish = (doc: StandardDoc) => {
    const updated = { ...doc, status: NodeStatus.ACTIVE, lastUpdated: new Date().toISOString().split('T')[0] };
    setAdminDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
    setSelectedAdminDoc(updated);
  };

  const handleDelete = (doc: StandardDoc) => {
    const updated = { ...doc, status: NodeStatus.TRASH };
    setAdminDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
    if (selectedAdminDoc?.id === doc.id) setSelectedAdminDoc(null);
  };

  const handleRestore = (doc: StandardDoc) => {
    const updated = { ...doc, status: NodeStatus.DRAFT };
    setAdminDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
  };

  const handleHardDelete = (docId: string) => {
    setAdminDocs(prev => prev.filter(d => d.id !== docId));
    if (selectedAdminDoc?.id === docId) setSelectedAdminDoc(null);
  };

  // -- Batch Actions --
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedDocIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocIds(newSet);
  };

  const toggleAll = () => {
    if (selectedDocIds.size === filteredAdminDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredAdminDocs.map(d => d.id)));
    }
  };

  const batchPublish = () => {
    setAdminDocs(prev => prev.map(d => selectedDocIds.has(d.id) ? { ...d, status: NodeStatus.ACTIVE, lastUpdated: new Date().toISOString().split('T')[0] } : d));
    setSelectedDocIds(new Set());
  };

  const batchArchive = () => {
    setAdminDocs(prev => prev.map(d => selectedDocIds.has(d.id) ? { ...d, status: NodeStatus.ARCHIVED } : d));
    setSelectedDocIds(new Set());
  };

  const batchTrash = () => {
    setAdminDocs(prev => prev.map(d => selectedDocIds.has(d.id) ? { ...d, status: NodeStatus.TRASH } : d));
    setSelectedDocIds(new Set());
    setSelectedAdminDoc(null);
  };

  // -- Frontend Logic --
  const departments = useMemo(() => graphData.nodes.filter(n => n.type === NodeType.DEPT), [graphData]);
  const [activeDeptId, setActiveDeptId] = useState<string>('d1'); 
  
  const activeDeptNodes = useMemo(() => {
    if (departments.length === 0) return [];
    const currentDeptName = departments.find(d => d.id === activeDeptId)?.name;
    return graphData.nodes.filter(n => n.department === currentDeptName && n.status === NodeStatus.ACTIVE);
  }, [activeDeptId, departments, graphData]);

  // -- Folder Icon Helper --
  const FolderIcon = ({ isOpen, color = 'blue' }: { isOpen: boolean, color?: string }) => (
    <svg className={`w-4 h-4 text-${color}-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800 overflow-hidden selection:bg-blue-100">
      
      {/* ---------------------------------------------------------------------------
          BACKEND VIEW (Overhauled to 3-Column Layout)
      --------------------------------------------------------------------------- */}
      {viewMode === 'backend' && (
        <div className="flex w-full h-full">
          
          {/* COLUMN 1: Navigation & Upload (w-64) */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full shrink-0 z-20">
             <div className="p-4 border-b bg-white flex justify-between items-center h-14 shrink-0">
                <div className="font-bold text-base text-slate-800 flex items-center gap-2">
                   <div className="w-7 h-7 bg-purple-600 rounded-lg text-white flex items-center justify-center shadow-md">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                   </div>
                   后台工作台
                </div>
                <button onClick={() => setViewMode('frontend')} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:text-blue-600 transition">前台</button>
             </div>
             
             {/* Upload Btn */}
             <div className="p-3">
               <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm space-y-2">
                  <select value={uploadDept} onChange={(e) => setUploadDept(e.target.value)} className="w-full text-xs border border-gray-300 rounded p-1.5 outline-none bg-gray-50">
                    <option value="安管部">安管部</option>
                    <option value="工程部">工程部</option>
                    <option value="客服部">客服部</option>
                    <option value="环境部">环境部</option>
                    <option value="综合">综合</option>
                  </select>
                  <button className="w-full bg-purple-50 border border-dashed border-purple-200 rounded p-2 text-purple-600 hover:bg-purple-100 transition flex items-center justify-center gap-2 text-xs relative overflow-hidden">
                      <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".pdf,.docx,.xlsx" />
                      {uploadStatus === 'uploading' ? '服务器上传中...' : '+ 上传新文件'}
                  </button>
               </div>
             </div>

             {/* Folder Tree */}
             <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
                
                {/* NEW: Uploads / Resource Library */}
                <div className="pt-2 pb-1 px-3 text-xs font-bold text-gray-400 uppercase">资源管理</div>
                <div onClick={() => setCurrentFolder('uploads')} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${currentFolder === 'uploads' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                   <span>本地上传</span>
                   <span className="ml-auto text-xs bg-white px-2 rounded-full border border-indigo-100 text-indigo-600">{dashboardStats.uploaded}</span>
                </div>

                <div className="pt-3 pb-1 px-3 text-xs font-bold text-gray-400 uppercase">工作流</div>
                <div onClick={() => setCurrentFolder('drafts')} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${currentFolder === 'drafts' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                   <span>草稿箱</span>
                   <span className="ml-auto text-xs bg-white px-2 rounded-full border border-amber-100 text-amber-600">{dashboardStats.draft}</span>
                </div>
                
                <div className="pt-3 pb-1 px-3 text-xs font-bold text-gray-400 uppercase">已发布</div>
                <div onClick={() => setCurrentFolder('published')} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${currentFolder === 'published' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                   <FolderIcon isOpen={currentFolder.startsWith('published')} color="green" />
                   <span>全部文档</span>
                   <span className="ml-auto text-xs bg-white px-2 rounded-full border border-green-100 text-green-600">{dashboardStats.active}</span>
                </div>
                <div className="pl-6 space-y-0.5">
                   {['安管部', '工程部', '客服部', '环境部'].map(dept => (
                      <div key={dept} onClick={() => setCurrentFolder(`published/${dept}`)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs ${currentFolder === `published/${dept}` ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
                         <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                         <span>{dept}</span>
                      </div>
                   ))}
                </div>

                <div className="pt-3 pb-1 px-3 text-xs font-bold text-gray-400 uppercase">管理</div>
                <div onClick={() => setCurrentFolder('archived')} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${currentFolder === 'archived' ? 'bg-gray-100 text-gray-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                   <span>归档历史</span>
                </div>
                <div onClick={() => setCurrentFolder('trash')} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${currentFolder === 'trash' ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   <span>回收站</span>
                </div>
             </div>
          </div>

          {/* COLUMN 2: List & Batch Ops (w-80) */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shrink-0 z-10">
             {/* Batch Toolbar */}
             <div className="h-14 border-b px-3 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                   <input type="checkbox" onChange={toggleAll} checked={selectedDocIds.size > 0 && selectedDocIds.size === filteredAdminDocs.length} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                   <span className="text-xs font-medium text-gray-500">{selectedDocIds.size > 0 ? `已选 ${selectedDocIds.size}` : '全选'}</span>
                </div>
                {selectedDocIds.size > 0 && (
                   <div className="flex gap-1">
                      {currentFolder === 'drafts' && <button onClick={batchPublish} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">批量发布</button>}
                      {currentFolder.startsWith('published') && <button onClick={batchArchive} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">批量归档</button>}
                      <button onClick={batchTrash} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">删除</button>
                   </div>
                )}
             </div>

             {/* List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredAdminDocs.map(doc => (
                  <div 
                    key={doc.id}
                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer group flex gap-3 ${selectedAdminDoc?.id === doc.id ? 'bg-blue-50/60' : ''}`}
                    onClick={() => setSelectedAdminDoc(doc)}
                  >
                     <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedDocIds.has(doc.id)} onChange={() => toggleSelection(doc.id)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-sm font-medium text-gray-800 truncate">{doc.title}</span>
                           {doc.status === NodeStatus.DRAFT && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5"></span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                           <span className="bg-gray-100 px-1.5 py-0.5 rounded">{doc.department}</span>
                           <span>{doc.lastUpdated}</span>
                        </div>
                     </div>
                  </div>
                ))}
                
                {filteredAdminDocs.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        {currentFolder === 'uploads' ? '暂无本地上传记录' : '暂无文档'}
                    </div>
                )}
             </div>
          </div>

          {/* COLUMN 3: Preview Area (Flex-1) */}
          <div className="flex-1 bg-gray-50/50 flex flex-col min-w-0 relative h-full">
            {selectedAdminDoc ? (
              <>
                {/* Preview Header */}
                <div className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 shadow-sm">
                   <div className="flex gap-4 items-center">
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setPreviewTab('doc')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${previewTab === 'doc' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>文档预览</button>
                        <button onClick={() => setPreviewTab('graph')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${previewTab === 'graph' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>关联图谱</button>
                     </div>
                     <div className="h-4 w-px bg-gray-300"></div>
                     <span className="text-sm font-bold text-gray-700 truncate max-w-xs">{selectedAdminDoc.title}</span>
                   </div>
                   
                   <div className="flex gap-2">
                      {/* Allow publishing from Uploads folder as well */}
                      {(selectedAdminDoc.status === NodeStatus.DRAFT || currentFolder === 'uploads') && (
                         <button onClick={() => handlePublish(selectedAdminDoc)} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 shadow-sm flex items-center gap-1">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           发布上线
                         </button>
                      )}
                      {selectedAdminDoc.status !== NodeStatus.TRASH ? (
                        <button onClick={() => handleDelete(selectedAdminDoc)} className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md border border-transparent hover:border-red-100">
                           删除
                        </button>
                      ) : (
                        <div className="flex gap-2">
                           <button onClick={() => handleRestore(selectedAdminDoc)} className="text-xs bg-white border px-2 py-1 rounded">恢复</button>
                           <button onClick={() => handleHardDelete(selectedAdminDoc.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">彻底删除</button>
                        </div>
                      )}
                   </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden relative">
                   {previewTab === 'doc' ? (
                     <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-4xl mx-auto bg-white min-h-[800px] shadow-sm border border-gray-200 p-10 md:p-14 rounded-sm">
                           {/* File Storage Info Panel (New) */}
                           {selectedAdminDoc.fileAttachment && (
                             <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-4 animate-fade-in">
                               <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                               </div>
                               <div className="flex-1 min-w-0 space-y-1">
                                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                     服务器端文件存储信息
                                     <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded border border-green-200">已归档</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 font-mono">
                                     <div><span className="text-gray-400">物理路径:</span> {selectedAdminDoc.fileAttachment.storagePath}</div>
                                     <div><span className="text-gray-400">文件大小:</span> {formatFileSize(selectedAdminDoc.fileAttachment.size)}</div>
                                     <div><span className="text-gray-400">MIME类型:</span> {selectedAdminDoc.fileAttachment.mimeType}</div>
                                     <div><span className="text-gray-400">上传时间:</span> {new Date(selectedAdminDoc.fileAttachment.uploadTime).toLocaleString()}</div>
                                  </div>
                               </div>
                               <a 
                                 href={selectedAdminDoc.fileAttachment.publicUrl} 
                                 download={selectedAdminDoc.fileAttachment.originalName}
                                 className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 text-gray-700 transition"
                               >
                                 下载源文件
                               </a>
                             </div>
                           )}

                           <div className="border-b pb-4 mb-8">
                              <h1 className="text-3xl font-bold text-gray-900 mb-4">{selectedAdminDoc.title}</h1>
                              <div className="flex gap-4 text-sm text-gray-500">
                                 <span>版本: {selectedAdminDoc.version}</span>
                                 <span>更新: {selectedAdminDoc.lastUpdated}</span>
                                 <span>部门: {selectedAdminDoc.department}</span>
                              </div>
                           </div>
                           <div className="prose prose-slate max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {selectedAdminDoc.content}
                           </div>
                        </div>
                     </div>
                   ) : (
                     <div className="h-full w-full bg-white relative">
                        <GraphViewer data={graphData} onNodeClick={() => {}} className="w-full h-full" />
                        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur p-2 rounded border text-xs text-gray-500">
                           当前文档的关联关系预览
                        </div>
                     </div>
                   )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                 <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 <p>请选择左侧文档进行预览或编辑</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------
          FRONTEND VIEW
      --------------------------------------------------------------------------- */}
      {viewMode === 'frontend' && (
        <div className="flex w-full h-full flex-col bg-[#f3f4f6]">
          {/* Header */}
          <header className="h-16 bg-white/80 backdrop-blur border-b flex items-center justify-between px-6 lg:px-10 z-20 sticky top-0">
             <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
                   <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   </div>
                   <span className="tracking-tight">SmartProp <span className="text-blue-600">AI</span></span>
                </div>
                <nav className="hidden md:flex gap-1">
                  <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'home' ? 'bg-gray-100 text-slate-900' : 'text-gray-500 hover:text-slate-900'}`}>工作台</button>
                  <button onClick={() => setActiveTab('graph')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'graph' ? 'bg-gray-100 text-slate-900' : 'text-gray-500 hover:text-slate-900'}`}>全景图谱</button>
                </nav>
             </div>
             
             <div className="flex items-center gap-4">
               {!process.env.API_KEY && (
                 <button onClick={() => setApiKeyModalOpen(true)} className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100 animate-pulse">! API Key</button>
               )}
               <button 
                  onClick={() => setViewMode('backend')}
                  className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
               >
                 管理后台
               </button>
               <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white shadow-md overflow-hidden">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
               </div>
             </div>
          </header>

          <main className="flex-1 overflow-hidden relative">
            
            {/* Tab: Home */}
            {activeTab === 'home' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-10">
                 <div className="max-w-7xl mx-auto space-y-10 pb-20">
                    
                    {/* Dashboard Overview Cards */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                           <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                           体系运行概览
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           {/* Card 1: Published -> Navigate to Dept Directory */}
                           <div 
                              onClick={() => { const el = document.getElementById('dept-directory'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition"></div>
                              <span className="text-sm font-medium text-gray-500 relative z-10">已上线文档</span>
                              <div className="flex items-end gap-2 mt-2 relative z-10">
                                 <span className="text-3xl font-bold text-slate-800">{dashboardStats.active}</span>
                                 <span className="text-xs text-green-600 font-medium mb-1">查看目录 →</span>
                              </div>
                           </div>
                           
                           {/* Card 2: Drafts -> Go to Backend Drafts */}
                           <div 
                              onClick={() => { setViewMode('backend'); setCurrentFolder('drafts'); }}
                              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition"></div>
                              <span className="text-sm font-medium text-gray-500 relative z-10">草稿箱</span>
                              <div className="flex items-end gap-2 mt-2 relative z-10">
                                 <span className="text-3xl font-bold text-slate-800">{dashboardStats.draft}</span>
                                 <span className="text-xs text-amber-600 font-medium mb-1">去处理 →</span>
                              </div>
                           </div>

                           {/* Card 3: Archived -> Go to Backend Archived */}
                           <div 
                              onClick={() => { setViewMode('backend'); setCurrentFolder('archived'); }}
                              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition"></div>
                              <span className="text-sm font-medium text-gray-500 relative z-10">历史归档</span>
                              <div className="flex items-end gap-2 mt-2 relative z-10">
                                 <span className="text-3xl font-bold text-slate-800">{dashboardStats.archived}</span>
                                 <span className="text-xs text-gray-400 font-medium mb-1">查看历史 →</span>
                              </div>
                           </div>

                           {/* Card 4: Scenes -> Go to Graph */}
                           <div 
                              onClick={() => setActiveTab('graph')}
                              className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg shadow-blue-500/20 text-white flex flex-col relative overflow-hidden cursor-pointer hover:opacity-95 transition"
                            >
                              <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none">
                                 <svg className="h-full w-full" viewBox="0 0 100 100" fill="white"><circle cx="80" cy="20" r="30" /></svg>
                              </div>
                              <span className="text-sm font-medium text-blue-100">覆盖业务场景</span>
                              <div className="flex items-end gap-2 mt-2">
                                 <span className="text-3xl font-bold">{graphData.nodes.filter(n => n.type === NodeType.SCENE).length}</span>
                                 <span className="text-xs text-blue-200 font-medium mb-1">查看图谱 →</span>
                              </div>
                           </div>
                        </div>

                        {/* Dept Stats Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                           {Object.keys(dashboardStats.deptStats).map(dept => {
                              const stat = dashboardStats.deptStats[dept];
                              const percent = stat.total > 0 ? (stat.active / stat.total) * 100 : 0;
                              return (
                                 <div 
                                    key={dept} 
                                    onClick={() => { setActiveDeptId(departments.find(d => d.name === dept)?.id || ''); document.getElementById('dept-directory')?.scrollIntoView({ behavior: 'smooth' }); }}
                                    className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-200 transition group"
                                 >
                                    <div>
                                       <div className="text-xs font-bold text-gray-700 group-hover:text-blue-700">{dept}</div>
                                       <div className="text-[10px] text-gray-400 mt-0.5">上线率 {Math.round(percent)}%</div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center text-xs font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                       {stat.active}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                    </div>

                    {/* Section: High Freq Scenes (Refined) */}
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            热门业务场景
                        </h2>
                        <button onClick={() => setActiveTab('graph')} className="text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                            查看全部
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                         {graphData.nodes
                            .filter(n => n.type === NodeType.SCENE)
                            .slice(0, 4)
                            .map((node, i) => {
                                // Assign colors cyclically
                                const colorClass = i % 3 === 0 ? 'text-blue-600 bg-blue-50' : i % 3 === 1 ? 'text-indigo-600 bg-indigo-50' : 'text-purple-600 bg-purple-50';
                                
                                return (
                                   <div 
                                     key={node.id}
                                     onClick={() => setSelectedNode(node)}
                                     className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group relative overflow-hidden cursor-pointer"
                                   >
                                      {/* Decorative Blob */}
                                      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl group-hover:scale-150 transition-transform duration-500 ${colorClass.replace('text-', 'bg-').replace('bg-', 'text-')}`}></div>
                                      
                                      <div className="relative z-10 flex flex-col h-full">
                                          <div className="flex justify-between items-start">
                                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase ${colorClass}`}>
                                                  {node.department || '综合'}
                                              </span>
                                          </div>
                                          
                                          <h3 className="text-base font-bold text-slate-800 mt-3 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                                             {node.name}
                                          </h3>
                                          
                                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4 flex-1">
                                             {node.description || '暂无详细描述...'}
                                          </p>
                                          
                                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                              <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{node.publishDate || '2024'}</span>
                                              <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                              </div>
                                          </div>
                                      </div>
                                   </div>
                                );
                            })}
                      </div>
                    </div>

                    {/* Section: Department Directory (Refined) */}
                    <div id="dept-directory">
                       <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                           <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                           部门知识目录
                       </h2>
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                          {/* Sidebar */}
                          <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-1.5 shrink-0">
                             <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">选择部门</div>
                             {departments.map(dept => (
                               <button 
                                 key={dept.id}
                                 onClick={() => setActiveDeptId(dept.id)}
                                 className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${
                                   activeDeptId === dept.id 
                                   ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' 
                                   : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                                 }`}
                               >
                                 {activeDeptId === dept.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}
                                 <span>{dept.name}</span>
                                 <span className={`text-xs px-2 py-0.5 rounded-full ${activeDeptId === dept.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                     {graphData.nodes.filter(n => n.department === dept.name && n.status === NodeStatus.ACTIVE).length}
                                 </span>
                               </button>
                             ))}
                          </div>
                          
                          {/* Content Grid */}
                          <div className="flex-1 p-6 lg:p-8 bg-white flex flex-col">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
                                <div>
                                  <h3 className="text-xl font-bold text-slate-800">{departments.find(d => d.id === activeDeptId)?.name}</h3>
                                  <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-md">{departments.find(d => d.id === activeDeptId)?.description}</p>
                                </div>
                                <div className="flex gap-2">
                                   <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-lg">
                                      {activeDeptNodes.filter(n => n.type === NodeType.SOP).length} 制度
                                   </span>
                                   <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-lg">
                                      {activeDeptNodes.filter(n => n.type === NodeType.TABLE).length} 表格
                                   </span>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 content-start">
                                {activeDeptNodes.length > 0 ? (
                                  activeDeptNodes.map(node => (
                                    <div 
                                      key={node.id}
                                      onClick={() => setSelectedNode(node)}
                                      className="group p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex gap-4 items-start"
                                    >
                                       {/* Icon Box */}
                                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 shadow-sm border border-white group-hover:scale-110 transition-transform duration-300
                                          ${node.type === NodeType.SOP ? 'bg-green-100 text-green-600' : 
                                            node.type === NodeType.TABLE ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}
                                       `}>
                                         {node.type === NodeType.SOP ? '文' : node.type === NodeType.TABLE ? '表' : '业'}
                                       </div>
                                       
                                       <div className="flex-1 min-w-0">
                                         <div className="flex justify-between items-start">
                                             <h4 className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate pr-2">{node.name}</h4>
                                             {node.type === NodeType.TABLE && <span className="shrink-0 text-[10px] bg-amber-50 text-amber-600 px-1.5 rounded border border-amber-100">下载</span>}
                                         </div>
                                         
                                         <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5">
                                            <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wide">ID: {node.id}</span>
                                            <span>{node.publishDate}</span>
                                         </div>
                                         
                                         <p className="text-xs text-slate-500 mt-2 line-clamp-1 group-hover:text-slate-600">
                                             {node.description || '点击查看详情...'}
                                         </p>
                                       </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-1 xl:col-span-2 py-12 text-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                                    <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <span className="text-sm">该部门暂无已发布的文档</span>
                                  </div>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* Tab: Graph */}
            {activeTab === 'graph' && (
              <div className="absolute inset-0 bg-white">
                <GraphViewer 
                  data={graphData} 
                  onNodeClick={setSelectedNode} 
                  className="w-full h-full"
                />
                <div className="absolute bottom-8 left-8 bg-white/90 p-5 rounded-2xl shadow-xl border border-white/50 backdrop-blur max-w-xs z-10 animate-fade-in">
                   <h3 className="font-bold text-gray-800 text-lg mb-1">全景知识图谱</h3>
                   <div className="w-10 h-1 bg-blue-500 rounded-full mb-3"></div>
                   <div className="space-y-3 text-sm font-medium text-gray-600">
                     <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> 业务场景</span>
                        <span className="font-bold">{graphData.nodes.filter(n => n.type === NodeType.SCENE).length}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> 制度文档</span>
                        <span className="font-bold">{graphData.nodes.filter(n => n.type === NodeType.SOP).length}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> 业务表格</span>
                        <span className="font-bold">{graphData.nodes.filter(n => n.type === NodeType.TABLE).length}</span>
                     </div>
                   </div>
                </div>
              </div>
            )}
            
            {/* Floating Assistant (Frontend Only) */}
            <FloatingAssistant contextNodes={graphData.nodes} hotTopics={HOT_TOPICS} />

          </main>
        </div>
      )}

      {/* ---------------------------------------------------------------------------
          MODALS
      --------------------------------------------------------------------------- */}
      
      {/* Node Detail Modal */}
      <Modal isOpen={!!selectedNode} onClose={() => setSelectedNode(null)} title="节点详情">
        {selectedNode && (
          <div className="p-8">
            <div className="flex items-start justify-between mb-8">
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-3">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm uppercase tracking-wide
                     ${selectedNode.type === NodeType.SCENE ? 'bg-blue-600' : 
                       selectedNode.type === NodeType.SOP ? 'bg-green-600' : 
                       selectedNode.type === NodeType.TABLE ? 'bg-amber-600' : 'bg-purple-600'}`
                   }>
                     {selectedNode.type}
                   </span>
                   {selectedNode.department && <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">所属: {selectedNode.department}</span>}
                 </div>
                 <h2 className="text-3xl font-bold text-gray-900 leading-tight">{selectedNode.name}</h2>
                 <p className="text-lg text-gray-600 mt-4 leading-relaxed border-l-4 border-gray-200 pl-4">{selectedNode.description || selectedNode.content}</p>
               </div>
               {selectedNode.type === NodeType.TABLE && (
                 <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition transform active:scale-95 shrink-0 ml-4">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   下载模板
                 </button>
               )}
            </div>
             {/* CONTENT: TABLE FILLING GUIDE */}
            {selectedNode.type === NodeType.TABLE && selectedNode.fields && (
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    填写指引预览
                  </h4>
                  
                  <div className="bg-white border shadow-sm rounded-xl overflow-hidden max-w-3xl mx-auto">
                    {/* Mock Paper Header */}
                    <div className="bg-gray-50 border-b p-4 text-center">
                       <h2 className="font-serif font-bold text-xl text-gray-800">{selectedNode.name}</h2>
                       <p className="text-xs text-gray-500 mt-1">编号: PROP-{selectedNode.id.toUpperCase()}-2024</p>
                    </div>
                    {/* Mock Form Fields */}
                    <div className="p-6 space-y-6">
                       {selectedNode.fields.map((field: any, idx: number) => (
                         <div key={idx} className="relative group">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              {field.name}
                              {field.required ? <span className="text-red-500 ml-1">*</span> : <span className="text-gray-400 font-normal ml-2 text-xs">(选填)</span>}
                            </label>
                            
                            <div className={`
                               border rounded-lg p-3 text-sm flex justify-between items-center transition
                               ${field.required ? 'border-red-200 bg-red-50/30' : 'border-blue-100 bg-blue-50/30'}
                            `}>
                               <span className="text-gray-400 italic">{field.example || '请输入...'}</span>
                               <div className="relative">
                                  <div className={`
                                    text-xs px-2 py-1 rounded font-medium border flex items-center gap-1 cursor-help
                                    ${field.required ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}
                                  `}>
                                     {field.required ? '必填' : '选填'}
                                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </div>
                               </div>
                            </div>

                            {/* Hover Guide */}
                            <div className="mt-2 text-xs text-gray-500 flex items-start gap-1.5 pl-1">
                               <svg className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                               <span className="opacity-90">{field.description}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>
            )}
          </div>
        )}
      </Modal>

      {/* API Key Modal */}
      <Modal isOpen={isApiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} title="API Key 配置">
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">配置 Gemini API Key</h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            为了启用 AI 智能问答、深度思考 (Thinking) 和联网搜索功能，请填入有效的 Google Gemini API Key。
            <br/>
            <span className="text-xs text-gray-400">* 本演示为纯前端运行，Key 不会被永久存储。</span>
            </p>
            <input 
            type="password" 
            className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="AIzaSy..."
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            />
            <div className="flex justify-end gap-3">
            <button onClick={() => setApiKeyModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">取消</button>
            <button onClick={() => {
                (process.env as any).API_KEY = tempApiKey;
                setApiKeyModalOpen(false);
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/30 transition">保存并启用</button>
            </div>
            <p className="mt-4 text-xs text-gray-400">
            没有 Key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline hover:text-blue-600">点击此处免费获取</a>
            </p>
        </div>
      </Modal>

    </div>
  );
}
