'use client'

import { useState } from 'react'
import { useBoards } from '../../hooks/useBoard'

export default function DashboardPage() {
  const { boards, loading, error, createBoard, deleteBoard } = useBoards()
  const [newTitle, setNewTitle] = useState('')
  const [emails, setEmails] = useState('')

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      await createBoard(newTitle, emails.split(',').map(e => e.trim()).filter(e => e))
      setNewTitle('')
      setEmails('')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (title: string) => {
    if (confirm(`Delete board "${title}"?`)) {
      try {
        await deleteBoard(title)
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Boards</h1>

      {/* Create Board */}
      <div className="mb-8 bg-white rounded-lg shadow p-4 space-y-2">
        <input
          className="w-full p-2 border rounded"
          placeholder="Board title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Invite by email (comma-separated)"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
        />
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Board
        </button>
      </div>

      {/* Board List */}
      {loading ? (
        <p>Loading boards...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : boards.length === 0 ? (
        <p className="text-gray-500">No boards found.</p>
      ) : (
        <ul className="space-y-4">
          {boards.map((board) => (
            <li
              key={board.id.toString()}
              className="flex items-center justify-between bg-white p-4 rounded shadow"
            >
              <div>
                <h2 className="text-lg font-semibold">{board.title}</h2>
                <p className="text-sm text-gray-500">Owner: {board.owner.name}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/board/${board.title}`}
                  className="text-blue-600 hover:underline"
                >
                  Open
                </a>
                <button
                  onClick={() => handleDelete(board.title.toString())}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
