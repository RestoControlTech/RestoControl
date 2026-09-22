/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Plus, Users, ShieldAlert, ShieldCheck, Search, Edit2 } from 'lucide-react';
import { StaffMember } from '../../types';

interface StaffProps {
  staffList: StaffMember[];
  onToggleShift: (staffId: string) => void;
  onAddStaff: (member: StaffMember) => void;
  onEditStaff: (member: StaffMember) => void;
  searchQuery: string;
}

export default function Staff({ staffList, onToggleShift, onAddStaff, onEditStaff, searchQuery }: StaffProps) {
  const [activeRoleFilter, setActiveRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  
  // New Staff Member State Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Manager' | 'Cashier' | 'Kitchen' | 'Waiter'>('Waiter');
  const [station, setStation] = useState('Unassigned');

  const onAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name,
      email,
      role,
      station: station || 'Unassigned',
      status: 'Off Duty'
    };

    onAddStaff(newMember);
    setShowAddModal(false);

    // Reset Form
    setName('');
    setEmail('');
    setRole('Waiter');
    setStation('Unassigned');
  };

  const totalStaff = staffList.length;
  const onDutyCount = staffList.filter(s => s.status === 'Active').length;
  const offDutyCount = staffList.filter(s => s.status === 'Off Duty').length;

  const roleFilters = [
    { id: 'all', label: `All (${totalStaff})` },
    { id: 'Manager', label: 'Manager' },
    { id: 'Cashier', label: 'Cashier' },
    { id: 'Kitchen', label: 'Kitchen' },
    { id: 'Waiter', label: 'Waiter' },
  ];

  const filteredStaff = staffList.filter(member => {
    const query = (localSearch || searchQuery).toLowerCase().trim();
    const matchesQuery = 
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.station.toLowerCase().includes(query);

    const matchesRole = activeRoleFilter === 'all' || member.role === activeRoleFilter;

    return matchesQuery && matchesRole;
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Manager': return 'bg-amber-50 text-amber-700 border-amber-200/40';
      case 'Cashier': return 'bg-blue-50 text-blue-700 border-blue-200/40';
      case 'Kitchen': return 'bg-rose-50 text-rose-700 border-rose-200/40';
      case 'Waiter': return 'bg-teal-50 text-teal-700 border-teal-200/40';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="staff-screen-root" className="space-y-6">
      
      {/* Header with "+ Add Staff" button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide mt-0.5">Manage team members, security roles, and active shift statuses.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff</span>
        </button>
      </div>

      {/* KPI stats counter panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Staff</p>
            <h4 className="text-lg font-black text-slate-800 mt-1.5 leading-none">{totalStaff}</h4>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">On Duty</p>
            <h4 className="text-lg font-black text-slate-800 mt-1.5 leading-none">{onDutyCount}</h4>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Off Duty</p>
            <h4 className="text-lg font-black text-slate-800 mt-1.5 leading-none">{offDutyCount}</h4>
          </div>
        </div>

      </div>

      {/* Roster query list filtering controls row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-50 pb-2">
        
        {/* Pills select group */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0 w-full sm:w-auto">
          {roleFilters.map(filter => {
            const isActive = activeRoleFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveRoleFilter(filter.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Local Search inside staff panel */}
        <div className="relative flex items-center w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search staff..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 py-1.5 pl-9 pr-4 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
          />
        </div>

      </div>

      {/* Main Roster grid/table list wrapper */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            {/* Table Head layout */}
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Staff Member</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Station / Terminal</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body rows */}
            <tbody className="divide-y divide-slate-50">
              {filteredStaff.map((member) => {
                const isActive = member.status === 'Active';
                return (
                  <tr key={member.id} className="hover:bg-slate-50/30 transition-all text-xs text-slate-700">
                    
                    {/* Name + email combo box */}
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">
                        {member.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800">{member.name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold leading-none mt-1">{member.email}</div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border tracking-wider ${getRoleBadgeClass(member.role)}`}>
                        {member.role}
                      </span>
                    </td>

                    {/* Station info */}
                    <td className="py-3.5 px-5 font-bold text-slate-500">
                      {member.station}
                    </td>

                    {/* Duty Shift status circle badge */}
                    <td className="py-3.5 px-5">
                      <button
                        onClick={() => onToggleShift(member.id)}
                        title="Click to toggle Shift Duty"
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-tight active:scale-95 transition-all ${
                          isActive 
                            ? 'text-emerald-600 hover:bg-emerald-50' 
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'}`}></span>
                        <span>{member.status}</span>
                      </button>
                    </td>

                    {/* CTA Edit status row */}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => {
                          const newName = prompt(`Enter new name for ${member.name}:`, member.name);
                          if (newName) {
                            onEditStaff({ ...member, name: newName });
                          }
                        }}
                        className="text-slate-400 hover:text-orange-600 font-bold p-1 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>

      {/* Add Staff Dialog Modal popup */}
      {showAddModal && (
        <div id="add-staff-modal" className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200/60 p-6 w-full max-w-sm shadow-2xl relative">
            
            <h3 className="font-extrabold text-slate-900 text-sm mb-4">Add Staff Member</h3>
            
            <form onSubmit={onAddStaffSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hana Mori"
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. hana.m@kurobistro.com"
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Waiter">Waiter</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Station</label>
                  <input
                    type="text"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    placeholder="e.g. Handheld 03"
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-bold text-white transition-colors active:scale-95 shadow-md"
                >
                  Register Staff
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
