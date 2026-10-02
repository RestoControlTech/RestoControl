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
  Calendar, 
  Lock, 
  KeyRound, 
  Save, 
  Sparkles,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Card, Input, Button, Badge } from '../../components/ui';
import { AvatarDropzone } from '../../components/profile';
import { useAuth } from '../../hooks/useAuth';

export default function Profile() {
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
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
      setAvatarPublicId(user.avatarPublicId || undefined);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400 font-bold text-sm">Please log in to view your profile.</p>
      </div>
    );
  }

  const validate = () => {
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) errs.name = 'Full name is required';
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isUploading) return;

    setIsSaving(true);
    updateUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatar: avatar.trim(),
      avatarPublicId,
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaving(false);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>My Profile</span>
            <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-md uppercase">
              {user.role}
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Manage your personal profile details and drag & drop your avatar image.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={user.role === 'admin' ? 'orange' : 'slate'} size="md">
            {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
          </Badge>
        </div>
      </div>

      {/* Main Grid: Left Avatar Card + Right Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Card: Avatar & Dropzone */}
        <div className="md:col-span-5 space-y-6">
          <Card padding="lg" className="bg-white border border-slate-100 shadow-xs flex flex-col items-center text-center">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
              Profile Photo
            </h2>

            {/* Interactive Drag & Drop Picture Area */}
            <AvatarDropzone
              avatar={avatar}
              avatarPublicId={avatarPublicId}
              name={name || user.name}
              onChange={handleAvatarChange}
              onUploadingChange={setIsUploading}
            />

            <div className="mt-5 pt-4 border-t border-slate-100 w-full text-center">
              <h3 className="text-base font-extrabold text-slate-800 truncate">
                {name || user.name}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {email || user.email}
              </p>
            </div>

            {/* Status indicators */}
            <div className="mt-4 w-full grid grid-cols-2 gap-2 text-left">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Account ID
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 truncate block mt-0.5" title={user.id}>
                  {user.id}
                </span>
              </div>
            </div>
          </Card>

          {/* Role Permissions Card */}
          <Card padding="md" className="bg-white border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-orange-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Role Privileges
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {user.role === 'admin'
                ? 'As an Administrator, you have full control over the POS terminal, sales analytics, menu management, tables, staff scheduling, and restaurant settings.'
                : 'As a Staff Member, you have access to create and manage POS orders, update table occupancy status, and view customer tickets.'}
            </p>
          </Card>
        </div>

        {/* Right Card: Personal Info & Save Form */}
        <div className="md:col-span-7">
          <Card padding="lg" className="bg-white border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Personal Information
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Update your name, contact email, and phone number.
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <Input
                label="Full Display Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Pan Bunheng"
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
                placeholder="e.g. user@restaurant.com"
                icon={<Mail className="w-4 h-4" />}
                error={errors.email}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +855 12 345 678"
                icon={<Phone className="w-4 h-4" />}
                sublabel="Optional contact info"
              />

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Profile updated successfully!
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSaving || isUploading}
                  isLoading={isSaving}
                  icon={saveSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
                  className={saveSuccess ? '!bg-emerald-600 !border-emerald-600' : ''}
                >
                  {saveSuccess ? 'Saved!' : 'Save Profile Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

      </div>
    </div>
  );
}
