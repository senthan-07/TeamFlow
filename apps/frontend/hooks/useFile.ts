// hooks/useFile.ts
import axios from '../lib/axios';
import { useFileStore } from '../store/fileStore';

export const useFile = (boardId: string) => {
  const { setFiles, addFile, removeFile } = useFileStore();

  const fetchFiles = async () => {
    const res = await axios.get(`/files/${boardId}`);
    setFiles(res.data);
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`/files/${boardId}`, formData);
    addFile(res.data);
  };

  const deleteFile = async (fileId: string) => {
    await axios.delete(`/files/${boardId}/${fileId}`);
    removeFile(fileId);
  };

  return { fetchFiles, uploadFile, deleteFile };
};
