/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Users, ShieldAlert, ShieldCheck, Edit2 } from 'lucide-react';
import { StaffMember } from '../../types';
import {
  Button,
  Input,
  Select,
  Modal,
  Badge,
  BadgeVariant,
  Tabs,
  SearchBar,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '../../components/ui';

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
  
  // Edit modal state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff && editName.trim()) {
      onEditStaff({ ...editingStaff, name: editName.trim() });
      setEditingStaff(null);
      setEditName('');
    }
  };

  const totalStaff = staffList.length;
  const onDutyCount = staffList.filter(s => s.status === 'Active').length;
  const offDutyCount = staffList.filter(s => s.status === 'Off Duty').length;

  const roleFilters = [
    { id: 'all', label: 'All', count: totalStaff },
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

  const getRoleBadgeVariant = (roleName: string): BadgeVariant => {
    switch (roleName) {
      case 'Manager': return 'amber';
      case 'Cashier': return 'blue';
      case 'Kitchen': return 'rose';
      case 'Waiter': return 'teal';
      default: return 'slate';
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
        <Button
          onClick={() => setShowAddModal(true)}
          icon={<Plus className="w-4 h-4" />}
          variant="primary"
          size="md"
        >
          Add Staff
        </Button>
      </div>

      {/* KPI stats counter panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <Card padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Staff</p>
            <h4 className="text-lg font-black text-slate-800 mt-1.5 leading-none">{totalStaff}</h4>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">On Duty</p>
            <h4 className="text-lg font-black text-slate-800 mt-1.5 leading-none">{onDutyCount}</h4>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Off Duty</p>
            <h4 className="text-lg font-black text-slate-800 mt-1.5 leading-none">{offDutyCount}</h4>
          </div>
        </Card>

      </div>

      {/* Roster query list filtering controls row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-50 pb-2">
        
        {/* Pills select group */}
        <Tabs
          tabs={roleFilters}
          activeTab={activeRoleFilter}
          onChange={setActiveRoleFilter}
          variant="dark"
          className="w-full sm:w-auto"
        />

        {/* Local Search inside staff panel */}
        <div className="w-full sm:w-64">
          <SearchBar
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search staff..."
            size="sm"
            className="bg-white"
          />
        </div>

      </div>

      {/* Main Roster grid/table list wrapper */}
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Staff Member</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Station / Terminal</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </tr>
        </TableHead>

        <TableBody>
          {filteredStaff.map((member) => {
            const isActive = member.status === 'Active';
            return (
              <TableRow key={member.id}>
                
                {/* Name + email combo box */}
                <TableCell className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {member.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-800">{member.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold leading-none mt-1">{member.email}</div>
                  </div>
                </TableCell>

                {/* Role badge */}
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                    {member.role}
                  </Badge>
                </TableCell>

                {/* Station info */}
                <TableCell className="font-bold text-slate-500">
                  {member.station}
                </TableCell>

                {/* Duty Shift status circle badge */}
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onToggleShift(member.id)}
                    title="Click to toggle Shift Duty"
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-tight active:scale-95 transition-all cursor-pointer ${
                      isActive 
                        ? 'text-emerald-600 hover:bg-emerald-50' 
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'}`}></span>
                    <span>{member.status}</span>
                  </button>
                </TableCell>

                {/* CTA Edit status row */}
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStaff(member);
                      setEditName(member.name);
                    }}
                    className="text-slate-400 hover:text-orange-600 font-bold p-1 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Edit Staff Name Modal */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit Staff Member"
        maxWidth="sm"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2.5 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditingStaff(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Staff Dialog Modal popup */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Staff Member"
        maxWidth="sm"
      >
        <form onSubmit={onAddStaffSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hana Mori"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. hana.m@kurobistro.com"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'Manager' | 'Cashier' | 'Kitchen' | 'Waiter')}
              options={[
                { value: 'Manager', label: 'Manager' },
                { value: 'Cashier', label: 'Cashier' },
                { value: 'Kitchen', label: 'Kitchen' },
                { value: 'Waiter', label: 'Waiter' },
              ]}
            />
            <Input
              label="Station"
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. Handheld 03"
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
            >
              Register Staff
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
