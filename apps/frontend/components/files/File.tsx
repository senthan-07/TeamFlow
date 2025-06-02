'use client';

import { useEffect, useRef } from 'react';
import { useFileStore } from '../../store/fileStore';
import { useFile } from '../../hooks/useFile';

interface Props {
  boardId: string;
}

export default function FileSection({ boardId }: Props) {
  const { files } = useFileStore();
  const { fetchFiles, uploadFile, deleteFile } = useFile(boardId);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [boardId, fetchFiles]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    await uploadFile(file);
    fileRef.current!.value = '';
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-3">📁 Files</h2>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          onChange={handleUpload}
        />
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          onClick={() => fileRef.current?.click()}
        >
          Upload File
        </button>
      </div>


      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between border-b py-1"
          >
            <div>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL_WO_SLASH }${file.url}`}
                download
                className="text-blue-500 underline"
                target="_blank"
                rel="noreferrer"
              >
                {file.filename}
              </a>
              <span className="text-sm text-gray-500 ml-2">({file.size} bytes)</span>
            </div>
            <button
              onClick={() => deleteFile(file.id)}
              className="text-red-500 hover:underline text-sm"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
