
import { FileAttachment } from "../types";

// 模拟后端文件存储服务
// 在真实环境中，这里会调用后端 API，如 POST /api/v1/upload
// 后端会将文件保存到云存储 (S3/OSS) 或本地磁盘，并返回文件元数据

export const uploadFileToServer = async (file: File): Promise<FileAttachment> => {
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      try {
        const fileId = crypto.randomUUID();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // 模拟服务器端生成的文件存储路径 (Linux 风格)
        // 这种结构方便运维人员在服务器上管理文件
        const extension = file.name.split('.').pop() || 'dat';
        const storagePath = `/var/data/smartprop/uploads/${year}/${month}/${day}/${fileId}.${extension}`;

        // 模拟生成的公网访问 URL
        // 在浏览器演示中，我们使用 blob URL 替代真实 CDN URL，以便用户确实能看到内容
        // 在真实部署时，这里会是 https://cdn.smartprop.com/files/...
        const publicUrl = URL.createObjectURL(file);

        const attachment: FileAttachment = {
          fileId,
          originalName: file.name,
          storagePath,
          publicUrl,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          uploadTime: date.toISOString()
        };

        console.log(`[Mock Server] File saved to: ${storagePath}`);
        resolve(attachment);
      } catch (error) {
        reject(new Error("File upload failed"));
      }
    }, 1500); // 1.5s 模拟上传进度
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
