import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metaApi, complaintsApi } from '../../api/endpoints';
import { getSavedAllotment } from '../../api/gaps';
import { useToast } from '../../components/ui/Toast';
import { SpecializationBadge } from '../../components/common/Badges';
import { TicketScope, Priority, Subcategory, CommonAreaItem } from '../../types';
import {
  PlusCircle,
  Building2,
  DoorOpen,
  Layers,
  Clock,
  Image,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const NewComplaintForm: React.FC = () => {
  const allotment = getSavedAllotment();

  const [ticketScope, setTicketScope] = useState<TicketScope>('ROOM');
  const [blockId, setBlockId] = useState<string>(allotment?.block_id || '');
  const [roomId, setRoomId] = useState<string>(allotment?.room_id || '');
  const [commonAreaId, setCommonAreaId] = useState<string>('');

  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [preferredTimeslot, setPreferredTimeslot] = useState<string>('04:00 PM - 06:00 PM');
  const [photoEvidenceUrl, setPhotoEvidenceUrl] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Meta Queries
  const { data: blocks = [] } = useQuery({
    queryKey: ['meta-blocks'],
    queryFn: metaApi.getBlocks,
  });

  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ['meta-rooms', blockId],
    queryFn: () => metaApi.getRoomsByBlock(blockId),
    enabled: !!blockId && ticketScope === 'ROOM',
  });

  const { data: commonAreas = [], isLoading: isLoadingCommonAreas } = useQuery({
    queryKey: ['meta-common-areas', blockId],
    queryFn: () => metaApi.getCommonAreas(blockId),
    enabled: !!blockId && ticketScope === 'COMMON_AREA',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['meta-categories'],
    queryFn: async () => {
      const data = await metaApi.getCategories();
      return data
        .sort((a, b) => a.category_id - b.category_id)
        .map((cat) => ({
          ...cat,
          subcategories: (cat.subcategories || []).filter((sub): sub is Subcategory => sub !== null),
        }));
    },
  });

  // Available subcategories for selected category
  const selectedCategory = categories.find((c) => c.category_id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  const selectedSubcategory = subcategories.find((s) => s.subcategory_id === subcategoryId);

  // Update default priority when subcategory selected
  useEffect(() => {
    if (selectedSubcategory) {
      setPriority(selectedSubcategory.priority_level);
    }
  }, [selectedSubcategory]);

  // Mutation
  const mutation = useMutation({
    mutationFn: complaintsApi.create,
    onSuccess: () => {
      showToast('Complaint registered successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      navigate('/student/complaints');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to submit complaint');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!blockId) {
      setFormError('Please select a Hostel Block.');
      return;
    }

    if (ticketScope === 'ROOM' && !roomId) {
      setFormError('Please select your Room Number.');
      return;
    }

    if (ticketScope === 'COMMON_AREA' && !commonAreaId) {
      setFormError('Please select a Common Area Facility.');
      return;
    }

    if (!subcategoryId) {
      setFormError('Please select a specific Issue Subcategory.');
      return;
    }

    mutation.mutate({
      ticket_scope: ticketScope,
      block_id: blockId,
      room_id: ticketScope === 'ROOM' ? roomId : null,
      common_area_id: ticketScope === 'COMMON_AREA' ? commonAreaId : null,
      subcategory_id: Number(subcategoryId),
      description: description.trim() || null,
      priority,
      preferred_timeslot: preferredTimeslot || null,
      photo_evidence_url: photoEvidenceUrl.trim() || null,
    });
  };

  const timeslotPresets = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
          <PlusCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">File New Maintenance Complaint</h1>
          <p className="text-xs text-slate-400">Detailed ticket submission form</p>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
        {/* 1. Ticket Scope Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">1. Ticket Scope *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTicketScope('ROOM')}
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                ticketScope === 'ROOM'
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              <span>MY ROOM</span>
            </button>

            <button
              type="button"
              onClick={() => setTicketScope('COMMON_AREA')}
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                ticketScope === 'COMMON_AREA'
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>COMMON AREA</span>
            </button>
          </div>
        </div>

        {/* 2. Block & Location Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hostel Block *</span>
            </label>
            <select
              value={blockId}
              onChange={(e) => {
                setBlockId(e.target.value);
                setRoomId('');
                setCommonAreaId('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              required
            >
              <option value="">Choose Block...</option>
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.block_name} ({b.block_id})
                </option>
              ))}
            </select>
          </div>

          {ticketScope === 'ROOM' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Room Number *</span>
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={!blockId || isLoadingRooms}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                required
              >
                <option value="">
                  {!blockId
                    ? 'Select block first...'
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
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Common Area Facility *</span>
              </label>
              <select
                value={commonAreaId}
                onChange={(e) => setCommonAreaId(e.target.value)}
                disabled={!blockId || isLoadingCommonAreas}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                required
              >
                <option value="">
                  {!blockId
                    ? 'Select block first...'
                    : isLoadingCommonAreas
                    ? 'Loading facilities...'
                    : 'Choose Facility...'}
                </option>
                {commonAreas.map((ca: CommonAreaItem) => (
                  <option key={ca.area_id} value={ca.area_id}>
                    {ca.description}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3. Category & Subcategory Cascade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Category *</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value ? Number(e.target.value) : '');
                setSubcategoryId('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              required
            >
              <option value="">Choose Category...</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Specific Issue *</span>
            </label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : '')}
              disabled={!categoryId}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              required
            >
              <option value="">
                {!categoryId ? 'Select category first...' : 'Choose Issue...'}
              </option>
              {subcategories.map((s) => (
                <option key={s.subcategory_id} value={s.subcategory_id}>
                  {s.issue_name} ({s.priority_level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Required Specialization Surface */}
        {selectedSubcategory && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Assigned Service Trade:</span>
            <SpecializationBadge specialization={selectedSubcategory.required_specialization} />
          </div>
        )}

        {/* 4. Description with Character Counter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">
              Description (Optional)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {description.length} / 500
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => {
              if (e.target.value.length <= 500) setDescription(e.target.value);
            }}
            placeholder="Explain the problem in detail (e.g. tube light flickering in room L-843)..."
            rows={3}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* 5. Priority & Timeslot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Priority *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="EMERGENCY">EMERGENCY (Immediate Hazard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Preferred Timeslot</span>
            </label>
            <input
              type="text"
              value={preferredTimeslot}
              onChange={(e) => setPreferredTimeslot(e.target.value)}
              placeholder="e.g. 04:00 PM - 06:00 PM"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-1.5 flex-wrap mt-2">
              {timeslotPresets.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPreferredTimeslot(slot)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Photo Evidence URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5 text-cyan-400" />
            <span>Photo Evidence Image URL (Optional)</span>
          </label>
          <input
            type="url"
            value={photoEvidenceUrl}
            onChange={(e) => setPhotoEvidenceUrl(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Submit Action */}
        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {mutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Register Complaint</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
