/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Check, 
  Loader2, 
  Calendar,
  Sparkles,
  Save,
  X
} from 'lucide-react';
import { User } from '../../types';
import { Modal, Input, Button, Badge } from '../ui';
import { AvatarDropzone } from './AvatarDropzone';
import { useAuth } from '../../hooks/useAuth';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [avatarPublicId, setAvatarPublicId] = useState<string | undefined>(undefined);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
      setAvatarPublicId(user.avatarPublicId || undefined);
      setErrors({});
      setSaveSuccess(false);
    }
  }, [user, isOpen]);

  if (!user) return null;

  const validate = () => {
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) {
      errs.name = 'Full name is required';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAvatarChange = (url: string, publicId?: string) => {
    setAvatar(url);
    setAvatarPublicId(publicId);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isUploading) return;

    setIsSaving(true);
    try {
      updateUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatar.trim(),
        avatarPublicId,
      });

      setSaveSuccess(true);
      onSuccess?.();

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile"
      subtitle="View and edit your personal information and profile picture"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-6 pt-1">
        {/* User Role & ID Pill */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  {user.role}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                <span className="text-[10px] font-bold text-emerald-600">Active</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                ID: {user.id}
              </p>
            </div>
          </div>
          <Badge variant={user.role === 'admin' ? 'orange' : 'slate'} size="sm">
            {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
          </Badge>
        </div>

        {/* Drag and Drop Avatar Section */}
        <div className="flex flex-col items-center py-2">
          <AvatarDropzone
            avatar={avatar}
            avatarPublicId={avatarPublicId}
            name={name || user.name}
            onChange={handleAvatarChange}
            onUploadingChange={setIsUploading}
          />
        </div>

        {/* Profile Inputs */}
        <div className="space-y-3.5">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Your name"
            icon={<UserIcon className="w-4 h-4" />}
            error={errors.name}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="your.email@restaurant.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+855 12 345 678"
            icon={<Phone className="w-4 h-4" />}
            sublabel="Optional"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSaving || isUploading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving || isUploading}
            isLoading={isSaving}
            icon={saveSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
            className={saveSuccess ? '!bg-emerald-600 !border-emerald-600' : ''}
          >
            {saveSuccess ? 'Changes Saved!' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserProfileModal;
