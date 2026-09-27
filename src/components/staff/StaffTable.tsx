/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit2 } from 'lucide-react';
import { StaffMember } from '../../types';
import {
  Badge,
  BadgeVariant,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from '../ui';
import { PermissionGate } from '../auth/PermissionGate';

export interface StaffTableProps {
  staffList: StaffMember[];
  onToggleShift: (staffId: string) => void;
  onStartEdit: (member: StaffMember) => void;
}

export const StaffTable: React.FC<StaffTableProps> = ({
  staffList,
  onToggleShift,
  onStartEdit,
}) => {
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
        {staffList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs font-medium">
              No staff members found.
            </TableCell>
          </TableRow>
        ) : (
          staffList.map((member) => {
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
                  <PermissionGate
                    permission="staff.manage"
                    fallback={
                      <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold tracking-tight text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <span>{member.status}</span>
                      </span>
                    }
                  >
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
                  </PermissionGate>
                </TableCell>

                {/* CTA Edit status row */}
                <TableCell className="text-right">
                  <PermissionGate permission="staff.manage">
                    <button
                      type="button"
                      onClick={() => onStartEdit(member)}
                      className="text-slate-400 hover:text-orange-600 font-bold p-1 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
