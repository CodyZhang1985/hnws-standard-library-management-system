import { GoogleGenAI, Type } from "@google/genai";
import { GraphNode } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("未设置 API_KEY。Gemini 功能将无法工作。");
  }
  return new GoogleGenAI({ apiKey });
};

// Simulate RAG by passing relevant nodes as context
const formatContext = (nodes: GraphNode[]) => {
  return nodes.map(n => 
    `[${n.type}] ${n.name} (${n.status}): ${n.description || n.content || '无详情'}`
  ).join('\n');
};

export const generateAnswer = async (
  query: string, 
  contextNodes: GraphNode[],
  useWebSearch: boolean = false,
  useThinking: boolean = false
) => {
  const ai = getAiClient();
  const context = formatContext(contextNodes);
  
  const systemInstruction = `你是一个智慧物业 AI 助手。
  你的目标是帮助物业一线员工（安保、工程、客服）查询制度、流程和表格。
  
  知识库上下文 (CONTEXT):
  ${context}
  
  规则:
  1. 如果答案在上下文中，请引用具体的 [节点名称]。
  2. 如果答案不在上下文中，请明确回答“当前知识库未收录相关制度，请咨询相关部门”。严禁编造（Hallucination）。
  3. 保持专业、简洁，并注重安全合规。
  4. 请始终使用中文回答。
  `;

  try {
    if (useThinking) {
      // Use Gemini 3 Pro Preview for deep reasoning
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: query,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 2048 }, // Moderate budget for demo
        }
      });
      return { 
        text: response.text || "正在思考中，但未生成回复。",
        groundingSources: [] 
      };
    } else if (useWebSearch) {
      // Use Gemini 2.5 Flash with Google Search
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || "未找到相关结果。";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
        .filter((s: any) => s !== null);

      return { text, groundingSources: sources };
    } else {
      // Standard RAG-like response with Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.1, // Low temperature for factual RAG
        }
      });
      return { text: response.text || "无法生成回复。", groundingSources: [] };
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "连接 AI 服务失败。请检查您的 API Key。", groundingSources: [] };
  }
};

export const analyzeUploadedFile = async (fileName: string, fileType: string) => {
  // Mock function to simulate "Thinking" analysis of a file
  
  return new Promise<{summary: string, nodes: any[]}>((resolve) => {
    setTimeout(() => {
      resolve({
        summary: `AI 已完成对《${fileName}》的分析：识别出标准操作流程 (SOP) 结构。`,
        nodes: [
          { name: `从 ${fileName} 提取的场景`, type: 'SCENE' },
          { name: `识别到的表格 A`, type: 'TABLE' }
        ]
      });
    }, 2000);
  });
};
