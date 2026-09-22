import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { metaApi } from '../../api/endpoints';
import { saveAllotment } from '../../api/gaps';
import { Modal } from '../../components/ui/Modal';
import { Building2, DoorOpen, CheckCircle2 } from 'lucide-react';

interface AllotmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block_id: string, room_id: string) => void;
  initialBlockId?: string;
  initialRoomId?: string;
}

export const AllotmentModal: React.FC<AllotmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBlockId = '',
  initialRoomId = '',
}) => {
  const [selectedBlock, setSelectedBlock] = useState(initialBlockId);
  const [selectedRoom, setSelectedRoom] = useState(initialRoomId);

  const { data: blocks = [] } = useQuery({
    queryKey: ['meta-blocks'],
    queryFn: metaApi.getBlocks,
    enabled: isOpen,
  });

  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ['meta-rooms', selectedBlock],
    queryFn: () => metaApi.getRoomsByBlock(selectedBlock),
    enabled: isOpen && !!selectedBlock,
  });

  useEffect(() => {
    if (initialBlockId) setSelectedBlock(initialBlockId);
    if (initialRoomId) setSelectedRoom(initialRoomId);
  }, [initialBlockId, initialRoomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlock || !selectedRoom) return;
    saveAllotment(selectedBlock, selectedRoom);
    onSave(selectedBlock, selectedRoom);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Your Room Allotment"
      subtitle="One-time setup for 1-Click Quick Actions (B3 Room Allotment)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Select Hostel Block *</span>
          </label>
          <select
            value={selectedBlock}
            onChange={(e) => {
              setSelectedBlock(e.target.value);
              setSelectedRoom('');
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
            required
          >
            <option value="">Choose Hostel Block...</option>
            {blocks.map((b) => (
              <option key={b.block_id} value={b.block_id}>
                {b.block_name} ({b.block_id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <DoorOpen className="w-4 h-4 text-cyan-400" />
            <span>Select Your Room *</span>
          </label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            disabled={!selectedBlock || isLoadingRooms}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            required
          >
            <option value="">
              {!selectedBlock
                ? 'Select a block first...'
                : isLoadingRooms
                ? 'Loading rooms...'
                : 'Choose Room...'}
            </option>
            {rooms.map((r) => (
              <option key={r.room_id} value={r.room_id}>
                Room {r.room_number} (Floor {r.floor_number})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedBlock || !selectedRoom}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Room Allotment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
